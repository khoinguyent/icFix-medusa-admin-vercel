const { getCookie } = require("../_utils/cookies")
const { getSetCookies, hardenCookieAttributes, cookieNames } = require("../_utils/headers")

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

function ensureArray(val) { return Array.isArray(val) ? val : (val ? [val] : []) }

async function createSessionWithFallback(jwt) {
  const attempts = ["/auth/session", "/auth/admin/session"]
  for (const path of attempts) {
    const r = await fetch(`${BACKEND}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    })
    if (r.ok) {
      const cookies = getSetCookies(r).map(hardenCookieAttributes)
      return { ok: true, cookies, endpointTried: path, status: r.status }
    }
    if (r.status >= 500) return { ok: false, cookies: [], endpointTried: path, status: r.status }
  }
  return { ok: false, cookies: [], endpointTried: "both", status: 401 }
}

module.exports = async function handler(req, res) {
  if (!BACKEND) return res.status(500).json({ message: "MEDUSA_BACKEND_URL is not set" })
  try {
    if (req.method === "POST") {
      const creds = parseBody(req)
      const login = await fetch(`${BACKEND}/auth/admin/emailpass`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(creds),
      })
      const loginTxt = await login.text()
      let loginData; try { loginData = JSON.parse(loginTxt) } catch { loginData = { raw: loginTxt } }

      const cookiesOut = []
      const token = loginData && loginData.token
      let sessionInfo = { ok: false, cookies: [], endpointTried: "" }
      if (login.ok && token) {
        sessionInfo = await createSessionWithFallback(token)
        cookiesOut.push(...sessionInfo.cookies)
        cookiesOut.push(`medusa_admin_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60*60*24*7}`)
      }
      if (cookiesOut.length) res.setHeader("Set-Cookie", cookiesOut)

      res.setHeader("x-proxied-endpoint", `${BACKEND}/auth/admin/emailpass`)
      res.setHeader("x-session-created", String(sessionInfo.ok))
      res.setHeader("x-session-endpoint", sessionInfo.endpointTried || "")
      res.setHeader("x-set-cookie-names", cookieNames(cookiesOut).join(","))
      return res.status(login.status).send(loginTxt)
    }

    if (req.method === "GET") {
      const bearer = getCookie(req, "medusa_admin_token")
      const fwdCookie = req.headers.cookie || ""
      const headers = {}
      if (bearer) headers["authorization"] = `Bearer ${bearer}`
      if (fwdCookie) headers["cookie"] = fwdCookie

      const r = await fetch(`${BACKEND}/admin/users/me`, { method: "GET", headers, cache: "no-store" })
      const text = await r.text()
      res.setHeader("x-proxied-endpoint", `${BACKEND}/admin/users/me`)
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


