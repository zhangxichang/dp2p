import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    preset: "cloudflare_module",
    rollupConfig: {
      external: ["__STATIC_CONTENT_MANIFEST", "node:async_hooks"],
    },
  },
  vite: {
    clearScreen: false,
    build: {
      target: "esnext",
    },
    envPrefix: ["VITE_", "TAURI_ENV_"],
    plugins: [tailwindcss()],
  },
});
