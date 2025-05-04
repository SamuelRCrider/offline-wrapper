const { StatusUI } = require("../../statusUI.js");

describe("StatusUI", () => {
  let statusUI;

  beforeEach(() => {
    document.body.innerHTML = '<div id="status-container"></div>';
    statusUI = new StatusUI();
  });

  describe("Basic functionality", () => {
    it("should be instantiable", () => {
      expect(statusUI).toBeTruthy();
      expect(typeof statusUI).toBe("object");
    });

    it("should initialize with default options", () => {
      expect(statusUI.options.containerId).toBe("offline-status");
    });

    it("should initialize with custom options", () => {
      const customStatusUI = new StatusUI({ containerId: "custom-status" });
      expect(customStatusUI.options.containerId).toBe("custom-status");
    });
  });

  describe("API Methods", () => {
    it("should have update, show, and hide methods", () => {
      expect(typeof statusUI.update).toBe("function");
      expect(typeof statusUI.show).toBe("function");
      expect(typeof statusUI.hide).toBe("function");
    });
  });
});
