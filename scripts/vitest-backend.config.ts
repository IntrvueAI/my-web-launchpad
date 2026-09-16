import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
const fixture = (name: string) =>
  fileURLToPath(
    new URL(`../supabase/tests/fixtures/${name}.ts`, import.meta.url),
  );

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^https:\/\/deno.land\/std@[^/]+\/http\/server.ts$/,
        replacement: fixture("server"),
      },
      {
        find: /^https:\/\/deno.land\/x\/xhr@[^/]+\/mod.ts$/,
        replacement: fixture("empty"),
      },
      {
        find: /^https:\/\/esm.sh\/@supabase\/supabase-js@.*$/,
        replacement: fixture("supabase"),
      },
      { find: /^npm:stripe@.*$/, replacement: fixture("stripe") },
      { find: /^npm:resend@.*$/, replacement: fixture("resend") },
      { find: "./_shared/appLogger.ts", replacement: fixture("logger") },
    ],
  },
  test: {
    environment: "node",
    include: ["supabase/tests/*.backend.ts"],
    setupFiles: ["supabase/tests/setup.ts"],
    fileParallelism: false,
  },
});
