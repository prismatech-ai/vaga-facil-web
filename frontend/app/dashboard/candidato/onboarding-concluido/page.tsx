"use client"

import { useRouter } from "next/navigation"
import { OnboardingConcluido } from "@/components/onboarding-concluido"

export default function OnboardingConcluidoPage() {
  const router = useRouter()

  const handleGoDashboard = () => {
    router.push("/dashboard/candidato")
  }

  return (
    <OnboardingConcluido
      areaAtuacao="Frontend"
      vagasDisponiveisPorArea={{
        frontend: 48,
        backend: 62,
        fullstack: 35,
        devops: 18,
        qa: 24,
        datascience: 15,
        mobile: 31,
        infraestrutura: 12,
      }}
      onGoDashboard={handleGoDashboard}
    />
  )
}
