// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Nota: en desarrollo usamos proxy para que cualquier llamada a /api
// vaya a Flask (http://127.0.0.1:5000). En producción, puedes servir
// el front detrás del mismo dominio o configurar VITE_API_BASE.

export default defineConfig(({ mode }) => {
  // Carga variables desde .env, .env.development, etc.
  const env = loadEnv(mode, process.cwd(), "");

  // Permite forzar un backend distinto sin tocar el código:
  // Si VITE_API_BASE está definido, el front usará esa URL absoluta.
  // Si NO está definido, usaremos el proxy (solo en dev).
  const API_BASE = env.VITE_API_BASE || "";

  return {
    plugins: [react()],

    // Alias útiles (opcional)
    resolve: {
      alias: {
        "@": "/src",
      },
    },

    // Buenas prácticas de dev server
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      open: true,
      cors: true,
      // Si NO definiste VITE_API_BASE, activamos el proxy en dev
      proxy:
        API_BASE
          ? undefined
          : {
              "/api": {
                target: "http://127.0.0.1:5000",
                changeOrigin: true,
                secure: false,
                ws: false,
                // opcional: reescritura si tu backend usa otro prefijo
                // rewrite: (path) => path.replace(/^\/api/, "/api"),
              },
            },
    },

    // Build con sourcemaps para facilitar depuración en prod (opcional)
    build: {
      sourcemap: true,
      target: "es2020",
      outDir: "dist",
      chunkSizeWarningLimit: 900,
    },

    // Optimización de dependencias en dev
    optimizeDeps: {
      include: ["react", "react-dom"],
    },

    // Menos ruido en consola
    clearScreen: false,
    logLevel: "info",

    // Define variables globales opcionales
    define: {
      __APP_ENV__: JSON.stringify(mode),
    },

    // Preview (si haces `vite preview`)
    preview: {
      host: "127.0.0.1",
      port: 4173,
      strictPort: true,
    },
  };
});
