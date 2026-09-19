import { navigate, addDebt, getState } from "../state.js";
import { toast } from "../components/toast.js";
import { todayISO, parseAmountInput, formatKsh, escapeHtml } from "../utils.js";

export function renderAddDebt() {
  const wrap = document.createElement("div");
  const state = getState();
  const customers = [...state.customers].sort((a, b) => a.name.localeCompare(b.name));

  wrap.innerHTML = `
    <div class="page-header">
      <button class="btn btn-ghost btn-icon" id="back-btn" aria-label="Back">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div>
        <h1 class="page-title">Add Debt</h1>
        <div class="page-subtitle">Record a new amount owed to the hotel</div>
      </div>
    </div>

    <section class="section">
      <form id="add-debt-form" class="section-body pad" novalidate>
        <div class="form-grid">
          <div class="field full">
            <label for="cust-name">Customer name</label>
            <input class="input" id="cust-name" name="customerName" list="cust-list" placeholder="e.g. Mary Wanjiku" autocomplete="off" required />
            <datalist id="cust-list">
              ${customers.map(c => `<option value="${escapeHtml(c.name)}"></option>`).join("")}
            </datalist>
            <div class="error" data-err="customerName" style="display:none;"></div>
          </div>

          <div class="field">
            <label for="cust-phone">Customer phone</label>
            <input class="input" id="cust-phone" name="customerPhone" placeholder="07XX XXX XXX" autocomplete="off" />
            <div class="error" data-err="customerPhone" style="display:none;"></div>
          </div>

          <div class="field">
            <label for="debt-date">Date</label>
            <input class="input" id="debt-date" name="date" type="date" value="${todayISO()}" />
            <div class="error" data-err="date" style="display:none;"></div>
          </div>

          <div class="field full">
            <label for="debt-total">Total debt</label>
            <div class="amount-input-wrap">
              <span class="currency">KSh</span>
              <input class="input" id="debt-total" name="total" inputmode="numeric" placeholder="0" autocomplete="off" required />
            </div>
            <div class="hint" id="amount-preview">Enter amount in whole shillings</div>
            <div class="error" data-err="total" style="display:none;"></div>
          </div>

          <div class="field full">
            <label for="debt-note">Note (optional)</label>
            <textarea class="textarea" id="debt-note" name="note" placeholder="Reason, context, or reference…"></textarea>
          </div>
        </div>
      </form>

      <div class="sticky-actions">
        <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="save-btn">Save Debt</button>
      </div>
    </section>
  `;

  const form = wrap.querySelector("#add-debt-form");
  const totalInput = wrap.querySelector("#debt-total");
  const preview = wrap.querySelector("#amount-preview");

  totalInput.addEventListener("input", () => {
    const v = parseAmountInput(totalInput.value);
    totalInput.value = v ? v.toString() : "";
    preview.textContent = v ? `Will be saved as ${formatKsh(v)}` : "Enter amount in whole shillings";
  });

  wrap.querySelector("#back-btn").addEventListener("click", () => history.length ? history.back() : navigate("debts"));
  wrap.querySelector("#cancel-btn").addEventListener("click", () => navigate("debts"));

  wrap.querySelector("#save-btn").addEventListener("click", () => {
    if (!validate(form)) return;

    const fd = new FormData(form);
    const customerName = (fd.get("customerName") || "").toString().trim();
    const customerPhone = (fd.get("customerPhone") || "").toString().trim();
    const total = parseAmountInput(fd.get("total"));
    const date = (fd.get("date") || todayISO()).toString();
    const note = (fd.get("note") || "").toString().trim();

    const debt = addDebt({ customerName, customerPhone, total, date, note });
    toast("Debt saved.", "success");
    navigate("debt-details", { debtId: debt.id });
  });

  return wrap;
}

function validate(form) {
  let ok = true;
  const clear = (name) => {
    const input = form.querySelector(`[name="${name}"]`);
    const err = form.querySelector(`[data-err="${name}"]`);
    input.classList.remove("invalid");
    err.style.display = "none";
  };
  const fail = (name, message) => {
    ok = false;
    const input = form.querySelector(`[name="${name}"]`);
    const err = form.querySelector(`[data-err="${name}"]`);
    input.classList.add("invalid");
    err.textContent = message;
    err.style.display = "block";
  };

  ["customerName", "customerPhone", "total", "date"].forEach(clear);

  const name = form.querySelector('[name="customerName"]').value.trim();
  if (!name) fail("customerName", "Customer name is required.");
  else if (name.length < 2) fail("customerName", "Name looks too short.");

  const phone = form.querySelector('[name="customerPhone"]').value.trim();
  if (phone && phone.replace(/\D/g, "").length < 9) fail("customerPhone", "Phone looks invalid.");

  const total = parseAmountInput(form.querySelector('[name="total"]').value);
  if (!total) fail("total", "Enter an amount greater than zero.");
  else if (total > 10_000_000) fail("total", "That amount is unrealistically large.");

  const date = form.querySelector('[name="date"]').value;
  if (!date) fail("date", "Date is required.");

  return ok;
}