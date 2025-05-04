// network.js
export function onReconnect(callback) {
  window.addEventListener('online', callback);
}

export function isOnline() {
  return navigator.onLine;
}

