"use client"

import { useRouter } from "next/navigation"
import { CadastroVaga } from "@/components/cadastro-vaga"

export default function CadastroVagaPage() {
  const router = useRouter()

  const handlePublish = (vaga: any) => {
    router.push("/empresa/jobs/list")
  }

  return <CadastroVaga onSubmit={handlePublish} />
}
