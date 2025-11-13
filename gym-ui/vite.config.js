// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const API_BASE = env.VITE_API_BASE || "";

  return {
    plugins: [react()],
    resolve: { alias: { "@": "/src" } },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      open: true,
      cors: true,
      proxy: API_BASE
        ? undefined
        : {
            "/api": {
              target: "http://127.0.0.1:5000",
              changeOrigin: true,
              secure: false,
              ws: false,
            },
            "/auth": {
              target: "http://127.0.0.1:5000",
              changeOrigin: true,
              secure: false,
              ws: false,
            },
          },
    },
    build: { sourcemap: true, target: "es2020", outDir: "dist", chunkSizeWarningLimit: 900 },
    optimizeDeps: { include: ["react", "react-dom"] },
    clearScreen: false,
    logLevel: "info",
    define: { __APP_ENV__: JSON.stringify(mode) },
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  };
});
