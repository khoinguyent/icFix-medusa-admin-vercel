export default async function handler(req, res) {
  const backendUrl = process.env.MEDUSA_BACKEND_URL || 'https://icfix.duckdns.org'
  const url = `${backendUrl}${req.url}`
  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        ...req.headers,
        'host': undefined,
        'content-length': undefined,
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    })

    const data = await response.text()

    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        res.setHeader(key, value)
      } else if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value)
      }
    })

    res.status(response.status).send(data)
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ error: 'Proxy error' })
  }
}
