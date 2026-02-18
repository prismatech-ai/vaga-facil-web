"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, User, Calendar, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface Candidato {
  id: number
  nome: string
  email: string
  area_atuacao: string
}

interface PipelineItem {
  candidate_id: number
  candidato: Candidato
  job_id: number
  titulo_vaga: string
  status: string
  data_interesse?: string
  data_entrevista?: string
  resultado?: boolean
}

type StatusTab = "interesse" | "entrevistas" | "contratados"

export default function PipelinePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<StatusTab>("interesse")
  const [pipeline, setPipeline] = useState<PipelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineItem | null>(null)
  const [dataEntrevista, setDataEntrevista] = useState("")

  useEffect(() => {
    if (!authLoading && user) {
      carregarPipeline()
    } else if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  const carregarPipeline = async () => {
    try {
      setIsLoading(true)

      const response = await api.get<any>("/api/v1/pipeline/meus-candidatos")

      setPipeline(response?.pipeline || [])
    } catch (err: any) {

      toast({
        title: "❌ Erro",
        description: "Erro ao carregar pipeline de candidatos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const agendarEntrevista = async () => {
    if (!selectedCandidate || !dataEntrevista) {
      toast({
        title: "⚠️ Atenção",
        description: "Selecione uma data para a entrevista",
        variant: "default",
      })
      return
    }

    setIsProcessing(`${selectedCandidate.candidate_id}-entrevista`)
    try {
      const isoDate = new Date(dataEntrevista).toISOString()

      await api.post(
        `/api/v1/pipeline/candidato/${selectedCandidate.candidate_id}/agendar-entrevista?job_id=${selectedCandidate.job_id}&data_entrevista=${encodeURIComponent(isoDate)}`,
        {}
      )
      
      toast({
        title: "✅ Sucesso",
        description: "Entrevista agendada com sucesso!",
        variant: "default",
      })
      
      setModalOpen(false)
      setDataEntrevista("")
      carregarPipeline()
    } catch (err: any) {

      toast({
        title: "❌ Erro",
        description: err.message || "Erro ao agendar entrevista",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  const marcarContratacao = async (candidate_id: number, job_id: number, contratado: boolean) => {
    setIsProcessing(`${candidate_id}-resultado`)
    try {

      await api.post(
        `/api/v1/pipeline/candidato/${candidate_id}/marcar-resultado?job_id=${job_id}&foi_contratado=${contratado}`,
        {}
      )
      
      toast({
        title: "✅ Sucesso",
        description: contratado ? "Candidato marcado como contratado!" : "Candidato marcado como rejeitado",
        variant: "default",
      })
      
      carregarPipeline()
    } catch (err: any) {

      toast({
        title: "❌ Erro",
        description: err.message || "Erro ao marcar resultado",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  const filtrarPorStatus = () => {
    switch (activeTab) {
      case "interesse":
        return pipeline.filter(p => p.status === "interesse" || !p.data_entrevista)
      case "entrevistas":
        return pipeline.filter(p => p.data_entrevista && p.resultado === undefined)
      case "contratados":
        return pipeline.filter(p => p.resultado === true)
      default:
        return pipeline
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  const candidatosFiltrados = filtrarPorStatus()

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pipeline de Candidatos</h1>
          <p className="text-gray-600 mt-2">Gerencie candidatos e entrevistas</p>
        </div>
        <Button 
          variant="outline"
          onClick={carregarPipeline}
          disabled={isLoading}
        >
          🔄 Atualizar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "interesse", label: "📬 Interesse", count: pipeline.filter(p => !p.data_entrevista).length },
          { key: "entrevistas", label: "📅 Agendadas", count: pipeline.filter(p => p.data_entrevista && p.resultado === undefined).length },
          { key: "contratados", label: "✅ Resultado", count: pipeline.filter(p => p.resultado !== undefined).length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as StatusTab)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#03565C] text-[#03565C]"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
            <p className="mt-4 text-gray-600">Carregando pipeline...</p>
          </div>
        </div>
      ) : candidatosFiltrados.length === 0 ? (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Nenhum candidato nesta etapa. {activeTab === "interesse" && "Indique interesse em candidatos para populat este pipeline."}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {candidatosFiltrados.map((item) => (
            <Card key={`${item.candidate_id}-${item.job_id}`} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#03565C]/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-[#03565C]" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.candidato.nome}</CardTitle>
                        <CardDescription>{item.candidato.email}</CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{item.titulo_vaga}</p>
                    <p className="text-xs text-gray-600">{item.candidato.area_atuacao}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Timeline */}
                <div className="space-y-3 py-4 border-t border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-[#03565C]" />
                      <div className="w-0.5 h-8 bg-gray-300" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Interesse Demonstrado</p>
                      <p className="text-sm font-medium">
                        {item.data_interesse ? new Date(item.data_interesse).toLocaleDateString("pt-BR") : "Hoje"}
                      </p>
                    </div>
                  </div>

                  {item.data_entrevista && (
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                        <div className="w-0.5 h-8 bg-gray-300" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Entrevista Agendada</p>
                        <p className="text-sm font-medium">
                          {new Date(item.data_entrevista).toLocaleDateString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {item.resultado !== undefined && (
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full ${item.resultado ? "bg-green-500" : "bg-red-500"}`} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Resultado Final</p>
                        <p className={`text-sm font-medium ${item.resultado ? "text-green-700" : "text-red-700"}`}>
                          {item.resultado ? "✅ Contratado" : "❌ Não Selecionado"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {!item.data_entrevista && item.resultado === undefined && (
                    <Button 
                      onClick={() => {
                        setSelectedCandidate(item)
                        setModalOpen(true)
                      }}
                      className="flex-1 bg-[#03565C] hover:bg-[#024147]"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar Entrevista
                    </Button>
                  )}

                  {item.data_entrevista && item.resultado === undefined && (
                    <>
                      <Button 
                        variant="outline"
                        onClick={() => marcarContratacao(item.candidate_id, item.job_id, false)}
                        disabled={isProcessing === `${item.candidate_id}-resultado`}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {isProcessing === `${item.candidate_id}-resultado` ? "..." : "Rejeitar"}
                      </Button>
                      <Button 
                        onClick={() => marcarContratacao(item.candidate_id, item.job_id, true)}
                        disabled={isProcessing === `${item.candidate_id}-resultado`}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {isProcessing === `${item.candidate_id}-resultado` ? "..." : "Contratar"}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para agendar entrevista */}
      {modalOpen && selectedCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle>Agendar Entrevista</CardTitle>
              <CardDescription>
                {selectedCandidate.candidato.nome} - {selectedCandidate.titulo_vaga}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data-entrevista">Data e Hora da Entrevista</Label>
                <Input
                  id="data-entrevista"
                  type="datetime-local"
                  value={dataEntrevista}
                  onChange={(e) => setDataEntrevista(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={isProcessing === `${selectedCandidate.candidate_id}-entrevista`}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={agendarEntrevista}
                  disabled={isProcessing === `${selectedCandidate.candidate_id}-entrevista` || !dataEntrevista}
                  className="flex-1 bg-[#03565C] hover:bg-[#024147]"
                >
                  {isProcessing === `${selectedCandidate.candidate_id}-entrevista` ? "Agendando..." : "Agendar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
