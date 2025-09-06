function getCookie(req, name) {
  const raw = (req.headers && req.headers.cookie) ? String(req.headers.cookie) : ""
  const parts = raw.split(";")
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return decodeURIComponent(rest.join("="))
  }
  return ""
}
module.exports = { getCookie }


