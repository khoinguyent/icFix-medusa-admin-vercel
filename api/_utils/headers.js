function getSetCookies(resp) {
  try {
    if (resp && resp.headers && typeof resp.headers.getSetCookie === "function") {
      const arr = resp.headers.getSetCookie()
      if (Array.isArray(arr)) return arr
    }
  } catch {}
  const single = resp && resp.headers && resp.headers.get && resp.headers.get("set-cookie")
  if (!single) return []
  return single.split(/,(?=[^;]+=[^;]+)/g).map(s => s.trim())
}
function hardenCookieAttributes(c) {
  let out = c
  if (!/;\s*Path=/i.test(out)) out += "; Path=/"
  if (!/;\s*HttpOnly/i.test(out)) out += "; HttpOnly"
  if (!/;\s*Secure/i.test(out)) out += "; Secure"
  if (!/;\s*SameSite=/i.test(out)) out += "; SameSite=Lax"
  return out
}
function cookieNames(list) {
  return list.map(c => (c.split(";")[0] || "").split("=")[0]).filter(Boolean)
}
module.exports = { getSetCookies, hardenCookieAttributes, cookieNames }
