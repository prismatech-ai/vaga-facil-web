"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

interface Area {
  id: string
  nome: string
  descricao: string
}

const AREAS_DISPONIVEIS: Area[] = [
  {
    id: "automacao-industrial",
    nome: "Automação Industrial",
    descricao: "Especialista em CLP/PLC, DCS, SCADA, IHM, Redes Industriais e Segurança Funcional",
  },
  {
    id: "caldeiraria-solda",
    nome: "Caldeiraria e Solda",
    descricao: "Especialista em processos de solda, caldeiraria e fabricação de estruturas metálicas",
  },
  {
    id: "eletrica",
    nome: "Elétrica",
    descricao: "Especialista em instalações elétricas, distribuição de energia e controle elétrico",
  },
  {
    id: "instrumentacao",
    nome: "Instrumentação",
    descricao: "Especialista em sensores, transmissores e laços de medição e controle",
  },
  {
    id: "manutencao-mecanica",
    nome: "Manutenção Mecânica",
    descricao: "Especialista em manutenção, reparos e desenvolvimento mecânico",
  },
  {
    id: "supervisao-operacao",
    nome: "Supervisão e Operação",
    descricao: "Especialista em supervisão de processos e operação de equipamentos industriais",
  },
]

const SUBCOMPETENCIAS: { [key: string]: Area[] } = {
  "caldeiraria-solda": [
    {
      id: "solda-arco-eletrico",
      nome: "Solda a Arco Elétrico (SMAW/MMA)",
      descricao: "Clique no título para adicionar nível",
    },
    {
      id: "soldagem-gas-inerte",
      nome: "Soldagem com Gás Inerte (GMAW/MIG e GTAW/TIG)",
      descricao: "Clique no título para adicionar nível",
    },
    {
      id: "solda-arco-submerso",
      nome: "Soldagem a Arco Submerso (SAW)",
      descricao: "Clique no título para adicionar nível",
    },
    {
      id: "solda-plasma",
      nome: "Soldagem a Plasma e Corte com Plasma",
      descricao: "Clique no título para adicionar nível",
    },
    {
      id: "solda-laser",
      nome: "Soldagem a Laser",
      descricao: "Clique no título para adicionar nível",
    },
    {
      id: "solda-friccao",
      nome: "Soldagem por Fricção",
      descricao: "Clique no título para adicionar nível",
    },
  ],
}

const NIVEIS_PROFICIENCIA = [
  { label: "Nível 1 - N1 - Básico", value: 1 },
  { label: "Nível 2 - N2 - Intermediário", value: 2 },
  { label: "Nível 3 - N3 - Avançado", value: 3 },
  { label: "Nível 4 - N4 - Especialista", value: 4 },
]

