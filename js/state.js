// Central in-memory store. The UI must never mutate state directly — call actions.
// All derived values (paid, remaining, status) are computed from debts + payments.
// Every mutation is applied optimistically to memory, then persisted via db.js
// (IndexedDB now, Supabase sync in the background if connected).

import { loadAllFromDb, saveRecord } from "./db.js";
import { uid } from "./utils.js";
import { toast } from "./components/toast.js";

const listeners = new Set();

const HOTEL_STORAGE_KEY = "cynthia_hotel_info";
function loadHotelInfo() {
  try {
    const raw = localStorage.getItem(HOTEL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { name: "Cynthia Hotel", phone: "", location: "" };
}

const state = {
  // data
  debts: [],
  payments: [],
  customers: [],
  currentUser: null,
  hotel: loadHotelInfo(),

  // ui
  route: "login",          // "login" | "dashboard" | "debts" | "add-debt" | "debt-details" | "payments" | "customers" | "settings"
  routeParams: {},         // e.g. { debtId: "..." } or { customerId: "..." }
  loading: false,

  // filters
  debtsFilter: { query: "", status: "all", sort: "recent" },
  paymentsFilter: { query: "", method: "all", range: "all" },
  customersQuery: ""
};

export function getState() { return state; }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn(state);
}

function persist(storeName, record) {
  saveRecord(storeName, record).catch(() => {
    toast("Saved on this device, but couldn't reach the database.", "warning");
  });
}

// ---------- Init ----------
export async function initState() {
  const data = await loadAllFromDb();
  state.debts = data.debts;
  state.payments = data.payments;
  state.customers = data.customers;
}

export function setCurrentUserFromSession(session) {
  if (!session || !session.user) { state.currentUser = null; notify(); return; }
  const email = session.user.email || "";
  const name = (session.user.user_metadata && session.user.user_metadata.full_name) || email.split("@")[0] || "Owner";
  state.currentUser = { id: session.user.id, name, role: "Owner", email };
  notify();
}

export function setLocalOnlyUser() {
  state.currentUser = { id: "local", name: "Owner", role: "Owner", email: "" };
  notify();
}

export function updateHotelInfo(patch) {
  state.hotel = { ...state.hotel, ...patch };
  try { localStorage.setItem(HOTEL_STORAGE_KEY, JSON.stringify(state.hotel)); } catch (e) { /* ignore */ }
  notify();
}

// ---------- Selectors / derived calculations ----------

export function getDebt(debtId) {
  return state.debts.find(d => d.id === debtId) || null;
}

export function getCustomer(customerId) {
  return state.customers.find(c => c.id === customerId) || null;
}

export function getPaymentsForDebt(debtId) {
  return state.payments.filter(p => p.debtId === debtId);
}

/**
 * A payment counts toward a debt only if it is not voided.
 */
export function getActivePaymentsForDebt(debtId) {
  return state.payments.filter(p => p.debtId === debtId && !p.voided);
}

export function calculateDebtPaid(debtId) {
  return getActivePaymentsForDebt(debtId).reduce((sum, p) => sum + p.amount, 0);
}

export function calculateDebtRemaining(debtId) {
  const debt = getDebt(debtId);
  if (!debt) return 0;
  const remaining = debt.total - calculateDebtPaid(debtId);
  return remaining > 0 ? remaining : 0;
}

export function calculateDebtStatus(debtId) {
  const debt = getDebt(debtId);
  if (!debt) return "unknown";
  if (debt.archived) return "archived";
  const paid = calculateDebtPaid(debtId);
  const remaining = debt.total - paid;
  if (remaining <= 0) return "paid";
  if (paid > 0) return "partial";
  return "owing";
}

export function statusLabel(status) {
  return ({
    owing: "Owing",
    partial: "Partially Paid",
    paid: "Paid",
    archived: "Archived"
  })[status] || status;
}

export function statusBadgeClass(status) {
  return ({
    owing: "badge-owing",
    partial: "badge-partial",
    paid: "badge-paid",
    archived: "badge-archived"
  })[status] || "badge-archived";
}

// Customer-level aggregation
export function getCustomerDebts(customerId) {
  return state.debts.filter(d => d.customerId === customerId);
}

export function calculateCustomerTotals(customerId) {
  const debts = getCustomerDebts(customerId);
  let totalOwed = 0;
  let totalPaid = 0;
  for (const d of debts) {
    totalOwed += d.total;
    totalPaid += calculateDebtPaid(d.id);
  }
  const outstanding = totalOwed - totalPaid;
  return { totalOwed, totalPaid, outstanding: outstanding > 0 ? outstanding : 0, debtCount: debts.length };
}

export function getCustomerLastTransaction(customerId) {
  const payments = state.payments
    .filter(p => {
      const debt = getDebt(p.debtId);
      return debt && debt.customerId === customerId;
    })
    .map(p => ({ ...p, _ts: new Date(p.recordedAt || p.date).getTime() }))
    .sort((a, b) => b._ts - a._ts);
  if (payments.length) return payments[0];
  const debts = getCustomerDebts(customerId)
    .map(d => ({ ...d, _ts: new Date(d.createdAt || d.date).getTime() }))
    .sort((a, b) => b._ts - a._ts);
  return debts[0] || null;
}

// Dashboard aggregates
export function getDashboardStats() {
  let totalOutstanding = 0;
  let totalCollected = 0;
  let activeDebts = 0;

  for (const d of state.debts) {
    const status = calculateDebtStatus(d.id);
    const remaining = calculateDebtRemaining(d.id);
    const paid = calculateDebtPaid(d.id);
    totalCollected += paid;
    if (status !== "archived" && status !== "paid") {
      totalOutstanding += remaining;
      activeDebts += 1;
    }
  }

  const paymentsToday = state.payments
    .filter(p => !p.voided)
    .filter(p => {
      const d = new Date(p.recordedAt || p.date);
      const t = new Date();
      return d.getFullYear() === t.getFullYear() &&
             d.getMonth() === t.getMonth() &&
             d.getDate() === t.getDate();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  return { totalOutstanding, totalCollected, activeDebts, paymentsToday };
}

export function getRecentDebts(limit = 5) {
  return [...state.debts]
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .slice(0, limit);
}

export function getRecentPayments(limit = 5) {
  return [...state.payments]
    .sort((a, b) => new Date(b.recordedAt || b.date) - new Date(a.recordedAt || a.date))
    .slice(0, limit);
}

export function getTopOutstandingCustomers(limit = 5) {
  return state.customers
    .map(c => ({ customer: c, totals: calculateCustomerTotals(c.id) }))
    .filter(x => x.totals.outstanding > 0)
    .sort((a, b) => b.totals.outstanding - a.totals.outstanding)
    .slice(0, limit);
}

// ---------- Actions (state mutations) ----------

export function navigate(route, params = {}) {
  state.route = route;
  state.routeParams = params;
  // reset scroll
  window.scrollTo({ top: 0, behavior: "auto" });
  notify();
}

export function setLoading(v) {
  state.loading = !!v;
  notify();
}

export function setDebtsFilter(patch) {
  state.debtsFilter = { ...state.debtsFilter, ...patch };
  notify();
}

export function setPaymentsFilter(patch) {
  state.paymentsFilter = { ...state.paymentsFilter, ...patch };
  notify();
}

export function setCustomersQuery(q) {
  state.customersQuery = q;
  notify();
}

export function addDebt({ customerName, customerPhone, total, date, note }) {
  const customerId = upsertCustomer(customerName, customerPhone);
  const now = new Date().toISOString();
  const debt = {
    id: uid("debt"),
    customerId,
    total: Number(total) || 0,
    date: date || now.slice(0, 10),
    note: note || "",
    archived: false,
    createdAt: now,
    updatedAt: now
  };
  state.debts.push(debt);
  notify();
  persist("debts", debt);
  return debt;
}

export function updateDebt(debtId, patch) {
  const d = getDebt(debtId);
  if (!d) return null;
  Object.assign(d, patch);
  notify();
  persist("debts", d);
  return d;
}

export function archiveDebt(debtId) {
  const d = getDebt(debtId);
  if (!d) return null;
  d.archived = true;
  notify();
  persist("debts", d);
  return d;
}

export function unarchiveDebt(debtId) {
  const d = getDebt(debtId);
  if (!d) return null;
  d.archived = false;
  notify();
  persist("debts", d);
  return d;
}

export function recordPayment({ debtId, amount, date, method, note }) {
  const now = new Date().toISOString();
  const payment = {
    id: uid("pay"),
    debtId,
    amount: Number(amount) || 0,
    date: date || now.slice(0, 10),
    method: method || "Cash",
    note: note || "",
    recordedBy: state.currentUser ? state.currentUser.name : "Staff",
    recordedAt: now,
    voided: false
  };
  state.payments.push(payment);
  notify();
  persist("payments", payment);
  return payment;
}

export function voidPayment(paymentId) {
  const p = state.payments.find(x => x.id === paymentId);
  if (!p) return null;
  p.voided = true;
  notify();
  persist("payments", p);
  return p;
}

function upsertCustomer(name, phone) {
  const cleanName = (name || "").trim();
  const cleanPhone = (phone || "").trim();
  const existing = state.customers.find(
    c => c.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) {
    if (cleanPhone && !existing.phone) {
      existing.phone = cleanPhone;
      persist("customers", existing);
    }
    return existing.id;
  }
  const id = uid("cust");
  const customer = {
    id,
    name: cleanName,
    phone: cleanPhone,
    createdAt: new Date().toISOString().slice(0, 10)
  };
  state.customers.push(customer);
  persist("customers", customer);
  return id;
}
