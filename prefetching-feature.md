# Prefetching Feature Implementation Plan

## Overview

The prefetching feature will allow users who anticipate going offline to proactively fetch and cache content from specified URLs. When offline, the library will serve this prefetched content instead of failing with network errors.

## User Experience Flow

1. User anticipates going offline (e.g., boarding a plane, entering an area with poor connectivity)
2. User calls the prefetch API with a list of URLs they want to access offline
3. The library aggressively prefetches these URLs and their dependencies
4. When the user goes offline, they can browse to these URLs normally
5. The library intercepts requests and serves the prefetched content from cache

## Technical Implementation Plan

### 1. Create Prefetch API

Add a new public method to the `OfflineLayer` class in `index.js`:

```javascript
async prefetchUrls(urls = [], options = {}) {
  const defaultOptions = {
    includeDependencies: true,  // Also fetch CSS, JS, images referenced in HTML
    depth: 1,                   // How deep to follow links (0 = just the URL, 1 = also fetch linked resources)
    progressCallback: null,     // Optional callback to report progress
    maxSize: 50 * 1024 * 1024   // 50MB default max size for prefetched content
  };

  const prefetchOptions = { ...defaultOptions, ...options };

  if (this.ui) {
    this.ui.setText("🔄 Prefetching content...");
  }

  try {
    // Implementation will call the prefetching module
    const result = await this.prefetcher.fetchUrls(urls, prefetchOptions);

    if (this.ui) {
      this.ui.setText(`✅ Prefetched ${result.count} resources (${Math.round(result.size / 1024)}KB)`);
      // Auto-hide UI after a few seconds if autoHideUI is enabled
      if (this.options.autoHideUI) {
        setTimeout(() => this.ui.hide(), 3000);
      }
    }

    return result;
  } catch (err) {
    console.error("[OfflineLayer] Prefetch error:", err);
    if (this.ui) {
      this.ui.setError("Prefetch failed");
    }
    return { success: false, error: err.message };
  }
}
```

### 2. Create Prefetcher Module

Create a new `prefetcher.js` file:

```javascript
// prefetcher.js
import { isOnline } from "./network.js";

export class Prefetcher {
  constructor(cache) {
    this.cache = cache;
    this.fetchedUrls = new Set();
    this.totalSize = 0;
  }

  async fetchUrls(urls, options) {
    if (!isOnline()) {
      throw new Error("Cannot prefetch while offline");
    }

    this.fetchedUrls.clear();
    this.totalSize = 0;

    // Track progress
    const total = urls.length;
    let completed = 0;

    // Process URLs one by one
    for (const url of urls) {
      try {
        await this.fetchUrl(url, options, 0);

        // Update progress
        completed++;
        if (options.progressCallback) {
          options.progressCallback({
            url,
            completed,
            total,
            size: this.totalSize,
          });
        }
      } catch (err) {
        console.warn(`[OfflineLayer] Failed to prefetch ${url}:`, err);
      }

      // Check if we've exceeded the max size
      if (options.maxSize && this.totalSize > options.maxSize) {
        console.warn(
          `[OfflineLayer] Prefetch size limit (${options.maxSize}B) reached. Stopping.`
        );
        break;
      }
    }

    return {
      success: true,
      count: this.fetchedUrls.size,
      size: this.totalSize,
    };
  }

  async fetchUrl(url, options, currentDepth) {
    // Avoid duplicate fetches
    if (this.fetchedUrls.has(url)) {
      return;
    }

    // Create a normalized form of the URL for caching
    const normalizedUrl = new URL(url, window.location.origin).toString();

    // Begin fetch
    try {
      const response = await fetch(normalizedUrl, {
        method: "GET",
        cache: "no-store", // Force fresh fetch
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      // Mark as fetched before processing to avoid loops
      this.fetchedUrls.add(normalizedUrl);

      // Clone response before consuming
      const responseClone = response.clone();

      // Store in cache (will be accessible with the original request args)
      const fetchArgs = [
        normalizedUrl,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        },
      ];

      // Prefetch flag helps differentiate these from regular cached responses
      await this.cache.store(fetchArgs, responseClone, { isPrefetched: true });

      // Update size tracking (approximate using content-length header)
      const contentLength = parseInt(
        response.headers.get("content-length") || "0",
        10
      );
      if (contentLength) {
        this.totalSize += contentLength;
      } else {
        // If content-length not available, use the actual response body size
        const text = await response.text();
        this.totalSize += text.length;

        // Analyze for dependencies if it's HTML and includeDependencies is enabled
        if (
          options.includeDependencies &&
          response.headers.get("content-type")?.includes("text/html")
        ) {
          const dependencies = this.extractDependencies(text, normalizedUrl);

          // Only fetch dependencies if we haven't reached max depth
          if (currentDepth < options.depth) {
            for (const depUrl of dependencies) {
              try {
                await this.fetchUrl(depUrl, options, currentDepth + 1);
              } catch (err) {
                console.warn(
                  `[OfflineLayer] Failed to prefetch dependency ${depUrl}:`,
                  err
                );
              }
            }
          }
        }
      }

      return true;
    } catch (err) {
      console.warn(`[OfflineLayer] Error prefetching ${normalizedUrl}:`, err);
      return false;
    }
  }

  extractDependencies(html, baseUrl) {
    const dependencies = new Set();
    const base = new URL(baseUrl);

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract scripts
    doc.querySelectorAll("script[src]").forEach((script) => {
      dependencies.add(new URL(script.getAttribute("src"), base).toString());
    });

    // Extract stylesheets
    doc.querySelectorAll("link[rel='stylesheet']").forEach((link) => {
      dependencies.add(new URL(link.getAttribute("href"), base).toString());
    });

    // Extract images
    doc.querySelectorAll("img[src]").forEach((img) => {
      dependencies.add(new URL(img.getAttribute("src"), base).toString());
    });

    // Extract other resources (favicon, fonts, etc.)
    doc
      .querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
      .forEach((link) => {
        dependencies.add(new URL(link.getAttribute("href"), base).toString());
      });

    return Array.from(dependencies);
  }
}
```

