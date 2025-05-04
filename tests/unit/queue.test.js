const { SyncQueue } = require("../../queue.js");

describe("SyncQueue", () => {
  let queue;

  beforeEach(() => {
    localStorage.clear();
    queue = new SyncQueue();
  });

  describe("Basic functionality", () => {
    it("should be instantiable", () => {
      expect(queue).toBeTruthy();
      expect(typeof queue).toBe("object");
    });

    it("should initialize with default options", () => {
      expect(queue.options.queueName).toBe("offline-queue");
    });
  });

  describe("API Methods", () => {
    it("should have add, remove, and process methods", () => {
      expect(typeof queue.add).toBe("function");
      expect(typeof queue.remove).toBe("function");
      expect(typeof queue.process).toBe("function");
    });

    it("should have enqueue and flush methods", () => {
      expect(typeof queue.enqueue).toBe("function");
      expect(typeof queue.flush).toBe("function");
    });

    it("should have a queue array property", () => {
      expect(Array.isArray(queue.queue)).toBe(true);
    });
  });
});
