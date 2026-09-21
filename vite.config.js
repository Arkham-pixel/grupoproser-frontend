import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

function arnaldVersionPlugin() {
  return {
    name: "arnald-version-json",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({
          build: String(Date.now()),
          generatedAt: new Date().toISOString(),
        }),
      });
    },
  };
}

export default defineConfig({
  plugins: [
    arnaldVersionPlugin(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["arnald-icon.png", "ArnaldDataFlow.png"],
      manifest: {
        name: "Arnald DataFlow - Grupo Proser",
        short_name: "Arnald",
        description: "Gestión de casos y formularios — Offline First",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        lang: "es",
        icons: [
          {
            src: "/arnald-icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/arnald-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2,woff}"],
        globIgnores: [
          "**/error404-arnald.png",
          "**/Captura de pantalla*",
          "**/version.json",
          "**/arnald-cache-bust.js",
          "**/*.html",
        ],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith("/version.json") ||
              url.pathname.endsWith("/arnald-cache-bust.js"),
            handler: "NetworkOnly",
          },
          {
            // HTML: red primero para que Mac/Safari no se queden en el shell viejo
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              networkTimeoutSeconds: 4,
            },
          },
          {
            // App shell / estáticos — stale-while-revalidate
            urlPattern: ({ request }) =>
              request.destination === "style" ||
              request.destination === "script" ||
              request.destination === "worker",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes("/api/storage/file"),
            handler: "NetworkFirst",
            options: {
              cacheName: "storage-files",
              networkTimeoutSeconds: 20,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            // Health / catálogos livianos — network first corto
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/health") ||
              url.pathname.includes("/api/catalogos"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-light",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 10,
              },
            },
          },
          {
            // Historial y auth — nunca cachear (JWT / datos sensibles)
            urlPattern: ({ url }) =>
              url.pathname.includes("/api/historial") ||
              url.pathname.includes("/api/auth") ||
              url.pathname.includes("/login"),
            handler: "NetworkOnly",
            options: {
              cacheName: "api-sensitive-bypass",
            },
          },
          {
            // Resto de API — network first sin persistir cuerpos con Authorization de forma agresiva
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-network-first",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 2,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
        // No precachear respuestas con Authorization
        ignoreURLParametersMatching: [/^utm_/, /^v$/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  define: {
    global: "window",
  },
  optimizeDeps: {
    include: ["pdfjs-dist"],
    exclude: ["heic-to", "heic-to/csp"],
  },
  worker: {
    format: "es",
  },
});
