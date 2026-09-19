// db.js — IndexedDB persistence + Supabase sync for Cynthia Hotel Ledger.
//
// Nothing here is ever hard-deleted: debts get archived, payments get voided.
// So sync only ever needs to upsert — which keeps the merge logic simple:
// whichever copy (local or remote) has the newer updatedAt wins.

const DB_NAME = "cynthia_hotel_db";
const DB_VERSION = 2; // v2 adds the "charges" store (debt top-ups)
const STORES = ["customers", "debts", "payments", "charges"];

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      });
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", { keyPath: "seq", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

export function idbGetAll(storeName) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  }));
}

export function idbPut(storeName, value) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, "readwrite");
    t.objectStore(storeName).put(value);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

export function idbAdd(storeName, value) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, "readwrite");
    t.objectStore(storeName).add(value);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

export function idbClear(storeName) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, "readwrite");
    t.objectStore(storeName).clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

export function idbCount(storeName) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, "readonly").objectStore(storeName).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

// ---------- Supabase client ----------
export let supabaseClient = null;
export function initSupabase(url, key) {
  if (url && key && url.indexOf("YOUR_SUPABASE") === -1 && window.supabase) {
    supabaseClient = window.supabase.createClient(url, key);
  }
  return supabaseClient;
}
export function isConfigured() {
  return !!supabaseClient;
}

// ---------- Sync status (UI subscribes to this) ----------
const syncListeners = new Set();
export function onSyncChange(fn) {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}
let syncing = false;
let lastSyncError = false;
let pendingCount = 0;
export function getSyncStatus() {
  return { configured: isConfigured(), online: navigator.onLine, syncing, lastSyncError, pendingCount };
}
function notifySync() {
  syncListeners.forEach((fn) => fn(getSyncStatus()));
}
async function refreshPendingCount() {
  pendingCount = await idbCount("syncQueue");
  notifySync();
}

function queueChange(storeName, record) {
  return idbAdd("syncQueue", { store: storeName, entityId: record.id, data: record, ts: new Date().toISOString() })
    .then(async () => {
      await refreshPendingCount();
      if (supabaseClient && navigator.onLine) syncNow();
    })
    .catch((err) => console.error("Could not queue change for sync.", err));
}

export async function saveRecord(storeName, record) {
  record.updatedAt = new Date().toISOString();
  await idbPut(storeName, record);
  await queueChange(storeName, record);
  return record;
}

// ---------- Field mapping (camelCase locally, snake_case in Postgres) ----------
const FIELD_MAPS = {
  customers: {
    toRemote: (c) => ({ id: c.id, name: c.name, phone: c.phone, created_at: c.createdAt, updated_at: c.updatedAt }),
    fromRemote: (r) => ({ id: r.id, name: r.name, phone: r.phone, createdAt: r.created_at, updatedAt: r.updated_at })
  },
  debts: {
    toRemote: (d) => ({ id: d.id, customer_id: d.customerId, total: d.total, date: d.date, note: d.note, archived: !!d.archived, created_at: d.createdAt, updated_at: d.updatedAt }),
    fromRemote: (r) => ({ id: r.id, customerId: r.customer_id, total: r.total, date: r.date, note: r.note, archived: !!r.archived, createdAt: r.created_at, updatedAt: r.updated_at })
  },
  payments: {
    toRemote: (p) => ({ id: p.id, debt_id: p.debtId, amount: p.amount, date: p.date, method: p.method, note: p.note, recorded_by: p.recordedBy, recorded_at: p.recordedAt, voided: !!p.voided, updated_at: p.updatedAt }),
    fromRemote: (r) => ({ id: r.id, debtId: r.debt_id, amount: r.amount, date: r.date, method: r.method, note: r.note, recordedBy: r.recorded_by, recordedAt: r.recorded_at, voided: !!r.voided, updatedAt: r.updated_at })
  },
  charges: {
    toRemote: (c) => ({ id: c.id, debt_id: c.debtId, amount: c.amount, date: c.date, note: c.note, recorded_by: c.recordedBy, recorded_at: c.recordedAt, updated_at: c.updatedAt }),
    fromRemote: (r) => ({ id: r.id, debtId: r.debt_id, amount: r.amount, date: r.date, note: r.note, recordedBy: r.recorded_by, recordedAt: r.recorded_at, updatedAt: r.updated_at })
  }
};

