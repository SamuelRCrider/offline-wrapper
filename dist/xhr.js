import { isOnline } from "./network.js";

export function patchXHR(queue) {
  const OriginalXHR = window.XMLHttpRequest;

  // Store the original constructor for cleanup later
  if (!window.XMLHttpRequest.__original) {
    window.XMLHttpRequest.__original = OriginalXHR;
  }

  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    let method = "GET";
    let url = "";
    let requestHeaders = {};
    let requestBody = null;

    // Patch the open method
    const open = xhr.open;
    xhr.open = function (_method, _url, ...rest) {
      method = _method.toUpperCase();
      url = _url;
      open.call(this, _method, _url, ...rest);
    };

    // Patch setRequestHeader to track headers
    const setRequestHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function (name, value) {
      requestHeaders[name] = value;
      return setRequestHeader.call(this, name, value);
    };

    // Patch the send method
    const send = xhr.send;
    xhr.send = function (body) {
      requestBody = body;

      // Handle offline case for non-GET requests
      if (!isOnline() && method !== "GET") {
        try {
          console.log("[OfflineLayer] Queued XHR request:", method, url);

          // Build fetch-like request for queue
          const options = {
            method,
            headers: requestHeaders,
            body: requestBody,
          };

          queue.enqueue([url, options]);

          // Mock the response
          this.readyState = 4;
          this.status = 202;
          this.statusText = "Accepted (Offline)";
          this.responseText = JSON.stringify({
            message: "Offline. Request queued.",
            queued: true,
            timestamp: Date.now(),
          });

          // Trigger callbacks
          this.onreadystatechange?.();
          this.onload?.();
        } catch (err) {
          console.error("[OfflineLayer] Error queueing XHR:", err);

          // Trigger error callback
          this.status = 0;
          this.statusText = "Error";
          this.onerror?.(new Error("Failed to queue offline request"));
        }
      } else {
        // Normal operation when online
        send.call(this, body);
      }
    };

    return xhr;
  };
}

// Helper function to restore original XHR
export function unpatchXHR() {
  if (window.XMLHttpRequest.__original) {
    window.XMLHttpRequest = window.XMLHttpRequest.__original;
    delete window.XMLHttpRequest.__original;
  }
}
