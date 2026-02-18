import { useEffect } from 'react'
import { useToast } from './use-toast'
import { useRouter } from 'next/navigation'

/**
 * Hook que escuta eventos de expiração de token
 * e mostra um toast ao usuário
 */
export function useTokenExpiredListener() {
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const handleTokenExpired = (event: Event) => {
      const customEvent = event as CustomEvent
      const message = customEvent.detail?.message || "Sua sessão expirou. Por favor, faça login novamente."

      toast({
        title: "Sessão Expirada",
        description: message,
        variant: "destructive",
        duration: 5000,
      })

      // Redirecionar para login após 2 segundos
      setTimeout(() => {

        router.push("/login")
      }, 2000)
    }

    window.addEventListener("token-expired", handleTokenExpired)

    return () => {
      window.removeEventListener("token-expired", handleTokenExpired)
    }
  }, [toast, router])
}
