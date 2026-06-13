/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  // Don't run duplicate suites from transient agent worktrees under .claude/.
  testPathIgnorePatterns: ["/node_modules/", "/.claude/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    // Next uses jsx: "preserve"; override so ts-jest emits runnable JS for the
    // few tests that render React components (e.g. the Markdown renderer).
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  testTimeout: 30000,
};
