import type { VercelRequest, VercelResponse } from '@vercel/node'

const BACKEND = process.env.MEDUSA_BACKEND_URL

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!BACKEND) return res.status(500).json({ message: 'MEDUSA_BACKEND_URL is not set' })

  if (req.method === 'POST') {
    // Login → /auth/admin/emailpass
    const r = await fetch(`${BACKEND}/auth/admin/emailpass`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    })
    const data = await r.json().catch(() => ({}))
    res.setHeader('x-proxied-endpoint', `${BACKEND}/auth/admin/emailpass`)

    const token = (data as any)?.token
    if (r.ok && token) {
      res.setHeader('Set-Cookie', `medusa_admin_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60*60*24*7}`)
    }
    return res.status(r.status).json(data)
  }

  if (req.method === 'GET') {
    // Session check → ✅ /admin/auth
    const token = (req.headers.cookie || '')
      .split(';').map(s => s.trim())
      .find(c => c.startsWith('medusa_admin_token='))?.split('=')[1]

    const r = await fetch(`${BACKEND}/admin/auth`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
    const data = await r.json().catch(() => ({}))
    res.setHeader('x-proxied-endpoint', `${BACKEND}/admin/auth`)
    return res.status(r.status).json(data)
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', 'medusa_admin_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0')
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ message: 'Method Not Allowed' })
}


