export function getCookie(req: any, name: string): string {
  const raw = (req.headers?.cookie as string) || ""
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=")
    if (k === name) return decodeURIComponent(rest.join("="))
  }
  return ""
}


