/**
 * Cliente HTTP com refresh token automático
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Evento customizado para notificar quando token expirar
export function dispatchTokenExpiredEvent(message: string = "Sua sessão expirou. Por favor, faça login novamente.") {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("token-expired", {
      detail: { message },
    })
    window.dispatchEvent(event)
  }
}

// Decodifica payload JWT
function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1]
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Extrai user_id do JWT
export function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null
  const payload = decodeJwtPayload(token)
  return payload?.sub || payload?.user_id || payload?.id || null
}

function isTokenExpired(token: string | null) {
  if (!token) return true
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp <= now + 30
}

async function tryRefreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null

  const refreshToken = localStorage.getItem("refresh_token")
  if (!refreshToken) {
    return null
  }

  try {
    const endpoints = [
      `${API_URL}/api/v1/auth/refresh`,  // Com versão da API
      `${API_URL}/auth/refresh`,          // Sem versão
    ]

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (!data) {
            continue
          }

          const newAccess = data.access_token || data.token || null
          const newRefresh = data.refresh_token || null

          if (newAccess) {
            localStorage.setItem("token", newAccess)
            if (newRefresh) localStorage.setItem("refresh_token", newRefresh)
            return newAccess
          }
        }
      } catch (err) {
        continue
      }
    }

    // Se chegou aqui, nenhum endpoint funcionou
    localStorage.removeItem("token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    dispatchTokenExpiredEvent("Sua sessão expirou. Por favor, faça login novamente.")
    return null
  } catch (err) {
    localStorage.removeItem("token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    dispatchTokenExpiredEvent("Erro ao renovar sessão. Por favor, faça login novamente.")
    return null
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let url = `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  }

  let token: string | null = null
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token")
    
    // If token not found, try alternative keys
    if (!token) {
      token = localStorage.getItem("access_token") || localStorage.getItem("accessToken") || localStorage.getItem("auth_token")
    }
    
    if (token) {
      if (isTokenExpired(token)) {
        token = await tryRefreshToken()
      }
    }
  }
  
  if (token) defaultHeaders["Authorization"] = `Bearer ${token}`

  // Adicionar user_id como query parameter para endpoints que precisam
  let userId = typeof window !== "undefined" ? getUserIdFromToken(token) : null
  
  if (endpoint.includes("onboarding")) {
    if (!userId && token) {
      userId = getUserIdFromToken(token)
    }
    
    if (userId) {
      const separator = url.includes("?") ? "&" : "?"
      url += `${separator}user_id=${userId}`
    }
  }

  // Adicionar user_id ao payload para requisições POST/PUT/PATCH se necessário
  let body = options.body
  const method = options.method || "GET"
  if ((method === "POST" || method === "PUT" || method === "PATCH") && body) {
    try {
      const data = JSON.parse(body as string)
      // Se o payload não tiver user_id e o endpoint mencionar onboarding, adicionar user_id
      if (!data.user_id && endpoint.includes("onboarding")) {
        if (!userId && token) {
          userId = getUserIdFromToken(token)
        }
        if (userId) {
          data.user_id = userId
          body = JSON.stringify(data)
        }
      }
    } catch (e) {
      // Se não for JSON válido, ignorar
    }
  }

  const config: RequestInit = {
    ...options,
    body,
    headers: { ...defaultHeaders, ...options.headers },
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    // Se desautorizado → tentar refresh
    if (response.status === 401) {
      const refreshed = await tryRefreshToken()
      if (refreshed) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${refreshed}`,
        }

        const retry = await fetch(url, config)
        
        if (retry.ok) {
          return retry.json()
        }

        localStorage.removeItem("token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user")
        dispatchTokenExpiredEvent("Sua sessão expirou. Por favor, faça login novamente.")
      } else {
        localStorage.removeItem("token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user")
        dispatchTokenExpiredEvent("Sua sessão expirou. Por favor, faça login novamente.")
      }
    }

    const errorData = await response.json().catch(() => ({ message: "Erro na requisição" }))
    // Converte erro para string, tratando objetos
    let errorMessage = `Erro ${response.status}`
    if (errorData.detail) errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail)
    else if (errorData.message) errorMessage = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message)
    else if (errorData.error) errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error)
    throw new Error(errorMessage)
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "DELETE" }),
}

export default api
