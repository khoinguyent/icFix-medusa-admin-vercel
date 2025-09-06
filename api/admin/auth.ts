// Vercel Serverless Function to proxy Admin auth routes to Medusa backend
// Handles:
// - POST /api/admin/auth  -> POST {backend}/auth/admin/emailpass
// - GET  /api/admin/auth  -> GET  {backend}/admin/auth (session)
// - DELETE /api/admin/auth -> DELETE {backend}/admin/auth (logout)

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

  const targetUrl = (() => {
    switch (method) {
      case "POST":
        return `${backendBase}/auth/admin/emailpass`
      case "GET":
      case "DELETE":
        return `${backendBase}/auth`
      default:
        return ""
    }
  })()

  if (!targetUrl) {
    res.setHeader("Allow", "GET,POST,DELETE")
    res.status(405).json({ message: `Method ${method} Not Allowed` })
    return
  }

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-forwarded-host": req.headers["host"] || "",
      "x-forwarded-proto": req.headers["x-forwarded-proto"] as string || "https",
      "user-agent": (req.headers["user-agent"] as string) || "",
    }

    // Forward cookies for session/logout flows
    if (req.headers.cookie) {
      headers["cookie"] = req.headers.cookie as string
    }

    const init: RequestInit = {
      method,
      headers,
    }

    if (method === "POST") {
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {})
    }

    const response = await fetch(targetUrl, init)

    // Forward Set-Cookie header(s) to the client (important for auth session)
    const raw = (response.headers as any).raw?.()
    const cookieArray: string[] | undefined = raw?.["set-cookie"]
    const single = response.headers.get("set-cookie")
    if (cookieArray && cookieArray.length) {
      res.setHeader("set-cookie", cookieArray)
    } else if (single) {
      res.setHeader("set-cookie", single)
    }

    // Mirror response status and body
    const text = await response.text()
    let payload: any = text
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      // non-JSON
    }

    // Mirror content-type back to client
    const ct = response.headers.get("content-type") || "application/json"
    res.setHeader("content-type", ct)
    res.status(response.status).send(payload)
  } catch (err: any) {
    const message = err?.message || "Proxy request failed"
    res.status(502).json({ message })
  }
}


