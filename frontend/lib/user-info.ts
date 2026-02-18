/**
 * Utilitários para extrair informações do usuário do JWT
 */

export function decodeJwtPayload(token: string): any {
  try {
    const payload = token.split(".")[1]
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null
  const payload = decodeJwtPayload(token)
  return payload?.sub || payload?.user_id || payload?.id || null
}

export function getUserInfoFromToken(token: string | null) {
  if (!token) return null
  const payload = decodeJwtPayload(token)
  
  if (!payload) return null
  
  return {
    userId: payload?.sub || payload?.user_id || payload?.id || null,
    email: payload?.email || null,
    name: payload?.name || payload?.full_name || null,
    type: payload?.type || payload?.user_type || null,
    roles: payload?.roles || [],
    exp: payload?.exp ? new Date(payload.exp * 1000) : null,
    iat: payload?.iat ? new Date(payload.iat * 1000) : null,
    rawPayload: payload,
  }
}

/**
 * Log útil para debugging - mostra informações do usuário atual
 */
export function logCurrentUser() {
  if (typeof window === "undefined") return
  
  const token = localStorage.getItem("token")
  if (!token) {
    return
  }
  
  const userInfo = getUserInfoFromToken(token)
  if (!userInfo) {
    return
  }
}
