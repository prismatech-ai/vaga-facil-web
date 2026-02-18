"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"

export interface AdaptiveTestSessionResponse {
  session_id: number
  habilidade: string
  nivel_atual: string
  questao_numero: number
  total_questoes_nivel: number
  questao: {
    id: number
    texto_questao: string
    alternatives: Array<{
      id: number
      texto: string
      ordem: number
    }>
  }
}

export interface AdaptiveTestAnswerResponse {
  acertou: boolean
  resposta_correta_id: number
  proxima_questao?: AdaptiveTestSessionResponse["questao"]
  sessao_completa: boolean
  resultado_final?: {
    session_id: number
    habilidade: string
    nivel_final: string
    mudanca_nivel: string
    descricao_resultado: string
    acertos_basico?: number
    acertos_intermediario?: number
    acertos_avancado?: number
    acertos_especialista?: number
  }
}

interface AdaptiveTestProps {
  habilidade: string
  onComplete: (resultado: any) => void
  onCancel: () => void
}

const NIVEL_LABELS: Record<number, string> = {
  1: "Básico",
  2: "Intermediário",
  3: "Avançado",
  4: "Especialista"
}

const NIVEL_COLORS: Record<number, string> = {
  1: "bg-blue-100 text-blue-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-orange-100 text-orange-800",
  4: "bg-green-100 text-green-800"
}

