// queue.js
const QUEUE_KEY = "offline-layer-queue";

export class SyncQueue {
  constructor() {
    try {
      const saved = localStorage.getItem(QUEUE_KEY);
      this.queue = saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error("[OfflineLayer] Error loading queue:", err);
      this.queue = [];
    }
  }

  enqueue(requestArgs) {
    if (!requestArgs || !Array.isArray(requestArgs)) {
      console.error("[OfflineLayer] Invalid request arguments:", requestArgs);
      return;
    }

    try {
      console.log("[OfflineLayer] Queued request", requestArgs);
      this.queue.push(requestArgs);
      this.persist();
    } catch (err) {
      console.error("[OfflineLayer] Error enqueueing request:", err);
    }
  }

  async flush() {
    console.log("[OfflineLayer] Flushing queued requests...");
    if (this.queue.length === 0) return Promise.resolve();

    const newQueue = [];
    const failures = [];

    try {
      for (const args of this.queue) {
        try {
          await fetch(...args); // try to replay
          console.log("[OfflineLayer] Replayed:", args);
        } catch (err) {
          console.warn(
            "[OfflineLayer] Failed to replay, keeping in queue:",
            args,
            err
          );
          failures.push({ args, error: err.message });
          newQueue.push(args);
        }
      }

      this.queue = newQueue;
      this.persist();

      return {
        success: this.queue.length === 0,
        remaining: this.queue.length,
        failures,
      };
    } catch (err) {
      console.error("[OfflineLayer] Error during flush:", err);
      return Promise.reject(err);
    }
  }

  persist() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (err) {
      console.error("[OfflineLayer] Error persisting queue:", err);
      // Could be quota exceeded
      if (err.name === "QuotaExceededError") {
        // Try to remove oldest items if storage is full
        while (this.queue.length > 0) {
          this.queue.shift();
          try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
            break;
          } catch (e) {
            if (this.queue.length === 0) break;
          }
        }
      }
    }
  }

  getQueueLength() {
    return this.queue.length;
  }
}
