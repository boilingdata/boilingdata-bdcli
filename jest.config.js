/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest"],
  },
  moduleNameMapper: {
    "^(\\.\\.?\\/.+)\\.js$": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
  testRegex: "(/src/.*(\\.)(test|spec))\\.(jsx?|tsx?)$",
  moduleFileExtensions: ["js", "ts"],
  collectCoverage: false,
  collectCoverageFrom: ["src/**/{!(index),}.ts"],
  coverageReporters: ["json-summary", "text", "lcov"],
};
