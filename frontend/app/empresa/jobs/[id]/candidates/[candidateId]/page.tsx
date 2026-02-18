"use client"

import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { DetalhesCandidatoAnonimos } from "@/components/detalhe-candidato-anonimo"
import { DetalhesCandidatoDadosLiberados } from "@/components/detalhe-candidato-dados-liberados"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function CandidateDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const jobId = params.id as string
  const candidateId = params.candidateId as string

  // Simulate checking if data is unlocked
  // In production, this would come from backend
  const [isDataUnlocked, setIsDataUnlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [unlockedData, setUnlockedData] = useState<any>(null)

  const competenciasArray = [
    { nome: "React", nivelDeclarado: 4 as const, testeScore: 92 },
    { nome: "TypeScript", nivelDeclarado: 4 as const, testeScore: 88 },
    { nome: "Node.js", nivelDeclarado: 3 as const, testeScore: 85 },
    { nome: "PostgreSQL", nivelDeclarado: 2 as const, testeScore: 78 },
    { nome: "Docker", nivelDeclarado: 3 as const, testeScore: 82 },
  ]


  const handleShowInterest = async () => {
    setIsLoading(true)
    try {
      // Usar a nova rota que aceita id_anonimo
      const response = await api.post(
        `/api/v1/pipeline/candidato-anonimo/${candidateId}/indicar-interesse?job_id=${jobId}`
      ) as any
      
      toast({
        title: "Sucesso!",
        description: "Interesse demonstrado com sucesso. Você pode agora enviar um convite de entrevista.",
        variant: "default",
      })
      
      // Armazenar dados descompactados
      if (response?.data) {
        setUnlockedData(response.data)
      }
      
      // Simular unlock de dados após demonstrar interesse
      setIsDataUnlocked(true)
    } catch (error: any) {

      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Erro ao demonstrar interesse"
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/empresa/jobs/${jobId}/kanban`)
  }

  if (!isDataUnlocked) {
    return (
      <DetalhesCandidatoAnonimos
        candidatoId={candidateId}
        competencias={competenciasArray}
        onDemonstraInteresse={handleShowInterest}
        onBack={handleBack}
        isLoading={isLoading}
      />
    )
  }

  return (
    <DetalhesCandidatoDadosLiberados
      candidatoId={candidateId}
      dadosPessoais={unlockedData?.dadosPessoais || {}}
      competencias={competenciasArray}
      onBack={handleBack}
    />
  )
}
