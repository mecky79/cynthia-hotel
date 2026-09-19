import { formatKsh, formatDate, escapeHtml } from "../utils.js";
import { getDebt, getCustomer } from "../state.js";
import { navigate } from "../state.js";

export function paymentItem(payment, { showCustomer = true, showDebt = false } = {}) {
  const debt = getDebt(payment.debtId);
  const customer = debt ? getCustomer(debt.customerId) : null;

  const el = document.createElement("div");
  el.className = "payment-item" + (payment.voided ? " voided" : "");
  el.innerHTML = `
    <div class="pi-icon">${payment.voided ? "×" : "✓"}</div>
    <div class="pi-main">
      <div class="pi-title">
        ${showCustomer ? escapeHtml(customer ? customer.name : "Unknown") : escapeHtml(payment.method)}
      </div>
      <div class="pi-sub">
        ${formatDate(payment.date)} · ${escapeHtml(payment.method)}
        ${payment.recordedBy ? ` · by ${escapeHtml(payment.recordedBy)}` : ""}
        ${payment.voided ? ' · <span class="badge badge-voided">Voided</span>' : ""}
      </div>
    </div>
    <div class="pi-amount">${formatKsh(payment.amount)}</div>
  `;

  if (debt) {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => navigate("debt-details", { debtId: debt.id }));
  }

  return el;
}