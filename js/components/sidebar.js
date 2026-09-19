import { getState, subscribe, navigate } from "../state.js";

const NAV = [
  { section: "Main", items: [
    { route: "dashboard", label: "Dashboard", icon: iconGrid() },
    { route: "debts",     label: "Debts",     icon: iconList() },
    { route: "payments",  label: "Payments",  icon: iconCash() },
    { route: "customers", label: "Customers", icon: iconPeople() }
  ]},
  { section: "System", items: [
    { route: "settings",  label: "Settings",  icon: iconCog() }
  ]}
];

export function renderSidebar() {
  const el = document.createElement("aside");
  el.className = "app-sidebar";

  function update() {
    const state = getState();
    el.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-mark">CH</div>
        <div class="sidebar-brand-text">
          <strong>Cynthia Hotel</strong>
          <span>Debt Ledger</span>
        </div>
      </div>
      <nav class="nav">
        ${NAV.map(group => `
          <div class="nav-section-label">${group.section}</div>
          ${group.items.map(item => `
            <button class="nav-item ${state.route === item.route ? "active" : ""}" data-route="${item.route}">
              <span class="nav-icon">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `).join("")}
        `).join("")}
      </nav>
      <div style="padding:16px; border-top:1px solid rgba(255,255,255,0.08); font-size:12px; color:#8aa195;">
        Signed in as<br>
        <strong style="color:#dfe8e2;">${state.currentUser ? state.currentUser.name : ""}</strong><br>
        <span style="color:#6d8377;">${state.currentUser ? state.currentUser.role : ""}</span>
      </div>
    `;

    el.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const r = btn.getAttribute("data-route");
        if (r === "debts") navigate("debts");
        else navigate(r);
      });
    });
  }

  update();
  subscribe(update);
  return el;
}

function iconGrid(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;}
function iconList(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>`;}
function iconCash(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>`;}
function iconPeople(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;}
function iconCog(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;}