import { formatKsh, formatDate, escapeHtml } from "../utils.js";
import {
  calculateDebtPaid, calculateDebtRemaining, calculateDebtStatus, calculateDebtTotal,
  statusLabel, statusBadgeClass, getCustomer, getState
} from "../state.js";
import { navigate } from "../state.js";

export function debtCard(debt) {
  const customer = getCustomer(debt.customerId);
  const total = calculateDebtTotal(debt.id);
  const paid = calculateDebtPaid(debt.id);
  const remaining = calculateDebtRemaining(debt.id);
  const status = calculateDebtStatus(debt.id);

  const el = document.createElement("div");
  el.className = "debt-card";
  el.innerHTML = `
    <div class="debt-card-top">
      <div style="min-width:0;">
        <div class="debt-card-name">${escapeHtml(customer ? customer.name : "Unknown")}</div>
        <div class="debt-card-phone">${escapeHtml(customer ? customer.phone : "")}</div>
      </div>
      <span class="badge ${statusBadgeClass(status)}">${statusLabel(status)}</span>
    </div>
    <div class="debt-card-amounts">
      <div>
        <div class="amt-label">Debt</div>
        <div class="amt-value">${formatKsh(total)}</div>
      </div>
      <div>
        <div class="amt-label">Paid</div>
        <div class="amt-value paid">${formatKsh(paid)}</div>
      </div>
      <div>
        <div class="amt-label">Remaining</div>
        <div class="amt-value remaining">${formatKsh(remaining)}</div>
      </div>
    </div>
    <div class="debt-card-foot">
      <span>${formatDate(debt.date)}</span>
      <span>${escapeHtml(debt.note || "")}</span>
    </div>
  `;

  el.addEventListener("click", () => navigate("debt-details", { debtId: debt.id }));
  return el;
}