### 3. Enhanced Caching System

Extend the `LocalCache` class in `cache.js` to support prefetched content:

```javascript
// In cache.js
export class LocalCache {
  constructor() {
    this.dbPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2); // Bump version to 2
      req.onerror = reject;
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }

        // Add store for prefetched content metadata
        if (!db.objectStoreNames.contains("prefetch-metadata")) {
          db.createObjectStore("prefetch-metadata");
        }
      };
    });
  }

  // Modified store method to accept metadata
  async store(requestArgs, response, metadata = {}) {
    const db = await this.dbPromise;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const key = JSON.stringify(requestArgs);

    // Clone before consuming
    const responseClone = response.clone();
    const body = await response.text();

    // Store response
    store.put(
      {
        body,
        headers: [...responseClone.headers],
        timestamp: Date.now(),
        isPrefetched: metadata.isPrefetched || false,
      },
      key
    );

    // If it's a prefetched resource, store additional metadata
    if (metadata.isPrefetched) {
      const metaTx = db.transaction("prefetch-metadata", "readwrite");
      const metaStore = metaTx.objectStore("prefetch-metadata");

      // Extract URL from requestArgs
      const url =
        Array.isArray(requestArgs) && requestArgs.length > 0
          ? requestArgs[0]
          : null;

      if (url) {
        metaStore.put(
          {
            url,
            timestamp: Date.now(),
            size: body.length,
            key, // Reference to the stored response
          },
          url
        );
      }

      await metaTx.complete.catch((err) => {
        console.error("[OfflineLayer] Error storing prefetch metadata:", err);
      });
    }

    return tx.complete.catch((err) => {
      console.error("[OfflineLayer] Error storing in cache:", err);
    });
  }

  // New method to get all prefetched URLs
  async getPrefetchedUrls() {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction("prefetch-metadata", "readonly");
      const store = tx.objectStore("prefetch-metadata");

      return new Promise((resolve) => {
        const urls = [];

        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            urls.push(cursor.value);
            cursor.continue();
          } else {
            resolve(urls);
          }
        };
        req.onerror = () => resolve([]);
      });
    } catch (err) {
      console.error("[OfflineLayer] Error getting prefetched URLs:", err);
      return [];
    }
  }

  // New method to clear prefetched content
  async clearPrefetchedContent() {
    try {
      const urls = await this.getPrefetchedUrls();
      const db = await this.dbPromise;

      // Delete from main store
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      for (const url of urls) {
        if (url.key) {
          store.delete(url.key);
        }
      }

      // Clear metadata
      const metaTx = db.transaction("prefetch-metadata", "readwrite");
      const metaStore = metaTx.objectStore("prefetch-metadata");
      metaStore.clear();

      await Promise.all([tx.complete, metaTx.complete]);
      return true;
    } catch (err) {
      console.error("[OfflineLayer] Error clearing prefetched content:", err);
      return false;
    }
  }
}
```

### 4. Integration with OfflineLayer in index.js

Update the `OfflineLayer` class in `index.js`:

