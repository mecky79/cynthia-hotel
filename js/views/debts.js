import {
  getState, subscribe, setDebtsFilter, navigate,
  calculateDebtPaid, calculateDebtRemaining, calculateDebtStatus,
  statusLabel, statusBadgeClass, getCustomer
} from "../state.js";
import { formatKsh, formatDate, matchesQuery, escapeHtml } from "../utils.js";
import { debtCard } from "../components/debt-card.js";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "owing", label: "Owing" },
  { value: "partial", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "archived", label: "Archived" }
];

const SORTS = [
  { value: "recent", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest" },
  { value: "lowest", label: "Lowest" }
];

export function renderDebts() {
  const wrap = document.createElement("div");

  function update() {
    const state = getState();
    const filter = state.debtsFilter;
    wrap.innerHTML = "";

    // header
    const header = document.createElement("div");
    header.className = "page-header";
    header.innerHTML = `
      <div>
        <h1 class="page-title">Debts</h1>
        <div class="page-subtitle">${state.debts.length} total records</div>
      </div>
      <div class="spacer"></div>
      <button class="btn btn-primary" id="add-debt-btn">
        + Add Debt
      </button>
    `;
    wrap.appendChild(header);
    header.querySelector("#add-debt-btn").addEventListener("click", () => navigate("add-debt"));

    // filters
    const filters = document.createElement("div");
    filters.className = "filters";
    filters.innerHTML = `
      <div class="search-wrap">
        <input class="input" id="debt-search" placeholder="Search by customer, phone or note…" value="${escapeHtml(filter.query)}" />
      </div>
      <select class="select" id="debt-sort" style="max-width:160px;">
        ${SORTS.map(s => `<option value="${s.value}" ${filter.sort === s.value ? "selected" : ""}>${s.label}</option>`).join("")}
      </select>
    `;
    wrap.appendChild(filters);

    const chipGroup = document.createElement("div");
    chipGroup.className = "chip-group";
    chipGroup.style.marginBottom = "16px";
    chipGroup.innerHTML = STATUS_FILTERS.map(s =>
      `<button class="chip ${filter.status === s.value ? "active" : ""}" data-status="${s.value}">${s.label}</button>`
    ).join("");
    wrap.appendChild(chipGroup);

    // list
    const list = applyFilter(state.debts, filter);
    const listWrap = document.createElement("div");

    if (!list.length) {
      listWrap.innerHTML = `<div class="empty-state"><div class="empty-title">No debts found</div><div class="empty-text">Try a different filter or add a new debt.</div></div>`;
    } else {
      // Mobile: cards
      const cards = document.createElement("div");
      cards.className = "stack-sm mobile-only";
      list.forEach(d => cards.appendChild(debtCard(d)));
      listWrap.appendChild(cards);

      // Desktop: table
      const tableWrap = document.createElement("div");
      tableWrap.className = "section desktop-only";
      tableWrap.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th class="num">Debt</th>
                <th class="num">Paid</th>
                <th class="num">Remaining</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(d => {
                const c = getCustomer(d.customerId);
                const paid = calculateDebtPaid(d.id);
                const rem = calculateDebtRemaining(d.id);
                const st = calculateDebtStatus(d.id);
                return `
                  <tr data-id="${d.id}">
                    <td><strong>${escapeHtml(c ? c.name : "Unknown")}</strong></td>
                    <td class="text-muted">${escapeHtml(c ? c.phone : "")}</td>
                    <td class="num">${formatKsh(d.total)}</td>
                    <td class="num paid">${formatKsh(paid)}</td>
                    <td class="num remaining">${formatKsh(rem)}</td>
                    <td class="text-muted">${formatDate(d.date)}</td>
                    <td><span class="badge ${statusBadgeClass(st)}">${statusLabel(st)}</span></td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
      tableWrap.querySelectorAll("tbody tr").forEach(tr => {
        tr.addEventListener("click", () => navigate("debt-details", { debtId: tr.dataset.id }));
      });
      listWrap.appendChild(tableWrap);
    }

    wrap.appendChild(listWrap);

    // wire filters
    wrap.querySelector("#debt-search").addEventListener("input", e => {
      setDebtsFilter({ query: e.target.value });
      // keep focus
      const input = wrap.querySelector("#debt-search");
      if (input) { input.focus(); const v = input.value; input.value = ""; input.value = v; }
    });
    wrap.querySelector("#debt-sort").addEventListener("change", e => {
      setDebtsFilter({ sort: e.target.value });
    });
    chipGroup.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => setDebtsFilter({ status: chip.dataset.status }));
    });
  }

  update();
  subscribe(update);
  return wrap;
}

function applyFilter(debts, filter) {
  let list = debts.filter(d => {
    const c = getCustomer(d.customerId);
    const hay = `${c?.name || ""} ${c?.phone || ""} ${d.note || ""}`;
    if (!matchesQuery(hay, filter.query)) return false;
    if (filter.status !== "all") {
      const st = calculateDebtStatus(d.id);
      if (st !== filter.status) return false;
    }
    return true;
  });

  const sorters = {
    recent:  (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date),
    oldest:  (a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date),
    highest: (a, b) => b.total - a.total,
    lowest:  (a, b) => a.total - b.total
  };
  list.sort(sorters[filter.sort] || sorters.recent);
  return list;
}