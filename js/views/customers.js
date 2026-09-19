import {
  getState, subscribe, navigate, setCustomersQuery,
  calculateCustomerTotals, calculateDebtPaid, calculateDebtRemaining, calculateDebtTotal,
  calculateDebtStatus, statusLabel, statusBadgeClass,
  getCustomerDebts, getCustomer, getCustomerLastTransaction
} from "../state.js";
import { formatKsh, formatDate, matchesQuery, escapeHtml, initials } from "../utils.js";
import { openModal } from "../components/modal.js";

export function renderCustomers(params) {
  const wrap = document.createElement("div");
  const focusId = params && params.focusCustomerId;

  function update() {
    const state = getState();
    wrap.innerHTML = "";

    const header = document.createElement("div");
    header.className = "page-header";
    header.innerHTML = `
      <div>
        <h1 class="page-title">Customers</h1>
        <div class="page-subtitle">${state.customers.length} records</div>
      </div>
    `;
    wrap.appendChild(header);

    const filters = document.createElement("div");
    filters.className = "filters";
    filters.innerHTML = `
      <div class="search-wrap">
        <input class="input" id="cust-search" placeholder="Search by name or phone…" value="${escapeHtml(state.customersQuery)}" />
      </div>
    `;
    wrap.appendChild(filters);

    const list = state.customers
      .filter(c => matchesQuery(`${c.name} ${c.phone}`, state.customersQuery))
      .map(c => ({ customer: c, totals: calculateCustomerTotals(c.id), last: getCustomerLastTransaction(c.id) }))
      .sort((a, b) => b.totals.outstanding - a.totals.outstanding);

    if (!list.length) {
      const empty = document.createElement("div");
      empty.className = "section";
      empty.innerHTML = `<div class="empty-state"><div class="empty-title">No customers</div><div class="empty-text">Try a different search.</div></div>`;
      wrap.appendChild(empty);
    } else {
      const section = document.createElement("section");
      section.className = "section";
      list.forEach(({ customer, totals, last }) => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.innerHTML = `
          <div class="pi-icon" style="background:var(--primary-soft); color:var(--primary);">${initials(customer.name)}</div>
          <div class="list-item-main">
            <div class="list-item-title">${escapeHtml(customer.name)}</div>
            <div class="list-item-sub">${escapeHtml(customer.phone)} · ${totals.debtCount} debt${totals.debtCount === 1 ? "" : "s"}${last ? ` · Last ${formatDate(last.recordedAt || last.date || last.createdAt)}` : ""}</div>
          </div>
          <div class="list-item-right">
            <div class="list-item-amount" style="color:${totals.outstanding > 0 ? "var(--danger)" : "var(--success)"};">${formatKsh(totals.outstanding)}</div>
            <div class="list-item-sub">${totals.outstanding > 0 ? "outstanding" : "settled"}</div>
          </div>
        `;
        item.addEventListener("click", () => openCustomerSheet(customer.id));
        section.appendChild(item);
      });
      wrap.appendChild(section);
    }

    wrap.querySelector("#cust-search").addEventListener("input", e => setCustomersQuery(e.target.value));
  }

  update();
  subscribe(update);

  if (focusId) {
    // after first render, open the sheet
    setTimeout(() => openCustomerSheet(focusId), 60);
  }

  return wrap;
}

function openCustomerSheet(customerId) {
  const customer = getCustomer(customerId);
  if (!customer) return;
  const totals = calculateCustomerTotals(customerId);
  const debts = getCustomerDebts(customerId)
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));

  const body = document.createElement("div");
  body.className = "stack";
  body.innerHTML = `
    <div class="detail-hero" style="margin:0;">
      <div class="dh-name">${escapeHtml(customer.name)}</div>
      <div class="dh-phone">${escapeHtml(customer.phone)}</div>
    </div>

    <div class="balance-panel" style="grid-template-columns:1fr 1fr;">
      <div>
        <div class="bp-label">Total Owed</div>
        <div class="bp-value">${formatKsh(totals.totalOwed)}</div>
      </div>
      <div>
        <div class="bp-label">Outstanding</div>
        <div class="bp-value remaining">${formatKsh(totals.outstanding)}</div>
      </div>
    </div>

    <div>
      <div class="section-title" style="padding: 0 0 8px;">Debt History</div>
      <div class="section" style="margin:0;">
        ${debts.length ? debts.map(d => {
          const paid = calculateDebtPaid(d.id);
          const rem = calculateDebtRemaining(d.id);
          const debtTotal = calculateDebtTotal(d.id);
          const st = calculateDebtStatus(d.id);
          return `
            <div class="list-item" data-debt="${d.id}">
              <div class="list-item-main">
                <div class="list-item-title">${formatKsh(debtTotal)} <span class="badge ${statusBadgeClass(st)}" style="margin-left:6px;">${statusLabel(st)}</span></div>
                <div class="list-item-sub">${formatDate(d.date)} · Paid ${formatKsh(paid)} · Remaining ${formatKsh(rem)}</div>
              </div>
            </div>
          `;
        }).join("") : `<div class="empty-state"><div class="empty-title">No debts</div></div>`}
      </div>
    </div>
  `;

  const m = openModal({ title: "Customer", body });

  body.querySelectorAll("[data-debt]").forEach(item => {
    item.addEventListener("click", () => {
      m.close();
      navigate("debt-details", { debtId: item.dataset.debt });
    });
  });
}
