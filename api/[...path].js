function getBackendUrl() {
  const url = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!url) {
    throw new Error(
      "Missing MEDUSA_BACKEND_URL (or NEXT_PUBLIC_MEDUSA_BACKEND_URL) env var. Set it to your Medusa backend, e.g. https://your-backend-domain:9000"
    )
  }
  return url.replace(/\/$/, "")
}

module.exports = async function handler(req, res) {
  let backendBase
  try {
    backendBase = getBackendUrl()
  } catch (e) {
    res.statusCode = 500
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ message: e.message || "Backend URL not configured" }))
    return
  }

  const method = req.method || "GET"
  const restPath = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path || "")

  // Only proxy /admin/* paths through here
  // Only allow /admin/* through this handler
  if (!/^admin\//.test(restPath)) {
    res.statusCode = 404
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ message: "Not Found" }))
    return
  }
  const targetUrl = `${backendBase}/${restPath}`.replace(/\/$/, "")

  try {
    const headers = {
      "content-type": req.headers["content-type"] || "application/json",
      "x-forwarded-host": req.headers["host"] || "",
      "x-forwarded-proto": req.headers["x-forwarded-proto"] || "https",
      "user-agent": req.headers["user-agent"] || "",
    }

    // Use our HttpOnly cookie to add Bearer token; do not forward backend cookies
    const cookieHeader = req.headers["cookie"] || ""
    const m = String(cookieHeader).match(/(?:^|;\s*)medusa_admin_token=([^;]+)/)
    const token = m ? decodeURIComponent(m[1]) : null
    if (token) {
      headers["authorization"] = `Bearer ${token}`
    }

    const init = { method, headers }
    if (method !== "GET" && method !== "HEAD") {
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})
    }

    const response = await fetch(targetUrl, init)

    // Do not forward backend Set-Cookie to the browser

    const buf = await response.arrayBuffer()
    const ct = response.headers && response.headers.get ? (response.headers.get("content-type") || "application/json") : "application/json"
    res.statusCode = response.status
    res.setHeader("content-type", ct)
    res.end(Buffer.from(buf))
  } catch (err) {
    const message = (err && err.message) || "Proxy request failed"
    res.statusCode = 502
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ message }))
  }
}


