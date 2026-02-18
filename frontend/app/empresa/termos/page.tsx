"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { 
  FileText, 
  Shield, 
  DollarSign, 
  Lock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Clock
} from "lucide-react"

interface RegrasNegocio {
  contrato: {
    tipo: string
    vigencia_anos: number
    prazo_aviso_renovacao: number
  }
  monetizacao: {
    modelo: string
    valor_publicacao_vaga: number
  }
  confidencialidade: {
    manter_anonimato_rejeitados: boolean
    revogar_dados_apos_rejeicao: boolean
    prazo_revogacao_dados_dias: number
  }
  fluxo_selecao: {
    exigir_pre_selecao: boolean
    fluxo_anonimato_padrao: boolean
  }
  contratados: {
    periodo_garantia_dias: number
    permitir_retorno_apos_garantia: boolean
  }
}

interface Contrato {
  id: number
  tipo: string
  status: string
  versao_termos: string
  data_aceite: string | null
  data_vigencia_inicio: string | null
  data_vigencia_fim: string | null
  dias_para_vencer: number
  esta_vigente: boolean
  aceite_termos_uso: boolean
  aceite_politica_privacidade: boolean
  aceite_regras_cobranca: boolean
  aceite_confidencialidade: boolean
}

interface StatusContrato {
  valido: boolean
  motivo?: string
  acao_necessaria?: string
  acao_recomendada?: string
  aviso?: string
  contrato_id?: number
  vigente_ate?: string
}

