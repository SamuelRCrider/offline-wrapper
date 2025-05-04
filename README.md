# Offline Layer

A drop-in JavaScript library that adds offline-first capabilities to any web application. This library enables your web app to work seamlessly both online and offline by caching requests, queuing operations, and providing real-time status feedback.

## Features

- **Automatic Request Handling**: Intercepts and queues non-GET requests when offline
- **Response Caching**: Caches GET responses for offline access
- **Automatic Synchronization**: Syncs queued requests when connectivity is restored
- **Form Input Persistence**: Saves form inputs to prevent data loss during offline sessions
- **Network Status Detection**: Uses reliable connection detection beyond the basic `navigator.onLine` API
- **User Interface**: Provides an optional status UI showing connection state and sync progress
- **XHR & Fetch Interception**: Works with both modern fetch API and legacy XHR requests

## Installation

```bash
npm install offline-layer
```

## Basic Usage

```javascript
import { OfflineLayer } from "offline-layer";

// Initialize with default options
const offlineLayer = new OfflineLayer();

// That's it! Your app now works offline
```

## Configuration Options

```javascript
const offlineLayer = new OfflineLayer({
  // Automatically sync queued requests when coming back online
  autoSync: true,

  // Show the status UI
  showUI: true,

  // Automatically hide status UI after being online for a few seconds
  autoHideUI: true,

  // Maximum number of sync retries when coming back online
  maxRetries: 3,
});
```

## Manual Operations

If you need more control, you can use the following methods:

```javascript
// Manually trigger synchronization
offlineLayer.syncNow();

// Destroy the instance and cleanup (remove listeners, restore original XHR/fetch)
offlineLayer.destroy();
```

## How It Works

### Request Interception

Offline Layer intercepts all network requests made through the Fetch API and XMLHttpRequest:

- **GET Requests**: When online, responses are cached for offline use
- **Non-GET Requests**: When offline, these are queued for later execution
- **Automatic Replay**: Queued requests are automatically replayed when connection is restored

### Data Persistence

The library uses a combination of:

- **IndexedDB**: For caching GET responses with proper headers and body content
- **LocalStorage**: For queuing requests and storing form inputs

### Status UI

The library includes an optional status UI that shows:

- Current connection status (online/offline/syncing)
- Number of queued requests
- Sync status and errors

## Compatibility

- Works in all modern browsers that support IndexedDB, LocalStorage, and Fetch API
- Requires minimal polyfills for older browsers

## Testing

```bash
npm test
```

## License

MIT
