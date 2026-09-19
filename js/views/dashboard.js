import { getState, getDashboardStats, getRecentDebts, getRecentPayments,
         getTopOutstandingCustomers, calculateDebtPaid, calculateDebtRemaining,
         calculateDebtStatus, statusLabel, statusBadgeClass, getCustomer,
         navigate, subscribe } from "../state.js";
import { formatKsh, formatDate, escapeHtml } from "../utils.js";
import { summaryCard } from "../components/summary-card.js";

export function renderDashboard() {
  const wrap = document.createElement("div");

  function update() {
    const state = getState();
    const stats = getDashboardStats();
    const recentDebts = getRecentDebts(5);
    const recentPayments = getRecentPayments(5);
    const topCustomers = getTopOutstandingCustomers(5);

    wrap.innerHTML = "";

    const header = document.createElement("div");
    header.className = "page-header";
    header.innerHTML = `
      <div>
        <h1 class="page-title">Dashboard</h1>
        <div class="page-subtitle">Welcome back, ${escapeHtml(state.currentUser?.name?.split(" ")[0] || "")}</div>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" id="dash-add">
        + Add Debt
      </button>
    `;
    wrap.appendChild(header);
    header.querySelector("#dash-add").addEventListener("click", () => navigate("add-debt"));

    // Summary cards
    const grid = document.createElement("div");
    grid.className = "summary-grid";
    grid.appendChild(summaryCard({
      label: "Total Outstanding",
      value: formatKsh(stats.totalOutstanding),
      meta: "Unpaid across active debts",
      accent: "primary"
    }));
    grid.appendChild(summaryCard({
      label: "Total Collected",
      value: formatKsh(stats.totalCollected),
      meta: "All recorded payments",
      accent: "success"
    }));
    grid.appendChild(summaryCard({
      label: "Active Debts",
      value: String(stats.activeDebts),
      meta: "Owing or partially paid"
    }));
    grid.appendChild(summaryCard({
      label: "Payments Today",
      value: formatKsh(stats.paymentsToday),
      meta: "Recorded so far",
      accent: "success"
    }));
    wrap.appendChild(grid);

    // Recent debts
    wrap.appendChild(buildRecentDebts(recentDebts));

    // Recent payments
    wrap.appendChild(buildRecentPayments(recentPayments));

    // Top outstanding customers
    wrap.appendChild(buildTopCustomers(topCustomers));
  }

  update();
  subscribe(update);
  return wrap;
}

function buildRecentDebts(debts) {
  const section = document.createElement("section");
  section.className = "section";
  section.innerHTML = `
    <div class="section-header">
      <div class="section-title">Recent Debts</div>
      <div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" data-view="debts">View all</button>
    </div>
  `;
  const body = document.createElement("div");
  body.className = "section-body";

  if (!debts.length) {
    body.innerHTML = `<div class="empty-state"><div class="empty-title">No debts yet</div><div class="empty-text">Add your first debt to see it here.</div></div>`;
  } else {
    debts.forEach(d => {
      const customer = getCustomer(d.customerId);
      const paid = calculateDebtPaid(d.id);
      const remaining = calculateDebtRemaining(d.id);
      const status = calculateDebtStatus(d.id);
      const item = document.createElement("div");
      item.className = "list-item";
      item.innerHTML = `
        <div class="list-item-main">
          <div class="list-item-title">${escapeHtml(customer ? customer.name : "Unknown")}</div>
          <div class="list-item-sub">${formatDate(d.date)} · Paid ${formatKsh(paid)}</div>
        </div>
        <div class="list-item-right">
          <div class="list-item-amount">${formatKsh(remaining)}</div>
          <span class="badge ${statusBadgeClass(status)}">${statusLabel(status)}</span>
        </div>
      `;
      item.addEventListener("click", () => navigate("debt-details", { debtId: d.id }));
      body.appendChild(item);
    });
  }
  section.appendChild(body);
  section.querySelector("[data-view]").addEventListener("click", () => navigate("debts"));
  return section;
}

function buildRecentPayments(payments) {
  const section = document.createElement("section");
  section.className = "section";
  section.innerHTML = `
    <div class="section-header">
      <div class="section-title">Recent Payments</div>
      <div class="spacer"></div>
      <button class="btn btn-ghost btn-sm" data-view="payments">View all</button>
    </div>
  `;
  const body = document.createElement("div");
  body.className = "section-body";

  if (!payments.length) {
    body.innerHTML = `<div class="empty-state"><div class="empty-title">No payments yet</div><div class="empty-text">Recorded payments will appear here.</div></div>`;
  } else {
    payments.forEach(p => {
      const debt = getState().debts.find(d => d.id === p.debtId);
      const customer = debt ? getCustomer(debt.customerId) : null;
      const item = document.createElement("div");
      item.className = "list-item" + (p.voided ? " voided" : "");
      item.innerHTML = `
        <div class="list-item-main">
          <div class="list-item-title">${escapeHtml(customer ? customer.name : "Unknown")}</div>
          <div class="list-item-sub">${formatDate(p.date)} · ${escapeHtml(p.method)}${p.voided ? ' · <span class="badge badge-voided">Voided</span>' : ""}</div>
        </div>
        <div class="list-item-right">
          <div class="list-item-amount text-success" style="${p.voided ? "text-decoration:line-through;color:var(--muted);" : ""}">${formatKsh(p.amount)}</div>
        </div>
      `;
      if (debt) item.addEventListener("click", () => navigate("debt-details", { debtId: debt.id }));
      body.appendChild(item);
    });
  }
  section.appendChild(body);
  section.querySelector("[data-view]").addEventListener("click", () => navigate("payments"));
  return section;
}

function buildTopCustomers(list) {
  const section = document.createElement("section");
  section.className = "section";
  section.innerHTML = `
    <div class="section-header">
      <div class="section-title">Top Outstanding Customers</div>
    </div>
  `;
  const body = document.createElement("div");
  body.className = "section-body";

  if (!list.length) {
    body.innerHTML = `<div class="empty-state"><div class="empty-title">Everyone is settled</div><div class="empty-text">No outstanding balances.</div></div>`;
  } else {
    list.forEach(({ customer, totals }) => {
      const item = document.createElement("div");
      item.className = "list-item";
      item.innerHTML = `
        <div class="list-item-main">
          <div class="list-item-title">${escapeHtml(customer.name)}</div>
          <div class="list-item-sub">${escapeHtml(customer.phone)} · ${totals.debtCount} debt${totals.debtCount === 1 ? "" : "s"}</div>
        </div>
        <div class="list-item-right">
          <div class="list-item-amount remaining" style="color:var(--danger);">${formatKsh(totals.outstanding)}</div>
        </div>
      `;
      item.addEventListener("click", () => navigate("customers", { focusCustomerId: customer.id }));
      body.appendChild(item);
    });
  }
  section.appendChild(body);
  return section;
}