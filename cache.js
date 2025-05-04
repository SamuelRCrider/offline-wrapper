// cache.js
const DB_NAME = "offline-layer-cache";
const STORE_NAME = "get-responses";

// TODO: Instead of a stubbed db, let's use redis

export class LocalCache {
  constructor() {
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = reject;
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore(STORE_NAME);
      };
    });
  }

  async store(requestArgs, response) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const key = JSON.stringify(requestArgs);

    // Clone before consuming
    const responseClone = response.clone();
    const body = await response.text(); // can be .json() later
    store.put(
      {
        body,
        headers: [...responseClone.headers],
        timestamp: Date.now(),
      },
      key
    );

    return tx.complete.catch((err) => {
      console.error("[OfflineLayer] Error storing in cache:", err);
    });
  }

  async match(requestArgs) {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const key = JSON.stringify(requestArgs);

      return new Promise((resolve) => {
        const req = store.get(key);
        req.onsuccess = () => {
          if (!req.result) return resolve(null);

          // Check if the cached item has expired
          if (this.isExpired(req.result)) {
            this.deleteItem(key).catch(console.error);
            return resolve(null);
          }

          const res = new Response(req.result.body, {
            headers: req.result.headers,
          });
          resolve(res);
        };
        req.onerror = (err) => {
          console.error("[OfflineLayer] Cache match error:", err);
          resolve(null);
        };
      });
    } catch (err) {
      console.error("[OfflineLayer] Error during cache match:", err);
      return null;
    }
  }

  async deleteItem(key) {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      return tx.complete;
    } catch (err) {
      console.error("[OfflineLayer] Error deleting cached item:", err);
      return Promise.reject(err);
    }
  }

  // Check if a cached item has expired (default 1 day)
  isExpired(item, maxAge = 24 * 60 * 60 * 1000) {
    if (!item.timestamp) return false; // No timestamp, assume not expired
    const now = Date.now();
    return now - item.timestamp > maxAge;
  }

  async allKeys() {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const keys = [];
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          keys.push(cursor.key);
          cursor.continue();
        } else {
          resolve(keys);
        }
      };
      req.onerror = () => resolve([]);
    });
  }
}
