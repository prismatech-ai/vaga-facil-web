"use client"

import { useTokenExpiredListener } from "@/hooks/use-token-expired-listener"

/**
 * Componente que monitora expiração de token
 * Deve ser colocado no layout principal
 */
export function TokenExpiredListener() {
  useTokenExpiredListener()
  return null
}
