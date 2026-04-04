import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "CommonJS" } }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: ["src/lib/**/*.ts", "src/types/**/*.ts", "!src/**/*.d.ts"],
};

export default config;
