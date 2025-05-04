const { LocalCache } = require("../../cache.js");

// Mock indexedDB
global.indexedDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
    result: {
      transaction: jest.fn().mockReturnValue({
        objectStore: jest.fn().mockReturnValue({
          put: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
          }),
          get: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
          }),
          delete: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
          }),
          clear: jest.fn().mockReturnValue({
            onsuccess: null,
            onerror: null,
          }),
        }),
      }),
    },
  }),
};

describe("LocalCache", () => {
  let cache;

  beforeEach(() => {
    cache = new LocalCache();
    global.indexedDB.open.mockClear();
    localStorage.clear();
  });

  describe("Basic functionality", () => {
    it("should be instantiable", () => {
      expect(cache).toBeTruthy();
      expect(typeof cache).toBe("object");
    });

    it("should initialize with default options", () => {
      expect(cache.options.cacheName).toBe("offline-cache");
    });
  });

  describe("API Methods", () => {
    it("should have get, set, remove, and clear methods", () => {
      expect(typeof cache.get).toBe("function");
      expect(typeof cache.set).toBe("function");
      expect(typeof cache.remove).toBe("function");
      expect(typeof cache.clear).toBe("function");
    });

    it("should have storage-related methods", () => {
      expect(typeof cache.store).toBe("function");
      expect(typeof cache.match).toBe("function");
      expect(typeof cache.allKeys).toBe("function");
    });
  });
});
