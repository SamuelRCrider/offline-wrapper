// Mock indexedDB
require("fake-indexeddb/auto");
const fetchMock = require("jest-fetch-mock");

// Enable fetch mocks
fetchMock.enableMocks();

// Mock localStorage
global.localStorage = {
  store: {},
  getItem: jest.fn(function (key) {
    return this.store[key] || null;
  }),
  setItem: jest.fn(function (key, value) {
    this.store[key] = value.toString();
  }),
  removeItem: jest.fn(function (key) {
    delete this.store[key];
  }),
  clear: jest.fn(function () {
    this.store = {};
  }),
};

// Mock crypto
global.crypto = {
  randomUUID: jest.fn(() => Math.random().toString(36).substring(2, 15)),
};

// Mock navigator.onLine
Object.defineProperty(global.navigator, "onLine", {
  writable: true,
  value: true,
});

// Mock window for tests that need DOM events
global.window = Object.assign(global.window || {}, {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
});

// Mock DOM elements
class MockElement {
  constructor(tag) {
    this.tagName = tag;
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.listeners = {};
    this.innerHTML = "";
    this.innerText = "";
    this.textContent = "";
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  remove() {
    // Mock removal
  }

  querySelectorAll(selector) {
    return [];
  }
}

// Mock document body if not in jsdom
if (!global.document) {
  global.document = {
    body: new MockElement("body"),
    createElement: (tag) => new MockElement(tag),
    querySelector: (selector) => null,
    addEventListener: jest.fn(),
  };
}

// Spy on setTimeout
jest.spyOn(global, "setTimeout");

// Spy on console methods
jest.spyOn(console, "log").mockImplementation();
jest.spyOn(console, "error").mockImplementation();
jest.spyOn(console, "warn").mockImplementation();

// Set timezone to UTC for consistent testing
process.env.TZ = "UTC";

// Set up mocks for our modules
jest.mock("../cache.js", () => {
  return {
    LocalCache: jest.fn().mockImplementation(() => {
      return {
        options: {
          cacheName: "offline-cache",
        },
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
        clear: jest.fn().mockResolvedValue(undefined),
        store: jest.fn().mockResolvedValue(undefined),
        match: jest.fn().mockResolvedValue(null),
        allKeys: jest.fn().mockResolvedValue([]),
      };
    }),
  };
});

jest.mock("../queue.js", () => {
  return {
    SyncQueue: jest.fn().mockImplementation(() => {
      return {
        options: {
          queueName: "offline-queue",
          maxRetries: 3,
        },
        queue: [],
        items: [],
        add: jest.fn(),
        enqueue: jest.fn(),
        remove: jest.fn(),
        process: jest.fn(),
        flush: jest.fn().mockResolvedValue({ success: true, remaining: 0 }),
        clear: jest.fn(),
        onSync: jest.fn(),
      };
    }),
  };
});

jest.mock("../statusUI.js", () => {
  return {
    StatusUI: jest.fn().mockImplementation((options = {}) => {
      return {
        options: {
          containerId: "offline-status",
          ...options,
        },
        update: jest.fn(),
        setText: jest.fn(),
        setOnline: jest.fn(),
        setOffline: jest.fn(),
        setSyncing: jest.fn(),
        setError: jest.fn(),
        show: jest.fn(),
        hide: jest.fn(),
        destroy: jest.fn(),
      };
    }),
  };
});

jest.mock("../inputTracker.js", () => {
  return {
    InputTracker: jest.fn().mockImplementation((options = {}) => {
      return {
        options: {
          trackForms: true,
          ...options,
        },
        save: jest.fn(),
        restore: jest.fn(),
        clear: jest.fn(),
        cleanupOldEntries: jest.fn(),
      };
    }),
  };
});

// Mock util.js
jest.mock("../util.js", () => {
  return {
    fakeResponse: jest.fn().mockImplementation((message) => {
      return new Response(JSON.stringify({ message }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      });
    }),
  };
});

// Setup and teardown
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Reset localStorage
  localStorage.store = {};

  // Reset fetch mocks
  fetchMock.resetMocks();
});

afterEach(() => {
  // Additional cleanup if needed
});