export default function TermosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [regras, setRegras] = useState<RegrasNegocio | null>(null)
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [statusContrato, setStatusContrato] = useState<StatusContrato | null>(null)
  const [historico, setHistorico] = useState<Contrato[]>([])
  
  // Estados dos aceites
  const [aceiteTermos, setAceiteTermos] = useState(false)
  const [aceitePrivacidade, setAceitePrivacidade] = useState(false)
  const [aceiteCobranca, setAceiteCobranca] = useState(false)
  const [aceiteConfidencialidade, setAceiteConfidencialidade] = useState(false)
  
  useEffect(() => {
    carregarDados()
  }, [])
  
  const carregarDados = async () => {
    setLoading(true)
    try {
      // Carregar regras de negócio (público)
      const regrasData = await api.get<RegrasNegocio>("/api/v1/contratos/regras-negocio")
      setRegras(regrasData)
      
      // Carregar status do contrato
      const statusData = await api.get<StatusContrato>("/api/v1/contratos/empresa/status")
      setStatusContrato(statusData)
      
      // Carregar contrato atual
      try {
        const contratoData = await api.get<Contrato | null>("/api/v1/contratos/empresa/contrato")
        if (contratoData) {
          setContrato(contratoData)
        }
      } catch {
        // Contrato pode não existir
      }
      
      // Carregar histórico
      try {
        const historicoData = await api.get<Contrato[]>("/api/v1/contratos/empresa/historico")
        setHistorico(historicoData || [])
      } catch {
        setHistorico([])
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }
  
  const aceitarTermos = async () => {
    if (!aceiteTermos || !aceitePrivacidade || !aceiteCobranca || !aceiteConfidencialidade) {
      toast({
        title: "Aceite obrigatório",
        description: "Você precisa aceitar todos os termos para continuar.",
        variant: "destructive"
      })
      return
    }
    
    setSubmitting(true)
    try {
      await api.post("/api/v1/contratos/empresa/aceitar-termos", {
        aceite_termos_uso: aceiteTermos,
        aceite_politica_privacidade: aceitePrivacidade,
        aceite_regras_cobranca: aceiteCobranca,
        aceite_confidencialidade: aceiteConfidencialidade
      })
      
      toast({
        title: "Termos aceitos!",
        description: "Seu contrato foi ativado com sucesso.",
      })
      
      await carregarDados()
    } catch (error: unknown) {
      const err = error as Error
      toast({
        title: "Erro",
        description: err.message || "Erro ao aceitar termos",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  const renovarContrato = async () => {
    if (!aceiteTermos || !aceitePrivacidade || !aceiteCobranca || !aceiteConfidencialidade) {
      toast({
        title: "Aceite obrigatório",
        description: "Você precisa aceitar todos os termos para renovar.",
        variant: "destructive"
      })
      return
    }
    
    setSubmitting(true)
    try {
      await api.post("/api/v1/contratos/empresa/renovar-contrato", {
        aceite_termos_uso: aceiteTermos,
        aceite_politica_privacidade: aceitePrivacidade,
        aceite_regras_cobranca: aceiteCobranca,
        aceite_confidencialidade: aceiteConfidencialidade
      })
      
      toast({
        title: "Contrato renovado!",
        description: "Seu contrato foi renovado com sucesso.",
      })
      
      await carregarDados()
    } catch (error: unknown) {
      const err = error as Error
      toast({
        title: "Erro",
        description: err.message || "Erro ao renovar contrato",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  const todosAceitos = aceiteTermos && aceitePrivacidade && aceiteCobranca && aceiteConfidencialidade
  const precisaAceitar = !statusContrato?.valido && statusContrato?.acao_necessaria === "aceitar_termos"
  const precisaRenovar = !statusContrato?.valido && statusContrato?.acao_necessaria === "renovar_contrato"
  const avisoRenovacao = statusContrato?.valido && statusContrato?.acao_recomendada === "renovar_contrato"
  
  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Termos e Contratos</h1>
          <p className="text-muted-foreground">Gerencie os termos de uso da plataforma</p>
        </div>
      </div>
      
      {/* Status Alert */}
      {precisaAceitar && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Ação necessária:</strong> Você precisa aceitar os termos de uso para utilizar a plataforma.
          </AlertDescription>
        </Alert>
      )}
      
      {precisaRenovar && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Contrato expirado:</strong> Seu contrato venceu. Por favor, renove para continuar usando a plataforma.
          </AlertDescription>
        </Alert>
      )}
      
      {avisoRenovacao && (
        <Alert className="mb-6 border-yellow-500 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Aviso:</strong> {statusContrato?.aviso}
          </AlertDescription>
        </Alert>
      )}
      
      {statusContrato?.valido && !avisoRenovacao && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Contrato ativo</strong> - Vigente até {statusContrato.vigente_ate ? new Date(statusContrato.vigente_ate).toLocaleDateString('pt-BR') : 'N/A'}
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue={precisaAceitar || precisaRenovar ? "aceitar" : "status"}>
        <TabsList className="mb-6">
          <TabsTrigger value="status">Status do Contrato</TabsTrigger>
          <TabsTrigger value="aceitar">Aceitar Termos</TabsTrigger>
          <TabsTrigger value="regras">Regras de Negócio</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status">
          {contrato ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contrato Atual</CardTitle>
                    <CardDescription>Versão {contrato.versao_termos}</CardDescription>
                  </div>
                  <Badge variant={contrato.esta_vigente ? "default" : "destructive"}>
                    {contrato.esta_vigente ? "Vigente" : "Expirado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Aceite</p>
                    <p className="font-medium">
                      {contrato.data_aceite ? new Date(contrato.data_aceite).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vigência</p>
                    <p className="font-medium">
                      {contrato.data_vigencia_fim ? new Date(contrato.data_vigencia_fim).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dias para Vencer</p>
                    <p className="font-medium">{contrato.dias_para_vencer} dias</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p className="font-medium capitalize">{contrato.tipo}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Termos Aceitos:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      {contrato.aceite_termos_uso ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Termos de Uso</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {contrato.aceite_politica_privacidade ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Política de Privacidade</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {contrato.aceite_regras_cobranca ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Regras de Cobrança</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {contrato.aceite_confidencialidade ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Confidencialidade</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum contrato encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não aceitou os termos de uso da plataforma.
                </p>
                <Button onClick={() => document.querySelector('[value="aceitar"]')?.dispatchEvent(new Event('click'))}>
                  Aceitar Termos
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="aceitar">
          <Card>
            <CardHeader>
              <CardTitle>{precisaRenovar ? "Renovar Contrato" : "Aceitar Termos de Uso"}</CardTitle>
              <CardDescription>
                Leia e aceite todos os termos para utilizar a plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Termos de Uso */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">1. Termos de Uso</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      A plataforma Vaga Fácil é um serviço de intermediação de vagas de emprego que conecta empresas a candidatos qualificados através de avaliação de competências.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Checkbox 
                        id="termos" 
                        checked={aceiteTermos}
                        onCheckedChange={(checked) => setAceiteTermos(checked as boolean)}
                      />
                      <label htmlFor="termos" className="text-sm cursor-pointer">
                        Li e aceito os termos de uso
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Taxa de Sucesso */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">2. Regras de Cobrança</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      A taxa de sucesso é calculada sobre a remuneração anual do candidato contratado:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Até R$ 60.000/ano: <strong>10%</strong></li>
                      <li>• R$ 60.000 a R$ 120.000/ano: <strong>12%</strong></li>
                      <li>• R$ 120.000 a R$ 240.000/ano: <strong>15%</strong></li>
                      <li>• Acima de R$ 240.000/ano: <strong>18%</strong></li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Pagamento em até <strong>30 dias</strong> após confirmação da contratação.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Checkbox 
                        id="cobranca" 
                        checked={aceiteCobranca}
                        onCheckedChange={(checked) => setAceiteCobranca(checked as boolean)}
                      />
                      <label htmlFor="cobranca" className="text-sm cursor-pointer">
                        Li e aceito as regras de cobrança
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Confidencialidade */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">3. Confidencialidade</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      A empresa compromete-se a:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Não divulgar dados de candidatos não selecionados</li>
                      <li>• Não contatar candidatos fora da plataforma</li>
                      <li>• Destruir qualquer dado de candidatos rejeitados após o processo</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      Os candidatos permanecem <strong>anônimos</strong> até demonstrarem interesse e concedem permissão.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Checkbox 
                        id="confidencialidade" 
                        checked={aceiteConfidencialidade}
                        onCheckedChange={(checked) => setAceiteConfidencialidade(checked as boolean)}
                      />
                      <label htmlFor="confidencialidade" className="text-sm cursor-pointer">
                        Li e aceito os termos de confidencialidade
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Garantia e Vigência */}
              <div className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">4. Garantia e Política de Privacidade</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      A plataforma oferece garantia de <strong>{regras?.contratados.periodo_garantia_dias || 90} dias</strong> após a contratação.
                      Se o candidato não se adequar durante este período, a empresa poderá solicitar reembolso parcial ou crédito para nova busca.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      <strong>Vigência:</strong> O contrato tem vigência de {regras?.contrato.vigencia_anos || 2} ano(s), renovado automaticamente.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Checkbox 
                        id="privacidade" 
                        checked={aceitePrivacidade}
                        onCheckedChange={(checked) => setAceitePrivacidade(checked as boolean)}
                      />
                      <label htmlFor="privacidade" className="text-sm cursor-pointer">
                        Li e aceito a política de privacidade e garantia
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                size="lg"
                disabled={!todosAceitos || submitting}
                onClick={precisaRenovar ? renovarContrato : aceitarTermos}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {precisaRenovar ? "Renovar Contrato" : "Aceitar e Continuar"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="regras">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Negócio da Plataforma</CardTitle>
              <CardDescription>
                Configurações e políticas vigentes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {regras && (
                <>
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" /> Contrato
                    </h4>
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                      <p>Tipo: <span className="font-medium capitalize">{regras.contrato.tipo === 'unico' ? 'Único (por empresa)' : 'Por vaga'}</span></p>
                      <p>Vigência: <span className="font-medium">{regras.contrato.vigencia_anos} ano(s)</span></p>
                      <p>Aviso de renovação: <span className="font-medium">{regras.contrato.prazo_aviso_renovacao} dias antes</span></p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4" /> Monetização
                    </h4>
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                      <p>Modelo: <span className="font-medium">{regras.monetizacao.modelo === 'fee_salario' ? 'Taxa sobre salário anual' : 'Taxa por publicação'}</span></p>
                      {regras.monetizacao.modelo === 'publicacao_vaga' && (
                        <p>Valor por vaga: <span className="font-medium">R$ {regras.monetizacao.valor_publicacao_vaga.toLocaleString('pt-BR')}</span></p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Lock className="h-4 w-4" /> Confidencialidade
                    </h4>
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                      <p>Anonimato de rejeitados: <span className="font-medium">{regras.confidencialidade.manter_anonimato_rejeitados ? 'Sim' : 'Não'}</span></p>
                      <p>Revogar dados após rejeição: <span className="font-medium">{regras.confidencialidade.revogar_dados_apos_rejeicao ? 'Sim' : 'Não'}</span></p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4" /> Candidatos Contratados
                    </h4>
                    <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                      <p>Período de garantia: <span className="font-medium">{regras.contratados.periodo_garantia_dias} dias</span></p>
                      <p>Retorno após garantia: <span className="font-medium">{regras.contratados.permitir_retorno_apos_garantia ? 'Permitido' : 'Não permitido'}</span></p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Contratos</CardTitle>
              <CardDescription>
                Todos os contratos aceitos pela empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum histórico de contratos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historico.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Contrato v{c.versao_termos}</p>
                          <Badge variant={c.status === 'ativo' ? 'default' : 'secondary'} className="capitalize">
                            {c.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Aceito em {c.data_aceite ? new Date(c.data_aceite).toLocaleDateString('pt-BR') : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Vigência</p>
                        <p>{c.data_vigencia_fim ? new Date(c.data_vigencia_fim).toLocaleDateString('pt-BR') : 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
