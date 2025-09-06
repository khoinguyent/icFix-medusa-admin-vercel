import type { VercelRequest, VercelResponse } from "@vercel/node"

const BACKEND = process.env.MEDUSA_BACKEND_URL

function parseBody(req: VercelRequest): Record<string, any> {
  const ct = String(req.headers["content-type"] || "").toLowerCase()
  try {
    if (ct.includes("application/json")) {
      if (typeof req.body === "string") return JSON.parse(req.body || "{}")
      if (typeof req.body === "object" && req.body) return req.body as any
      return {}
    }
    if (ct.includes("application/x-www-form-urlencoded")) {
      const raw = typeof req.body === "string" ? req.body : ""
      return Object.fromEntries(new URLSearchParams(raw))
    }
  } catch {}
  if (typeof req.body === "object" && req.body) return req.body as any
  return {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!BACKEND) return res.status(500).json({ message: "MEDUSA_BACKEND_URL is not set" })

  if (req.method === "POST") {
    const creds = parseBody(req)
    const r = await fetch(`${BACKEND}/auth/admin/emailpass`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(creds),
    })
    const text = await r.text()
    let data: any; try { data = JSON.parse(text) } catch { data = { raw: text } }

    res.setHeader("x-proxied-endpoint", `${BACKEND}/auth/admin/emailpass`)

    const token = data?.token
    if (r.ok && token) {
      res.setHeader("Set-Cookie", `medusa_admin_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60*60*24*7}`)
    }
    return res.status(r.status).json(data)
  }

  if (req.method === "GET") {
    const token = (req.headers.cookie || "")
      .split(";").map((s) => s.trim())
      .find((c) => c.startsWith("medusa_admin_token="))?.split("=")[1]

    const r = await fetch(`${BACKEND}/admin/auth`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    })
    const text = await r.text()
    let data: any; try { data = JSON.parse(text) } catch { data = { raw: text } }

    res.setHeader("x-proxied-endpoint", `${BACKEND}/admin/auth`)
    return res.status(r.status).json(data)
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", "medusa_admin_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0")
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ message: "Method Not Allowed" })
}


