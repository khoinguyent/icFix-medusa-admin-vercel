import type { VercelRequest, VercelResponse } from "@vercel/node"

const getBackendUrl = (): string => {
  const url = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  if (!url) {
    throw new Error(
      "Missing MEDUSA_BACKEND_URL (or NEXT_PUBLIC_MEDUSA_BACKEND_URL) env var. Set it to your Medusa backend, e.g. https://your-backend-domain:9000"
    )
  }
  return url.replace(/\/$/, "")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let backendBase: string
  try {
    backendBase = getBackendUrl()
  } catch (e: any) {
    res.status(500).json({ message: e.message || "Backend URL not configured" })
    return
  }

  const method = req.method || "GET"
  const restPath = Array.isArray(req.query.path) ? req.query.path.join("/") : String(req.query.path || "")

  // Special-case Medusa v2 admin auth login path
  const isAdminAuth = restPath.replace(/^\//, "") === "admin/auth"
  const targetUrl = isAdminAuth && method === "POST"
    ? `${backendBase}/auth/admin/emailpass`
    : `${backendBase}/${restPath}`.replace(/\/$/, "")

  try {
    const headers: Record<string, string> = {
      "content-type": req.headers["content-type"] as string || "application/json",
      "x-forwarded-host": req.headers["host"] || "",
      "x-forwarded-proto": (req.headers["x-forwarded-proto"] as string) || "https",
      "user-agent": (req.headers["user-agent"] as string) || "",
    }

    if (req.headers.cookie) {
      headers["cookie"] = req.headers.cookie as string
    }

    const init: RequestInit = {
      method,
      headers,
    }

    if (method !== "GET" && method !== "HEAD") {
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})
    }

    const response = await fetch(targetUrl, init)

    const setCookies = (response.headers as any).getSetCookie?.() || []
    if (setCookies.length) {
      res.setHeader("set-cookie", setCookies)
    }

    const buf = await response.arrayBuffer()
    res.status(response.status)
    // Mirror content-type back to client
    const ct = response.headers.get("content-type") || "application/json"
    res.setHeader("content-type", ct)
    res.send(Buffer.from(buf))
  } catch (err: any) {
    const message = err?.message || "Proxy request failed"
    res.status(502).json({ message })
  }
}


