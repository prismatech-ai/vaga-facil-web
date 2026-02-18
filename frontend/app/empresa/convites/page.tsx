"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Clock, Eye, Calendar, Download } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"

interface Convite {
  vaga_id: number
  candidate_id: number
  status: string
  data_interesse: string
  consentimento_concedido: boolean
  data_consentimento: string
  dados_liberados: boolean
  entrevista_agendada: boolean
  resultado_final: {
    foi_contratado: boolean | null
  }
}

interface ConvitesResponse {
  vaga_id: number
  vaga_titulo: string
  total_convites: number
  convites: Convite[]
}

interface Vaga {
  id: number | string
  titulo?: string
  title?: string
  status: string
}

interface DadosCandidato {
  id: number
  full_name: string
  email: string
  phone: string
  cpf: string
  location: string
  linkedin_url?: string
  portfolio_url?: string
  resume_url?: string
  curriculo_url?: string
  curriculum_url?: string
  cv_url?: string
  bio?: string
  consentimento_entrevista: boolean
  data_consentimento: string
}

export default function ConvitesPage() {
  const { toast } = useToast()
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [selectedVagaId, setSelectedVagaId] = useState<string>("")
  const [convites, setConvites] = useState<Convite[]>([])
  const [vagaTitulo, setVagaTitulo] = useState<string>("")
  const [totalConvites, setTotalConvites] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingConvites, setIsFetchingConvites] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [searchCandidato, setSearchCandidato] = useState<string>("")
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null)
  const [dadosCandidato, setDadosCandidato] = useState<DadosCandidato | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [selectedCandidateForSchedule, setSelectedCandidateForSchedule] = useState<number | null>(null)
  const [dataEntrevista, setDataEntrevista] = useState("")
  const [horaEntrevista, setHoraEntrevista] = useState("")
  const [isScheduling, setIsScheduling] = useState(false)
  const [candidatoContratadoRecentemente, setCandidatoContratadoRecentemente] = useState<number | null>(null)

  // Carregar vagas ao montar
  useEffect(() => {
    carregarVagas()
  }, [])

  // Carregar convites quando vaga é selecionada
  useEffect(() => {
    if (selectedVagaId) {
      carregarConvites(selectedVagaId)
    }
  }, [selectedVagaId])

  const carregarVagas = async () => {
    setIsLoading(true)
    try {
      const response = await api.get("/api/v1/jobs/")
      const vagasData = (response as any).data || response
      const vagasList = Array.isArray(vagasData) ? vagasData : []
      
      // Filtrar apenas vagas publicadas
      const vagasPublicadas = vagasList.filter(
        (vaga: any) => vaga.status === "publicado" || vaga.status === "aberta"
      )
      
      setVagas(vagasPublicadas)
      
      // Auto-selecionar primeira vaga se houver
      if (vagasPublicadas.length > 0) {
        setSelectedVagaId(String(vagasPublicadas[0].id))
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao carregar vagas"
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      })
      setVagas([])
    } finally {
      setIsLoading(false)
    }
  }

  const carregarConvites = async (vagaId: string) => {
    setIsFetchingConvites(true)
    try {
      const response = await api.get(`/api/v1/empresas/convites/${vagaId}`)
      const data = response as ConvitesResponse
      
      let convidatesEnriquecidos = data.convites || []
      
      // Enriquecer dados com status de contratação de cada candidato
      try {
        convidatesEnriquecidos = await Promise.all(
          (data.convites || []).map(async (convite) => {
            try {
              const statusResponse = await api.get(
                `/api/v1/companies/candidato/${convite.candidate_id}/status`
              )
              const statusData = (statusResponse as any).data || statusResponse
              
              // Mesclar dados de status com convite
              return {
                ...convite,
                // Atualizar status com os dados mais recentes
                resultado_final: {
                  ...convite.resultado_final,
                  foi_contratado: statusData.contratado,
                },
                // Adicionar dados de status
                candidato_status: statusData,
              }
            } catch (err) {
              // Se falhar, retorna convite original
              return convite
            }
          })
        )
      } catch (err) {
        // Continua com dados originais se enriquecimento falhar
      }
      
      setConvites(convidatesEnriquecidos)
      setVagaTitulo(data.vaga_titulo)
      setTotalConvites(data.total_convites)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao carregar convites"
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      })
      setConvites([])
      setVagaTitulo("")
      setTotalConvites(0)
    } finally {
      setIsFetchingConvites(false)
    }
  }

  const carregarDadosCandidato = async (candidateId: number) => {
    if (!selectedVagaId) return
    
    setIsLoadingDetails(true)
    try {
      const response = await api.get(
        `/api/v1/empresa/vagas/${selectedVagaId}/candidatos/${candidateId}`
      )
      setDadosCandidato(response as DadosCandidato)
      setSelectedCandidateId(candidateId)
      setIsDetailDialogOpen(true)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao carregar dados do candidato"
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const abrirAgendamento = (candidateId: number) => {
    setSelectedCandidateForSchedule(candidateId)
    setDataEntrevista("")
    setHoraEntrevista("")
    setIsScheduleDialogOpen(true)
  }

  const baixarCurriculo = async (candidateId: number) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      
      // Solicita URL assinada do backend
      const response = await fetch(
        `${apiUrl}/api/v1/companies/candidato/${candidateId}/curriculo-download`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        let errorText = "Erro desconhecido"
        try {
          const errorData = await response.json()
          errorText = errorData.detail || JSON.stringify(errorData)
        } catch (e) {
          errorText = `HTTP ${response.status}`
        }
        throw new Error(`Falha ao obter URL de download: ${errorText}`)
      }

      const { download_url, nome_arquivo, mensagem } = await response.json()
      
      // Abre em novo abá (mais seguro e escalável)
      window.open(download_url, "_blank")
      
      toast({
        title: "Sucesso",
        description: "Iniciando download do currículo...",
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao baixar currículo"
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      })
    }
  }


  const agendarEntrevista = async () => {
    if (!selectedCandidateForSchedule || !selectedVagaId || !dataEntrevista || !horaEntrevista) {
      toast({
        title: "Erro",
        description: "Preencha data e hora da entrevista",
        variant: "destructive",
      })
      return
    }

    setIsScheduling(true)
    try {
      // Combinar data e hora em formato ISO 8601
      const dataHoraCompleta = `${dataEntrevista}T${horaEntrevista}:00`
      
      // Usar novo endpoint que envia email de confirmação via Resend
      const response = await api.post(
        `/api/v1/empresa/vagas/${selectedVagaId}/candidatos/${selectedCandidateForSchedule}/agendar-entrevista`,
        { data_entrevista: dataHoraCompleta }
      )

      toast({
        title: "✅ Sucesso",
        description: "Entrevista agendada com sucesso! Email de confirmação foi enviado para o candidato.",
      })

      // Recarregar convites para atualizar status
      carregarConvites(selectedVagaId)
      setIsScheduleDialogOpen(false)
      setSelectedCandidateForSchedule(null)
      setDataEntrevista("")
      setHoraEntrevista("")
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao agendar entrevista"
      toast({
        title: "❌ Erro",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsScheduling(false)
    }
  }

  const marcarComoContratado = async (candidateId: number) => {
    try {
      setIsScheduling(true) // Reutilizando estado de loading
      const response = await api.put(
        `/api/v1/companies/candidato/${candidateId}/marcar-contratado`,
        {}
      )

      // Verificar status do candidato para confirmar contratação
      try {
        const statusResponse = await api.get(`/api/v1/candidato/status`)
        const statusData = (statusResponse as any).data || statusResponse
      } catch (statusError) {
        // Falha silenciosa
      }

      // Registrar candidato contratado recentemente
      setCandidatoContratadoRecentemente(candidateId)
      
      // Remover alerta após 5 segundos
      setTimeout(() => {
        setCandidatoContratadoRecentemente(null)
      }, 5000)

      toast({
        title: "✅ Sucesso",
        description: "Candidato marcado como contratado! Seu perfil foi desativado automaticamente.",
      })

      // Recarregar convites para atualizar status
      if (selectedVagaId) {
        carregarConvites(selectedVagaId)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao marcar como contratado"
      toast({
        title: "❌ Erro",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsScheduling(false)
    }
  }

  // Filtrar convites por status e busca
  const convitesFiltrados = convites.filter((convite) => {
    // Normalizar status (maiúsculas e substituir underscore por hífen se necessário)
    const statusNormalizado = convite.status.toUpperCase()
    
    const statusMatch =
      filtroStatus === "todos" ||
      (filtroStatus === "aceitos" && (statusNormalizado === "ENTREVISTA_ACEITA" || convite.status === "entrevista_aceita")) ||
      (filtroStatus === "pendentes" && (statusNormalizado === "PENDENTE" || convite.status === "pendente")) ||
      (filtroStatus === "com_dados" && convite.consentimento_concedido) ||
      (filtroStatus === "contratados" && convite.resultado_final?.foi_contratado === true)

    const candidatoMatch =
      searchCandidato === "" ||
      String(convite.candidate_id).includes(searchCandidato)

    return statusMatch && candidatoMatch
  })

  const getStatusBadge = (status: string) => {
    const statusNormalizado = status.toUpperCase()
    const statusMap: Record<string, { label: string; variant: any; icon: any }> = {
      ENTREVISTA_ACEITA: {
        label: "Aceito",
        variant: "default",
        icon: CheckCircle,
      },
      PENDENTE: {
        label: "Pendente",
        variant: "secondary",
        icon: Clock,
      },
      REJEITADO: {
        label: "Rejeitado",
        variant: "destructive",
        icon: XCircle,
      },
    }

    const statusInfo = statusMap[statusNormalizado] || {
      label: status,
      variant: "outline",
      icon: Clock,
    }

    return (
      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
        <statusInfo.icon className="h-3 w-3" />
        {statusInfo.label}
      </Badge>
    )
  }

  const formatarData = (data: string) => {
    try {
      return new Date(data).toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "-"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner className="h-12 w-12 mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando vagas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Convites Aceitos</h1>
          <p className="text-gray-600">
            Visualize todos os candidatos que aceitaram seus convites
          </p>
        </div>
      </div>

      {/* Seletor de Vaga */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Selecione uma Vaga</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedVagaId} onValueChange={setSelectedVagaId}>
            <SelectTrigger className="w-full md:w-96">
              <SelectValue placeholder="Selecione uma vaga..." />
            </SelectTrigger>
            <SelectContent>
              {vagas.map((vaga) => (
                <SelectItem key={vaga.id} value={String(vaga.id)}>
                  {vaga.titulo || vaga.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Informações da Vaga */}
      {selectedVagaId && vagaTitulo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{vagaTitulo}</CardTitle>
            <CardDescription>
              Total de convites: <span className="font-bold text-foreground">{totalConvites}</span>
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Filtros */}
      {convites.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aceitos">Aceitos</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="com_dados">Com Dados Liberados</SelectItem>
                <SelectItem value="contratados">Contratados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Buscar Candidato</label>
            <Input
              placeholder="Buscar por ID do candidato..."
              value={searchCandidato}
              onChange={(e) => setSearchCandidato(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Lista de Convites */}
      {isFetchingConvites ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : convitesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-muted-foreground mb-2">
              {convites.length === 0
                ? "Nenhum convite para esta vaga"
                : "Nenhum convite encontrado com os filtros aplicados"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {convitesFiltrados.map((convite, index) => (
            <Card 
              key={`${convite.candidate_id}-${index}`}
              className={candidatoContratadoRecentemente === convite.candidate_id ? "border-2 border-green-400 bg-green-50" : ""}
            >
              {candidatoContratadoRecentemente === convite.candidate_id && (
                <Alert className="border-0 border-b-2 border-green-400 bg-green-100 rounded-t-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 font-semibold">
                    ✅ Candidato marcado como contratado com sucesso!
                  </AlertDescription>
                </Alert>
              )}
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* ID do Candidato */}
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Candidato</p>
                    <p className="font-semibold">{convite.candidate_id}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(convite.status)}
                    </div>
                  </div>

                  {/* Data do Interesse */}
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Interesse</p>
                    <p className="font-semibold text-sm">
                      {formatarData(convite.data_interesse)}
                    </p>
                  </div>

                  {/* Dados Liberados */}
                  <div>
                    <p className="text-sm text-muted-foreground">Dados Liberados</p>
                    <div className="mt-1">
                      <Badge
                        variant={convite.dados_liberados ? "default" : "outline"}
                        className="flex items-center gap-1 w-fit"
                      >
                        {convite.dados_liberados ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Sim
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Não
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Informações adicionais */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
                  {/* Consentimento */}
                  <div>
                    <p className="text-sm text-muted-foreground">Consentimento Concedido</p>
                    <p className="font-semibold">
                      {convite.consentimento_concedido ? "Sim ✓" : "Não"}
                    </p>
                  </div>

                  {/* Data do Consentimento */}
                  {convite.consentimento_concedido && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data do Consentimento</p>
                      <p className="text-sm font-semibold">
                        {formatarData(convite.data_consentimento)}
                      </p>
                    </div>
                  )}

                  {/* Entrevista Agendada */}
                  <div>
                    <p className="text-sm text-muted-foreground">Entrevista Agendada</p>
                    <Badge
                      variant={convite.entrevista_agendada ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {convite.entrevista_agendada ? "Agendada" : "Não agendada"}
                    </Badge>
                  </div>

                  {/* Resultado Final */}
                  <div className="md:col-span-2 lg:col-span-1">
                    <p className="text-sm text-muted-foreground">Resultado Final</p>
                    {convite.resultado_final?.foi_contratado === true ? (
                      <Badge variant="default" className="mt-1">
                        Contratado ✓
                      </Badge>
                    ) : convite.resultado_final?.foi_contratado === false ? (
                      <Badge variant="destructive" className="mt-1">
                        Não Contratado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1">
                        Pendente
                      </Badge>
                    )}
                  </div>

                  {/* Data de Contratação */}
                  {convite.resultado_final?.foi_contratado === true && (convite as any).candidato_status?.data_contratacao && (
                    <div className="md:col-span-2 lg:col-span-1">
                      <p className="text-sm text-muted-foreground">Data da Contratação</p>
                      <p className="font-semibold text-sm">
                        {formatarData((convite as any).candidato_status.data_contratacao)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Botão de Detalhes */}
                {(convite.status === "ENTREVISTA_ACEITA" || convite.status === "entrevista_aceita") && convite.dados_liberados && (
                  <div className="pt-4 border-t mt-4 flex gap-2 flex-wrap">
                    <Button
                      onClick={() => carregarDadosCandidato(convite.candidate_id)}
                      disabled={isLoadingDetails}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </Button>
                    <Button
                      onClick={() => abrirAgendamento(convite.candidate_id)}
                      disabled={isScheduling}
                      className="gap-2"
                      variant="outline"
                    >
                      <Clock className="h-4 w-4" />
                      Agendar Entrevista
                    </Button>
                    <Button
                      onClick={() => marcarComoContratado(convite.candidate_id)}
                      disabled={isScheduling || convite.resultado_final?.foi_contratado === true}
                      className={`gap-2 ${
                        convite.resultado_final?.foi_contratado === true
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {convite.resultado_final?.foi_contratado === true ? "Já Contratado" : "Marcar como Contratado"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resumo */}
      {convitesFiltrados.length > 0 && (
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total de Convites</p>
              <p className="text-2xl font-bold">{convites.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Aceitos</p>
              <p className="text-2xl font-bold">
                {convites.filter((c) => c.status === "ENTREVISTA_ACEITA" || c.status === "entrevista_aceita").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Com Dados</p>
              <p className="text-2xl font-bold">
                {convites.filter((c) => c.consentimento_concedido).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Contratados</p>
              <p className="text-2xl font-bold">
                {convites.filter((c) => c.resultado_final?.foi_contratado === true).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Detalhes do Candidato */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Candidato</DialogTitle>
            <DialogDescription>
              Informações completas do candidato que aceitou o convite
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : dadosCandidato ? (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome Completo</p>
                    <p className="font-semibold">{dadosCandidato.full_name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold break-all">{dadosCandidato.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-semibold">{dadosCandidato.phone}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-semibold">{dadosCandidato.cpf}</p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Localização</p>
                    <p className="font-semibold">{dadosCandidato.location}</p>
                  </div>
                </div>
              </div>

              {/* Informações Profissionais */}
              {(dadosCandidato.linkedin_url || dadosCandidato.portfolio_url || dadosCandidato.bio || dadosCandidato.resume_url || dadosCandidato.curriculo_url || dadosCandidato.curriculum_url || dadosCandidato.cv_url) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Informações Profissionais</h3>
                  <div className="space-y-4">
                    {dadosCandidato.bio && (
                      <div>
                        <p className="text-sm text-muted-foreground">Sobre</p>
                        <p className="font-semibold whitespace-pre-wrap">
                          {dadosCandidato.bio}
                        </p>
                      </div>
                    )}

                    {dadosCandidato.linkedin_url && (
                      <div>
                        <p className="text-sm text-muted-foreground">LinkedIn</p>
                        <a
                          href={dadosCandidato.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 hover:underline break-all"
                        >
                          {dadosCandidato.linkedin_url}
                        </a>
                      </div>
                    )}

                    {dadosCandidato.portfolio_url && (
                      <div>
                        <p className="text-sm text-muted-foreground">Portfólio</p>
                        <a
                          href={dadosCandidato.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 hover:underline break-all"
                        >
                          {dadosCandidato.portfolio_url}
                        </a>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground">Currículo</p>
                      <button
                        onClick={() => baixarCurriculo(dadosCandidato.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Baixar Currículo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Informações de Consentimento */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Consentimento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Consentimento para Entrevista</p>
                    <Badge
                      variant={dadosCandidato.consentimento_entrevista ? "default" : "destructive"}
                      className="mt-1"
                    >
                      {dadosCandidato.consentimento_entrevista ? "Concedido ✓" : "Não Concedido"}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Data do Consentimento</p>
                    <p className="font-semibold text-sm">
                      {formatarData(dadosCandidato.data_consentimento)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Não foi possível carregar os dados do candidato</p>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Agendamento de Entrevista */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agendar Entrevista</DialogTitle>
            <DialogDescription>
              Selecione a data e horário para a entrevista
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Data */}
            <div>
              <label className="text-sm font-medium mb-2 block">Data da Entrevista</label>
              <Input
                type="date"
                value={dataEntrevista}
                onChange={(e) => setDataEntrevista(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Hora */}
            <div>
              <label className="text-sm font-medium mb-2 block">Horário da Entrevista</label>
              <Input
                type="time"
                value={horaEntrevista}
                onChange={(e) => setHoraEntrevista(e.target.value)}
              />
            </div>

            {/* Preview */}
            {dataEntrevista && horaEntrevista && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">Agendamento:</p>
                <p className="font-semibold">
                  {new Date(`${dataEntrevista}T${horaEntrevista}`).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsScheduleDialogOpen(false)
                setDataEntrevista("")
                setHoraEntrevista("")
              }}
              disabled={isScheduling}
            >
              Cancelar
            </Button>
            <Button
              onClick={agendarEntrevista}
              disabled={isScheduling || !dataEntrevista || !horaEntrevista}
            >
              {isScheduling ? "Agendando..." : "Agendar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
