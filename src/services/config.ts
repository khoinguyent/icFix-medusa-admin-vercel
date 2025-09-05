// Prefer relative "/api" when running under HTTPS (e.g., Vercel) to avoid mixed content.
const defaultUrl = typeof window !== "undefined" && window.location.protocol === "https:"
  ? "/api"
  : "http://128.199.188.70:9000"

const medusaUrl = __MEDUSA_BACKEND_URL__ || defaultUrl

export { medusaUrl }
