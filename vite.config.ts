import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { medicineLabPlugin } from "./scripts/medicine-lab-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Keep the optional second local preview from invalidating the main dev server's dependency cache.
  cacheDir: process.env.MEDICINE_LAB_PREVIEW === '1' ? 'node_modules/.vite-medicine-lab' : undefined,
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    medicineLabPlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
