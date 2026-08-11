import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
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
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff}"],
        globIgnores: ["**/error404-arnald.png", "**/Captura de pantalla*"],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [
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
  define: {
    global: "window",
  },
});
