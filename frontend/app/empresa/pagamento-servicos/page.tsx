"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  CreditCard, 
  QrCode, 
  FileText, 
  CheckCircle2, 
  Clock,
  Shield,
  Users,
  Briefcase
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

function PagamentoServicosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const vagaCandidatoId = searchParams.get("vaga_candidato_id")
  const valorParam = searchParams.get("valor")
  
  const [metodoPagamento, setMetodoPagamento] = useState<string>("pix")
  const [processando, setProcessando] = useState(false)
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false)
  const [detalhes, setDetalhes] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  
  const valor = valorParam ? parseFloat(valorParam) : 0
  
  useEffect(() => {
    if (vagaCandidatoId) {
      carregarDetalhes()
    }
  }, [vagaCandidatoId])
  
  const carregarDetalhes = async () => {
    try {
      // Carregar detalhes do candidato e vaga
      const response: any = await api.get(`/workflow/empresa/vaga-candidato/${vagaCandidatoId}`)
      setDetalhes(response.data)
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error)
    } finally {
      setCarregando(false)
    }
  }
  
  const handlePagar = async () => {
    setProcessando(true)
    
    try {
      // Simular processamento de pagamento
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Em produção, integrar com gateway de pagamento real
      // await api.post('/pagamentos/processar', {
      //   vaga_candidato_id: vagaCandidatoId,
      //   valor,
      //   metodo: metodoPagamento
      // })
      
      setPagamentoConfirmado(true)
      toast({
        title: "Pagamento confirmado!",
        description: "Os serviços serão realizados em até 5 dias úteis.",
      })
    } catch (error: any) {
      toast({
        title: "Erro no pagamento",
        description: error.response?.data?.detail || "Não foi possível processar o pagamento.",
        variant: "destructive"
      })
    } finally {
      setProcessando(false)
    }
  }
  
  if (pagamentoConfirmado) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-lg mx-auto px-4">
          <Card className="text-center">
            <CardContent className="pt-12 pb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Pagamento Confirmado!
              </h2>
              <p className="text-gray-600 mb-6">
                Seu pagamento de R$ {valor.toFixed(2)} foi processado com sucesso.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Próximos passos:
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Os serviços serão realizados em até 5 dias úteis</li>
                  <li>• Você receberá os resultados por e-mail</li>
                  <li>• Os relatórios também estarão disponíveis no painel</li>
                </ul>
              </div>
              
              <Button 
                onClick={() => router.push('/empresa/dashboard')}
                className="bg-[#03565C] hover:bg-[#024950]"
              >
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pagamento de Serviços</h1>
          <p className="text-gray-600 mt-2">Complete o pagamento para ativar os serviços adicionais</p>
        </div>
        
        {/* Resumo do pedido */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Resumo do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {valor >= 150 && valor < 300 && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-[#03565C]" />
                  <div>
                    <p className="font-medium">Teste de Soft Skills</p>
                    <p className="text-sm text-gray-500">Avaliação comportamental</p>
                  </div>
                </div>
                <span className="font-semibold">R$ 150,00</span>
              </div>
            )}
            
            {valor >= 300 && valor < 450 && (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-[#03565C]" />
                  <div>
                    <p className="font-medium">Entrevista Técnica</p>
                    <p className="text-sm text-gray-500">Conduzida por especialista</p>
                  </div>
                </div>
                <span className="font-semibold">R$ 300,00</span>
              </div>
            )}
            
            {valor >= 450 && (
              <>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-[#03565C]" />
                    <div>
                      <p className="font-medium">Teste de Soft Skills</p>
                      <p className="text-sm text-gray-500">Avaliação comportamental</p>
                    </div>
                  </div>
                  <span className="font-semibold">R$ 150,00</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-[#03565C]" />
                    <div>
                      <p className="font-medium">Entrevista Técnica</p>
                      <p className="text-sm text-gray-500">Conduzida por especialista</p>
                    </div>
                  </div>
                  <span className="font-semibold">R$ 300,00</span>
                </div>
              </>
            )}
            
            <div className="border-t pt-4 flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-[#03565C]">R$ {valor.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Forma de pagamento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Forma de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={metodoPagamento} onValueChange={setMetodoPagamento}>
              <div className="space-y-3">
                <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${metodoPagamento === 'pix' ? 'border-[#03565C] bg-[#03565C]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex-1 cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <QrCode className="h-6 w-6 text-[#03565C]" />
                      <div>
                        <p className="font-medium">PIX</p>
                        <p className="text-sm text-gray-500">Pagamento instantâneo</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Recomendado</Badge>
                  </Label>
                </div>
                
                <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${metodoPagamento === 'boleto' ? 'border-[#03565C] bg-[#03565C]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <RadioGroupItem value="boleto" id="boleto" />
                  <Label htmlFor="boleto" className="flex-1 cursor-pointer flex items-center gap-3">
                    <FileText className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-medium">Boleto Bancário</p>
                      <p className="text-sm text-gray-500">Compensação em até 3 dias úteis</p>
                    </div>
                  </Label>
                </div>
                
                <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${metodoPagamento === 'cartao' ? 'border-[#03565C] bg-[#03565C]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <RadioGroupItem value="cartao" id="cartao" />
                  <Label htmlFor="cartao" className="flex-1 cursor-pointer flex items-center gap-3">
                    <CreditCard className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-medium">Cartão de Crédito</p>
                      <p className="text-sm text-gray-500">Até 12x sem juros</p>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
            
            {metodoPagamento === 'pix' && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-3">QR Code será gerado após confirmar</p>
                <div className="w-48 h-48 bg-gray-200 rounded-lg mx-auto flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-gray-400" />
                </div>
              </div>
            )}
            
            {metodoPagamento === 'cartao' && (
              <div className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="numero-cartao">Número do Cartão</Label>
                  <Input id="numero-cartao" placeholder="0000 0000 0000 0000" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="validade">Validade</Label>
                    <Input id="validade" placeholder="MM/AA" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="nome-cartao">Nome no Cartão</Label>
                  <Input id="nome-cartao" placeholder="NOME COMPLETO" className="mt-1" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Segurança */}
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Pagamento 100% seguro. Seus dados são protegidos com criptografia SSL.
          </AlertDescription>
        </Alert>
        
        {/* Botão de pagamento */}
        <Button 
          onClick={handlePagar}
          disabled={processando}
          className="w-full bg-[#03565C] hover:bg-[#024950] h-12 text-lg"
        >
          {processando ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Processando...
            </>
          ) : (
            `Pagar R$ ${valor.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  )
}

export default function PagamentoServicosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03565C]" />
      </div>
    }>
      <PagamentoServicosContent />
    </Suspense>
  )
}
