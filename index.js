// index.js
import { LocalCache } from './cache.js';
import { SyncQueue } from './queue.js';
import { patchXHR } from './xhr.js';
import { onReconnect, isOnline } from './network.js';
import { fakeResponse } from './utils.js';
import { InputTracker } from './inputTracker.js';

export class OfflineLayer {
  constructor() {
    this.cache = new LocalCache();
    this.queue = new SyncQueue();
    patchXHR(this.queue);
    this.inputs = new InputTracker();
    this.ui = new StatusUI(
      {
        autoHide: true,
        queueRef: this.queue,
        cacheRef: this.cache,
      }
    );

    this.ui.setText(navigator.onLine ? '🟢 Online' : '🔴 Offline – Cached Mode');

    this.interceptFetch();
    onReconnect(() => {
      this.ui.setSyncing();
      this.queue.flush().then(() => {
        this.ui.setOnline();
      }).catch(() => {
        this.ui.setError();
      });
    });

    window.addEventListener('offline', () => this.ui.setOffline());
    window.addEventListener('online', () => this.ui.setSyncing());
  }

  interceptFetch() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const method = options.method?.toUpperCase() || 'GET';

      if (isOnline()) {
        try {
          const response = await originalFetch(...args);

          if (method === 'GET') {
            this.cache.store(args, response.clone());
          }

          return response;
        } catch (err) {
          if (method !== 'GET') this.queue.enqueue(args);
          return fakeResponse();
        }
      } else {
        if (method === 'GET') {
          const cached = await this.cache.match(args);
          if (cached) return cached;
        }

        if (method !== 'GET') {
          this.queue.enqueue(args);
        }

        return fakeResponse();
      }
    };
  }
}

