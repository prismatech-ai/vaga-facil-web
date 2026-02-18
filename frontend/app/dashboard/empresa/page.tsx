"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { AlertCircle, Calendar, CheckCircle2, XCircle, Search, Eye, Edit2, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VagaSummary {
  id: string
  titulo: string
  status: string
  candidatos_count: number
}

interface Candidato {
  id_anonimo: string
  nome?: string
  email?: string
  area_atuacao?: string
  estado?: string
  cidade?: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "aberta":
      return "bg-green-100 text-green-800"
    case "fechada":
      return "bg-red-100 text-red-800"
    case "rascunho":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export default function EmpresaDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [vagas, setVagas] = useState<VagaSummary[]>([])
  const [allVagas, setAllVagas] = useState<VagaSummary[]>([])
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingConvites, setIsLoadingConvites] = useState(true)
  const [stats, setStats] = useState({
    totalVagas: 0,
    vagasAbertas: 0,
    totalCandidatos: 0,
    convitesEnviados: 0,
    convitesAceitos: 0,
    taxaAceitacao: 0,
  })
  
  // Paginação de candidatos
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const CANDIDATOS_POR_PAGINA = 10
  
  // Filtros de candidatos
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroCidade, setFiltroCidade] = useState("")
  const [filtroIsPcd, setFiltroIsPcd] = useState<boolean | null>(null)
  const [filtroHabilidade, setFiltroHabilidade] = useState("")
  const [filtroGenero, setFiltroGenero] = useState("")
  const [filtroExperiencia, setFiltroExperiencia] = useState("")
  const [filtroAreaAtuacao, setFiltroAreaAtuacao] = useState("")
  
  // Pipeline states
  interface PipelineItem {
    vaga_candidato_id: number
    candidate_id: number
    vaga_id: number
    vaga_titulo: string
    candidate_nome: string
    status: "pendente" | "em_progresso" | "contratado" | "rejeitado"
    empresa_demonstrou_interesse: boolean
    data_interesse?: string
    entrevista_agendada: boolean
    data_entrevista?: string
    foi_contratado?: boolean
    data_resultado?: string
    created_at: string
  }
  
  type StatusTab = "interesse" | "entrevistas" | "contratados"
  
  const [activeTab, setActiveTab] = useState<StatusTab>("interesse")
  const [pipeline, setPipeline] = useState<PipelineItem[]>([])
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<PipelineItem | null>(null)
  const [dataEntrevista, setDataEntrevista] = useState("")

  useEffect(() => {
    fetchDashboardData()
    carregarPipeline()
  }, [])

  // Recarrega dados quando a página mudar
  useEffect(() => {
    if (paginaAtual > 1) {
      fetchDashboardData()
    }
  }, [paginaAtual])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Paralizar requisições para melhorar performance
      const [dashboardResponse, vagasResponse, candidatosResponse] = await Promise.all([
        api.get("/api/v1/empresa/dashboard").catch(err => ({ error: err })),
        api.get("/api/v1/jobs/").catch(err => ({ error: err })),
        api.get(`/api/v1/companies/candidatos-anonimos?skip=${(paginaAtual - 1) * CANDIDATOS_POR_PAGINA}&limit=${CANDIDATOS_POR_PAGINA}`).catch(err => ({ error: err }))
      ]) as [unknown, unknown, unknown]

      // Processar dados do dashboard
      if (dashboardResponse && typeof dashboardResponse === 'object' && !('error' in dashboardResponse)) {
        try {
          const dashboardData = dashboardResponse as any
          
          setStats(prev => ({
            ...prev,
            convitesEnviados: dashboardData.convites_enviados || 0,
            convitesAceitos: dashboardData.convites_aceitos || 0,
            taxaAceitacao: dashboardData.taxa_aceitacao || 0,
          }))
          setIsLoadingConvites(false)
        } catch (error) {
        }
      }

      // Processar vagas
      if (vagasResponse && typeof vagasResponse === 'object' && !('error' in vagasResponse)) {
        try {
          const vagasList = (vagasResponse as any).data || vagasResponse
          const vagasAbertas = vagasList.filter((v: any) => v.status === "aberta")

          setVagas(vagasList.slice(0, 5))
          setAllVagas(vagasList)

          setStats(prev => ({
            ...prev,
            totalVagas: vagasList.length,
            vagasAbertas: vagasAbertas.length,
          }))
        } catch (error) {
          setVagas([])
          setAllVagas([])
        }
      } else {
        const errorMsg = (vagasResponse as any).error instanceof Error ? (vagasResponse as any).error.message : "Erro ao buscar vagas"
        
        if (errorMsg.includes("empresa não encontrada")) {
          toast({
            title: "Aviso",
            description: "Nenhuma empresa encontrada. Por favor, complete seu perfil de empresa.",
            variant: "default",
          })
        }
        setVagas([])
        setAllVagas([])
      }

      // Processar candidatos
      if (candidatosResponse && typeof candidatosResponse === 'object' && !('error' in candidatosResponse)) {
        try {
          processarCandidatasDashboard(candidatosResponse)
        } catch (error) {
          setCandidatos([])
        }
      }
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const processarCandidatasDashboard = (candidatosResponse: any) => {
    let candidatosList = []
    let totalCount = 0
    
    if (candidatosResponse && typeof candidatosResponse === 'object') {
      if (Array.isArray(candidatosResponse)) {
        candidatosList = candidatosResponse
      } else if ((candidatosResponse as any).data && Array.isArray((candidatosResponse as any).data)) {
        candidatosList = (candidatosResponse as any).data
        totalCount = (candidatosResponse as any).total || candidatosList.length
      } else if ((candidatosResponse as any).candidatos && Array.isArray((candidatosResponse as any).candidatos)) {
        candidatosList = (candidatosResponse as any).candidatos
        totalCount = (candidatosResponse as any).total || candidatosList.length
      } else {
        const values = Object.values(candidatosResponse as any)
        if (values.length > 0 && Array.isArray(values[0])) {
          candidatosList = values[0] as any[]
        }
      }
    }
    
    if (Array.isArray(candidatosList) && candidatosList.length > 0) {
      const allCandidatos = candidatosList.map((c: any) => ({
        id_anonimo: c.id_anonimo || c.id,
        area_atuacao: c.area_atuacao,
        estado: c.estado,
        cidade: c.cidade,
      }))
      setCandidatos(allCandidatos)
      const totalCandidatos = totalCount || candidatosList.length
      const totalPags = Math.ceil(totalCandidatos / CANDIDATOS_POR_PAGINA)
      setTotalPaginas(totalPags)
      setStats(prev => ({
        ...prev,
        totalCandidatos: totalCandidatos,
      }))
    } else {
      setCandidatos([])
      setTotalPaginas(1)
    }
  }

  const carregarPipeline = async () => {
    try {
      const response = await api.get("/api/v1/pipeline/meus-candidatos")
      const data = (response as any)
      
      // A API retorna { candidatos: [...], por_vaga: [...], etc }
      let candidatosData: PipelineItem[] = []
      
      if (Array.isArray(data)) {
        candidatosData = data
      } else if (data.candidatos && Array.isArray(data.candidatos)) {
        candidatosData = data.candidatos
      } else if (data.por_vaga && Array.isArray(data.por_vaga)) {
        // Flatten da estrutura por_vaga
        candidatosData = data.por_vaga.flatMap((vaga: any) => vaga.candidatos || [])
      }
      
      setPipeline(candidatosData)
    } catch (error) {
      setPipeline([])
    }
  }

  const agendarEntrevista = async () => {
    if (!selectedCandidate || !dataEntrevista) return
    try {
      setIsProcessing(`${selectedCandidate.candidate_id}-entrevista`)
      await api.post(`/api/v1/pipeline/candidato/${selectedCandidate.candidate_id}/agendar-entrevista`, {
        data_entrevista: dataEntrevista,
        job_id: selectedCandidate.vaga_id,
      })
      setModalOpen(false)
      setDataEntrevista("")
      setSelectedCandidate(null)
      toast({
        title: "Sucesso",
        description: "Entrevista agendada com sucesso!",
      })
      carregarPipeline()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao agendar entrevista"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })

    } finally {
      setIsProcessing(null)
    }
  }

  const marcarContratacao = async (candidateId: number, jobId: number, resultado: boolean) => {
    try {
      setIsProcessing(`${candidateId}-resultado`)
      await api.post(`/api/v1/pipeline/candidato/${candidateId}/marcar-resultado`, {
        resultado,
        job_id: jobId,
      })
      toast({
        title: "Sucesso",
        description: resultado ? "Candidato contratado!" : "Candidato rejeitado",
      })
      carregarPipeline()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao marcar resultado"
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })

    } finally {
      setIsProcessing(null)
    }
  }

  const filtrarPorStatus = () => {
    if (activeTab === "interesse") {
      return pipeline.filter(p => p.status === "em_progresso" && !p.entrevista_agendada)
    } else if (activeTab === "entrevistas") {
      return pipeline.filter(p => p.entrevista_agendada && p.status === "em_progresso")
    } else {
      return pipeline.filter(p => p.status === "contratado" || p.status === "rejeitado")
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      aberta: "bg-green-100 text-green-800",
      fechada: "bg-red-100 text-red-800",
      rascunho: "bg-yellow-100 text-yellow-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Bem-vindo ao seu painel de controle</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total de Vagas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalVagas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Vagas Abertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.vagasAbertas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Total de Candidatos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.totalCandidatos}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Convites Enviados</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingConvites ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03565C]"></div>
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-[#03565C]">{stats.convitesEnviados}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Convites Aceitos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingConvites ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-emerald-600">{stats.convitesAceitos}</div>
                    {stats.convitesEnviados > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Taxa: {((stats.convitesAceitos / stats.convitesEnviados) * 100).toFixed(1)}%
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="recentes" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recentes">Vagas Recentes</TabsTrigger>
              <TabsTrigger value="status">Status do Pipeline</TabsTrigger>
            </TabsList>

            {/* Vagas Recentes Tab */}
            <TabsContent value="recentes" className="mt-4">
              {vagas.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">Nenhuma vaga criada ainda</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {vagas.map((vaga: any) => (
                    <Card 
                      key={vaga.id} 
                      className="overflow-hidden hover:shadow-lg transition cursor-pointer"
                      onClick={() => router.push(`/empresa/jobs/${vaga.id}`)}
                    >
                      <CardContent className="p-0">
                        <div className="p-6">
                          {/* Header com Título e Status */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-1">
                                {vaga.title || vaga.titulo || "Vaga sem título"}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {vaga.location || "Localização não especificada"}
                              </p>
                            </div>
                            <Badge className={getStatusColor(vaga.status)}>
                              {vaga.status === "aberta" ? "Aberta" : vaga.status === "fechada" ? "Fechada" : "Rascunho"}
                            </Badge>
                          </div>

                          {/* Descrição */}
                          {(vaga.description || vaga.descricao) && (
                            <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                              {vaga.description || vaga.descricao}
                            </p>
                          )}

                          {/* Info Cards */}
                          <div className="grid grid-cols-4 gap-3 mb-4 pt-4 border-t border-gray-200">
                            {/* Salário */}
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-600 font-medium mb-1">Salário</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {vaga.salary_min && vaga.salary_max
                                  ? `R$ ${parseFloat(vaga.salary_min).toLocaleString("pt-BR")} - R$ ${parseFloat(vaga.salary_max).toLocaleString("pt-BR")}`
                                  : "A negociar"}
                              </p>
                            </div>

                            {/* Tipo de Contrato */}
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-600 font-medium mb-1">Tipo</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {vaga.job_type || "Não especificado"}
                              </p>
                            </div>


                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-4 border-t border-gray-200">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/empresa/jobs/${vaga.id}`)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              Visualizar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/empresa/jobs/${vaga.id}?edit=true`)
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2 text-red-600 hover:text-red-700 border-red-200"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Deletar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Status do Pipeline Tab */}
            <TabsContent value="status" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline de Candidatos</CardTitle>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant={activeTab === "interesse" ? "default" : "outline"}
                      onClick={() => setActiveTab("interesse")}
                      className="flex-1"
                    >
                      Interesse
                    </Button>
                    <Button
                      variant={activeTab === "entrevistas" ? "default" : "outline"}
                      onClick={() => setActiveTab("entrevistas")}
                      className="flex-1"
                    >
                      Entrevistas
                    </Button>
                    <Button
                      variant={activeTab === "contratados" ? "default" : "outline"}
                      onClick={() => setActiveTab("contratados")}
                      className="flex-1"
                    >
                      Contratados
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  {pipeline.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Nenhum candidato neste estágio</p>
                      <Button 
                        onClick={() => carregarPipeline()}
                        variant="outline"
                        size="sm"
                      >
                        Atualizar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filtrarPorStatus().map((item: PipelineItem) => (
                        <Card key={`${item.vaga_candidato_id}`} className="border-l-4 border-[#03565C]/50">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">
                                  {item.candidate_nome || `Candidato ${item.candidate_id}`}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Vaga:</strong> {item.vaga_titulo || "Vaga desconhecida"}
                                </p>
                                
                                {activeTab === "interesse" && (
                                  <p className="text-xs text-gray-500 mb-3">
                                    <strong>Interesse desde:</strong> {item.data_interesse ? new Date(item.data_interesse).toLocaleDateString("pt-BR") : "-"}
                                  </p>
                                )}
                                
                                {activeTab === "entrevistas" && (
                                  <p className="text-xs text-gray-500 mb-3">
                                    <strong>Entrevista agendada para:</strong> {item.data_entrevista ? new Date(item.data_entrevista).toLocaleDateString("pt-BR") : "-"}
                                  </p>
                                )}
                                
                                {activeTab === "contratados" && (
                                  <p className="text-xs text-gray-500 mb-3">
                                    <strong>Resultado:</strong> {item.foi_contratado ? "✅ Contratado" : "❌ Rejeitado"}
                                  </p>
                                )}
                              </div>

                              <div className="flex gap-2">
                                {activeTab === "interesse" && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCandidate(item)
                                      setModalOpen(true)
                                    }}
                                    disabled={isProcessing !== null}
                                    className="gap-2 bg-[#03565C] hover:bg-[#024147]"
                                  >
                                    {isProcessing === `${item.candidate_id}-entrevista` ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        Agendando...
                                      </>
                                    ) : (
                                      <>
                                        <Calendar className="h-4 w-4" />
                                        Agendar
                                      </>
                                    )}
                                  </Button>
                                )}
                                
                                {activeTab === "entrevistas" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => marcarContratacao(item.candidate_id, item.vaga_id, true)}
                                      disabled={isProcessing !== null}
                                      className="gap-2 bg-green-600 hover:bg-green-700"
                                    >
                                      {isProcessing === `${item.candidate_id}-resultado` ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                      ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                      )}
                                      Aprovar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => marcarContratacao(item.candidate_id, item.vaga_id, false)}
                                      disabled={isProcessing !== null}
                                      variant="outline"
                                      className="gap-2 text-red-600 hover:text-red-700 border-red-200"
                                    >
                                      {isProcessing === `${item.candidate_id}-resultado` ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                      ) : (
                                        <XCircle className="h-4 w-4" />
                                      )}
                                      Rejeitar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>


          </Tabs>
        </>
      )}
    </div>
  )
}
