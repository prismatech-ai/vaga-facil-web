"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowLeft, Edit, Trash2, Users, CheckCircle2, Clock } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { prepareIdForApi, normalizeAnonymousId, extractNumericId } from "@/lib/id-helper"
import { useToast } from "@/hooks/use-toast"

export default function VagaDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const vagaId = params.id as string
  const [vaga, setVaga] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [isLoadingCandidatos, setIsLoadingCandidatos] = useState(false)
  const [selectedCandidatoDetails, setSelectedCandidatoDetails] = useState<any>(null)
  const [candidatosIdeais, setCandidatosIdeais] = useState<any[]>([])
  const [isLoadingIdeais, setIsLoadingIdeais] = useState(false)
  const [convites, setConvites] = useState<any[]>([])
  const [isLoadingConvites, setIsLoadingConvites] = useState(false)

  const getNivelLabel = (nivel: number) => {
    const niveis = {
      1: "Iniciante",
      2: "Intermediário",
      3: "Avançado",
      4: "Expert",
    }
    return niveis[nivel as keyof typeof niveis] || "Desconhecido"
  }

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: { label: string; badge: string; badgeClass: string } } = {
      aberta: { label: "Aberta", badge: "Ativa", badgeClass: "bg-green-600" },
      rascunho: { label: "Rascunho", badge: "Rascunho", badgeClass: "bg-yellow-600" },
      fechado: { label: "Fechada", badge: "Inativa", badgeClass: "bg-red-600" },
    }
    return statusMap[status] || { label: "Desconhecido", badge: "Desconhecido", badgeClass: "bg-gray-600" }
  }

  // Contar convites realizados e aceitos baseado nos dados do objeto vaga
  const convidesRealizados = vaga?.convites_enviados || convites.length || 0
  const convitesAceitos = vaga?.convites_aceitos || convites.filter((c: any) => {
    // Support different status formats: "aceito", "Aceito", "accepted", etc
    const status = (c.status || c.aceito || c.accepted || "").toString().toLowerCase()
    return status === "aceito" || status === "accepted" || c.aceito === true || c.accepted === true
  }).length || 0

  useEffect(() => {
    if (vagaId) {
      fetchVagaDetails()
      // Comentado: Carregamento de candidatos inicialmente desabilitado para evitar bloqueios
      // fetchCandidatos()
      // fetchCandidatosIdeais()
    }
  }, [vagaId])

  // Comentado: Carregar convites apenas quando solicitado
  // useEffect(() => {
  //   if (candidatosIdeais.length > 0) {
  //     fetchConvites()
  //   }
  // }, [candidatosIdeais])

  const fetchVagaDetails = async () => {
    setIsLoading(true)
    try {
      
      // Tenta ambos os endpoints para compatibilidade
      let response
      try {
        response = await api.get(`/api/v1/jobs/${vagaId}`)
      } catch (err1: any) {
        try {
          response = await api.get(`/api/v1/empresa/vagas/${vagaId}`)
        } catch (err2: any) {
          throw new Error("Não foi possível carregar a vaga")
        }
      }
      
      const jobData = (response as any).data || response
      setVaga(jobData)
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao carregar detalhes da vaga"
      
      // Se for erro 401, redirecionar para login
      if (errorMsg.includes("401") || errorMsg.includes("Não autenticado")) {
        router.push("/login")
        return
      }
      
      // Não exibe toast para evitar bloquear a UI
      // Define um objeto vaga vazio para permitir exibição de erro
      setVaga({})
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCandidatos = async () => {
    setIsLoadingCandidatos(true)
    try {
      const response = await api.get("/api/v1/companies/candidatos-anonimos")
      const data = (response as any).data || response
      const candidatosData = data.candidatos || data
      setCandidatos(Array.isArray(candidatosData) ? candidatosData : [])
    
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao carregar candidatos"
      
      // Se for erro 401, redirecionar para login
      if (errorMsg.includes("401") || errorMsg.includes("Não autenticado")) {
        router.push("/login")
        return
      }
      
      setCandidatos([])
    } finally {
      setIsLoadingCandidatos(false)
    }
  }

  const fetchCandidatosIdeais = async () => {
    setIsLoadingIdeais(true)
    try {
      // Buscar candidatos ideais com nova estrutura agrupada
      const response = await api.get(`/api/v1/companies/candidatos-ideais/${vagaId}?min_compatibility=0.5&limit=50`)
      const data = (response as any).data || response
      
      // Nova estrutura: { grupos: { certificados: {...}, autoavaliacao: {...} } }
      let candidatosData: any[] = []
      
      if (data.grupos) {
        // Nova estrutura com grupos
        const certificados = data.grupos.certificados?.candidatos || []
        const autoavaliacao = data.grupos.autoavaliacao?.candidatos || []
        
        // Combinar ambos os grupos: certificados primeiro (recomendados), depois autoavaliação
        candidatosData = [
          ...certificados.map((c: any) => ({ ...c, recomendado: true })),
          ...autoavaliacao.map((c: any) => ({ ...c, recomendado: false }))
        ]
      } else if (Array.isArray(data.candidatos)) {
        // Fallback para estrutura antiga se houver compatibilidade
        candidatosData = data.candidatos
      } else if (Array.isArray(data)) {
        candidatosData = data
      }
      
      // Buscar status de todos os candidatos em UMA requisição
      if (Array.isArray(candidatosData) && candidatosData.length > 0) {
        try {
          const statusResponse = await api.get(`/api/v1/empresa/vagas/${vagaId}/candidatos`)
          const candidatosComStatus = (statusResponse as any).data || statusResponse
          
          // Mapear candidatos ideais com seus status de aceite
          candidatosData = candidatosData.map((candidato: any) => {
            const statusInfo = Array.isArray(candidatosComStatus)
              ? candidatosComStatus.find((c: any) => 
                  c.id_anonimo === candidato.id_anonimo || 
                  c.candidato_id === candidato.id ||
                  c.id === candidato.id
                )
              : null
            
            return {
              ...candidato,
              consentimento: statusInfo?.consentimento || false,
              data_consentimento: statusInfo?.data_consentimento,
              dados_pessoais_liberados: statusInfo?.dados_pessoais_liberados || false
            }
          })
        } catch (err) {
          // Se falhar a busca de status, continua com candidatos sem status
          candidatosData = candidatosData.map((c: any) => ({
            ...c,
            consentimento: false,
            dados_pessoais_liberados: false
          }))
        }
      }
      
      setCandidatosIdeais(Array.isArray(candidatosData) ? candidatosData : [])
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao carregar candidatos ideais"
      
      // Se for erro de requisitos técnicos não definidos, ignorar
      if (errorMsg.includes("requisitos técnicos") || errorMsg.includes("technical requirements")) {
        setCandidatosIdeais([])
        return
      }
      
      // Se for erro 401, redirecionar para login
      if (errorMsg.includes("401") || errorMsg.includes("Não autenticado")) {
        router.push("/login")
        return
      }
      
      setCandidatosIdeais([])
    } finally {
      setIsLoadingIdeais(false)
    }
  }

  const fetchConvites = async () => {
    setIsLoadingConvites(true)
    try {
      
      // Tentar o endpoint específico de convites primeiro
      try {
        const response = await api.get(`/api/v1/empresa/convites/${vagaId}`)
        const data = response as any
        
        // Handle both data.convites and direct array responses
        let convitesData = []
        if (data.convites && Array.isArray(data.convites)) {
          convitesData = data.convites
        } else if (Array.isArray(data)) {
          convitesData = data
        } else if (data.data && Array.isArray(data.data)) {
          convitesData = data.data
        }
        
        // Filter out null/undefined entries and ensure all have status field
        convitesData = convitesData.filter((c: any) => c !== null && c !== undefined)
        
        setConvites(convitesData)
      } catch (convitesError) {
        // Se falhar, tentar usar dados dos candidatos com consentimento
       
        
        // Usar dados dos candidatos ideais que já contêm informações de aceite
        const convitesDosCandidatos = candidatosIdeais
          .filter((c: any) => c.consentimento || c.dados_pessoais_liberados)
          .map((c: any) => ({
            id: c.id || c.id_anonimo,
            candidato_id: c.id_anonimo,
            status: c.consentimento ? "aceito" : "pendente",
            data_consentimento: c.data_consentimento
          }))
        
        setConvites(convitesDosCandidatos)
      }
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao carregar convites"
      
      // Se for erro 401, redirecionar para login
      if (errorMsg.includes("401") || errorMsg.includes("Não autenticado")) {
        router.push("/login")
        return
      }
      
      setConvites([])
    } finally {
      setIsLoadingConvites(false)
    }
  }

  const fetchCandidatoDetalhes = async (idAnonimo: string) => {
    try {
      // Usar helper para preparar o ID corretamente
      const candidatoId = prepareIdForApi({ id_anonimo: idAnonimo })
     
      
      const response = await api.get(`/api/v1/companies/candidatos-anonimos/detalhes/${candidatoId}`)
      const detalhes = (response as any).data || response
      setSelectedCandidatoDetails(detalhes)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do candidato",
        variant: "destructive",
      })
    }
  }

  const handleViewCandidato = async (candidatoId: string) => {
    await fetchCandidatoDetalhes(candidatoId)
  }

  

  const getCompatibilidadeColor = (score: number) => {
    if (score >= 0.9) return "bg-green-100 text-green-800 border-green-300"
    if (score >= 0.7) return "bg-blue-100 text-blue-800 border-blue-300"
    if (score >= 0.5) return "bg-yellow-100 text-yellow-800 border-yellow-300"
    return "bg-red-100 text-red-800 border-red-300"
  }

  const getCompatibilidadePercent = (score: number) => {
    return Math.round(score * 100)
  }

  const transformarCandidatos = (candidatosAnonimos: any[]) => {
    return candidatosAnonimos.map((candidato) => ({
      id: candidato.id_anonimo,
      candidatoId: candidato.id_anonimo,
      competenciasDeclaradas: candidato.habilidades 
        ? candidato.habilidades.split(",").map((h: string) => h.trim())
        : [],
      testes: candidato.score_teste_habilidades 
        ? [{ competencia: "Geral", score: Math.min(10, (candidato.score_teste_habilidades / 100) * 10) }]
        : [],
      demonstrouInteresse: false,
      aceituEntrevista: false,
      dataDemonstrouInteresse: undefined,
      estado: candidato.estado,
      cidade: candidato.cidade,
      genero: candidato.genero,
      area_atuacao: candidato.area_atuacao,
      is_pcd: candidato.is_pcd,
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  if (!vaga || Object.keys(vaga).length === 0) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">
            Vaga não encontrada ou erro ao carregar. Tente novamente.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{vaga.title}</h1>
              <p className="text-gray-600 mt-1">{vaga.location} • {vaga.job_type}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
              <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
                Deletar
              </Button>
            </div>
          </div>

          {/* Status and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-2xl font-bold text-[#03565C] mt-1">
                      {getStatusLabel(vaga.status).label}
                    </p>
                  </div>
                  <Badge className={`${getStatusLabel(vaga.status).badgeClass} text-white`}>
                    {getStatusLabel(vaga.status).badge}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Convites Realizados</p>
                    <p className="text-2xl font-bold text-[#03565C] mt-1">
                      {convidesRealizados}
                    </p>
                  </div>
                  <Users className="h-6 w-6 text-[#03565C] opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Convites Aceitos</p>
                    <p className="text-2xl font-bold text-[#03565C] mt-1">
                      {convitesAceitos}
                    </p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Sobre a Vaga</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-gray-900 text-base leading-relaxed">
                      {vaga.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-600">Tipo de Contrato</p>
                      <p className="font-semibold text-gray-900">{vaga.job_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Local</p>
                      <p className="font-semibold text-gray-900">{vaga.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Remoto</p>
                      <p className="font-semibold text-gray-900">{vaga.remote ? "Sim" : "Não"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Moeda</p>
                      <p className="font-semibold text-gray-900">{vaga.salary_currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Salary */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Remuneração</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Salário Mínimo</p>
                      <p className="font-semibold text-gray-900 text-lg">
                        {vaga.salary_currency} {vaga.salary_min}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Salário Máximo</p>
                      <p className="font-semibold text-gray-900 text-lg">
                        {vaga.salary_currency} {vaga.salary_max}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Requisitos</CardTitle>
                  <CardDescription>
                    Habilidades e experiências necessárias para esta vaga
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{vaga.requirements}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Benefits */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Benefícios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-gray-900 text-sm whitespace-pre-wrap">{vaga.benefits}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Info Card */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Informações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Criada em</p>
                    <p className="font-medium text-gray-900">
                      {new Date(vaga.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-gray-600">Última atualização</p>
                    <p className="font-medium text-gray-900">
                      {new Date(vaga.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  onClick={() => router.push(`/empresa/kanban-vaga`)}
                  className="w-full gap-2 bg-[#03565C] hover:bg-[#024147]"
                >
                  <Users className="h-4 w-4" />
                  Ver Status
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/empresa/jobs/list`)}
                >
                  Voltar à Lista
                </Button>
              </div>

              {/* Info Alert - Candidatos Ideais */}
              <Card className="border-[#24BFB0]/30 bg-[#25D9B8]/10 shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-[#03565C]" />
                    <CardTitle className="text-[#03565C]">Candidatos Ideais</CardTitle>
                  </div>
                  <CardDescription className="text-[#03565C]">
                    Aparecem apenas aqueles que atendem aos requisitos mínimos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingIdeais ? (
                    <div className="flex items-center justify-center py-4">
                      <Spinner />
                    </div>
                  ) : candidatosIdeais.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">Nenhum candidato encontrado com compatibilidade mínima</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Grupo de Certificados (Recomendados) */}
                      {candidatosIdeais.some((c: any) => c.recomendado) && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold text-[#03565C] bg-yellow-100 px-2 py-1 rounded">⭐ CERTIFICADOS</span>
                            <span className="text-xs text-gray-500">
                              ({candidatosIdeais.filter((c: any) => c.recomendado).length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {candidatosIdeais.filter((c: any) => c.recomendado).slice(0, 5).map((candidato) => (
                              <div
                                key={candidato.id_anonimo}
                                className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200 hover:bg-yellow-100 transition-colors"
                              >
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 text-sm">{normalizeAnonymousId(candidato.id_anonimo)}</p>
                                  <p className="text-xs text-gray-600">
                                    {candidato.dados_pessoais_liberados || candidato.consentimento
                                      ? candidato.logradouro
                                        ? `${candidato.logradouro}, ${candidato.numero || ""} - ${candidato.bairro || ""}, ${candidato.cidade || ""}, ${candidato.estado || ""}`
                                        : `${candidato.cidade || ""}, ${candidato.estado || ""}`
                                      : `${candidato.cidade || ""}, ${candidato.estado || ""}`
                                    }
                                  </p>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-semibold border ${getCompatibilidadeColor(candidato.compatibilidade)}`}>
                                  {getCompatibilidadePercent(candidato.compatibilidade)}%
                                </div>
                              </div>
                            ))}
                            {candidatosIdeais.filter((c: any) => c.recomendado).length > 5 && (
                              <p className="text-xs text-gray-500 text-center pt-1">
                                +{candidatosIdeais.filter((c: any) => c.recomendado).length - 5} certificados mais
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Grupo de Autoavaliação */}
                      {candidatosIdeais.some((c: any) => !c.recomendado) && (
                        <div>
                          <div className="flex items-center gap-2 mb-2 pt-2 border-t">
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">📝 AUTOAVALIAÇÃO</span>
                            <span className="text-xs text-gray-500">
                              ({candidatosIdeais.filter((c: any) => !c.recomendado).length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {candidatosIdeais.filter((c: any) => !c.recomendado).slice(0, 5).map((candidato) => (
                              <div
                                key={candidato.id_anonimo}
                                className="flex items-center justify-between p-2 bg-white rounded border border-[#24BFB0]/20 hover:bg-[#25D9B8]/5 transition-colors"
                              >
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900 text-sm">{normalizeAnonymousId(candidato.id_anonimo)}</p>
                                  <p className="text-xs text-gray-600">
                                    {candidato.dados_pessoais_liberados || candidato.consentimento
                                      ? candidato.logradouro
                                        ? `${candidato.logradouro}, ${candidato.numero || ""} - ${candidato.bairro || ""}, ${candidato.cidade || ""}, ${candidato.estado || ""}`
                                        : `${candidato.cidade || ""}, ${candidato.estado || ""}`
                                      : `${candidato.cidade || ""}, ${candidato.estado || ""}`
                                    }
                                  </p>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-semibold border ${getCompatibilidadeColor(candidato.compatibilidade)}`}>
                                  {getCompatibilidadePercent(candidato.compatibilidade)}%
                                </div>
                              </div>
                            ))}
                            {candidatosIdeais.filter((c: any) => !c.recomendado).length > 5 && (
                              <p className="text-xs text-gray-500 text-center pt-1">
                                +{candidatosIdeais.filter((c: any) => !c.recomendado).length - 5} candidatos mais
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
    </div>
  )
}
