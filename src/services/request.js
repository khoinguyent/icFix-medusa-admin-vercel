import axios from "axios"
import { medusaUrl } from "./config"

const client = axios.create({ baseURL: medusaUrl, withCredentials: true })

function parseCookie(name) {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[1]) : null
}

function getAdminJwt() {
  const fromCookie = parseCookie("admin_jwt")
  if (fromCookie) return fromCookie
  if (typeof localStorage !== "undefined") {
    const fromLS = localStorage.getItem("admin_jwt")
    if (fromLS) return fromLS
  }
  return null
}

function setAdminJwt(token) {
  try {
    if (!token) return
    const secure = typeof window !== "undefined" && window.location.protocol === "https:"
    const attrs = ["Path=/", "SameSite=None"].concat(secure ? ["Secure"] : [])
    document.cookie = `admin_jwt=${encodeURIComponent(token)}; ${attrs.join("; ")}`
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("admin_jwt", token)
    }
  } catch (_) {}
}

function clearAdminJwt() {
  try {
    document.cookie = "admin_jwt=; Path=/; Max-Age=0"
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("admin_jwt")
    }
  } catch (_) {}
}

client.interceptors.request.use((config) => {
  const token = getAdminJwt()
  if (token) {
    config.headers = config.headers || {}
    if (!config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${token}`
    }
  }
  return config
})

export default async function medusaRequest(method, path = "", payload = {}) {
  const options = {
    method,
    url: path,
    data: payload,
    json: true,
  }
  const response = await client(options)

  // Persist token on login and clear on logout to support local dev and environments without cookie sessions
  try {
    const isAuthPath = String(path).replace(/\/$/, "") === "/admin/auth"
    if (isAuthPath && method === "POST" && response?.data?.token) {
      setAdminJwt(response.data.token)
    }
    if (isAuthPath && method === "DELETE") {
      clearAdminJwt()
    }
  } catch (_) {}

  return response
}
