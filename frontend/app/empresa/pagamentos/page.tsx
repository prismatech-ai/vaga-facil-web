"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Spinner } from "@/components/ui/spinner"
import { 
  CreditCard, 
  QrCode, 
  FileText, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Copy,
  Download,
  RefreshCw,
  User,
  Briefcase,
  Calendar,
  DollarSign,
  XCircle
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Cobranca {
  id: number
  vaga_candidato_id: number
  empresa_id: number
  vaga_id: number | null
  candidato_id: number | null
  tipo: string
  status: string
  remuneracao_anual: number
  percentual_taxa: number
  valor_taxa: number
  valor_servicos_adicionais: number
  valor_total: number
  valor_pago: number | null
  descricao_faixa: string | null
  data_emissao: string
  data_vencimento: string
  data_pagamento: string | null
  dias_para_vencimento: number
  esta_vencido: boolean
  metodo_pagamento: string | null
  codigo_boleto: string | null
  linha_digitavel: string | null
  url_boleto: string | null
  pix_copia_cola: string | null
  candidato_nome: string | null
  vaga_titulo: string | null
}

interface FaixaTaxa {
  min: number
  max: number
  percentual: number
  descricao: string
}

export default function PagamentosPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [cobrancasPendentes, setCobrancasPendentes] = useState<Cobranca[]>([])
  const [historicoCobrancas, setHistoricoCobrancas] = useState<Cobranca[]>([])
  const [faixasTaxa, setFaixasTaxa] = useState<FaixaTaxa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processandoPagamento, setProcessandoPagamento] = useState(false)
  
  // Modal de pagamento
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false)
  const [cobrancaSelecionada, setCobrancaSelecionada] = useState<Cobranca | null>(null)
  const [metodoPagamento, setMetodoPagamento] = useState<string>("pix")
  const [idTransacao, setIdTransacao] = useState("")
  
  // Modal de simular taxa
  const [modalSimularAberto, setModalSimularAberto] = useState(false)
  const [remuneracaoSimular, setRemuneracaoSimular] = useState("")
  const [simulacaoResultado, setSimulacaoResultado] = useState<{
    valor_taxa: number
    percentual_aplicado: number
    descricao_faixa: string
  } | null>(null)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [pendentes, historico, faixas] = await Promise.all([
        api.get("/api/v1/pagamentos/empresa/pendentes"),
        api.get("/api/v1/pagamentos/empresa/historico"),
        api.get("/api/v1/pagamentos/faixas-taxa")
      ])
      
      setCobrancasPendentes((pendentes as any).data || pendentes || [])
      setHistoricoCobrancas((historico as any).data || historico || [])
      setFaixasTaxa((faixas as any).data || faixas || [])
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de pagamento.",
        variant: "destructive"
      })
    } finally {
      setCarregando(false)
    }
  }

  const abrirModalPagamento = (cobranca: Cobranca) => {
    setCobrancaSelecionada(cobranca)
    setMetodoPagamento("pix")
    setIdTransacao("")
    setModalPagamentoAberto(true)
  }

  const confirmarPagamento = async () => {
    if (!cobrancaSelecionada) return
    
    if (!idTransacao.trim()) {
      toast({
        title: "ID obrigatório",
        description: "Informe o ID da transação",
        variant: "destructive"
      })
      return
    }
    
    setProcessandoPagamento(true)
    try {
      await api.post("/api/v1/pagamentos/confirmar", {
        cobranca_id: cobrancaSelecionada.id,
        metodo_pagamento: metodoPagamento,
        id_transacao: idTransacao
      })
      
      toast({
        title: "Pagamento confirmado!",
        description: "O período de garantia de 90 dias foi iniciado.",
      })
      
      setModalPagamentoAberto(false)
      carregarDados()
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.message || "Não foi possível confirmar o pagamento.",
        variant: "destructive"
      })
    } finally {
      setProcessandoPagamento(false)
    }
  }

  const simularTaxa = async () => {
    const valor = parseFloat(remuneracaoSimular)
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor de remuneração válido",
        variant: "destructive"
      })
      return
    }
    
    try {
      const response: any = await api.post("/api/v1/pagamentos/simular-taxa", {
        remuneracao_anual: valor
      })
      const data = response.data || response
      setSimulacaoResultado({
        valor_taxa: data.valor_taxa,
        percentual_aplicado: data.percentual_aplicado,
        descricao_faixa: data.descricao_faixa
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível simular a taxa",
        variant: "destructive"
      })
    }
  }

  const copiarPix = (pix: string) => {
    navigator.clipboard.writeText(pix)
    toast({
      title: "PIX copiado!",
      description: "O código PIX foi copiado para a área de transferência.",
    })
  }

  const copiarBoleto = (linha: string) => {
    navigator.clipboard.writeText(linha)
    toast({
      title: "Linha digitável copiada!",
      description: "A linha digitável foi copiada para a área de transferência.",
    })
  }

  const getStatusBadge = (status: string, estaVencido: boolean) => {
    if (status === "pago") {
      return <Badge className="bg-green-100 text-green-800">Pago</Badge>
    } else if (status === "vencido" || estaVencido) {
      return <Badge className="bg-red-100 text-red-800">Vencido</Badge>
    } else if (status === "pendente") {
      return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
    } else if (status === "cancelado") {
      return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>
    }
    return <Badge>{status}</Badge>
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pagamentos</h1>
            <p className="text-gray-600 mt-1">Gerencie suas cobranças e pagamentos</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setModalSimularAberto(true)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Simular Taxa
            </Button>
            <Button 
              variant="outline"
              onClick={carregarDados}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Cobranças pendentes em destaque */}
        {cobrancasPendentes.length > 0 && (
          <Alert className="mb-6 border-yellow-300 bg-yellow-50">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Você tem <strong>{cobrancasPendentes.length}</strong> cobrança(s) pendente(s). 
              Regularize os pagamentos para iniciar o período de garantia.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="pendentes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pendentes" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({cobrancasPendentes.length})
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="faixas" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Faixas de Taxa
            </TabsTrigger>
          </TabsList>

          {/* Tab Pendentes */}
          <TabsContent value="pendentes">
            {cobrancasPendentes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">Nenhuma cobrança pendente</h3>
                  <p className="text-gray-600">Você está em dia com seus pagamentos!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {cobrancasPendentes.map((cobranca) => (
                  <Card key={cobranca.id} className={cobranca.esta_vencido ? "border-red-300" : ""}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-gray-500" />
                            {cobranca.candidato_nome || "Candidato"}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Briefcase className="h-4 w-4" />
                            {cobranca.vaga_titulo || "Vaga"}
                          </CardDescription>
                        </div>
                        {getStatusBadge(cobranca.status, cobranca.esta_vencido)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Detalhes da cobrança */}
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Remuneração anual:</span>
                            <span className="font-medium">R$ {cobranca.remuneracao_anual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Taxa ({(cobranca.percentual_taxa * 100).toFixed(0)}%):</span>
                            <span className="font-medium">R$ {cobranca.valor_taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {cobranca.valor_servicos_adicionais > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Serviços adicionais:</span>
                              <span className="font-medium">R$ {cobranca.valor_servicos_adicionais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          <div className="border-t pt-2 flex justify-between">
                            <span className="font-semibold">Total:</span>
                            <span className="font-bold text-lg text-[#03565C]">
                              R$ {cobranca.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className={cobranca.esta_vencido ? "text-red-600 font-medium" : ""}>
                              Vencimento: {new Date(cobranca.data_vencimento).toLocaleDateString('pt-BR')}
                              {!cobranca.esta_vencido && cobranca.dias_para_vencimento > 0 && (
                                <span className="text-gray-500 ml-1">({cobranca.dias_para_vencimento} dias)</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Opções de pagamento */}
                        <div className="space-y-3">
                          {cobranca.pix_copia_cola && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <QrCode className="h-4 w-4" />
                                PIX Copia e Cola
                              </p>
                              <div className="flex gap-2">
                                <code className="text-xs bg-gray-100 p-2 rounded flex-1 overflow-hidden text-ellipsis">
                                  {cobranca.pix_copia_cola.substring(0, 40)}...
                                </code>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => copiarPix(cobranca.pix_copia_cola!)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {cobranca.linha_digitavel && (
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Linha Digitável
                              </p>
                              <div className="flex gap-2">
                                <code className="text-xs bg-gray-100 p-2 rounded flex-1 overflow-hidden text-ellipsis">
                                  {cobranca.linha_digitavel}
                                </code>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => copiarBoleto(cobranca.linha_digitavel!)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <Button 
                            className="w-full bg-[#03565C] hover:bg-[#024950]"
                            onClick={() => abrirModalPagamento(cobranca)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Confirmar Pagamento
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Histórico */}
          <TabsContent value="historico">
            {historicoCobrancas.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">Nenhuma cobrança registrada</h3>
                  <p className="text-gray-600">O histórico aparecerá aqui após a primeira contratação.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {historicoCobrancas.map((cobranca) => (
                  <Card key={cobranca.id}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${
                            cobranca.status === 'pago' ? 'bg-green-100' : 
                            cobranca.status === 'cancelado' ? 'bg-gray-100' : 
                            'bg-red-100'
                          }`}>
                            {cobranca.status === 'pago' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : cobranca.status === 'cancelado' ? (
                              <XCircle className="h-5 w-5 text-gray-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{cobranca.candidato_nome || "Candidato"}</p>
                            <p className="text-sm text-gray-500">{cobranca.vaga_titulo || "Vaga"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">R$ {cobranca.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-sm text-gray-500">
                            {cobranca.data_pagamento 
                              ? `Pago em ${new Date(cobranca.data_pagamento).toLocaleDateString('pt-BR')}`
                              : `Emitido em ${new Date(cobranca.data_emissao).toLocaleDateString('pt-BR')}`
                            }
                          </p>
                        </div>
                        {getStatusBadge(cobranca.status, cobranca.esta_vencido)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Faixas de Taxa */}
          <TabsContent value="faixas">
            <Card>
              <CardHeader>
                <CardTitle>Tabela de Taxas de Sucesso</CardTitle>
                <CardDescription>
                  A taxa é calculada com base na remuneração anual do candidato contratado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Faixa Salarial (Anual)</th>
                        <th className="text-center py-3 px-4">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faixasTaxa.map((faixa, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">{faixa.descricao}</td>
                          <td className="text-center py-3 px-4 font-semibold text-[#03565C]">
                            {faixa.percentual.toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Exemplo:</strong> Para um candidato com remuneração anual de R$ 96.000,00 
                    (faixa R$ 60.000 a R$ 120.000), a taxa de sucesso será de 12%, 
                    totalizando R$ 11.520,00.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Pagamento */}
        <Dialog open={modalPagamentoAberto} onOpenChange={setModalPagamentoAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar Pagamento</DialogTitle>
              <DialogDescription>
                Informe os dados do pagamento realizado
              </DialogDescription>
            </DialogHeader>
            
            {cobrancaSelecionada && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Candidato</p>
                  <p className="font-medium">{cobrancaSelecionada.candidato_nome}</p>
                  <p className="text-2xl font-bold text-[#03565C] mt-2">
                    R$ {cobrancaSelecionada.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Método de Pagamento</Label>
                  <RadioGroup value={metodoPagamento} onValueChange={setMetodoPagamento}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pix" id="pix" />
                      <Label htmlFor="pix" className="flex items-center gap-2">
                        <QrCode className="h-4 w-4" /> PIX
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="boleto" id="boleto" />
                      <Label htmlFor="boleto" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Boleto
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cartao" id="cartao" />
                      <Label htmlFor="cartao" className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Cartão
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id_transacao">ID da Transação / Comprovante</Label>
                  <Input
                    id="id_transacao"
                    placeholder="Ex: E123456789"
                    value={idTransacao}
                    onChange={(e) => setIdTransacao(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalPagamentoAberto(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmarPagamento}
                disabled={processandoPagamento}
                className="bg-[#03565C] hover:bg-[#024950]"
              >
                {processandoPagamento ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Processando...
                  </>
                ) : (
                  "Confirmar Pagamento"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Simular Taxa */}
        <Dialog open={modalSimularAberto} onOpenChange={setModalSimularAberto}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Simular Taxa de Sucesso</DialogTitle>
              <DialogDescription>
                Descubra quanto será a taxa baseada na remuneração do candidato
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remuneracao">Remuneração Anual (R$)</Label>
                <div className="flex gap-2">
                  <Input
                    id="remuneracao"
                    type="number"
                    placeholder="96000"
                    value={remuneracaoSimular}
                    onChange={(e) => setRemuneracaoSimular(e.target.value)}
                  />
                  <Button onClick={simularTaxa} className="bg-[#03565C] hover:bg-[#024950]">
                    Calcular
                  </Button>
                </div>
              </div>

              {simulacaoResultado && (
                <div className="bg-[#03565C]/5 p-4 rounded-lg border border-[#03565C]/20">
                  <p className="text-sm text-gray-600">Taxa calculada</p>
                  <p className="text-3xl font-bold text-[#03565C]">
                    R$ {simulacaoResultado.valor_taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Percentual: {simulacaoResultado.percentual_aplicado.toFixed(0)}%</p>
                    <p>Faixa: {simulacaoResultado.descricao_faixa}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setModalSimularAberto(false)
                setSimulacaoResultado(null)
                setRemuneracaoSimular("")
              }}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
