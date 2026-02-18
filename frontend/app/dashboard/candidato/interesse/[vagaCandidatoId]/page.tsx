"use client"

import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Briefcase, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  XCircle,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

function InteresseVagaContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const vagaCandidatoId = params.vagaCandidatoId as string
  const respostaParam = searchParams.get("resposta")
  
  const [detalhes, setDetalhes] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [respondido, setRespondido] = useState(false)
  const [aceitou, setAceitou] = useState<boolean | null>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState("")
  const [mostrarFormRejeicao, setMostrarFormRejeicao] = useState(false)
  
  useEffect(() => {
    carregarDetalhes()
  }, [vagaCandidatoId])
  
  useEffect(() => {
    // Se veio com resposta via URL (do e-mail)
    if (respostaParam === "sim" && detalhes && !detalhes.ja_respondeu) {
      handleResponder(true)
    } else if (respostaParam === "nao" && detalhes && !detalhes.ja_respondeu) {
      setMostrarFormRejeicao(true)
    }
  }, [respostaParam, detalhes])
  
  const carregarDetalhes = async () => {
    try {
      const response: any = await api.get(`/workflow/candidato/interesse/${vagaCandidatoId}`)
      setDetalhes(response.data)
      
      if (response.data.ja_respondeu) {
        setRespondido(true)
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da vaga.",
        variant: "destructive"
      })
    } finally {
      setCarregando(false)
    }
  }
  
  const handleResponder = async (aceita: boolean) => {
    setProcessando(true)
    
    try {
      await api.post(`/workflow/candidato/interesse/${vagaCandidatoId}/responder`, {
        aceita,
        motivo_rejeicao: aceita ? null : motivoRejeicao
      })
      
      setRespondido(true)
      setAceitou(aceita)
      
      toast({
        title: aceita ? "Interesse confirmado!" : "Resposta enviada",
        description: aceita 
          ? "A empresa será notificada sobre seu interesse."
          : "A empresa foi informada sobre sua decisão.",
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Não foi possível enviar sua resposta.",
        variant: "destructive"
      })
    } finally {
      setProcessando(false)
    }
  }
  
  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03565C]" />
      </div>
    )
  }
  
  if (respondido) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-lg mx-auto px-4">
          <Card className="text-center">
            <CardContent className="pt-12 pb-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${aceitou ? 'bg-green-100' : 'bg-gray-100'}`}>
                {aceitou ? (
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                ) : (
                  <XCircle className="h-10 w-10 text-gray-500" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {aceitou ? "Interesse Confirmado!" : "Resposta Registrada"}
              </h2>
              <p className="text-gray-600 mb-6">
                {aceitou 
                  ? "A empresa receberá sua confirmação e poderá prosseguir com o processo seletivo."
                  : "A empresa foi notificada sobre sua decisão. Obrigado por responder!"}
              </p>
              
              {aceitou && (
                <div className="bg-green-50 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-green-800">
                    <Clock className="h-4 w-4" />
                    Próximos passos:
                  </h3>
                  <ul className="space-y-1 text-sm text-green-700">
                    <li>• A empresa confirmará interesse formal</li>
                    <li>• Você receberá um convite para entrevista</li>
                    <li>• Ao aceitar, seus dados completos serão liberados</li>
                  </ul>
                </div>
              )}
              
              <Button 
                onClick={() => router.push('/dashboard/candidato')}
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
  
  if (!detalhes) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-lg mx-auto px-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Não foi possível carregar os detalhes desta oportunidade.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }
  
  const { vaga } = detalhes
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nova Oportunidade!</h1>
          <p className="text-gray-600 mt-2">Uma empresa está interessada no seu perfil</p>
        </div>
        
        {/* Detalhes da Vaga */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{vaga?.titulo}</CardTitle>
                <CardDescription className="mt-2 flex items-center gap-4">
                  {vaga?.local && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {vaga.local}
                    </span>
                  )}
                  {vaga?.modelo_trabalho && (
                    <Badge variant="outline">{vaga.modelo_trabalho}</Badge>
                  )}
                </CardDescription>
              </div>
              <Briefcase className="h-8 w-8 text-[#03565C]" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {vaga?.area && (
              <div>
                <Label className="text-sm text-gray-500">Área</Label>
                <p className="font-medium">{vaga.area}</p>
              </div>
            )}
            
            {vaga?.nivel_senioridade && (
              <div>
                <Label className="text-sm text-gray-500">Nível</Label>
                <p className="font-medium capitalize">{vaga.nivel_senioridade}</p>
              </div>
            )}
            
            {vaga?.descricao && (
              <div>
                <Label className="text-sm text-gray-500">Descrição</Label>
                <p className="text-gray-700 mt-1">{vaga.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Nota sobre privacidade */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Building2 className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Nota de privacidade:</strong> Seus dados pessoais ainda não foram compartilhados. 
            Se você demonstrar interesse e a empresa prosseguir com o convite de entrevista, 
            você poderá decidir se deseja liberar suas informações completas.
          </AlertDescription>
        </Alert>
        
        {/* Formulário de rejeição */}
        {mostrarFormRejeicao && (
          <Card className="mb-6 border-amber-200">
            <CardHeader>
              <CardTitle className="text-lg">Por que não tem interesse?</CardTitle>
              <CardDescription>
                Ajude-nos a entender para melhorar nossas recomendações (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Ex: Não atende às minhas expectativas salariais, localização muito distante, etc."
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
              />
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setMostrarFormRejeicao(false)}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={() => handleResponder(false)}
                  disabled={processando}
                  variant="destructive"
                  className="flex-1"
                >
                  {processando ? "Enviando..." : "Confirmar Rejeição"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Botões de ação */}
        {!mostrarFormRejeicao && (
          <div className="space-y-4">
            <p className="text-center text-gray-700 font-medium">
              Você tem interesse nesta oportunidade?
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => handleResponder(true)}
                disabled={processando}
                className="bg-green-600 hover:bg-green-700 h-14 text-lg"
              >
                <ThumbsUp className="h-5 w-5 mr-2" />
                {processando ? "Enviando..." : "Tenho Interesse"}
              </Button>
              
              <Button 
                onClick={() => setMostrarFormRejeicao(true)}
                disabled={processando}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 h-14 text-lg"
              >
                <ThumbsDown className="h-5 w-5 mr-2" />
                Não Tenho Interesse
              </Button>
            </div>
            
            <p className="text-xs text-center text-gray-500">
              Ao responder "Tenho Interesse", você autoriza a empresa a prosseguir 
              com o processo seletivo. Seus dados só serão liberados após você 
              aceitar o convite formal de entrevista.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InteresseVagaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#03565C]" />
      </div>
    }>
      <InteresseVagaContent />
    </Suspense>
  )
}
