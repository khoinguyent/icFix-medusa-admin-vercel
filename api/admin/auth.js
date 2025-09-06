// CommonJS Vercel Serverless Function to proxy Admin auth routes to Medusa backend

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

  let targetUrl = ""
  if (method === "POST") {
    targetUrl = `${backendBase}/auth/admin/emailpass`
  } else if (method === "GET" || method === "DELETE") {
    targetUrl = `${backendBase}/admin/auth`
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

    const init = { method, headers }

    if (method === "POST") {
      const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})
      init.body = body
    }

    const response = await fetch(targetUrl, init)

    // Forward Set-Cookie header(s) and normalize Domain/SameSite/Secure for browser acceptance
    const collectSetCookies = () => {
      const headers = response.headers
      const possible = []
      // undici Response may expose multiple cookies via getSetCookie
      const anyHeaders = /** @type {any} */ (headers)
      if (typeof anyHeaders.getSetCookie === "function") {
        try {
          const arr = anyHeaders.getSetCookie()
          if (Array.isArray(arr)) return arr
        } catch (_) {}
      }
      const single = headers.get && headers.get("set-cookie")
      if (single) possible.push(single)
      return possible
    }

    const cookies = collectSetCookies()
    if (cookies && cookies.length) {
      const normalized = cookies.map((c) => {
        let v = String(c)
        // Drop Domain attribute so cookie becomes host-only for the Admin domain
        v = v.replace(/;\s*Domain=[^;]+/gi, "")
        // Ensure Secure when served over HTTPS
        if (!/;\s*Secure/i.test(v)) {
          v += "; Secure"
        }
        // Ensure SameSite=None for cross-site iframes/fetches; backend usually sets this already
        v = v.replace(/;\s*SameSite=[^;]+/gi, "") + "; SameSite=None"
        return v
      })
      res.setHeader("set-cookie", normalized)
    }

    const text = await response.text()
    let payload = text
    try {
      payload = text ? JSON.parse(text) : {}
    } catch (_) {}

    const ct = response.headers && response.headers.get ? (response.headers.get("content-type") || "application/json") : "application/json"
    res.statusCode = response.status
    res.setHeader("content-type", ct)
    res.end(typeof payload === "string" ? payload : JSON.stringify(payload))
  } catch (err) {
    const message = (err && err.message) || "Proxy request failed"
    res.statusCode = 502
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ message }))
  }
}


