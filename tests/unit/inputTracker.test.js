const { InputTracker } = require("../../inputTracker.js");

describe("InputTracker", () => {
  let tracker;

  beforeEach(() => {
    // Set up a basic document body with form elements
    document.body.innerHTML = `
      <form id="test-form">
        <input type="text" name="username" value="testuser">
        <textarea name="comment">Test comment</textarea>
        <select name="option">
          <option value="1">One</option>
          <option value="2" selected>Two</option>
        </select>
      </form>
    `;

    tracker = new InputTracker();
  });

  describe("Basic functionality", () => {
    it("should be instantiable", () => {
      expect(tracker).toBeTruthy();
      expect(typeof tracker).toBe("object");
    });

    it("should initialize with default options", () => {
      expect(tracker.options.trackForms).toBe(true);
    });

    it("should initialize with custom options", () => {
      const customTracker = new InputTracker({ trackForms: false });
      expect(customTracker.options.trackForms).toBe(false);
    });
  });

  describe("API Methods", () => {
    it("should have save, restore, and clear methods", () => {
      expect(typeof tracker.save).toBe("function");
      expect(typeof tracker.restore).toBe("function");
      expect(typeof tracker.clear).toBe("function");
    });
  });
});
