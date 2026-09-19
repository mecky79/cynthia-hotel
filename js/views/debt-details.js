import {
  getState, subscribe, navigate, getDebt, getCustomer,
  getPaymentsForDebt, getChargesForDebt, calculateDebtPaid, calculateDebtRemaining,
  calculateDebtTotal, calculateDebtStatus, statusLabel, statusBadgeClass,
  archiveDebt, unarchiveDebt, recordPayment, voidPayment, addCharge, updateDebt
} from "../state.js";
import { formatKsh, formatDate, formatDateTime, todayISO, parseAmountInput, escapeHtml } from "../utils.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";

export function renderDebtDetails(params) {
  const wrap = document.createElement("div");
  const debtId = params && params.debtId;

  function update() {
    const state = getState();
    const debt = getDebt(debtId);
    wrap.innerHTML = "";

    if (!debt) {
      wrap.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">Debt not found</div>
          <div class="empty-text">It may have been removed.</div>
          <button class="btn btn-primary" style="margin-top:16px;" id="back">Back to Debts</button>
        </div>
      `;
      wrap.querySelector("#back").addEventListener("click", () => navigate("debts"));
      return;
    }

    const customer = getCustomer(debt.customerId);
    const total = calculateDebtTotal(debt.id);
    const paid = calculateDebtPaid(debt.id);
    const remaining = calculateDebtRemaining(debt.id);
    const status = calculateDebtStatus(debt.id);
    const payments = getPaymentsForDebt(debt.id);
    const charges = getChargesForDebt(debt.id);

    // Combined activity feed — every top-up and every payment, newest first.
    const activity = [
      ...payments.map(p => ({ kind: "payment", ts: new Date(p.recordedAt || p.date).getTime(), data: p })),
      ...charges.map(c => ({ kind: "charge", ts: new Date(c.recordedAt || c.date).getTime(), data: c }))
    ].sort((a, b) => b.ts - a.ts);

    // Header
    const header = document.createElement("div");
    header.className = "page-header";
    header.innerHTML = `
      <button class="btn btn-ghost btn-icon" id="back-btn" aria-label="Back">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div>
        <h1 class="page-title">Debt Details</h1>
        <div class="page-subtitle">Created ${formatDate(debt.createdAt || debt.date)}</div>
      </div>
      <div class="spacer"></div>
      <span class="badge ${statusBadgeClass(status)}">${statusLabel(status)}</span>
    `;
    wrap.appendChild(header);
    header.querySelector("#back-btn").addEventListener("click", () => navigate("debts"));

    // Customer hero
    const hero = document.createElement("div");
    hero.className = "detail-hero";
    hero.innerHTML = `
      <div class="dh-name">${escapeHtml(customer ? customer.name : "Unknown customer")}</div>
      <div class="dh-phone">${escapeHtml(customer ? customer.phone : "")}</div>
    `;
    wrap.appendChild(hero);

    // Balance panel
    const panel = document.createElement("div");
    panel.className = "balance-panel";
    panel.innerHTML = `
      <div>
        <div class="bp-label">Total Debt</div>
        <div class="bp-value">${formatKsh(total)}</div>
      </div>
      <div>
        <div class="bp-label">Total Paid</div>
        <div class="bp-value">${formatKsh(paid)}</div>
      </div>
      <div class="bp-full">
        <div class="bp-label">Remaining Balance</div>
        <div class="bp-value remaining">${formatKsh(remaining)}</div>
      </div>
    `;
    wrap.appendChild(panel);

    // Summary details
    const summary = document.createElement("section");
    summary.className = "section";
    summary.innerHTML = `
      <div class="section-header"><div class="section-title">Summary</div></div>
      <div class="section-body pad">
        <div class="kv-list">
          <div class="kv"><span class="k">Started</span><span class="v">${formatDate(debt.date)} · ${formatKsh(debt.total)}</span></div>
          <div class="kv"><span class="k">Status</span><span class="v">${statusLabel(status)}</span></div>
          ${debt.note ? `<div class="kv"><span class="k">Note</span><span class="v" style="max-width:60%; font-weight:500;">${escapeHtml(debt.note)}</span></div>` : ""}
        </div>
      </div>
    `;
    wrap.appendChild(summary);

    // Activity — debt top-ups and payments, in one running history
    const activitySection = document.createElement("section");
    activitySection.className = "section";
    activitySection.innerHTML = `
      <div class="section-header">
        <div class="section-title">Activity</div>
        <div class="spacer"></div>
        <span class="badge badge-method">${activity.length} record${activity.length === 1 ? "" : "s"}</span>
      </div>
    `;
    const activityBody = document.createElement("div");
    activityBody.className = "section-body";
    if (!activity.length) {
      activityBody.innerHTML = `<div class="empty-state"><div class="empty-title">No activity yet</div><div class="empty-text">Payments and any added debt will appear here.</div></div>`;
    } else {
      activity.forEach(entry => {
        const item = document.createElement("div");
        if (entry.kind === "payment") {
          const p = entry.data;
          item.className = "payment-item" + (p.voided ? " voided" : "");
          item.innerHTML = `
            <div class="pi-icon">${p.voided ? "×" : "✓"}</div>
            <div class="pi-main">
              <div class="pi-title">${formatKsh(p.amount)} paid · ${escapeHtml(p.method)}</div>
              <div class="pi-sub">
                ${formatDate(p.date)} · recorded by ${escapeHtml(p.recordedBy || "—")}
                ${p.voided ? ' · <span class="badge badge-voided">Voided</span>' : ""}
              </div>
              ${p.note ? `<div class="pi-sub">${escapeHtml(p.note)}</div>` : ""}
            </div>
            ${!p.voided ? `<button class="btn btn-ghost btn-sm" data-void="${p.id}">Void</button>` : ""}
          `;
        } else {
          const c = entry.data;
          item.className = "payment-item";
          item.innerHTML = `
            <div class="pi-icon" style="background:var(--primary-soft); color:var(--primary);">+</div>
            <div class="pi-main">
              <div class="pi-title">${formatKsh(c.amount)} added to debt</div>
              <div class="pi-sub">${formatDate(c.date)} · recorded by ${escapeHtml(c.recordedBy || "—")}</div>
              ${c.note ? `<div class="pi-sub">${escapeHtml(c.note)}</div>` : ""}
            </div>
          `;
        }
        activityBody.appendChild(item);
      });
    }
    activitySection.appendChild(activityBody);
    wrap.appendChild(activitySection);

    // Actions
    const actions = document.createElement("div");
    actions.className = "sticky-actions";
    const canPay = status !== "paid" && status !== "archived";
    const canAddDebt = status !== "archived";
    actions.innerHTML = `
      <button class="btn btn-secondary" id="archive-btn">${debt.archived ? "Unarchive" : "Archive"}</button>
      <button class="btn btn-secondary" id="edit-btn">Edit</button>
      <button class="btn btn-secondary" id="add-debt-btn" ${canAddDebt ? "" : "disabled"}>Add Debt</button>
      <button class="btn btn-primary" id="pay-btn" ${canPay ? "" : "disabled"}>${status === "archived" ? "Archived" : (status === "paid" ? "Fully Paid" : "Record Payment")}</button>
    `;
    wrap.appendChild(actions);

    actions.querySelector("#pay-btn").addEventListener("click", () => {
      if (canPay) openRecordPayment(debt, () => update());
    });
    actions.querySelector("#add-debt-btn").addEventListener("click", () => {
      if (canAddDebt) openAddCharge(debt, () => update());
    });
    actions.querySelector("#edit-btn").addEventListener("click", () => openEditDebt(debt, () => update()));
    actions.querySelector("#archive-btn").addEventListener("click", async () => {
      if (debt.archived) { unarchiveDebt(debt.id); toast("Debt restored.", "success"); }
      else {
        const ok = await confirmModal({
          title: "Archive Debt",
          message: "Archiving hides this debt from active lists. You can unarchive it later.",
          confirmLabel: "Archive",
          destructive: true
        });
        if (ok) { archiveDebt(debt.id); toast("Debt archived.", "success"); }
      }
      update();
    });

    wrap.querySelectorAll("[data-void]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const ok = await confirmModal({
          title: "Void Payment",
          message: "This payment will no longer count toward the debt balance.",
          confirmLabel: "Void Payment",
          destructive: true
        });
        if (ok) { voidPayment(btn.dataset.void); toast("Payment voided.", "warning"); update(); }
      });
    });
  }

  update();
  subscribe(update);
  return wrap;
}

// ---------- Edit debt modal (corrects the starting amount/date/note) ----------

function openEditDebt(debt, onDone) {
  const body = document.createElement("div");
  body.className = "stack";
  body.innerHTML = `
    <div class="field">
      <label>Starting amount (KSh)</label>
      <div class="amount-input-wrap">
        <span class="currency">KSh</span>
        <input class="input" id="edit-total" inputmode="numeric" value="${debt.total}" />
      </div>
      <div class="hint">To add more debt on top of this later, use "Add Debt" instead of editing here.</div>
    </div>
    <div class="field">
      <label>Date</label>
      <input class="input" id="edit-date" type="date" value="${debt.date}" />
    </div>
    <div class="field">
      <label>Note</label>
      <textarea class="textarea" id="edit-note">${escapeHtml(debt.note || "")}</textarea>
    </div>
  `;

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.gap = "12px";
  footer.style.width = "100%";
  footer.innerHTML = `
    <button class="btn btn-secondary" data-cancel style="flex:1;">Cancel</button>
    <button class="btn btn-primary" data-save style="flex:1;">Save Changes</button>
  `;

  const m = openModal({ title: "Edit Debt", body, footer });

  const totalInput = body.querySelector("#edit-total");
  totalInput.addEventListener("input", () => {
    const v = parseAmountInput(totalInput.value);
    totalInput.value = v ? v.toString() : "";
  });

  footer.querySelector("[data-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-save]").addEventListener("click", () => {
    const newBaseTotal = parseAmountInput(totalInput.value);
    const newDate = body.querySelector("#edit-date").value;
    const newNote = body.querySelector("#edit-note").value.trim();

    if (!newBaseTotal) { toast("Starting amount must be greater than zero.", "error"); return; }
    if (!newDate) { toast("Please pick a date.", "error"); return; }

    // Guard: the combined total (this + any charges already added) can't
    // drop below what's already been paid.
    const paid = calculateDebtPaid(debt.id);
    const chargesSum = calculateDebtTotal(debt.id) - debt.total;
    if (newBaseTotal + chargesSum < paid) {
      toast(`Total cannot be less than amount already paid (${formatKsh(paid)}).`, "error");
      return;
    }

    updateDebt(debt.id, { total: newBaseTotal, date: newDate, note: newNote });
    toast("Debt updated.", "success");
    m.close();
    if (onDone) onDone();
  });
}

// ---------- Add Debt modal (tops up an existing debt, keeps a record) ----------

function openAddCharge(debt, onDone) {
  const customer = getCustomer(debt.customerId);
  const currentTotal = calculateDebtTotal(debt.id);

  const body = document.createElement("div");
  body.className = "stack";
  body.innerHTML = `
    <div class="card card-pad" style="background:var(--surface-2);">
      <div class="kv-list">
        <div class="kv"><span class="k">Customer</span><span class="v">${escapeHtml(customer ? customer.name : "—")}</span></div>
        <div class="kv"><span class="k">Current total</span><span class="v">${formatKsh(currentTotal)}</span></div>
      </div>
    </div>

    <div class="field">
      <label for="charge-amount">Amount to add (KSh)</label>
      <div class="amount-input-wrap">
        <span class="currency">KSh</span>
        <input class="input" id="charge-amount" inputmode="numeric" placeholder="0" />
      </div>
      <div class="hint" id="charge-hint">Enter how much more is owed</div>
      <div class="error" id="charge-err" style="display:none;"></div>
    </div>

    <div class="field">
      <label for="charge-date">Date</label>
      <input class="input" id="charge-date" type="date" value="${todayISO()}" />
    </div>

    <div class="field">
      <label for="charge-note">Note (optional)</label>
      <textarea class="textarea" id="charge-note" placeholder="What was added, reference…"></textarea>
    </div>
  `;

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.gap = "12px";
  footer.style.width = "100%";
  footer.innerHTML = `
    <button class="btn btn-secondary" data-cancel style="flex:1;">Cancel</button>
    <button class="btn btn-primary" data-save style="flex:1;">Add Debt</button>
  `;

  const m = openModal({ title: "Add Debt", body, footer });

  const amtInput = body.querySelector("#charge-amount");
  const hint = body.querySelector("#charge-hint");
  const errEl = body.querySelector("#charge-err");

  amtInput.addEventListener("input", () => {
    const v = parseAmountInput(amtInput.value);
    amtInput.value = v ? v.toString() : "";
    hint.textContent = v ? `New total will be ${formatKsh(currentTotal + v)}` : "Enter how much more is owed";
  });

  footer.querySelector("[data-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-save]").addEventListener("click", () => {
    const amount = parseAmountInput(amtInput.value);
    const date = body.querySelector("#charge-date").value;
    const note = body.querySelector("#charge-note").value.trim();

    if (!amount) { errEl.textContent = "Enter an amount greater than zero."; errEl.style.display = "block"; return; }
    if (!date) { errEl.textContent = "Pick a date."; errEl.style.display = "block"; return; }

    addCharge({ debtId: debt.id, amount, date, note });
    toast(`${formatKsh(amount)} added — new total ${formatKsh(currentTotal + amount)}.`, "success");
    m.close();
    if (onDone) onDone();
  });
}

// ---------- Record payment modal ----------

function openRecordPayment(debt, onDone) {
  const customer = getCustomer(debt.customerId);
  const total = calculateDebtTotal(debt.id);
  const paid = calculateDebtPaid(debt.id);
  const remaining = calculateDebtRemaining(debt.id);

  const body = document.createElement("div");
  body.className = "stack";
  body.innerHTML = `
    <div class="card card-pad" style="background:var(--surface-2);">
      <div class="kv-list">
        <div class="kv"><span class="k">Customer</span><span class="v">${escapeHtml(customer ? customer.name : "—")}</span></div>
        <div class="kv"><span class="k">Total debt</span><span class="v">${formatKsh(total)}</span></div>
        <div class="kv"><span class="k">Already paid</span><span class="v text-success">${formatKsh(paid)}</span></div>
        <div class="kv"><span class="k">Remaining</span><span class="v text-danger">${formatKsh(remaining)}</span></div>
      </div>
    </div>

    <div class="field">
      <label for="pay-amount">Payment amount (KSh)</label>
      <div class="amount-input-wrap">
        <span class="currency">KSh</span>
        <input class="input" id="pay-amount" inputmode="numeric" placeholder="0" />
      </div>
      <div class="hint" id="pay-hint">Maximum allowed: ${formatKsh(remaining)}</div>
      <div class="error" id="pay-err" style="display:none;"></div>
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button class="btn btn-secondary btn-sm" id="pay-full">Pay full remaining</button>
        <button class="btn btn-secondary btn-sm" id="pay-half">Half</button>
      </div>
    </div>

    <div class="field">
      <label for="pay-date">Payment date</label>
      <input class="input" id="pay-date" type="date" value="${todayISO()}" />
    </div>

    <div class="field">
      <label for="pay-method">Payment method</label>
      <select class="select" id="pay-method">
        <option>Cash</option>
        <option>M-Pesa</option>
        <option>Bank</option>
        <option>Cheque</option>
        <option>Card</option>
      </select>
    </div>

    <div class="field">
      <label for="pay-note">Note (optional)</label>
      <textarea class="textarea" id="pay-note" placeholder="Reference, receipt number…"></textarea>
    </div>
  `;

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.gap = "12px";
  footer.style.width = "100%";
  footer.innerHTML = `
    <button class="btn btn-secondary" data-cancel style="flex:1;">Cancel</button>
    <button class="btn btn-primary" data-save style="flex:1;">Record Payment</button>
  `;

  const m = openModal({ title: "Record Payment", body, footer });

  const amtInput = body.querySelector("#pay-amount");
  const hint = body.querySelector("#pay-hint");
  const errEl = body.querySelector("#pay-err");

  function refreshHint() {
    const v = parseAmountInput(amtInput.value);
    if (!v) { hint.textContent = `Maximum allowed: ${formatKsh(remaining)}`; hint.style.color = ""; }
    else if (v > remaining) { hint.textContent = `Too much — max ${formatKsh(remaining)}`; hint.style.color = "var(--danger)"; }
    else { hint.textContent = `Will leave ${formatKsh(remaining - v)} outstanding`; hint.style.color = ""; }
  }

  amtInput.addEventListener("input", () => {
    const v = parseAmountInput(amtInput.value);
    amtInput.value = v ? v.toString() : "";
    refreshHint();
  });

  body.querySelector("#pay-full").addEventListener("click", () => {
    amtInput.value = String(remaining); refreshHint();
  });
  body.querySelector("#pay-half").addEventListener("click", () => {
    amtInput.value = String(Math.floor(remaining / 2)); refreshHint();
  });

  footer.querySelector("[data-cancel]").addEventListener("click", () => m.close());
  footer.querySelector("[data-save]").addEventListener("click", () => {
    const amount = parseAmountInput(amtInput.value);
    const date = body.querySelector("#pay-date").value;
    const method = body.querySelector("#pay-method").value;
    const note = body.querySelector("#pay-note").value.trim();

    if (!amount) { errEl.textContent = "Enter an amount."; errEl.style.display = "block"; return; }
    if (amount > remaining) {
      errEl.textContent = `Amount cannot exceed remaining balance (${formatKsh(remaining)}).`;
      errEl.style.display = "block"; return;
    }
    if (!date) { errEl.textContent = "Pick a payment date."; errEl.style.display = "block"; return; }

    recordPayment({ debtId: debt.id, amount, date, method, note });
    toast(`Payment of ${formatKsh(amount)} recorded.`, "success");
    m.close();
    if (onDone) onDone();
  });
}

