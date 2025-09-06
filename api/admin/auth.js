const { getCookie } = require("../_utils/cookies")

const BACKEND = process.env.MEDUSA_BACKEND_URL

function parseBody(req) {
  const ct = String(req.headers["content-type"] || "").toLowerCase()
  try {
    if (ct.includes("application/json")) {
      if (typeof req.body === "string") return JSON.parse(req.body || "{}")
      if (req.body && typeof req.body === "object") return req.body
      return {}
    }
    if (ct.includes("application/x-www-form-urlencoded")) {
      const raw = typeof req.body === "string" ? req.body : ""
      return Object.fromEntries(new URLSearchParams(raw))
    }
  } catch {}
  if (req.body && typeof req.body === "object") return req.body
  return {}
}

module.exports = async function handler(req, res) {
  if (!BACKEND) return res.status(500).json({ message: "MEDUSA_BACKEND_URL is not set" })
  try {
    if (req.method === "POST") {
      const creds = parseBody(req)
      const r = await fetch(`${BACKEND}/auth/admin/emailpass`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(creds),
      })

      // capture backend cookies
      const setCookie = r.headers.get("set-cookie") || ""
      const cookiesOut = []
      if (setCookie) {
        for (const part of setCookie.split(/,(?=[^;]+=[^;]+)/g)) {
          let c = part.trim()
          if (!/;\s*Path=/i.test(c)) c += "; Path=/"
          if (!/;\s*HttpOnly/i.test(c)) c += "; HttpOnly"
          if (!/;\s*Secure/i.test(c)) c += "; Secure"
          if (!/;\s*SameSite=/i.test(c)) c += "; SameSite=Lax"
          cookiesOut.push(c)
        }
      }

      const text = await r.text()
      let data; try { data = JSON.parse(text) } catch { data = { raw: text } }

      // also set our JWT cookie if present
      const token = data && data.token
      if (r.ok && token) {
        cookiesOut.push(`medusa_admin_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60*60*24*7}`)
      }
      if (cookiesOut.length) res.setHeader("Set-Cookie", cookiesOut)

      res.setHeader("x-proxied-endpoint", `${BACKEND}/auth/admin/emailpass`)
      res.setHeader("x-set-cookie-count", String(cookiesOut.length))
      return res.status(r.status).send(text)
    }

    if (req.method === "GET") {
      const bearer = getCookie(req, "medusa_admin_token")
      const fwdCookie = req.headers.cookie || ""
      const headers = {}
      if (bearer) headers["authorization"] = `Bearer ${bearer}`
      if (fwdCookie) headers["cookie"] = fwdCookie

      const r = await fetch(`${BACKEND}/admin/auth`, { headers, cache: "no-store" })
      const text = await r.text()
      res.setHeader("x-proxied-endpoint", `${BACKEND}/admin/auth`)
      res.setHeader("x-forwarded-cookies", fwdCookie ? fwdCookie.split(";").map(s=>s.trim().split("=")[0]).join(",") : "")
      res.setHeader("x-bearer-present", bearer ? "true" : "false")
      return res.status(r.status).send(text)
    }

    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", [
        "medusa_admin_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
        "connect.sid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
      ])
      return res.status(200).json({ ok: true })
    }

    return res.status(405).json({ message: "Method Not Allowed" })
  } catch (e) {
    res.setHeader("x-proxy-error", String((e && e.message) || e))
    return res.status(502).json({ message: "Proxy to backend failed", error: String((e && e.message) || e) })
  }
}


