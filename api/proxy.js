module.exports = async function handler(req, res) {
  const backendUrl = process.env.MEDUSA_BACKEND_URL || 'https://icfix.duckdns.org'

  // Strip the serverless prefix so "/api/proxy/admin/..." -> "/admin/..."
  const forwardedPath = (req.url || '').replace(/^\/api\/proxy/, '')
  const url = `${backendUrl}${forwardedPath}`

  try {
    const headers = {}
    for (const [k, v] of Object.entries(req.headers || {})) {
      const lower = k.toLowerCase()
      if (['host', 'content-length', 'connection', 'accept-encoding'].includes(lower)) continue
      headers[k] = Array.isArray(v) ? v.join(',') : v
    }

    const method = req.method || 'GET'
    const hasBody = !['GET', 'HEAD'].includes(method)
    const body = hasBody ? (typeof req.body === 'string' ? req.body : (req.body ? JSON.stringify(req.body) : undefined)) : undefined

    const response = await fetch(url, { method, headers, body })
    const data = await response.text()

    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (['content-encoding', 'transfer-encoding'].includes(lower)) return
      res.setHeader(key, value)
    })

    res.status(response.status).send(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ error: 'Proxy error' })
  }
}
