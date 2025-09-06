// Prefer relative "/api" for production/https (e.g., Vercel) to avoid mixed content.
const defaultUrl = "/api/proxy"

const resolved = __MEDUSA_BACKEND_URL__ || defaultUrl

if (!resolved) {
  // This is a runtime guard in case define wasn't set.
  // eslint-disable-next-line no-console
  console.error(
    "MEDUSA_BACKEND_URL is not configured. Set MEDUSA_BACKEND_URL or NEXT_PUBLIC_MEDUSA_BACKEND_URL to your Medusa backend (e.g., https://your-backend-domain:9000). Falling back to /api."
  )
}

const medusaUrl = resolved

export { medusaUrl }
