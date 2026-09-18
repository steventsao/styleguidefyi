import { defineConfig } from "vitest/config"

// Local config so vitest does not pick up ~/dev/vitest.config.ts from the parent directory.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"]
  }
})
