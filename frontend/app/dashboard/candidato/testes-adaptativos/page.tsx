"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, BookOpen, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import TesteAdaptativo from "@/components/teste-adaptativo"
import { getAreaById, TODAS_AREAS } from "@/lib/areas-competencias"

interface CandidatoData {
  id: number
  full_name: string
  area_atuacao: string
}

type ViewState = "lista-habilidades" | "teste-ativo" | "resultados"

export default function TestesAdaptativosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading: authLoading } = useAuth()

  // States
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [viewState, setViewState] = useState<ViewState>("lista-habilidades")
  const [candidato, setCandidato] = useState<CandidatoData | null>(null)
  const [competenciasDisponiveis, setCompetenciasDisponiveis] = useState<any[]>([])
  const [habilidadeSelecionada, setHabilidadeSelecionada] = useState<string | null>(null)
  const [resultados, setResultados] = useState<Map<string, any>>(new Map())
  const [testesRealizados, setTestesRealizados] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    if (!authLoading && user) {
      carregarDados()
    }
  }, [authLoading, user])

  const normalizarString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
  }

  const carregarDados = async () => {
    try {
      setIsLoading(true)
      setError("")

      const data = await api.get<CandidatoData>("/api/v1/candidates/me")
      setCandidato(data)

      if (data.area_atuacao) {
        try {
          // Chamar a rota que retorna competências filtradas pela área do candidato
          const competenciasResponse = await api.get<any>("/api/v1/candidato/competencias")
          
          // A resposta pode ser um array direto ou um objeto com propriedade competencias
          const competencias = Array.isArray(competenciasResponse) 
            ? competenciasResponse 
            : (competenciasResponse.competencias || [])
          
          // Transformar a resposta da API para o formato esperado
          const competenciasFormatadas = competencias.map((comp: any) => ({
            id: comp.id,
            nome: comp.nome,
            descricao: comp.descricao || "",
            categoria: comp.categoria || "tecnica",
          }))
          
          setCompetenciasDisponiveis(competenciasFormatadas)
        } catch (apiErr: any) {
          // Se a API falhar, tentar com dados estáticos como fallback
          let area = getAreaById(data.area_atuacao)

          if (!area) {
            const areaNormalizada = normalizarString(data.area_atuacao)
            area = TODAS_AREAS.find(a => 
              normalizarString(a.nome) === areaNormalizada || 
              normalizarString(a.id) === areaNormalizada
            )
          }

          if (area) {
            const competencias = area.categorias.flatMap(cat => cat.competencias)
            setCompetenciasDisponiveis(competencias)
          } else {
            setError("Área de atuação não encontrada no sistema")
          }
        }
      } else {
        setError("Área de atuação não definida. Complete seu perfil primeiro.")
      }
    } catch (err: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTesteCompleto = (resultado: any) => {
    const habilidade = habilidadeSelecionada || "Desconhecida"
    
    // Salvar resultado
    setResultados(new Map(resultados.set(habilidade, resultado)))
    setTestesRealizados(new Map(testesRealizados.set(habilidade, {
      data: new Date().toLocaleDateString("pt-BR"),
      nivel: resultado.nivel_final,
      mudanca: resultado.mudanca_nivel
    })))

    setViewState("resultados")
    
    toast({
      title: "✅ Teste Concluído",
      description: "Seu resultado foi salvo.",
      variant: "default"
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Testes Adaptativos</h1>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/dashboard/candidato/meu-perfil")} className="bg-[#03565C] hover:bg-[#024147]">
          Completar Perfil
        </Button>
      </div>
    )
  }

  // ===== VIEW 1: Lista de Habilidades =====
  if (viewState === "lista-habilidades") {
    return (
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white p-8 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Testes Adaptativos por Nível</h1>
              <p className="text-lg opacity-90">
                Avalie seu conhecimento com testes que se adaptam ao seu desempenho
              </p>
            </div>
            <Zap className="h-12 w-12 opacity-80 flex-shrink-0" />
          </div>
        </div>

        {/* Info */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Como funciona:</strong> Selecione seu nível inicial (Básico, Intermediário ou Avançado) e responda 5 questões. 
            O teste progressivamente se adapta baseado no seu desempenho, classificando-o com precisão.
          </AlertDescription>
        </Alert>

        {/* Grid de Habilidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competenciasDisponiveis.map((comp) => {
            const temResultado = resultados.has(comp.nome)
            const testeRealizado = testesRealizados.get(comp.nome)

            return (
              <Card 
                key={comp.nome}
                className={`transition-all overflow-hidden ${
                  temResultado 
                    ? "border-green-200 bg-green-50" 
                    : "border-gray-200 hover:border-[#03565C] hover:shadow-lg"
                }`}
              >
                <CardHeader className={temResultado ? "bg-green-100/50" : "bg-gray-50/50"}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <CardTitle className="text-lg">{comp.nome}</CardTitle>
                    {temResultado && (
                      <Badge className="bg-green-600">✓ Testado</Badge>
                    )}
                  </div>
                  {temResultado && testeRealizado && (
                    <CardDescription className="text-green-700">
                      <div className="space-y-1">
                        <div className="text-sm">{testeRealizado.data}</div>
                        <div className="font-semibold text-green-900">{testeRealizado.nivel}</div>
                      </div>
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setHabilidadeSelecionada(comp.nome)
                        setViewState("teste-ativo")
                      }}
                      className="flex-1 bg-[#03565C] hover:bg-[#024147]"
                    >
                      {temResultado ? "Retestas" : "Iniciar"}
                    </Button>
                    {temResultado && (
                      <Button
                        onClick={() => setViewState("resultados")}
                        variant="outline"
                        size="sm"
                      >
                        Ver
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Stats Card */}
        {testesRealizados.size > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-lg">Seu Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{testesRealizados.size}</div>
                  <div className="text-sm text-gray-600">Testes Realizados</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#03565C]">{competenciasDisponiveis.length}</div>
                  <div className="text-sm text-gray-600">Habilidades Disponíveis</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round((testesRealizados.size / competenciasDisponiveis.length) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Completado</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="flex gap-3 pt-4">
          <Button 
            onClick={() => router.push("/dashboard/candidato")}
            variant="outline"
            className="flex-1"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // ===== VIEW 2: Teste Ativo =====
  if (viewState === "teste-ativo" && habilidadeSelecionada) {
    return (
      <div className="space-y-6 max-w-6xl">
        <TesteAdaptativo
          habilidade={habilidadeSelecionada}
          onComplete={handleTesteCompleto}
          onCancel={() => {
            setHabilidadeSelecionada(null)
            setViewState("lista-habilidades")
          }}
        />
      </div>
    )
  }

  // ===== VIEW 3: Resultados =====
  if (viewState === "resultados") {
    const habilidade = habilidadeSelecionada || Array.from(resultados.keys())[0]
    const resultado = resultados.get(habilidade!)

    if (!resultado) {
      return (
        <div className="space-y-6 max-w-4xl">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">Nenhum resultado disponível</AlertDescription>
          </Alert>
          <Button 
            onClick={() => setViewState("lista-habilidades")}
            className="bg-[#03565C] hover:bg-[#024147]"
          >
            Voltar
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6 max-w-4xl">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Resultado do Teste</CardTitle>
            <CardDescription className="text-white/80">{resultado.habilidade}</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded border border-green-200">
                  <div className="text-sm text-gray-600 mb-2">Nível Final</div>
                  <div className="text-2xl font-bold text-green-600">{resultado.nivel_final}</div>
                </div>
                <div className="p-4 bg-white rounded border border-green-200">
                  <div className="text-sm text-gray-600 mb-2">Situação</div>
                  <Badge className={
                    resultado.mudanca_nivel === "progrediu" ? "bg-green-600" :
                    resultado.mudanca_nivel === "regrediu" ? "bg-red-600" :
                    "bg-blue-600"
                  }>
                    {resultado.mudanca_nivel === "progrediu" && "📈 Progrediu"}
                    {resultado.mudanca_nivel === "regrediu" && "📉 Regrediu"}
                    {resultado.mudanca_nivel === "confirmado" && "✅ Confirmado"}
                  </Badge>
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  {resultado.descricao_resultado}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Desempenho Detalhado:</h4>
                {[
                  { label: "Básico", value: resultado.acertos_basico },
                  { label: "Intermediário", value: resultado.acertos_intermediario },
                  { label: "Avançado", value: resultado.acertos_avancado }
                ].map((item, idx) => (
                  item.value !== null && item.value !== undefined && (
                    <div key={idx} className="flex justify-between items-center p-3 bg-white rounded border border-gray-200">
                      <span className="text-gray-700 font-medium">{item.label}</span>
                      <Badge className="bg-gray-100 text-gray-800">{item.value}/5</Badge>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                onClick={() => setViewState("lista-habilidades")}
                className="flex-1 bg-[#03565C] hover:bg-[#024147]"
              >
                Voltar aos Testes
              </Button>
              <Button 
                onClick={() => router.push("/dashboard/candidato")}
                variant="outline"
                className="flex-1"
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
