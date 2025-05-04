// network.js
const CONNECTIVITY_CHECK_URL = "https://www.gstatic.com/generate_204";
let lastConnectivityState = navigator.onLine;
let callbacks = [];

// More reliable online check using fetch
export async function checkConnectivity() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(CONNECTIVITY_CHECK_URL, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true;
  } catch (e) {
    return false;
  }
}

// Register for online event
export function onReconnect(callback) {
  if (typeof callback === "function") {
    callbacks.push(callback);
  }

  // Only setup listeners once
  if (callbacks.length === 1) {
    setupConnectivityListeners();
  }
}

// Remove a callback
export function offReconnect(callback) {
  callbacks = callbacks.filter((cb) => cb !== callback);
}

// Setup listeners for connectivity changes
function setupConnectivityListeners() {
  // Listen for online/offline events
  window.addEventListener("online", checkAndNotify);
  window.addEventListener("offline", () => {
    lastConnectivityState = false;
  });

  // Periodically check connectivity while the page is open
  setInterval(checkAndNotify, 30000);
}

// Check actual connectivity and notify if state changed
async function checkAndNotify() {
  const isConnected = await checkConnectivity();

  // Only trigger when state changes from offline to online
  if (isConnected && !lastConnectivityState) {
    callbacks.forEach((callback) => {
      try {
        callback();
      } catch (e) {
        console.error("[OfflineLayer] Error in reconnect callback:", e);
      }
    });
  }

  lastConnectivityState = isConnected;
}

// Public API to check if we're online
export function isOnline() {
  return lastConnectivityState;
}

// Initialize connectivity state
checkAndNotify();
