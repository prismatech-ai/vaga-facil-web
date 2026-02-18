"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, BookOpen, Clock, Award, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"

interface Alternative {
  id: number
  texto: string
  ordem: number
}

interface Questao {
  id: number
  texto_questao: string
  ordem: number
  alternatives: Alternative[]
}

interface Teste {
  id: number
  nome: string
  habilidade: string
  nivel: string
  descricao: string
  total_questoes: number
  questoes: Questao[]
}

interface TestesResponse {
  total_testes: number
  testes: Teste[]
  autoavaliacao_nivel: Record<string, number>
  mensagem: string
}

export default function TestesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState<TestesResponse | null>(null)

  useEffect(() => {
    carregarTestes()
  }, [])

  const carregarTestes = async () => {
    try {
      setIsLoading(true)
      setError("")
      
      // Carregar testes disponíveis baseados na autoavaliação
      const response = await api.get<TestesResponse>("/api/v1/candidates/testes/habilidades-disponiveis")
      setData(response)
    } catch (err: any) {

      setError(err.message || "Não foi possível carregar os testes disponíveis. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const iniciarTeste = (testeId: number) => {
    // Redirecionar para a página de execução do teste
    window.location.href = `/dashboard/candidato/testes/${testeId}/executar`
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testes de Habilidades</h1>
          <p className="text-gray-600 mt-2">Carregando testes disponíveis...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Testes de Habilidades</h1>
        <p className="text-gray-600 mt-2">Avalie suas habilidades práticas com testes baseados nas competências que você indicou</p>
      </div>

      {/* Info Alert */}
      {data && data.testes.length > 0 && (
        <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
          <BookOpen className="h-4 w-4 text-[#03565C]" />
          <AlertDescription className="text-[#03565C]">
            {data.mensagem}
          </AlertDescription>
        </Alert>
      )}

      {/* Erro Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de Testes */}
      {data && data.testes.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {data.testes.map((teste) => (
            <Card key={teste.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-gray-900">{teste.nome}</h2>
                      <p className="text-sm text-gray-600">{teste.descricao}</p>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen className="h-4 w-4 text-[#03565C]" />
                        {teste.total_questoes} questões
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4 text-[#03565C]" />
                        ~30 minutos
                      </div>
                    </div>

                    {/* Badge de Habilidade e Nível */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Badge variant="outline" className="text-xs">
                        {teste.habilidade}
                      </Badge>
                      <Badge className="bg-[#03565C]/10 text-[#03565C] border-[#03565C]/20 text-xs">
                        {teste.nivel}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Button
                      onClick={() => iniciarTeste(teste.id)}
                      className="gap-2 bg-[#03565C] hover:bg-[#024147] whitespace-nowrap"
                    >
                      Iniciar Teste
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !error ? (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-12 pb-12 text-center space-y-4">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Nenhum teste disponível</h3>
              <p className="text-gray-600 mt-2">
                Você precisa completar a autoavaliação de competências primeiro para ter acesso aos testes.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = "/dashboard/candidato/testes-habilidades"}
              className="bg-[#03565C] hover:bg-[#024147] mt-4"
            >
              Ir para Autoavaliação
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Como funcionam os testes?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-3">
          <p>
            • A quantidade de questões varia de acordo com o teste selecionado e está relacionada às competências que você indicou na autoavaliação
          </p>
          <p>
            • As questões são de múltipla escolha com 4 alternativas cada
          </p>
          <p>
            • Você terá aproximadamente 30 minutos para completar cada teste
          </p>
          <p>
            • As questões avaliam seu conhecimento prático e teórico
          </p>
          <p>
            • Você pode retomar testes não finalizados a qualquer momento
          </p>
          <p>
            • As pontuações dos testes serão visíveis para as empresas que se interessarem por você
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