export default function SelecionarAreaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<"areas" | "competencias" | "resumo">("areas")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [selectedCompetencias, setSelectedCompetencias] = useState<{ [key: string]: number }>({})

  const handleSelectArea = (area: Area) => {
    setSelectedArea(area)
    if (SUBCOMPETENCIAS[area.id]) {
      setStep("competencias")
    } else {
      setStep("resumo")
    }
  }

  const handleSelectCompetencia = (competenciaId: string, nivel: number) => {
    setSelectedCompetencias({
      ...selectedCompetencias,
      [competenciaId]: nivel,
    })
  }

  const handleContinuar = async () => {
    if (step === "competencias") {
      setStep("resumo")
    } else if (step === "resumo") {
      setIsLoading(true)
      try {
        const token = localStorage.getItem("token")
        
        // Aqui você salvaria a área selecionada e as competências
    

        toast({
          title: "Sucesso",
          description: "Sua área de atuação foi registrada. Agora você pode fazer os testes técnicos!",
        })

        router.push("/dashboard/candidato/testes-habilidades")
      } catch (err: any) {
        toast({
          title: "Erro",
          description: err.message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const getProgress = () => {
    if (step === "areas") return 33
    if (step === "competencias") return 66
    return 100
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      {step === "areas" && (
        <div className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white p-6 rounded-lg">
          <h1 className="text-3xl font-bold mb-2">Qual é sua área de atuação?</h1>
          <p className="text-lg opacity-90">Selecione a área onde você tem maior experiência</p>
        </div>
      )}

      {step === "competencias" && (
        <div className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white p-6 rounded-lg">
          <h1 className="text-3xl font-bold mb-2">{selectedArea?.nome}</h1>
          <p className="text-lg opacity-90">Selecione seus níveis de proficiência</p>
        </div>
      )}

      {step === "resumo" && (
        <div className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white p-6 rounded-lg">
          <h1 className="text-3xl font-bold mb-2">Resumo da sua seleção</h1>
          <p className="text-lg opacity-90">Você pode editar sua seleção ou continuar para os testes</p>
        </div>
      )}

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Etapa {step === "areas" ? 1 : step === "competencias" ? 2 : 3} de 3
          </span>
          <span className="text-sm text-gray-500">
            {step === "areas" ? "Seleção de Área" : step === "competencias" ? "Competências" : "Resumo"}
          </span>
        </div>
        <Progress value={getProgress()} className="h-2" />
      </div>

      {/* Áreas */}
      {step === "areas" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AREAS_DISPONIVEIS.map((area) => (
              <Card
                key={area.id}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-[#03565C]"
                onClick={() => handleSelectArea(area)}
              >
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">{area.nome}</h3>
                    <p className="text-sm text-gray-600">{area.descricao}</p>
                    <div className="flex justify-end pt-2">
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Competências */}
      {step === "competencias" && selectedArea && SUBCOMPETENCIAS[selectedArea.id] && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Processos de {selectedArea.nome.split(" ").pop()}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUBCOMPETENCIAS[selectedArea.id].map((competencia) => (
              <Card
                key={competencia.id}
                className="cursor-pointer hover:shadow-lg transition-all"
              >
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">{competencia.nome}</h3>
                    <p className="text-xs text-gray-500 italic">{competencia.descricao}</p>

                    {selectedCompetencias[competencia.id] && (
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {NIVEIS_PROFICIENCIA.map((nivel) => (
                            <button
                              key={nivel.value}
                              onClick={() => handleSelectCompetencia(competencia.id, nivel.value)}
                              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                                selectedCompetencias[competencia.id] === nivel.value
                                  ? "bg-[#03565C] text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {nivel.value}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!selectedCompetencias[competencia.id] && (
                      <button
                        onClick={() => handleSelectCompetencia(competencia.id, 1)}
                        className="text-sm font-medium text-[#03565C] hover:underline"
                      >
                        Adicionar nível
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      {step === "resumo" && (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-bold text-gray-900 mb-3">Você declarou 1 competência(s):</h3>
              
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">{selectedArea?.nome}</h4>
                        <p className="text-sm text-gray-600">
                          {selectedCompetencias && Object.keys(selectedCompetencias).length > 0
                            ? `${Object.keys(selectedCompetencias).length} competência(s) selecionada(s)`
                            : "Nenhuma competência selecionada"}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setStep("competencias")}>
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <p className="font-medium mb-2">Tempo estimado para testes: ~5 minutos</p>
              <p className="text-sm">
                A próxima etapa envolve testes técnicos para validar cada competência declarada. Você pode fazer todos os testes de uma vez ou distribuir ao longo do tempo.
              </p>
            </AlertDescription>
          </Alert>

          <Alert className="border-teal-200 bg-teal-50">
            <AlertCircle className="h-4 w-4 text-teal-600" />
            <AlertDescription className="text-teal-800 text-sm">
              Suas competências serão usadas para buscar vagas alinhadas com seus interesses. Quanto mais precisa sua autoavaliação, melhores as recomendações.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3 pt-6">
        {step !== "areas" && (
          <Button
            variant="outline"
            onClick={() => {
              if (step === "competencias") {
                setStep("areas")
              } else if (step === "resumo") {
                setStep("competencias")
              }
            }}
          >
            Voltar
          </Button>
        )}
        <Button
          onClick={handleContinuar}
          disabled={isLoading}
          className="flex-1 gap-2 bg-[#03565C] hover:bg-[#024147]"
        >
          {isLoading ? "Carregando..." : "Continuar"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
