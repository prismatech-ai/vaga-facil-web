"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Clock, ChevronRight, Play } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface Teste {
  id: string
  competenciaId: string
  competenciaNome: string
  nivelTeste: 1 | 2 | 3 | 4
  status: "nao-iniciado" | "em-progresso" | "concluido"
  tempoLimite: number // em minutos
  tempoRestante?: number
  respostasCorretas?: number
  totalPerguntas?: number
}

interface TestesTecnicosProps {
  testes: Teste[]
  onTestStart: (testeId: string) => void
  onTestComplete: (testeId: string, score: number) => void
  onAllTestsComplete?: () => void
  isLoading?: boolean
}

const STATUS_LABELS = {
  "nao-iniciado": "Não iniciado",
  "em-progresso": "Em andamento",
  "concluido": "Concluído",
}

const STATUS_CORES = {
  "nao-iniciado": "bg-gray-100 text-gray-800 border-gray-300",
  "em-progresso": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "concluido": "bg-green-100 text-green-800 border-green-300",
}

export function TestesTecnicos({
  testes,
  onTestStart,
  onTestComplete,
  onAllTestsComplete,
  isLoading = false,
}: TestesTecnicosProps) {
  const [testesLocais, setTestesLocais] = useState<Teste[]>(testes)
  const [testEmFoco, setTestEmFoco] = useState<string | null>(null)

  const concluidosCount = testesLocais.filter((t) => t.status === "concluido").length
  const emProgressoCount = testesLocais.filter((t) => t.status === "em-progresso").length

  const handleStartTest = (testeId: string) => {
    setTestEmFoco(testeId)
    setTestesLocais(
      testesLocais.map((t) => (t.id === testeId ? { ...t, status: "em-progresso" } : t))
    )
    onTestStart(testeId)
  }

  const handleCompleteTest = (testeId: string, score: number) => {
    setTestesLocais(
      testesLocais.map((t) =>
        t.id === testeId
          ? { ...t, status: "concluido", respostasCorretas: score }
          : t
      )
    )
    onTestComplete(testeId, score)
    setTestEmFoco(null)
  }

  const tempoTotalEstimado = testesLocais.reduce((acc, t) => acc + t.tempoLimite, 0)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary/30 py-8">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white">
          <CardTitle className="text-2xl">Testes Técnicos</CardTitle>
          <CardDescription className="text-white/80">
            Etapa 3 de 3 - Valide suas competências com testes práticos
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Progress Indicator */}
          <div className="mb-8 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                Etapa 3 de 3 - {concluidosCount}/{testesLocais.length} concluídos
              </span>
              <span className="text-gray-500">Testes</span>
            </div>
            <Progress
              value={(concluidosCount / testesLocais.length) * 100}
              className="h-2"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{testesLocais.length}</div>
                  <div className="text-sm text-gray-600">Testes totais</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-900">{emProgressoCount}</div>
                  <div className="text-sm text-yellow-600">Em progresso</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">{concluidosCount}</div>
                  <div className="text-sm text-green-600">Concluídos</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tempo Estimado */}
          <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10 mb-8">
            <Clock className="h-4 w-4 text-[#03565C]" />
            <AlertDescription className="text-[#03565C]">
              <div className="font-semibold">Tempo estimado total: ~{tempoTotalEstimado} minutos</div>
              <p className="text-sm mt-1">
                Você pode fazer os testes em qualquer ordem e retomar a qualquer momento.
              </p>
            </AlertDescription>
          </Alert>

          {/* Lista de Testes */}
          <div className="space-y-4 mb-8">
            {testesLocais.map((teste) => (
              <div
                key={teste.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  testEmFoco === teste.id
                    ? "border-[#24BFB0] bg-[#25D9B8]/10"
                    : teste.status === "concluido"
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{teste.competenciaNome}</h4>
                      <Badge
                        variant="outline"
                        className={`${STATUS_CORES[teste.status]} text-xs`}
                      >
                        {STATUS_LABELS[teste.status]}
                      </Badge>
                      {teste.nivelTeste && (
                        <Badge variant="secondary" className="text-xs">
                          Nível {teste.nivelTeste}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {teste.tempoLimite} minutos
                      </div>
                      {teste.status === "concluido" && teste.totalPerguntas && (
                        <div className="text-green-600 font-semibold">
                          {teste.respostasCorretas}/{teste.totalPerguntas} respostas corretas
                        </div>
                      )}
                    </div>
                  </div>

                  {teste.status === "nao-iniciado" && (
                    <Button
                      onClick={() => handleStartTest(teste.id)}
                      disabled={isLoading}
                      className="gap-2 ml-4"
                      variant="default"
                    >
                      <Play className="h-4 w-4" />
                      Iniciar
                    </Button>
                  )}

                  {teste.status === "em-progresso" && (
                    <Button
                      onClick={() => handleCompleteTest(teste.id, 8)}
                      disabled={isLoading}
                      className="gap-2 ml-4 bg-yellow-600 hover:bg-yellow-700"
                    >
                      Simular conclusão
                    </Button>
                  )}

                  {teste.status === "concluido" && (
                    <Badge className="bg-green-600 text-white ml-4">✓ Concluído</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Info */}
          <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10 mb-8">
            <AlertCircle className="h-4 w-4 text-[#03565C]" />
            <AlertDescription className="text-[#03565C] text-sm">
              Os testes são múltipla escolha e baseados no nível de proficiência que você declarou.
              Seu desempenho será visível apenas para você e para empresas com as quais você
              decidir compartilhar seus dados.
            </AlertDescription>
          </Alert>

          {/* CTA */}
          <Button
            onClick={onAllTestsComplete}
            disabled={concluidosCount !== testesLocais.length || isLoading}
            className="w-full gap-2 bg-[#03565C] hover:bg-[#024147] py-6 text-base"
          >
            {isLoading ? "Processando..." : "Continuar para Dashboard"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
