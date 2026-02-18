"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, MapPin, Briefcase, DollarSign, CheckCircle2, XCircle, Calendar, Clock, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

interface EmpresaInfo {
  id: number
  nome: string
  logo_url?: string
}

interface InteresseInfo {
  data_interesse: string
  status: string
}

interface EntrevistaInfo {
  agendada: boolean
  data?: string
}

interface ResultadoFinalInfo {
  foi_contratado: boolean
  data_resultado: string
}

interface VagaSugerida {
  vaga_id: number
  titulo_vaga: string
  descricao: string
  area_atuacao: string
  localizacao: string
  remoto: boolean
  tipo_contratacao: string
  salario_minimo: number
  salario_maximo: number
  moeda: string
  empresa: EmpresaInfo
  interesse: InteresseInfo
  entrevista?: EntrevistaInfo
  resultado_final?: ResultadoFinalInfo
}

export default function VagasSugeridasPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [vagas, setVagas] = useState<VagaSugerida[]>([])
  const [isProcessing, setIsProcessing] = useState<number | null>(null)
  const [vagasAceitadas, setVagasAceitadas] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!authLoading && user) {
      carregarVagas()
    } else if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  const carregarVagas = async () => {
    try {
      setIsLoading(true)
      const response = await api.get<any>("/api/v1/candidato/vagas-sugeridas")
     
      setVagas(response?.vagas_sugeridas || [])
    } catch (err: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao carregar vagas sugeridas",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const aceitarInteresse = (vaga_id: number) => {
    setIsProcessing(vaga_id)
    try {

      // Redireciona para o modal de aceite de entrevista
      router.push(`/interview-acceptance?vaga_id=${vaga_id}`)
    } catch (err: any) {
      toast({
        title: "❌ Erro",
        description: "Erro ao abrir o formulário de aceitação",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  const rejeitarInteresse = async (vaga_id: number) => {
    setIsProcessing(vaga_id)
    try {
      // POST /api/v1/candidato/recusar-entrevista/{vaga_id} - novo endpoint com email via Resend
      await api.post(`/api/v1/candidato/recusar-entrevista/${vaga_id}`, {})
      
      toast({
        title: "✅ Rejeitado",
        description: "Você rejeitou essa oportunidade. Email de notificação foi enviado para a empresa.",
        variant: "default",
      })
      
      carregarVagas()
    } catch (err: any) {
      toast({
        title: "❌ Erro",
        description: err.message || "Erro ao rejeitar interesse",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
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

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vagas Sugeridas</h1>
          <p className="text-gray-600 mt-2">Oportunidades de empresas interessadas em você</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.push("/dashboard/candidato")}
          >
            ← Voltar ao Dashboard
          </Button>
          <Button 
            variant="outline"
            onClick={carregarVagas}
            disabled={isLoading}
          >
            🔄 Atualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
            <p className="mt-4 text-gray-600">Carregando vagas...</p>
          </div>
        </div>
      ) : vagas.length === 0 ? (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Nenhuma vaga sugerida no momento. Complete seu perfil e autoavaliação para aumentar suas chances!
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {vagas.map((vaga) => (
            <Card 
              key={vaga.vaga_id}
              className={`overflow-hidden border-l-4 transition-all ${
                vaga.resultado_final?.foi_contratado
                  ? "border-l-green-500 bg-green-50"
                  : vaga.entrevista?.agendada
                  ? "border-l-blue-500 bg-blue-50"
                  : "border-l-amber-500 bg-amber-50"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{vaga.titulo_vaga}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Building2 className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">{vaga.empresa.nome}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {vaga.resultado_final?.foi_contratado && (
                      <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        Contratado
                      </div>
                    )}
                    {!vaga.resultado_final?.foi_contratado && vaga.entrevista?.agendada && (
                      <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                        📅 Entrevista Agendada
                      </div>
                    )}
                    {!vaga.resultado_final && !vaga.entrevista?.agendada && (
                      <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-semibold">
                        ⏳ Aguardando Ação
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Descrição */}
                <p className="text-gray-700">{vaga.descricao}</p>

                {/* Informações */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">Localização</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">{vaga.localizacao}</span>
                    </div>
                    {vaga.remoto && <p className="text-xs text-blue-600">✓ Remoto</p>}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">Tipo de Contratação</p>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">{vaga.tipo_contratacao}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">Salário</p>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">
                        {vaga.salario_minimo.toLocaleString("pt-BR")} - {vaga.salario_maximo.toLocaleString("pt-BR")} {vaga.moeda}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">Área</p>
                    <span className="text-sm font-medium">{vaga.area_atuacao}</span>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3 py-4 border-t border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-[#03565C]" />
                      <div className="w-0.5 h-8 bg-gray-300" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Interesse da Empresa</p>
                      <p className="text-sm font-medium">
                        {new Date(vaga.interesse.data_interesse).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  {vaga.entrevista?.agendada && vaga.entrevista.data && (
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">Entrevista Agendada</p>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <p className="text-sm font-medium">
                              {new Date(vaga.entrevista.data).toLocaleDateString("pt-BR", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <p className="text-sm font-medium">
                              {new Date(vaga.entrevista.data).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="pt-4 border-t border-gray-200">
                  <Button 
                    onClick={() => aceitarInteresse(vaga.vaga_id)}
                    disabled={isProcessing === vaga.vaga_id}
                    className="w-full mb-3 bg-[#03565C] hover:bg-[#024147] text-white h-12 text-base font-semibold"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    {isProcessing === vaga.vaga_id ? "Processando..." : "Aceitar Interesse"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => rejeitarInteresse(vaga.vaga_id)}
                    disabled={isProcessing === vaga.vaga_id}
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {isProcessing === vaga.vaga_id ? "Processando..." : "Rejeitar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
