"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { CheckCircle2, Clock, AlertCircle, Sparkles, HeartHandshake, Calendar, Zap } from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { StatusPerfilCandidato } from "@/components/status-perfil-candidato"

interface Interesse {
  id: string
  dataInteresse: string
  status: "novo" | "aceito" | "rejeitado"
  descricao: string // Ex: "Uma empresa demonstrou interesse em você"
}

interface TesteTecnico {
  id: string
  nome: string
  data: string
  status: "concluido" | "pendente" | "expirado"
  duracao?: string
}

interface EntrevistaAgendada {
  id: string
  vagaId: string
  titulo: string
  empresa: string
  data: string
  hora?: string
}

interface CandidatoDashboardProps {
  areaAtuacao: string
  nomeCompleto?: string
  perfilCompleto?: boolean
  onAceitarEntrevista?: (interesseId: string) => void
  interesses?: Interesse[]
  testes?: TesteTecnico[]
  candidatoData?: {
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
}

export function CandidatoDashboard({
  areaAtuacao = "Frontend",
  nomeCompleto = "Usuário",
  perfilCompleto = true,
  onAceitarEntrevista,
  interesses: interessesInit = [],
  testes: testesInit = [],
  candidatoData,
}: CandidatoDashboardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [interesses, setInteresses] = useState<Interesse[]>(interessesInit)
  const [isLoadingInteresses, setIsLoadingInteresses] = useState(true)
  const [entrevistasAgendadas, setEntrevistasAgendadas] = useState<EntrevistaAgendada[]>([])
  const [testeWarningShown, setTesteWarningShown] = useState(false)

  // Mostrar aviso se candidato não fez teste técnico
  useEffect(() => {
    if (!testeWarningShown && testesInit.length === 0) {
      toast({
        title: "📝 Aumente suas chances!",
        description: "Realize seu teste técnico e tenha mais chance de receber convites das empresas.",
        variant: "default",
        duration: 5000,
      })
      setTesteWarningShown(true)
    }
  }, [testesInit, testeWarningShown, toast])

  // Carregar interesses da API
  useEffect(() => {
    const carregarInteresses = async () => {
      try {
        setIsLoadingInteresses(true)

        // Tentar buscar vagas sugeridas primeiro
        try {
          const response = await api.get<any>("/api/v1/candidato/vagas-sugeridas")

          if (response?.vagas_sugeridas && Array.isArray(response.vagas_sugeridas)) {
            // Converter a resposta da API para o formato esperado pelo componente
            const interessesFormatados: Interesse[] = response.vagas_sugeridas.map(
              (vaga: any) => {

                const nomeEmpresa = vaga.empresa_nome || 
                                     vaga.company_name || 
                                     vaga.empresa?.nome ||
                                     vaga.empresa?.name ||
                                     vaga.company?.nome ||
                                     vaga.company?.name ||
                                     "Uma empresa"
                
                // Determina o status baseado nos dados da vaga
                let status: "novo" | "aceito" | "rejeitado" = "novo"
                if (vaga.entrevista?.agendada || vaga.resultado_final) {
                  status = "aceito"
                }
                
                return {
                  id: `vaga-${vaga.vaga_id}`,
                  dataInteresse: vaga.data_interesse || new Date().toISOString(),
                  status,
                  descricao: `${nomeEmpresa} demonstrou interesse em você para a vaga de ${vaga.titulo_vaga}`,
                }
              }
            )
            setInteresses(interessesFormatados)

            // Extrair entrevistas agendadas
            const entrevistasAgendadasData: EntrevistaAgendada[] = response.vagas_sugeridas
              .filter((vaga: any) => vaga.entrevista?.agendada)
              .map((vaga: any) => {
                // Extrair hora da data completa no formato ISO
                let hora: string | undefined = undefined
                
                if (vaga.entrevista?.data) {
                  try {
                    // Parse da data ISO (ex: "2026-01-15T14:30:00+00:00")
                    const dataObj = new Date(vaga.entrevista.data)
                    if (!isNaN(dataObj.getTime())) {
                      // Extrai horas e minutos
                      const horas = String(dataObj.getUTCHours()).padStart(2, "0")
                      const minutos = String(dataObj.getUTCMinutes()).padStart(2, "0")
                      hora = `${horas}:${minutos}`
                    }
                  } catch (e) {
                    // Se não conseguir extrair, deixa em branco
                  }
                }
                
                return {
                  id: `entrevista-${vaga.vaga_id}`,
                  vagaId: vaga.vaga_id,
                  titulo: vaga.titulo_vaga || "Vaga sem título",
                  empresa: vaga.empresa_nome || 
                           vaga.company_name || 
                           vaga.empresa?.nome ||
                           vaga.empresa?.name ||
                           vaga.company?.nome ||
                           vaga.company?.name ||
                           "Empresa desconhecida",
                  data: vaga.entrevista?.data || new Date().toISOString(),
                  hora,
                }
              })
            setEntrevistasAgendadas(entrevistasAgendadasData)
            return
          }
        } catch (err) {
          // Se falhar, tenta buscar convites
        }

        // Se não encontrou vagas sugeridas, tenta buscar convites diretos
        try {
          const convitesResponse = await api.get<any>("/api/v1/candidato/convites")
          
          if (convitesResponse && Array.isArray(convitesResponse)) {
            const interessesFormatados: Interesse[] = convitesResponse.map(
              (convite: any) => {
                const nomeEmpresa = convite.empresa_nome || 
                                     convite.company_name || 
                                     convite.empresa?.nome ||
                                     convite.company?.name ||
                                     "Uma empresa"
                
                // Determina o status baseado nos dados do convite
                let status: "novo" | "aceito" | "rejeitado" = "novo"
                if (convite.aceito || convite.status === "aceito" || convite.data_aceitacao) {
                  status = "aceito"
                }
                if (convite.rejeitado || convite.status === "rejeitado") {
                  status = "rejeitado"
                }
                
                return {
                  id: `convite-${convite.id}`,
                  dataInteresse: convite.data_criacao || new Date().toISOString(),
                  status,
                  descricao: `${nomeEmpresa} demonstrou interesse em você`,
                }
              }
            )
            setInteresses(interessesFormatados)
          }
        } catch (err) {
          // Mantém estado vazio se ambos falharem
        }
      } finally {
        setIsLoadingInteresses(false)
      }
    }

    carregarInteresses()
    
    // Recarrega os interesses a cada 30 segundos para atualizar status
    const interval = setInterval(carregarInteresses, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Função para calcular o percentual de completude
  const calcularCompletudePercentual = (): number => {
    if (!candidatoData) return 0

    const camposVerificacao = {
      full_name: !!candidatoData.full_name,
      email: !!candidatoData.email,
      phone: !!candidatoData.phone,
      area_atuacao: !!candidatoData.area_atuacao,
      bio: !!candidatoData.bio,
      linkedin_url: !!candidatoData.linkedin_url,
      portfolio_url: !!candidatoData.portfolio_url,
      resume_url: !!candidatoData.resume_url,
      birth_date: !!candidatoData.birth_date,
      cpf: !!candidatoData.cpf,
      rg: !!candidatoData.rg,
      cep: !!candidatoData.cep,
      logradouro: !!candidatoData.logradouro,
      numero: !!candidatoData.numero,
      bairro: !!candidatoData.bairro,
      cidade: !!candidatoData.cidade,
      estado: !!candidatoData.estado,
    }

    const totalCampos = Object.keys(camposVerificacao).length
    const camposPreenchidos = Object.values(camposVerificacao).filter(Boolean).length

    return Math.round((camposPreenchidos / totalCampos) * 100)
  }

  const completudePerfil = calcularCompletudePercentual()

  const handleAceitarEntrevista = async (interesseId: string) => {
    // Extrai o ID da vaga do interesseId (formato: "vaga-10")
    const vagaId = interesseId.replace("vaga-", "")
    
    try {

      // Redireciona para o modal de aceite de entrevista
      router.push(`/interview-acceptance?vaga_id=${vagaId}`)
    } catch (err: any) {

      toast({
        title: "❌ Erro",
        description: "Erro ao abrir o formulário de aceitação",
        variant: "destructive",
      })
    }
  }

  const interessesNovos = interesses.filter((i) => i.status === "novo").length
  const interessesAceitos = interesses.filter((i) => i.status === "aceito").length

  return (
    <div className="space-y-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bem-vindo de volta, {nomeCompleto.split(" ")[0]}!
          </h1>
          <p className="text-gray-600 mt-2">
            Acompanhe o progresso do seu processo de candidatura
          </p>
        </div>

        {/* Status do Perfil */}
        <StatusPerfilCandidato />

        {/* Alerta de Perfil Incompleto */}
        {completudePerfil < 100 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="flex items-center justify-between">
                <span className="font-medium">Seu perfil está incompleto. Complete agora para receber mais oportunidades!</span>
                <Button
                  size="sm"
                  onClick={() => router.push("/dashboard/candidato/meu-perfil")}
                  className="ml-4 bg-orange-600 hover:bg-orange-700"
                >
                  Completar Perfil
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Status Cards - 3 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Completude do Perfil */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Status do Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completude</span>
                  <span className="font-semibold text-gray-900">{completudePerfil}%</span>
                </div>
                <Progress value={completudePerfil} className="h-2" />
              </div>
              <div className="text-sm text-gray-600">
                <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                  Área: {areaAtuacao}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card: Interesse de Empresas */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                <Sparkles className="h-5 w-5 text-[#03565C]" />
                Interesse de Empresas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold text-[#03565C]">{interessesNovos}</div>
              <p className="text-sm text-gray-600">
                {interessesNovos === 1
                  ? "empresa demonstrou interesse"
                  : "empresas demonstraram interesse"}
              </p>
              {interessesAceitos > 0 && (
                <Badge variant="secondary" className="w-fit">
                  {interessesAceitos} aceito{interessesAceitos > 1 ? "s" : ""}
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Card: Convites Aceitos */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-[#24BFB0]" />
                Convites Aceitos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold text-[#03565C]">
                {interessesAceitos}
              </div>
              <p className="text-sm text-gray-600">
                {interessesAceitos === 1
                  ? "convite aceito"
                  : "convites aceitos"}
              </p>
              {interessesNovos > 0 && (
                <Badge variant="outline" className="w-fit bg-blue-50 text-blue-800 border-blue-200">
                  {interessesNovos} novo
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Privacy Alert */}
        <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
          <AlertCircle className="h-4 w-4 text-[#03565C]" />
          <AlertDescription className="text-[#03565C] text-sm">
            <strong>Sua privacidade:</strong> Nenhum dado de empresas ou vagas é revelado nesta página.
            Você controla totalmente quais informações compartilha.
          </AlertDescription>
        </Alert>

        {/* Atalhos Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card: Meu Perfil */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/candidato/meu-perfil")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                👤 Meu Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Atualize suas informações e complete seu perfil
            </CardContent>
          </Card>

          {/* Card: Vagas Sugeridas */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/candidato/vagas-sugeridas")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                💼 Vagas Sugeridas
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Explore vagas recomendadas para seu perfil
            </CardContent>
          </Card>

          {/* Card: Testes Adaptativos */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 border-[#03565C] bg-[#03565C]/5" onClick={() => router.push("/dashboard/candidato/testes-adaptativos")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-[#03565C]">
                <Zap className="h-4 w-4" />
                Testes Adaptativos
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Avalie suas habilidades com testes inteligentes
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="interesses" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="interesses" className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4" />
              Interesse das Empresas
            </TabsTrigger>
            <TabsTrigger value="testes" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Entrevistas Agendadas
            </TabsTrigger>
          </TabsList>

          {/* Tab: Interesses */}
          <TabsContent value="interesses" className="space-y-4">
            {interesses.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-8 pb-8 text-center">
                  <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Nenhum interesse de empresas por enquanto. Continue atualizando seu perfil!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {interesses.map((interesse) => (
                  <Card
                    key={interesse.id}
                    className={`border-0 shadow-sm transition-all ${
                      interesse.status === "novo"
                        ? "bg-[#25D9B8]/10 border-l-4 border-[#24BFB0]"
                        : interesse.status === "aceito"
                          ? "bg-emerald-50 border-l-4 border-emerald-500"
                          : "bg-gray-50"
                    }`}
                  >
                    <CardContent className="pt-6 pb-6">
                      <div className="space-y-4">
                        {/* Cabeçalho com descrição e status */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {interesse.descricao}
                              </p>
                              {interesse.status === "novo" && (
                                <Badge className="bg-blue-600 text-white text-xs">
                                  Novo
                                </Badge>
                              )}
                              {interesse.status === "aceito" && (
                                <Badge className="bg-emerald-600 text-white text-xs">
                                  Aceito
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {(() => {
                                try {
                                  // Tenta diferentes formatos de data
                                  const dateStr = interesse.dataInteresse
                                  if (!dateStr) return "Data indisponível"
                                  
                                  const data = new Date(dateStr)
                                  if (isNaN(data.getTime())) {
                                    // Se não conseguir parsear, tenta mostrar como está
                                    return dateStr
                                  }
                                  return data.toLocaleDateString("pt-BR")
                                } catch {
                                  return "Data indisponível"
                                }
                              })()}
                            </p>
                          </div>
                        </div>

                        {/* Botões de ação */}
                        {interesse.status === "aceito" ? (
                          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-sm font-semibold w-fit">
                            <CheckCircle2 className="h-4 w-4" />
                            Vaga Aceita ✓
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#03565C] text-[#03565C] hover:bg-[#03565C]/10"
                              onClick={() => router.push(`/dashboard/candidato/vagas-sugeridas`)}
                            >
                              Ver Detalhes da Vaga
                            </Button>
                            
                            {interesse.status === "novo" && (
                              <Button
                                size="sm"
                                className="bg-[#03565C] hover:bg-[#024147] text-white"
                                onClick={() => handleAceitarEntrevista(interesse.id)}
                              >
                                Aceitar Interesse
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Entrevistas */}
          <TabsContent value="testes">
            {entrevistasAgendadas.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-8 pb-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Você ainda não tem entrevistas agendadas.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {entrevistasAgendadas.map((entrevista) => (
                  <Card key={entrevista.id} className="border-0 shadow-sm border-l-4 border-[#24BFB0]">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{entrevista.titulo}</h3>
                          <p className="text-sm text-gray-600 mt-1">{entrevista.empresa}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-[#03565C]" />
                              <span className="text-sm text-gray-600">
                                {new Date(entrevista.data).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            {entrevista.hora && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-[#03565C]" />
                                <span className="text-sm text-gray-600">{entrevista.hora}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className="bg-[#24BFB0] text-white">Agendada</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
