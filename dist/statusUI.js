import { isOnline } from "./network.js";

// statusUI.js
export class StatusUI {
  constructor({
    autoHide = false,
    hideDelay = 3000,
    queueRef = null,
    cacheRef = null,
  } = {}) {
    this.autoHide = autoHide;
    this.hideDelay = hideDelay;
    this.queue = queueRef;
    this.cache = cacheRef;
    this.initialized = false;

    // Create elements but don't attach yet
    this.createElements();

    // Initialize when document is ready
    if (document.body) {
      this.attachElements();
    } else {
      // Wait for document.body to be available
      document.addEventListener("DOMContentLoaded", () =>
        this.attachElements()
      );
      // Fallback for late initialization
      setTimeout(() => {
        if (!this.initialized && document.body) this.attachElements();
      }, 1000);
    }
  }

  createElements() {
    // Create status element
    this.el = document.createElement("div");
    this.el.style.cssText = `
      position: fixed;
      bottom: 12px;
      right: 12px;
      min-width: 180px;
      padding: 10px 16px;
      border-radius: 8px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      color: white;
      background: #333;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      z-index: 9999;
      cursor: pointer;
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    this.el.innerText = "OfflineLayer: status";
    this.el.onclick = () => this.toggleDrawer();

    // Create drawer
    this.drawer = document.createElement("div");
    this.drawer.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 12px;
      width: 320px;
      max-height: 300px;
      overflow: auto;
      background: #1e1e1e;
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      z-index: 9998;
      display: none;
    `;
  }

  attachElements() {
    if (this.initialized || !document.body) return;

    // Append elements to the DOM
    document.body.appendChild(this.el);
    document.body.appendChild(this.drawer);

    // Set initial status
    this.setStatus({
      text: isOnline() ? "🟢 Online" : "🔴 Offline – Cached Mode",
      bg: isOnline() ? "#2e7d32" : "#c0392b",
    });

    this.initialized = true;
  }

  async renderDrawer() {
    const queueItems = this.queue?.queue || [];
    const cacheItems = this.cache ? await this.cache.allKeys() : [];

    this.drawer.innerHTML = `
      <div><strong>Status:</strong> ${isOnline() ? "Online" : "Offline"}</div>
      <hr style="border-color:#555;" />
      <div><strong>Queued Requests:</strong></div>
      <pre>${
        queueItems.map((req, i) => `${i + 1}. ${req[0]}`).join("\n") || "(none)"
      }</pre>
      <div><strong>Cached GET Keys:</strong></div>
      <pre>${cacheItems.join("\n") || "(none)"}</pre>
    `;
  }

  toggleDrawer() {
    if (this.drawer.style.display === "none") {
      this.renderDrawer();
      this.drawer.style.display = "block";
    } else {
      this.drawer.style.display = "none";
    }
  }

  setStatus({ text, bg }) {
    this.el.textContent = text;
    this.el.style.background = bg;

    if (this.autoHide && text.includes("Online")) {
      setTimeout(() => this.hide(), this.hideDelay);
    }
  }

  setOnline() {
    this.setStatus({
      text: "🟢 Online",
      bg: "#2e7d32",
    });
  }

  setOffline() {
    this.setStatus({
      text: "🔴 Offline – Cached Mode",
      bg: "#c0392b",
    });
  }

  setSyncing() {
    this.setStatus({
      text: "🟡 Syncing...",
      bg: "#f39c12",
    });
  }

  setError(message = "⚠️ Sync error") {
    this.setStatus({
      text: message,
      bg: "#d35400",
    });
  }

  hide() {
    this.el.style.opacity = "0";
    this.el.style.transform = "translateY(20px)";
  }

  destroy() {
    this.el.remove();
    this.drawer.remove();
  }
}
