import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": root,
      "server-only": path.join(root, "tests", "fixtures", "server-only.ts"),
    },
  },
})
