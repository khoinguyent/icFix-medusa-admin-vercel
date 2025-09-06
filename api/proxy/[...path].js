function getBackendUrl() {
  const url = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!url) throw new Error("Missing MEDUSA_BACKEND_URL (or NEXT_PUBLIC_MEDUSA_BACKEND_URL)")
  return url.replace(/\/$/, "")
}

module.exports = async function handler(req, res) {
  let backendBase
  try { backendBase = getBackendUrl() } catch (e) {
    res.statusCode = 500
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ message: e.message || "Backend URL not configured" }))
    return
  }

  const method = req.method || "GET"
  const restPath = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path || "")

  const isAdminAuth = restPath.replace(/^\//, "") === "admin/auth"
  const targetUrl = isAdminAuth && method === "POST"
    ? `${backendBase}/auth/user/emailpass`
    : `${backendBase}/${restPath}`.replace(/\/$/, "")

  try {
    const headers = {
      "content-type": req.headers["content-type"] || "application/json",
      "x-forwarded-host": req.headers["host"] || "",
      "x-forwarded-proto": req.headers["x-forwarded-proto"] || "https",
      "user-agent": req.headers["user-agent"] || "",
    }
    if (req.headers.cookie) headers["cookie"] = req.headers.cookie

    const init = { method, headers }
    if (method !== "GET" && method !== "HEAD") {
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})
    }

    const response = await fetch(targetUrl, init)
    const setCookie = response.headers.get && response.headers.get("set-cookie")
    if (setCookie) res.setHeader("set-cookie", setCookie)

    const buf = await response.arrayBuffer()
    const ct = response.headers.get && response.headers.get("content-type")
    if (ct) res.setHeader("content-type", ct)
    res.statusCode = response.status
    res.end(Buffer.from(buf))
  } catch (err) {
    res.statusCode = 502
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ message: err?.message || "Proxy request failed" }))
  }
}


