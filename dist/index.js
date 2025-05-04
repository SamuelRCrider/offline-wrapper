// index.js
import { LocalCache } from "./cache.js";
import { SyncQueue } from "./queue.js";
import { patchXHR, unpatchXHR } from "./xhr.js";
import { onReconnect, isOnline, offReconnect } from "./network.js";
import { fakeResponse } from "./util.js";
import { InputTracker } from "./inputTracker.js";
import { StatusUI } from "./statusUI.js";

export class OfflineLayer {
  constructor(options = {}) {
    this.options = {
      autoSync: true,
      showUI: true,
      autoHideUI: true,
      maxRetries: 3,
      ...options,
    };

    // Initialize components
    this.cache = new LocalCache();
    this.queue = new SyncQueue();
    patchXHR(this.queue);
    this.inputs = new InputTracker();

    if (this.options.showUI) {
      this.ui = new StatusUI({
        autoHide: this.options.autoHideUI,
        queueRef: this.queue,
        cacheRef: this.cache,
      });
    }

    // Handle online/offline events
    this.setupNetworkListeners();

    // Setup fetch interception
    this.interceptFetch();

    // Perform initial cleanup
    this.performMaintenance();

    // Set interval for maintenance
    this.maintenanceInterval = setInterval(() => {
      this.performMaintenance();
    }, 24 * 60 * 60 * 1000); // Once a day
  }

  setupNetworkListeners() {
    // Set initial status
    if (this.ui) {
      this.ui.setText(
        navigator.onLine ? "🟢 Online" : "🔴 Offline – Cached Mode"
      );
    }

    // Custom reconnection handling with retry logic
    onReconnect(async () => {
      if (this.ui) {
        this.ui.setSyncing();
      }

      if (this.options.autoSync) {
        let attempt = 0;
        let success = false;

        while (attempt < this.options.maxRetries && !success) {
          try {
            const result = await this.queue.flush();
            if (result && result.success) {
              success = true;
            } else {
              attempt++;
              // Wait before retry
              await new Promise((resolve) =>
                setTimeout(resolve, 2000 * attempt)
              );
            }
          } catch (err) {
            console.error("[OfflineLayer] Sync error:", err);
            attempt++;
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
          }
        }

        if (success && this.ui) {
          this.ui.setOnline();
        } else if (this.ui) {
          this.ui.setError(`Sync failed after ${attempt} attempts`);
        }
      }
    });

    // Basic online/offline handling
    window.addEventListener("offline", () => {
      if (this.ui) this.ui.setOffline();
    });

    window.addEventListener("online", () => {
      if (this.ui) this.ui.setSyncing();
    });
  }

  interceptFetch() {
    const originalFetch = window.fetch;

    // Store original fetch for cleanup
    window.fetch.__originalFetch = originalFetch;

    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const method = options.method?.toUpperCase() || "GET";

      if (isOnline()) {
        try {
          const response = await originalFetch(...args);

          if (method === "GET" && response.ok) {
            this.cache
              .store(args, response.clone())
              .catch((err) =>
                console.error("[OfflineLayer] Error caching response:", err)
              );
          }

          return response;
        } catch (err) {
          console.warn("[OfflineLayer] Fetch error in online mode:", err);

          if (method !== "GET") {
            this.queue.enqueue(args);
            if (this.ui) this.ui.setText("Request queued for later");
          }

          // Try to get from cache even in online mode if the fetch fails
          if (method === "GET") {
            const cached = await this.cache.match(args);
            if (cached) return cached;
          }

          return fakeResponse(
            `Request ${method !== "GET" ? "queued" : "failed"}`
          );
        }
      } else {
        // Offline mode
        if (method === "GET") {
          const cached = await this.cache.match(args);
          if (cached) return cached;
        }

        if (method !== "GET") {
          this.queue.enqueue(args);
          if (this.ui) this.ui.setText("Request queued for when online");
        }

        return fakeResponse("Offline mode");
      }
    };
  }

  performMaintenance() {
    // Clean up input tracker periodically
    if (this.inputs) {
      this.inputs.cleanupOldEntries();
    }

    // Could add more maintenance tasks here
  }

  // Public API
  async syncNow() {
    if (!isOnline()) {
      console.warn("[OfflineLayer] Cannot sync while offline");
      return false;
    }

    if (this.ui) this.ui.setSyncing();

    try {
      const result = await this.queue.flush();
      if (this.ui) {
        if (result.success) {
          this.ui.setOnline();
        } else {
          this.ui.setError(`Synced ${result.remaining} items remaining`);
        }
      }
      return result.success;
    } catch (err) {
      console.error("[OfflineLayer] Manual sync error:", err);
      if (this.ui) this.ui.setError();
      return false;
    }
  }

  destroy() {
    // Clean up intervals
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
    }

    // Remove UI
    if (this.ui) {
      this.ui.destroy();
    }

    // Restore original XMLHttpRequest
    unpatchXHR();

    // Restore original fetch
    if (window.fetch.__originalFetch) {
      window.fetch = window.fetch.__originalFetch;
    }

    // Remove network reconnect listeners
    offReconnect();
  }
}
