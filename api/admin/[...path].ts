import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getCookie } from "../_utils/cookies"
const BACKEND = process.env.MEDUSA_BACKEND_URL

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!BACKEND) return res.status(500).json({ message: "MEDUSA_BACKEND_URL is not set" })
  try {
    const seg = (req.query as any).path
    const dynamicPath = Array.isArray(seg) ? seg.join("/") : (seg || "")
    const qs = req.url?.includes("?") ? `?${req.url.split("?")[1]}` : ""
    const target = `${BACKEND}/admin/${dynamicPath}${qs}`

    const token = getCookie(req, "medusa_admin_token")

    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v) continue
      const lower = k.toLowerCase()
      if (lower === "host" || lower === "content-length") continue
      headers[k] = Array.isArray(v) ? v.join(",") : v
    }
    if (token) headers["authorization"] = `Bearer ${token}`
    if (!headers["content-type"]) headers["content-type"] = "application/json"

    const method = req.method || "GET"
    const hasBody = !["GET","HEAD"].includes(method)
    const body = hasBody ? JSON.stringify(req.body ?? {}) : undefined

    const r = await fetch(target, { method, headers, body })
    const text = await r.text()

    res.setHeader("x-proxied-endpoint", target)
    for (const [k, v] of r.headers.entries()) {
      if (k.toLowerCase() === "set-cookie") continue
      res.setHeader(k, v)
    }
    return res.status(r.status).send(text)
  } catch (e: any) {
    res.setHeader("x-proxy-error", String(e?.message || e))
    return res.status(502).json({ message: "Proxy to backend failed", error: String(e?.message || e) })
  }
}


