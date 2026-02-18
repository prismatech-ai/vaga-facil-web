"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"

export default function ConfiguracoesPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar para a nova página de Meu Perfil
    router.replace("/empresa/meu-perfil")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
    </div>
  )
}

