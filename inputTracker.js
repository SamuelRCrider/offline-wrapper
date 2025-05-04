const FORM_KEY = "__offline_form_inputs__";

export class InputTracker {
  constructor() {
    this.restore();

    document.addEventListener("input", (e) => {
      if (
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      )
        return;
      this.save(e.target);
    });

    // Listen for form submissions to clear saved inputs
    document.addEventListener("submit", (e) => {
      if (e.target instanceof HTMLFormElement) {
        this.clearFormInputs(e.target);
      }
    });
  }

  save(el) {
    const inputs = JSON.parse(localStorage.getItem(FORM_KEY) || "{}");
    const key = this.keyFor(el);
    inputs[key] = el.value;
    localStorage.setItem(FORM_KEY, JSON.stringify(inputs));
  }

  restore() {
    const inputs = JSON.parse(localStorage.getItem(FORM_KEY) || "{}");
    for (const [key, val] of Object.entries(inputs)) {
      const el = document.querySelector(`[data-offline-id="${key}"]`);
      if (el) el.value = val;
    }
  }

  clearFormInputs(form) {
    const inputs = JSON.parse(localStorage.getItem(FORM_KEY) || "{}");
    let changed = false;

    form.querySelectorAll("input, textarea").forEach((el) => {
      const key = el.dataset.offlineId;
      if (key && inputs[key]) {
        delete inputs[key];
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(FORM_KEY, JSON.stringify(inputs));
    }
  }

  // Cleanup old stored values (older than maxAge in ms)
  cleanupOldEntries(maxAge = 7 * 24 * 60 * 60 * 1000) {
    // Default 7 days
    try {
      const inputs = JSON.parse(localStorage.getItem(FORM_KEY) || "{}");

      // Check for elements that no longer exist in the DOM
      Object.keys(inputs).forEach((key) => {
        if (!document.querySelector(`[data-offline-id="${key}"]`)) {
          delete inputs[key];
        }
      });

      localStorage.setItem(FORM_KEY, JSON.stringify(inputs));
    } catch (err) {
      console.error("[OfflineLayer] Error cleaning up inputs:", err);
    }
  }

  keyFor(el) {
    if (!el.dataset.offlineId) {
      el.dataset.offlineId = crypto.randomUUID();
    }
    return el.dataset.offlineId;
  }
}
