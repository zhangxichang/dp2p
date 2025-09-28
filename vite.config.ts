import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
    clearScreen: false,
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    plugins: [
        tanstackRouter({ target: "react", autoCodeSplitting: true }),
        react(),
        tailwindcss(),
        wasm(),
        visualizer({
            template: "network"
        }),
    ]
});
