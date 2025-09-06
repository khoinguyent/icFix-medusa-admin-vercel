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
        cookieDomainRewrite: "",
        cookiePathRewrite: "/",
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const setCookie = proxyRes.headers["set-cookie"] as unknown as string[] | undefined
            if (setCookie && Array.isArray(setCookie)) {
              proxyRes.headers["set-cookie"] = setCookie.map((c) =>
                c
                  // Drop Domain so cookie becomes host-only (localhost)
                  .replace(/;\s*Domain=[^;]+/gi, "")
                  // Force Path=/ so cookie is sent to all routes
                  .replace(/;\s*Path=[^;]*/i, "; Path=/")
                  // Drop Secure so cookies work over http in dev
                  .replace(/;\s*Secure/gi, "")
                  // Force SameSite=Lax for http dev to avoid rejection of None without Secure
                  .replace(/;\s*SameSite=[^;]+/gi, "; SameSite=Lax")
              ) as unknown as any
            }
          })
          proxy.on("proxyReq", (proxyReq, req) => {
            try {
              const isPost = (req.method || "").toUpperCase() === "POST"
              const newPath = isPost ? "/auth/user/emailpass" : "/admin/users/me"
              // Update the path of the outgoing request
              // @ts-ignore - node ClientRequest exposes path
              proxyReq.path = newPath
              // Also update the :path header if present
              if (typeof proxyReq.setHeader === "function") {
                try { proxyReq.setHeader(":path", newPath) } catch (_) {}
              }
            } catch (_) {}
          })
        },
        // Default rewrite to backend /admin/users/me; proxyReq will switch to login path for POST
        rewrite: (path) => path.replace(/^\/api\/admin\/auth$/, "/admin/users/me"),
      },
      // Generic API proxy for other admin routes (session, logout, resources)
      "/api": {
        target: env.MEDUSA_BACKEND_URL || env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "",
        cookiePathRewrite: "/",
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const setCookie = proxyRes.headers["set-cookie"] as unknown as string[] | undefined
            if (setCookie && Array.isArray(setCookie)) {
              proxyRes.headers["set-cookie"] = setCookie.map((c) =>
                c
                  .replace(/;\s*Domain=[^;]+/gi, "")
                  .replace(/;\s*Path=[^;]*/i, "; Path=/")
                  .replace(/;\s*Secure/gi, "")
              ) as unknown as any
            }
          })
        },
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
