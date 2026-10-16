import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Rush-day logic must not depend on the host machine's time zone. Pinning the
// test process to a zone far from America/New_York makes any accidental use of
// local-time Date APIs fail loudly instead of passing on an East Coast laptop.
process.env.TZ = "Asia/Tokyo";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url))
    }
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node"
  }
});
