import { getState, subscribe, navigate, updateHotelInfo } from "../state.js";
import { escapeHtml } from "../utils.js";
import { toast } from "../components/toast.js";
import { getSyncStatus, onSyncChange, syncNow, isConfigured, clearAllLocalData } from "../db.js";
import { signOut } from "../auth.js";
import { confirmModal } from "../components/modal.js";

export function renderSettings() {
  const wrap = document.createElement("div");
  let unsubscribeSync = null;

  function update() {
    const state = getState();
    const sync = getSyncStatus();
    wrap.innerHTML = "";

    const header = document.createElement("div");
    header.className = "page-header";
    header.innerHTML = `
      <div>
        <h1 class="page-title">Settings</h1>
        <div class="page-subtitle">App and account information</div>
      </div>
    `;
    wrap.appendChild(header);

    // Hotel info — editable
    const hotelSection = document.createElement("section");
    hotelSection.className = "section";
    hotelSection.innerHTML = `
      <div class="section-header"><div class="section-title">Hotel Information</div></div>
      <div class="settings-list">
        <div class="settings-item"><span class="si-label">Hotel name</span><input class="input" id="hotel-name" value="${escapeHtml(state.hotel.name)}" style="max-width:220px;"></div>
        <div class="settings-item"><span class="si-label">Phone</span><input class="input" id="hotel-phone" value="${escapeHtml(state.hotel.phone)}" style="max-width:220px;"></div>
        <div class="settings-item"><span class="si-label">Location</span><input class="input" id="hotel-location" value="${escapeHtml(state.hotel.location)}" style="max-width:220px;"></div>
      </div>
      <div class="section-footer"><button class="btn btn-secondary" id="save-hotel-btn">Save</button></div>
    `;
    wrap.appendChild(hotelSection);
    hotelSection.querySelector("#save-hotel-btn").addEventListener("click", () => {
      updateHotelInfo({
        name: hotelSection.querySelector("#hotel-name").value.trim() || "Cynthia Hotel",
        phone: hotelSection.querySelector("#hotel-phone").value.trim(),
        location: hotelSection.querySelector("#hotel-location").value.trim()
      });
      toast("Hotel info saved.", "success");
    });

    // User info
    const user = state.currentUser;
    const userSection = document.createElement("section");
    userSection.className = "section";
    userSection.innerHTML = `
      <div class="section-header"><div class="section-title">User Information</div></div>
      <div class="settings-list">
        <div class="settings-item"><span class="si-label">Signed in as</span><span class="si-value">${escapeHtml(user ? user.name : "—")}</span></div>
        <div class="settings-item"><span class="si-label">Role</span><span class="si-value">${escapeHtml(user ? user.role : "—")}</span></div>
        <div class="settings-item"><span class="si-label">Email</span><span class="si-value">${escapeHtml(user && user.email ? user.email : "—")}</span></div>
      </div>
    `;
    wrap.appendChild(userSection);

    // App status — real sync state, not placeholder text
    const configured = isConfigured();
    const connLabel = !configured ? "Not connected — local device only" : (sync.online ? "Online" : "Offline");
    const syncLabel = !configured
      ? "No backend connected yet"
      : sync.syncing
        ? "Syncing…"
        : sync.lastSyncError
          ? `Sync error — ${sync.pendingCount} change${sync.pendingCount === 1 ? "" : "s"} waiting`
          : sync.pendingCount > 0
            ? `${sync.pendingCount} change${sync.pendingCount === 1 ? "" : "s"} waiting to sync`
            : "All caught up";

    const appSection = document.createElement("section");
    appSection.className = "section";
    appSection.innerHTML = `
      <div class="section-header"><div class="section-title">Application</div></div>
      <div class="settings-list">
        <div class="settings-item">
          <span class="si-label">Connection</span>
          <span class="si-value"><span class="status-dot"></span>${connLabel}</span>
        </div>
        <div class="settings-item">
          <span class="si-label">Data synchronization</span>
          <span class="si-value">${syncLabel}</span>
        </div>
        <div class="settings-item">
          <span class="si-label">Version</span>
          <span class="si-value mono">v1.0.0</span>
        </div>
      </div>
      <div class="section-footer" style="display:flex; gap:8px; flex-wrap:wrap;">
        ${configured ? '<button class="btn btn-secondary" id="sync-now-btn">Sync now</button>' : ""}
        <button class="btn btn-secondary" id="clear-data-btn">Clear all data</button>
        <button class="btn btn-secondary" id="signout-btn">Sign Out</button>
      </div>
    `;
    wrap.appendChild(appSection);

    if (configured) {
      appSection.querySelector("#sync-now-btn").addEventListener("click", () => syncNow());
    }

    appSection.querySelector("#clear-data-btn").addEventListener("click", async () => {
      const ok = await confirmModal({
        title: "Clear All Data",
        message: configured
          ? "This permanently deletes every customer, debt and payment — on this device and in the connected database. Meant for wiping test data before real use — not for everyday use."
          : "This permanently deletes every customer, debt and payment stored on this device. Meant for wiping test data before real use — not for everyday use.",
        confirmLabel: "Clear Everything",
        destructive: true
      });
      if (!ok) return;
      await clearAllLocalData();
      toast("Local data cleared. Reloading…", "success");
      setTimeout(() => window.location.reload(), 600);
    });

    appSection.querySelector("#signout-btn").addEventListener("click", async () => {
      await signOut();
      toast("Signed out.", "success");
      navigate("login");
    });
  }

  update();
  subscribe(update);
  unsubscribeSync = onSyncChange(update);

  return wrap;
}
