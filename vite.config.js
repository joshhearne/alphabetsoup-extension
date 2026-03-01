import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup:   resolve(__dirname, "popup.html"),
        options: resolve(__dirname, "options.html"),
      },
      output: {
        // Keep filenames predictable for manifest references
        entryFileNames: "src/[name].js",
        chunkFileNames: "src/[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
  // Copy static files that aren't processed by Vite
  publicDir: "public",
});
