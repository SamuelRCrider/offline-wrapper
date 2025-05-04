// cache.js
const DB_NAME = 'offline-layer-cache';
const STORE_NAME = 'get-responses';

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
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const key = JSON.stringify(requestArgs);
    const body = await response.clone().text(); // can be .json() later
    store.put({ body, headers: [...response.headers] }, key);
    await tx.complete;
  }

  async match(requestArgs) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const key = JSON.stringify(requestArgs);
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => {
        if (!req.result) return resolve(null);
        const res = new Response(req.result.body, {
          headers: req.result.headers
        });
        resolve(res);
      };
    });
  }
  async allKeys() {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAME, 'readonly');
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

