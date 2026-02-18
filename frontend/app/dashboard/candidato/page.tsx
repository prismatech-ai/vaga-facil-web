"use client"

import { useEffect, useState } from "react"
import { CandidatoDashboard } from "@/components/candidato-dashboard"
import { api } from "@/lib/api"

interface CandidatoData {
  id?: number
  full_name?: string
  email?: string
  phone?: string
  area_atuacao?: string
  bio?: string
  linkedin_url?: string
  portfolio_url?: string
  resume_url?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  birth_date?: string
  cpf?: string
  rg?: string
  genero?: string
  estado_civil?: string
}

export default function CandidatoDashboardPage() {
  const [candidatoData, setCandidatoData] = useState<CandidatoData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get<CandidatoData>("/api/v1/candidates/me")
        setCandidatoData(response)
      } catch (error) {

      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <CandidatoDashboard
      areaAtuacao={candidatoData?.area_atuacao || ""}
      nomeCompleto={candidatoData?.full_name || ""}
      perfilCompleto={false}
      candidatoData={candidatoData}
    />
  )
}
