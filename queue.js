// queue.js
const QUEUE_KEY = 'offline-layer-queue';

export class SyncQueue {
  constructor() {
    const saved = localStorage.getItem(QUEUE_KEY);
    this.queue = saved ? JSON.parse(saved) : [];
  }

  enqueue(requestArgs) {
    console.log('[OfflineLayer] Queued request', requestArgs);
    this.queue.push(requestArgs);
    this.persist();
  }

  async flush() {
    console.log('[OfflineLayer] Flushing queued requests...');
    const newQueue = [];

    for (const args of this.queue) {
      try {
        await fetch(...args); // try to replay
        console.log('[OfflineLayer] Replayed:', args);
      } catch (err) {
        console.warn('[OfflineLayer] Failed to replay, keeping in queue:', args);
        newQueue.push(args);
      }
    }

    this.queue = newQueue;
    this.persist();
  }

  persist() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
  }
}

