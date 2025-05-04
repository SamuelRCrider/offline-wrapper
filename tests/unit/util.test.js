const { fakeResponse } = require("../../util.js");

describe("Utility Functions", () => {
  describe("fakeResponse", () => {
    it("should create a response", () => {
      const response = fakeResponse("Test message");
      expect(response).toBeTruthy();
      expect(response instanceof Response).toBe(true);
      expect(response.status).toBe(202);
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });
});
