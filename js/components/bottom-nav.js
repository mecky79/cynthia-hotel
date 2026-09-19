import { getState, subscribe, navigate } from "../state.js";

const ITEMS = [
  { route: "dashboard", label: "Home",      icon: iconGrid() },
  { route: "debts",     label: "Debts",     icon: iconList() },
  { route: "payments",  label: "Payments",  icon: iconCash() },
  { route: "customers", label: "Customers", icon: iconPeople() },
  { route: "settings",  label: "More",      icon: iconMore() }
];

export function renderBottomNav() {
  const el = document.createElement("nav");
  el.className = "bottom-nav";

  function update() {
    const state = getState();
    const active = {
      "dashboard": "dashboard",
      "debts": "debts",
      "add-debt": "debts",
      "debt-details": "debts",
      "payments": "payments",
      "customers": "customers",
      "settings": "settings"
    }[state.route] || "dashboard";

    el.innerHTML = ITEMS.map(item => `
      <button class="bottom-nav-item ${active === item.route ? "active" : ""}" data-route="${item.route}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join("");

    el.querySelectorAll(".bottom-nav-item").forEach(btn => {
      btn.addEventListener("click", () => navigate(btn.getAttribute("data-route")));
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
function iconMore(){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/></svg>`;}