/// <reference types="vitest" />
import react from "@vitejs/plugin-react"
import dns from "dns"
import path from "path"
import { env } from "process"
import { defineConfig } from "vite"

// Resolve localhost for Node v16 and older.
// @see https://vitejs.dev/config/server-options.html#server-host.
dns.setDefaultResultOrder("verbatim")

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Auth login needs special rewrite for Medusa v2 email/password endpoint
      "/api/admin/auth": {
        target: env.MEDUSA_BACKEND_URL || env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/admin\/auth$/, "/auth/admin/emailpass"),
      },
      // Generic API proxy for other admin routes (session, logout, resources)
      "/api": {
        target: env.MEDUSA_BACKEND_URL || env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    api: 7001,
  },
  // Backwards-compat with Gatsby.
  publicDir: "static",
  build: {
    outDir: "public",
  },
  resolve: {
    alias: {
      gatsby: path.resolve(__dirname, "src/compat/gatsby-compat.tsx"),
      "@reach/router": path.resolve(
        __dirname,
        "src/compat/reach-router-compat.tsx"
      ),
    },
  },
  define: {
    // Do not expose backend URL to the browser. Frontend must call relative /api.
    __MEDUSA_BACKEND_URL__: JSON.stringify(""),
  },
  optimizeDeps: {
    exclude: ["typeorm", "medusa-interfaces"],
  },
})
