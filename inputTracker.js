const FORM_KEY = '__offline_form_inputs__';

export class InputTracker {
  constructor() {
    this.restore();

    document.addEventListener('input', (e) => {
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) return;
      this.save(e.target);
    });
  }

  save(el) {
    const inputs = JSON.parse(localStorage.getItem(FORM_KEY) || '{}');
    const key = this.keyFor(el);
    inputs[key] = el.value;
    localStorage.setItem(FORM_KEY, JSON.stringify(inputs));
  }

  restore() {
    const inputs = JSON.parse(localStorage.getItem(FORM_KEY) || '{}');
    for (const [key, val] of Object.entries(inputs)) {
      const el = document.querySelector(`[data-offline-id="${key}"]`);
      if (el) el.value = val;
    }
  }

  keyFor(el) {
    if (!el.dataset.offlineId) {
      el.dataset.offlineId = crypto.randomUUID();
    }
    return el.dataset.offlineId;
  }
}

