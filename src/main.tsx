import React from "react"
import ReactDOM from "react-dom/client"
import { AdminProvider } from "@medusajs/admin-sdk"
import App from "./App"
import "./index.css"

const backendUrl = (import.meta as any).env.VITE_MEDUSA_BACKEND_URL || (globalThis as any).__MEDUSA_BACKEND_URL__ || ""

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdminProvider baseUrl={backendUrl}>
      <App />
    </AdminProvider>
  </React.StrictMode>
)
