import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.svg", "logo-egolfinho.png", "icons.svg"],
      manifest: {
        name: "Educajá — Gestão Escolar",
        short_name: "Educajá",
        description: "Plataforma de gestão escolar Educajá (Okulandisa).",
        theme_color: "#1d4ed8",
        background_color: "#1e3a8a",
        display: "standalone",
        orientation: "any",
        lang: "pt-PT",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/educaja-192.png", sizes: "192x192", type: "image/png" },
          { src: "/educaja-512.png", sizes: "512x512", type: "image/png" },
          { src: "/educaja-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the built app shell.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        // SPA fallback: any uncached navigation falls back to index.html (offline boot).
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/sanctum\//, /^\/storage\//],
        // Increase precache size limit for our build.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Same-origin GET API → NetworkFirst (try live, fall back to cached response).
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" && url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "educaja-api-get",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Static fonts (cdn-uicons.flaticon.com etc).
          {
            urlPattern: /^https:\/\/cdn-uicons\.flaticon\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "educaja-cdn-icons",
              expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Same-origin static assets.
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              ["image", "font", "style", "script"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "educaja-static" },
          },
        ],
      },
      devOptions: {
        enabled: false, // Mantém o SW desligado em `npm run dev` para evitar surpresas em desenvolvimento.
        type: "module",
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { proxy: { "/api": { target: "http://localhost", changeOrigin: true } } },
});
