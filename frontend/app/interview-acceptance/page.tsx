"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { AceiteEntrevista } from "@/components/aceite-entrevista"
import { useEffect, useState, Suspense } from "react"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

function InterviewAcceptanceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [detalhesAceite, setDetalhesAceite] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Params da URL - suporta ambos vaga_candidato_id e vaga_id (legado)
  const vagaCandidatoId = searchParams.get("vaga_candidato_id") || searchParams.get("vaga_id")

  // Carregar detalhes do aceite via API do workflow
  useEffect(() => {
    const carregarDetalhes = async () => {
      if (!vagaCandidatoId) {
        setErro("ID do convite não informado")
        setIsLoading(false)
        setMounted(true)
        return
      }

      try {
        setIsLoading(true)
        
        // Usar endpoint do workflow
        const response = await api.get<any>(`/workflow/aceite-entrevista/${vagaCandidatoId}`)
        
        if (!response.valido) {
          setErro(response.motivo || "Convite inválido ou expirado")
        } else {
          setDetalhesAceite(response)
        }
      } catch (err: any) {
        // Fallback para API legada se workflow não disponível
        try {
          const legacyResponse = await api.get<any>("/api/v1/candidato/vagas-sugeridas")
          if (legacyResponse?.vagas_sugeridas && Array.isArray(legacyResponse.vagas_sugeridas)) {
            const vaga = legacyResponse.vagas_sugeridas.find((v: any) => v.vaga_id === parseInt(vagaCandidatoId))
            if (vaga) {
              setDetalhesAceite({
                valido: true,
                vaga: { titulo: vaga.titulo_vaga },
                empresa: { nome: vaga.empresa?.nome || "Empresa" },
                data_interesse: vaga.interesse?.data_interesse || new Date().toISOString()
              })
            } else {
              setErro("Convite não encontrado")
            }
          }
        } catch {
          setErro(err.response?.data?.detail || "Erro ao carregar dados do convite")
        }
      } finally {
        setIsLoading(false)
        setMounted(true)
      }
    }

    carregarDetalhes()
  }, [vagaCandidatoId])

  const handleAccept = async (id: string) => {
    try {
      // Tentar novo endpoint primeiro
      try {
        await api.post(`/workflow/aceite-entrevista/${vagaCandidatoId}/responder?aceitar=true`, {})
      } catch {
        // Fallback para endpoint legado
        await api.post(`/api/v1/candidato/aceitar-entrevista/${vagaCandidatoId}`, {})
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || "Erro ao aceitar entrevista"
      alert(`❌ ${errorMsg}`)
    }
  }

  const handleReject = async (id: string) => {
    try {
      // Tentar novo endpoint
      await api.post(`/workflow/aceite-entrevista/${vagaCandidatoId}/responder?aceitar=false`, {})
    } catch {
      // Se falhar, apenas redireciona
    }
    router.push("/dashboard/candidato")
  }

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
          <p className="mt-4 text-gray-600">Carregando informações do convite...</p>
        </div>
      </div>
    )
  }

  // Tela de erro
  if (erro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Convite Inválido
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-600 mb-6">{erro}</p>
            <button
              onClick={() => router.push("/dashboard/candidato")}
              className="w-full py-3 bg-[#03565C] text-white rounded-lg hover:bg-[#024950] transition-colors"
            >
              Voltar ao Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dados do aceite
  const nomeEmpresa = detalhesAceite?.empresa?.nome || "Empresa"
  const vagaTitulo = detalhesAceite?.vaga?.titulo || "Vaga"
  const dataConvite = detalhesAceite?.data_interesse || new Date().toISOString()

  return (
    <AceiteEntrevista
      conviteId={vagaCandidatoId || ""}
      empresaNome={nomeEmpresa}
      vagaTitulo={vagaTitulo}
      dataConvite={dataConvite}
      competenciasRequeridas={[]}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  )
}

export default function InterviewAcceptancePage() {
  return (
    <Suspense fallback={null}>
      <InterviewAcceptanceContent />
    </Suspense>
  )
}
