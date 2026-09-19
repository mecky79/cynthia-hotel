import { getState, subscribe } from "../state.js";

export function renderTopbar() {
  const el = document.createElement("header");
  el.className = "app-topbar";

  function update() {
    const state = getState();
    const titles = {
      "dashboard": "Dashboard",
      "debts": "Debts",
      "add-debt": "Add Debt",
      "debt-details": "Debt Details",
      "payments": "Payments",
      "customers": "Customers",
      "settings": "Settings"
    };
    el.innerHTML = `
      <div class="brand-mark" style="width:32px;height:32px;font-size:14px;">CH</div>
      <div style="flex:1; min-width:0;">
        <div class="topbar-title">${titles[state.route] || "Cynthia Hotel"}</div>
        <div class="topbar-user">${state.currentUser ? state.currentUser.name : ""}</div>
      </div>
    `;
  }

  update();
  subscribe(update);
  return el;
}