async function pushQueue() {
  const items = await idbGetAll("syncQueue");
  if (!items.length) return;
  // Keep only the latest queued change per (store, entityId) — no point
  // pushing three edits to the same debt if a fourth already superseded them.
  const latest = new Map();
  items.forEach((item) => latest.set(item.store + ":" + item.entityId, item));
  for (const item of latest.values()) {
    const row = FIELD_MAPS[item.store].toRemote(item.data);
    const res = await supabaseClient.from(item.store).upsert(row);
    if (res.error) throw res.error;
  }
  await idbClear("syncQueue");
}

export function idbDelete(storeName, key) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, "readwrite");
    t.objectStore(storeName).delete(key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

async function pullOne(storeName) {
  const res = await supabaseClient.from(storeName).select("*");
  if (res.error) throw res.error;
  const remoteRows = res.data || [];
  const remoteIds = new Set(remoteRows.map((r) => r.id));

  const localAll = await idbGetAll(storeName);
  const localById = new Map(localAll.map((r) => [r.id, r]));

  for (const remoteRow of remoteRows) {
    const remote = FIELD_MAPS[storeName].fromRemote(remoteRow);
    const local = localById.get(remote.id);
    if (!local || new Date(remote.updatedAt || 0) > new Date(local.updatedAt || 0)) {
      await idbPut(storeName, remote);
    }
  }

  // A row that's local but missing from the remote result was deleted
  // there (e.g. someone cleared the database) — remove it here too,
  // unless it's still sitting in the outbound queue waiting to be pushed
  // for the first time (don't erase something not yet uploaded).
  const queueItems = await idbGetAll("syncQueue");
  const pendingIds = new Set(queueItems.filter((q) => q.store === storeName).map((q) => q.entityId));
  for (const local of localAll) {
    if (!remoteIds.has(local.id) && !pendingIds.has(local.id)) {
      await idbDelete(storeName, local.id);
    }
  }
}

export async function syncNow() {
  if (!supabaseClient || syncing || !navigator.onLine) return;
  syncing = true;
  notifySync();
  try {
    await pushQueue();
    await pullOne("customers");
    await pullOne("debts");
    await pullOne("payments");
    await pullOne("charges");
    lastSyncError = false;
  } catch (err) {
    console.error("Sync failed:", err);
    lastSyncError = true;
  }
  syncing = false;
  await refreshPendingCount();
}

window.addEventListener("online", () => { notifySync(); syncNow(); });
window.addEventListener("offline", notifySync);

// Keeps things in sync even when nothing local changed — e.g. someone
// edited data directly in Supabase, or from another device.
let autoSyncTimer = null;
export function startAutoSync(intervalMs = 30000) {
  if (autoSyncTimer) return;
  autoSyncTimer = setInterval(() => {
    if (supabaseClient && navigator.onLine) syncNow();
  }, intervalMs);
}

// ---------- Bulk load / wipe ----------
export async function loadAllFromDb() {
  const [customers, debts, payments, charges] = await Promise.all([
    idbGetAll("customers"), idbGetAll("debts"), idbGetAll("payments"), idbGetAll("charges")
  ]);
  await refreshPendingCount();
  return { customers, debts, payments, charges };
}

// Wipes this device's copy — meant for clearing test data before a real
// handoff, not everyday use. If connected and online, also deletes every
// row remotely first (children before parents, to respect foreign keys);
// otherwise a future sync would just pull the old data straight back down.
export async function clearAllLocalData() {
  if (supabaseClient && navigator.onLine) {
    try {
      await supabaseClient.from("payments").delete().neq("id", "");
      await supabaseClient.from("charges").delete().neq("id", "");
      await supabaseClient.from("debts").delete().neq("id", "");
      await supabaseClient.from("customers").delete().neq("id", "");
    } catch (err) {
      console.error("Could not clear the remote database:", err);
    }
  }
  await idbClear("customers");
  await idbClear("debts");
  await idbClear("payments");
  await idbClear("charges");
  await idbClear("syncQueue");
  pendingCount = 0;
  notifySync();
}