```javascript
// index.js
import { LocalCache } from "./cache.js";
import { SyncQueue } from "./queue.js";
import { patchXHR, unpatchXHR } from "./xhr.js";
import { onReconnect, isOnline, offReconnect } from "./network.js";
import { fakeResponse } from "./util.js";
import { InputTracker } from "./inputTracker.js";
import { StatusUI } from "./statusUI.js";
import { Prefetcher } from "./prefetcher.js"; // New import

export class OfflineLayer {
  constructor(options = {}) {
    this.options = {
      autoSync: true,
      showUI: true,
      autoHideUI: true,
      maxRetries: 3,
      prefetch: {
        maxSize: 50 * 1024 * 1024, // 50MB default
        defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
        autoCleanup: true,
      },
      ...options,
    };

    // Initialize components
    this.cache = new LocalCache();
    this.queue = new SyncQueue();
    this.prefetcher = new Prefetcher(this.cache);
    patchXHR(this.queue);
    this.inputs = new InputTracker();

    if (this.options.showUI) {
      this.ui = new StatusUI({
        autoHide: this.options.autoHideUI,
        queueRef: this.queue,
        cacheRef: this.cache,
      });
    }

    // Rest of constructor remains the same
    // ...
  }

  // Add the prefetchUrls method as defined earlier
  // ...

  // Update interceptFetch to check prefetched content
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

  // Add method to get prefetched content info
  async getPrefetchedContent() {
    return this.cache.getPrefetchedUrls();
  }

  // Add method to clear prefetched content
  async clearPrefetchedContent() {
    const result = await this.cache.clearPrefetchedContent();
    if (result && this.ui) {
      this.ui.setText("Prefetched content cleared");
      if (this.options.autoHideUI) {
        setTimeout(() => this.ui.hide(), 3000);
      }
    }
    return result;
  }
}
```

### 5. StatusUI Updates

Enhance the StatusUI component in `statusUI.js` to display prefetching information:

```javascript
// In statusUI.js
export class StatusUI {
  // Existing constructor and methods
  // ...

  // Add method to show prefetching progress
  setPrefetching(progress) {
    this.show();
    const { completed, total, size } = progress || {};

    if (completed && total) {
      const percent = Math.round((completed / total) * 100);
      const sizeInKB = size ? `(${Math.round(size / 1024)}KB)` : "";
      this.setText(`🔄 Prefetching: ${percent}% complete ${sizeInKB}`);
    } else {
      this.setText("🔄 Prefetching...");
    }
  }
}
```

## Integration Steps

1. **Create New Files**:

   - `prefetcher.js` for the prefetching implementation

2. **Modify Existing Files**:

   - `index.js` - Add prefetching API and integration
   - `cache.js` - Enhance cache to support prefetched content
   - `statusUI.js` - Add prefetching status display

3. **Update Data Structures**:
   - Add a new IndexedDB object store for prefetch metadata
   - Track prefetched URLs with size and timestamp information

## Example Usage

```javascript
// Basic usage
const offlineLayer = new OfflineLayer();

// Prefetch content before going offline
offlineLayer.prefetchUrls([
  "https://example.com/important-page",
  "https://example.com/docs/reference",
]);

// Advanced usage with options
offlineLayer.prefetchUrls(
  ["https://example.com/app/dashboard", "https://example.com/app/profile"],
  {
    includeDependencies: true,
    depth: 2,
    progressCallback: (progress) => {
      console.log(
        `Prefetched: ${progress.completed}/${progress.total} resources`
      );
      document.getElementById("progress").textContent = `${
        progress.completed
      }/${progress.total} (${Math.round(progress.size / 1024)}KB)`;
    },
  }
);

// Get info about prefetched content
const prefetchedContent = await offlineLayer.getPrefetchedContent();
console.log(`You have ${prefetchedContent.length} resources prefetched`);

// Clear prefetched content
await offlineLayer.clearPrefetchedContent();
```

## Testing Strategy

1. **Unit Tests**:

   - Test URL normalization and dependency extraction
   - Test prefetching with various content types (HTML, CSS, images)
   - Test storage and retrieval of prefetched content

2. **Integration Tests**:

   - Test prefetching multiple pages with dependencies
   - Test serving prefetched content when offline
   - Test storage limits and quota handling

3. **End-to-End Tests**:
   - Test complete user flow (prefetch → go offline → browse content)
   - Test with real web applications

## Potential Challenges and Solutions

1. **Storage Limitations**:

   - Implement size tracking and quota management
   - Add user-configurable max size limits
   - Provide clear feedback when limits are reached

2. **Cross-Origin Resources**:

   - Document CORS limitations
   - Provide options for handling CORS errors
   - Support prefetching with credentials for authenticated content

3. **Resource Updates**:
   - Implement TTL-based expiration for prefetched content
   - Add option to refresh prefetched content periodically
   - Provide diff-based updates when possible

## Timeline

- Design and initial implementation: 1-2 weeks
- Testing and refinement: 1 week
- Documentation and examples: 2-3 days

## Future Enhancements

- Smart prefetching based on user browsing patterns
- Background prefetching during idle time
- Differential updates to prefetched content
- Prefetch content compression to save storage space
