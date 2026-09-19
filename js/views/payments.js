import {
  getState, subscribe, navigate, setPaymentsFilter,
  getDebt, getCustomer
} from "../state.js";
import { formatKsh, formatDate, matchesQuery, escapeHtml } from "../utils.js";

const METHODS = ["all", "Cash", "M-Pesa", "Bank", "Cheque", "Card"];
const RANGES = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" }
];

export function renderPayments() {
  const wrap = document.createElement("div");

  function update() {
    const state = getState();
    const filter = state.paymentsFilter;
    wrap.innerHTML = "";

    const header = document.createElement("div");
    header.className = "page-header";
    header.innerHTML = `
      <div>
        <h1 class="page-title">Payments</h1>
        <div class="page-subtitle">${state.payments.length} total records</div>
      </div>
    `;
    wrap.appendChild(header);

    const filters = document.createElement("div");
    filters.className = "filters";
    filters.innerHTML = `
      <div class="search-wrap">
        <input class="input" id="pay-search" placeholder="Search customer or note…" value="${escapeHtml(filter.query)}" />
      </div>
      <select class="select" id="pay-method" style="max-width:160px;">
        ${METHODS.map(m => `<option value="${m}" ${filter.method === m ? "selected" : ""}>${m === "all" ? "All methods" : m}</option>`).join("")}
      </select>
      <select class="select" id="pay-range" style="max-width:160px;">
        ${RANGES.map(r => `<option value="${r.value}" ${filter.range === r.value ? "selected" : ""}>${r.label}</option>`).join("")}
      </select>
    `;
    wrap.appendChild(filters);

    const list = applyFilter(state, filter);

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "section";
      empty.innerHTML = `<div class="empty-state"><div class="empty-title">No payments found</div><div class="empty-text">Adjust your filters or record a new payment.</div></div>`;
      wrap.appendChild(empty);
    } else {
      const section = document.createElement("section");
      section.className = "section";
      section.innerHTML = `<div class="section-header"><div class="section-title">All Payments</div></div>`;
      const body = document.createElement("div");
      body.className = "section-body";
      list.forEach(p => {
        const debt = getDebt(p.debtId);
        const customer = debt ? getCustomer(debt.customerId) : null;
        const item = document.createElement("div");
        item.className = "payment-item" + (p.voided ? " voided" : "");
        item.style.cursor = "pointer";
        item.innerHTML = `
          <div class="pi-icon">${p.voided ? "×" : "✓"}</div>
          <div class="pi-main">
            <div class="pi-title">${escapeHtml(customer ? customer.name : "Unknown")}</div>
            <div class="pi-sub">
              ${formatDate(p.date)} · ${escapeHtml(p.method)}
              ${p.recordedBy ? ` · by ${escapeHtml(p.recordedBy)}` : ""}
              ${debt ? ` · Ref ${escapeHtml(debt.id)}` : ""}
              ${p.voided ? ' · <span class="badge badge-voided">Voided</span>' : ""}
            </div>
            ${p.note ? `<div class="pi-sub">${escapeHtml(p.note)}</div>` : ""}
          </div>
          <div class="pi-amount">${formatKsh(p.amount)}</div>
        `;
        if (debt) item.addEventListener("click", () => navigate("debt-details", { debtId: debt.id }));
        body.appendChild(item);
      });
      section.appendChild(body);
      wrap.appendChild(section);
    }

    wrap.querySelector("#pay-search").addEventListener("input", e => setPaymentsFilter({ query: e.target.value }));
    wrap.querySelector("#pay-method").addEventListener("change", e => setPaymentsFilter({ method: e.target.value }));
    wrap.querySelector("#pay-range").addEventListener("change", e => setPaymentsFilter({ range: e.target.value }));
  }

  update();
  subscribe(update);
  return wrap;
}

function applyFilter(state, filter) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  return state.payments.filter(p => {
    const debt = getDebt(p.debtId);
    const customer = debt ? getCustomer(debt.customerId) : null;
    const hay = `${customer?.name || ""} ${p.note || ""} ${p.method || ""} ${p.recordedBy || ""}`;
    if (!matchesQuery(hay, filter.query)) return false;

    if (filter.method !== "all" && p.method !== filter.method) return false;

    if (filter.range !== "all") {
      const d = new Date(p.date || p.recordedAt);
      if (filter.range === "today" && d < startOfToday) return false;
      if (filter.range === "week" && d < weekAgo) return false;
      if (filter.range === "month" && d < monthAgo) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.recordedAt || b.date) - new Date(a.recordedAt || a.date));
}