export default function TesteAdaptativo({ habilidade, onComplete, onCancel }: AdaptiveTestProps) {
  const { toast } = useToast()
  
  // States
  const [step, setStep] = useState<"selecionar-nivel" | "teste" | "resultado">("selecionar-nivel")
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isAnswering, setIsAnswering] = useState(false)
  
  // Teste em andamento
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [nivelAtual, setNivelAtual] = useState<string | null>(null)
  const [questaoAtual, setQuestaoAtual] = useState<AdaptiveTestSessionResponse["questao"] | null>(null)
  const [questaoNumero, setQuestaoNumero] = useState(1)
  const [totalQuestoes, setTotalQuestoes] = useState(5)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  
  // Resultado
  const [resultado, setResultado] = useState<AdaptiveTestAnswerResponse["resultado_final"] | null>(null)
  const [historico, setHistorico] = useState<{ questionId: number; alternativeId: number; acertou: boolean }[]>([])

  // Iniciar teste
  const iniciarTeste = async () => {
    if (!selectedLevel) {
      toast({
        title: "Erro",
        description: "Selecione um nível para continuar",
        variant: "destructive",
      })
      return
    }

    setIsInitializing(true)
    try {
      const nivelMap: Record<number, string> = {
        1: "basico",
        2: "intermediario",
        3: "avancado"
      }

      const response = await api.post<AdaptiveTestSessionResponse>(
        "/api/v1/candidates/testes/adaptativo/iniciar",
        {
          habilidade: habilidade,
          nivel_inicial: nivelMap[selectedLevel]
        }
      )

      setSessionId(response.session_id)
      setNivelAtual(response.nivel_atual)
      setQuestaoAtual(response.questao)
      setQuestaoNumero(response.questao_numero)
      setTotalQuestoes(5) // 5 questões por nível agora
      setStep("teste")
      setSelectedAnswer(null)

      toast({
        title: "✅ Teste Iniciado",
        description: `Nível: ${response.nivel_atual}. Você terá 5 questões.`,
        variant: "default"
      })
    } catch (err: any) {
      toast({
        title: "❌ Erro",
        description: err.message || "Erro ao iniciar teste",
        variant: "destructive",
      })
    } finally {
      setIsInitializing(false)
    }
  }

  // Responder questão
  const responderQuestao = async () => {
    if (!sessionId || !questaoAtual || selectedAnswer === null) {
      toast({
        title: "Erro",
        description: "Selecione uma resposta",
        variant: "destructive",
      })
      return
    }

    setIsAnswering(true)
    try {
      const response = await api.post<AdaptiveTestAnswerResponse>(
        `/api/v1/candidates/testes/adaptativo/sessao/${sessionId}/responder`,
        {
          question_id: questaoAtual.id,
          alternative_id: selectedAnswer
        }
      )

      // Mostrar feedback imediato
      if (response.acertou) {
        toast({
          title: "✅ Correto!",
          description: "Próxima questão...",
          variant: "default"
        })
      } else {
        toast({
          title: "❌ Incorreto",
          description: "Tente acertar as próximas!",
          variant: "destructive"
        })
      }

      // Registrar resposta no histórico
      setHistorico([
        ...historico,
        {
          questionId: questaoAtual.id,
          alternativeId: selectedAnswer,
          acertou: response.acertou
        }
      ])

      if (response.sessao_completa && response.resultado_final) {
        // Teste completo
        setResultado(response.resultado_final)
        setStep("resultado")
        
        toast({
          title: "✅ Teste Concluído",
          description: response.resultado_final.descricao_resultado,
          variant: "default"
        })
      } else {
        // Próxima questão
        if (response.proxima_questao) {
          setQuestaoAtual(response.proxima_questao)
          setQuestaoNumero(questaoNumero + 1)
          setSelectedAnswer(null)
        }
      }
    } catch (err: any) {
      toast({
        title: "❌ Erro",
        description: err.message || "Erro ao responder questão",
        variant: "destructive",
      })
    } finally {
      setIsAnswering(false)
    }
  }

  // ===== ETAPA 1: Selecionar Nível =====
  if (step === "selecionar-nivel") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white rounded-t-lg">
          <CardTitle className="text-2xl">Teste Adaptativo: {habilidade}</CardTitle>
          <CardDescription className="text-white/80">
            Qual é o seu nível de conhecimento atual?
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="space-y-4">
            <p className="text-gray-600 mb-6">
              Selecione seu nível inicial em <strong>{habilidade}</strong>. Você terá 5 questões e o teste se adaptará conforme seu desempenho, podendo evoluir para níveis superiores ou regredir para inferiores.
            </p>

            <div className="grid gap-3">
              {[
                { level: 1, label: "Básico", description: "Fundamentos e conceitos iniciais" },
                { level: 2, label: "Intermediário", description: "Aplicação prática e conceitos intermediários" },
                { level: 3, label: "Avançado", description: "Técnicas avançadas e problemas complexos" }
              ].map((option) => (
                <button
                  key={option.level}
                  onClick={() => setSelectedLevel(option.level)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedLevel === option.level
                      ? "border-[#03565C] bg-[#03565C]/5"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{option.label}</h4>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                    {selectedLevel === option.level && (
                      <CheckCircle2 className="h-5 w-5 text-[#03565C] flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <Alert className="border-blue-200 bg-blue-50 mt-6">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Regras de Progressão:</strong> O teste tem 5 questões por nível. Conforme você acerta, pode evoluir para níveis superiores. Se erra muito, pode regredir. O objetivo é encontrar seu verdadeiro nível de conhecimento!
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={iniciarTeste}
                disabled={isInitializing || !selectedLevel}
                className="flex-1 bg-[#03565C] hover:bg-[#024147]"
              >
                {isInitializing ? "Iniciando..." : "Iniciar Teste"}
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ===== ETAPA 2: Respondendo Questões =====
  if (step === "teste" && questaoAtual) {
    const progressPercent = (questaoNumero / totalQuestoes) * 100
    const acertos = historico.filter(h => h.acertou).length

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white rounded-t-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl">{habilidade}</CardTitle>
              <CardDescription className="text-white/80">{nivelAtual}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{questaoNumero}</div>
              <div className="text-white/80 text-sm">de {totalQuestoes}</div>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </CardHeader>

        <CardContent className="pt-8">
          <div className="space-y-6">
            {/* Questão */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                {questaoAtual.texto_questao}
              </h3>

              {/* Alternativas */}
              <div className="space-y-3">
                {questaoAtual.alternatives.map((alt) => (
                  <button
                    key={alt.id}
                    onClick={() => setSelectedAnswer(alt.id)}
                    disabled={isAnswering}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedAnswer === alt.id
                        ? "border-[#03565C] bg-[#03565C]/5"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedAnswer === alt.id
                            ? "border-[#03565C] bg-[#03565C]"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedAnswer === alt.id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="text-gray-900">{alt.texto}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-green-600">{acertos}</div>
                <div className="text-xs text-gray-600">Acertos</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-600">{questaoNumero - 1 - acertos}</div>
                <div className="text-xs text-gray-600">Erros</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={responderQuestao}
                disabled={isAnswering || selectedAnswer === null}
                className="flex-1 bg-[#03565C] hover:bg-[#024147] gap-2"
              >
                {isAnswering ? "Enviando..." : "Próxima"}
                {!isAnswering && <ArrowRight className="h-4 w-4" />}
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                disabled={isAnswering}
              >
                Sair
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ===== ETAPA 3: Resultado =====
  if (step === "resultado" && resultado) {
    const getNivelNumber = (nivelStr: string): number => {
      if (nivelStr.includes("Especialista")) return 4
      if (nivelStr.includes("Avançado")) return 3
      if (nivelStr.includes("Intermediário")) return 2
      return 1
    }

    const nivelNumber = getNivelNumber(resultado.nivel_final)
    const mudancaLevel = resultado.mudanca_nivel

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-lg">
          <CardTitle className="text-2xl flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            Teste Concluído!
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-8">
          <div className="space-y-6">
            {/* Nível Final */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Seu nível em</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{resultado.habilidade}</h3>
              
              <div className={`inline-block px-6 py-3 rounded-lg ${NIVEL_COLORS[nivelNumber]}`}>
                <div className="text-2xl font-bold">{resultado.nivel_final}</div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2">
                <Badge variant="outline" className={
                  mudancaLevel === "progrediu" ? "bg-green-50 text-green-700 border-green-200" :
                  mudancaLevel === "regrediu" ? "bg-red-50 text-red-700 border-red-200" :
                  "bg-blue-50 text-blue-700 border-blue-200"
                }>
                  {mudancaLevel === "progrediu" && "📈 Progrediu"}
                  {mudancaLevel === "regrediu" && "📉 Regrediu"}
                  {mudancaLevel === "confirmado" && "✅ Confirmado"}
                </Badge>
              </div>
            </div>

            {/* Descrição */}
            <Alert className="border-green-200 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {resultado.descricao_resultado}
              </AlertDescription>
            </Alert>

            {/* Estatísticas Detalhadas */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Desempenho por Nível:</h4>
              <div className="space-y-2">
                {resultado.acertos_basico !== null && resultado.acertos_basico !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span className="text-gray-700">Básico</span>
                    <Badge className="bg-blue-100 text-blue-800">{resultado.acertos_basico}/5</Badge>
                  </div>
                )}
                {resultado.acertos_intermediario !== null && resultado.acertos_intermediario !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                    <span className="text-gray-700">Intermediário</span>
                    <Badge className="bg-yellow-100 text-yellow-800">{resultado.acertos_intermediario}/5</Badge>
                  </div>
                )}
                {resultado.acertos_avancado !== null && resultado.acertos_avancado !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span className="text-gray-700">Avançado</span>
                    <Badge className="bg-orange-100 text-orange-800">{resultado.acertos_avancado}/5</Badge>
                  </div>
                )}
                {resultado.acertos_especialista !== null && resultado.acertos_especialista !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span className="text-gray-700">Especialista 🎉</span>
                    <Badge className="bg-green-100 text-green-800">{resultado.acertos_especialista}/5</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => onComplete(resultado)}
                className="flex-1 bg-[#03565C] hover:bg-[#024147]"
              >
                Concluir
              </Button>
              <Button
                onClick={() => {
                  setStep("selecionar-nivel")
                  setSelectedLevel(null)
                  setSessionId(null)
                  setHistorico([])
                  setResultado(null)
                }}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Testar Outra Habilidade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
