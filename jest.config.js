module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  moduleFileExtensions: ["js"],
  setupFilesAfterEnv: ["./tests/setupTests.js"],
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverage: true,
  collectCoverageFrom: ["*.js", "!jest.config.js", "!babel.config.js"],
  coverageDirectory: "coverage",
  transformIgnorePatterns: ["/node_modules/(?!.*\\.mjs$)"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
