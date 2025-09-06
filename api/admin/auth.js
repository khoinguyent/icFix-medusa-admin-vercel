// CommonJS Vercel Serverless Function to proxy Admin auth routes to Medusa backend

function getBackendUrl() {
  const url = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!url) {
    throw new Error(
      "Missing MEDUSA_BACKEND_URL (or NEXT_PUBLIC_MEDUSA_BACKEND_URL) env var. Set it to your Medusa backend, e.g. https://your-backend-domain:9000"
    )
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `Invalid MEDUSA_BACKEND_URL: ${url}. It must be a full URL starting with http(s)://, e.g. https://your-backend-domain:9000`
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

  let targetUrl = ""
  if (method === "POST") {
    // Per requested behavior: admin emailpass
    targetUrl = `${backendBase}/auth/admin/emailpass`
  } else if (method === "GET") {
    // Validate token via admin session endpoint
    targetUrl = `${backendBase}/admin/auth`
  } else if (method === "DELETE") {
    // No backend call needed; we'll just clear cookie and return 200
    targetUrl = ""
  }

  // DELETE: clear cookie locally and exit
  if (method === "DELETE") {
    res.setHeader("set-cookie", "medusa_admin_token=; Path=/; HttpOnly; Max-Age=0; SameSite=None; Secure")
    res.statusCode = 200
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ success: true }))
    return
  }

  if (!targetUrl) {
    res.statusCode = 405
    res.setHeader("Allow", "GET,POST,DELETE")
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ message: `Method ${method} Not Allowed` }))
    return
  }

  try {
    const headers = {
      "content-type": req.headers["content-type"] || "application/json",
      "x-forwarded-host": req.headers["host"] || "",
      "x-forwarded-proto": req.headers["x-forwarded-proto"] || "https",
      "user-agent": req.headers["user-agent"] || "",
    }

    if (req.headers.cookie) {
      headers["cookie"] = req.headers.cookie
    }

    // If we have our own token cookie, forward it as Authorization: Bearer ...
    const cookieHeader = req.headers.cookie || ""
    const jwtMatch = cookieHeader.match(/(?:^|;\s*)medusa_admin_token=([^;]+)/)
    const adminJwt = jwtMatch ? decodeURIComponent(jwtMatch[1]) : null
    const hasAdminJwt = Boolean(adminJwt)
    if (hasAdminJwt) {
      headers["authorization"] = `Bearer ${adminJwt}`
      headers["Authorization"] = `Bearer ${adminJwt}`
      headers["x-medusa-access-token"] = adminJwt
    }

    const init = { method, headers }

    if (method === "POST") {
      const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})
      init.body = body
    }

    let selectedUrl = targetUrl
    let response = await fetch(targetUrl, init)

    // No additional probing needed; /admin/users/me is the expected endpoint

    // Do not forward backend Set-Cookie. We will manage our own auth cookie.

    // Expose which backend endpoint was used for debugging
    try { res.setHeader("x-proxied-endpoint", selectedUrl) } catch (_) {}

    const text = await response.text()
    let payload = text
    try {
      payload = text ? JSON.parse(text) : {}
    } catch (_) {}

    const ct = response.headers && response.headers.get ? (response.headers.get("content-type") || "application/json") : "application/json"
    // If this is a successful POST login and backend returned a token, set our own HttpOnly cookie only
    if (method === "POST" && response.ok && payload && typeof payload === "object" && payload.token) {
      const tokenCookie = `medusa_admin_token=${encodeURIComponent(payload.token)}; Path=/; HttpOnly; Secure; SameSite=None`
      res.setHeader("set-cookie", tokenCookie)
    }

    res.statusCode = response.status
    res.setHeader("content-type", ct)
    try { res.setHeader("x-proxied-endpoint", selectedUrl) } catch(_) {}
    res.end(typeof payload === "string" ? payload : JSON.stringify(payload))
  } catch (err) {
    const message = (err && err.message) || "Proxy request failed"
    res.statusCode = 502
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ message }))
  }
}


