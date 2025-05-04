const { OfflineLayer } = require("../../index.js");
const { LocalCache } = require("../../cache.js");
const { SyncQueue } = require("../../queue.js");
const { StatusUI } = require("../../statusUI.js");
const { InputTracker } = require("../../inputTracker.js");
const networkModule = require("../../network.js");
import * as xhrModule from "../../xhr.js";
import * as utilModule from "../../util.js";

// Mock dependencies
jest.mock("../../cache.js");
jest.mock("../../queue.js");
jest.mock("../../statusUI.js");
jest.mock("../../inputTracker.js");
jest.mock("../../network.js");
jest.mock("../../xhr.js");
jest.mock("../../util.js");

describe("OfflineLayer", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should be instantiable", () => {
      const offlineLayer = new OfflineLayer();
      expect(offlineLayer).toBeTruthy();
      expect(typeof offlineLayer).toBe("object");
    });

    it("should initialize dependencies", () => {
      new OfflineLayer();
      expect(LocalCache).toHaveBeenCalled();
      expect(SyncQueue).toHaveBeenCalled();
      expect(StatusUI).toHaveBeenCalled();
      expect(InputTracker).toHaveBeenCalled();
    });

    it("should accept custom options", () => {
      const options = {
        autoSync: false,
        showUI: false,
      };

      const offlineLayer = new OfflineLayer(options);
      expect(offlineLayer.options.autoSync).toBe(false);
      expect(offlineLayer.options.showUI).toBe(false);
    });
  });

  describe("Cleanup", () => {
    it("should have a destroy method", () => {
      const offlineLayer = new OfflineLayer();
      expect(typeof offlineLayer.destroy).toBe("function");
      // Just call it to ensure it doesn't throw
      offlineLayer.destroy();
    });
  });
});
