import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "src/web/client",
  base: "./",
  build: {
    outDir: "../../../dist/web",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/web/client"),
    },
  },
  server: {
    port: 5291,
    strictPort: true,
    proxy: {
      "/rpc": {
        target: "http://127.0.0.1:9876",
        changeOrigin: true,
      },
    },
  },
});
