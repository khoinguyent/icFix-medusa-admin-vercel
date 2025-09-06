const { getCookie } = require("../_utils/cookies")

const BACKEND = process.env.MEDUSA_BACKEND_URL

module.exports = async function handler(req, res) {
  if (!BACKEND) return res.status(500).json({ message: "MEDUSA_BACKEND_URL is not set" })
  try {
    const seg = (req.query && req.query.path) || ""
    const dynamicPath = Array.isArray(seg) ? seg.join("/") : seg
    const qs = req.url && req.url.includes("?") ? `?${req.url.split("?")[1]}` : ""
    const target = `${BACKEND}/admin/${dynamicPath}${qs}`

    const bearer = getCookie(req, "medusa_admin_token")
    const fwdCookie = req.headers.cookie || ""

    const headers = {}
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (!v) continue
      const lower = k.toLowerCase()
      if (lower === "host" || lower === "content-length") continue
      headers[k] = Array.isArray(v) ? v.join(",") : v
    }
    if (bearer) headers["authorization"] = `Bearer ${bearer}`
    if (fwdCookie) headers["cookie"] = fwdCookie
    if (!headers["content-type"]) headers["content-type"] = "application/json"

    const method = req.method || "GET"
    const hasBody = !["GET", "HEAD"].includes(method)
    const body = hasBody ? JSON.stringify(req.body ?? {}) : undefined

    const r = await fetch(target, { method, headers, body })
    const buf = await r.arrayBuffer()

    res.setHeader("x-proxied-endpoint", target)
    res.setHeader("x-forwarded-cookies", fwdCookie ? fwdCookie.split(";").map(s=>s.trim().split("=")[0]).join(",") : "")
    for (const [k, v] of r.headers.entries()) {
      if (k.toLowerCase() === "set-cookie") continue
      res.setHeader(k, v)
    }
    return res.status(r.status).send(Buffer.from(buf))
  } catch (e) {
    res.setHeader("x-proxy-error", String((e && e.message) || e))
    return res.status(502).json({ message: "Proxy to backend failed", error: String((e && e.message) || e) })
  }
}


