import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Integration tests talk to a running Supabase instance (npm run db:start).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY come from the environment or
// .env.local, and the suite only runs when SUPABASE_INTEGRATION=1.
export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // lib/data.ts is exercised directly; see tests/stubs/server-only.ts.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url))
    }
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    env: loadEnv(mode, process.cwd(), ""),
    testTimeout: 60_000
  }
}));
