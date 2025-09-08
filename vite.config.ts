import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  define: {
    __MEDUSA_BACKEND_URL__: JSON.stringify(process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"),
  },
  server: {
    port: 7001,
    proxy: {
      "/admin": {
        target: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          admin: ["@medusajs/dashboard"]
        }
      }
    }
  }
})
