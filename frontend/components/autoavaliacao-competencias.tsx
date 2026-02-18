"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ChevronDown, ChevronRight, ChevronUp, Info, Clock, HelpCircle } from "lucide-react"
import { getAreaById } from "@/lib/areas-competencias"
import { api } from "@/lib/api"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Escala padronizada 0-4
const ESCALA_PROFICIENCIA = [
  {
    nivel: 0,
    nome: "Não exposto",
    descricao: "Nunca trabalhou com essa competência",
    cor: "bg-gray-100 text-gray-600 border-gray-300",
    corSelecionado: "bg-gray-500 text-white border-gray-600",
  },
  {
    nivel: 1,
    nome: "Básico",
    descricao: "Conhecimento básico, executa tarefas simples com supervisão",
    cor: "bg-blue-50 text-blue-600 border-blue-200",
    corSelecionado: "bg-blue-500 text-white border-blue-600",
  },
  {
    nivel: 2,
    nome: "Intermediário",
    descricao: "Executa tarefas de forma autônoma, resolve problemas comuns",
    cor: "bg-green-50 text-green-600 border-green-200",
    corSelecionado: "bg-green-500 text-white border-green-600",
  },
  {
    nivel: 3,
    nome: "Avançado",
    descricao: "Domínio avançado, resolve problemas complexos, pode mentorar",
    cor: "bg-amber-50 text-amber-600 border-amber-200",
    corSelecionado: "bg-amber-500 text-white border-amber-600",
  },
  {
    nivel: 4,
    nome: "Especialista",
    descricao: "Expert reconhecido, define padrões, lidera inovações na área",
    cor: "bg-purple-50 text-purple-600 border-purple-200",
    corSelecionado: "bg-purple-600 text-white border-purple-700",
  },
]

interface Competencia {
  id: string
  nome: string
  nivel: number | null
  descricaoExperiencia?: string
  anosExperiencia?: number
}

interface CategoriaCompetencias {
  id: string
  nome: string
  competencias: Competencia[]
}

interface AutoavaliacaoCompetenciasProps {
  areaId?: string
  onComplete: (competencias: Competencia[]) => void
  isLoading?: boolean
}

// Competências padrão para desenvolvimento
const CATEGORIAS_COMPETENCIAS: CategoriaCompetencias[] = [
  {
    id: "linguagens",
    nome: "Linguagens de Programação",
    competencias: [
      { id: "js", nome: "JavaScript/TypeScript", nivel: null },
      { id: "python", nome: "Python", nivel: null },
      { id: "java", nome: "Java", nivel: null },
      { id: "csharp", nome: "C#", nivel: null },
      { id: "go", nome: "Go", nivel: null },
      { id: "rust", nome: "Rust", nivel: null },
    ],
  },
  {
    id: "frameworks",
    nome: "Frameworks & Libraries",
    competencias: [
      { id: "react", nome: "React", nivel: null },
      { id: "vue", nome: "Vue.js", nivel: null },
      { id: "angular", nome: "Angular", nivel: null },
      { id: "nodejs", nome: "Node.js", nivel: null },
      { id: "django", nome: "Django/Flask", nivel: null },
      { id: "spring", nome: "Spring Boot", nivel: null },
    ],
  },
  {
    id: "ferramentas",
    nome: "Ferramentas & DevOps",
    competencias: [
      { id: "git", nome: "Git", nivel: null },
      { id: "docker", nome: "Docker", nivel: null },
      { id: "kubernetes", nome: "Kubernetes", nivel: null },
      { id: "ci-cd", nome: "CI/CD (Jenkins, GitHub Actions)", nivel: null },
      { id: "aws", nome: "AWS", nivel: null },
      { id: "azure", nome: "Azure", nivel: null },
    ],
  },
  {
    id: "dados",
    nome: "Banco de Dados",
    competencias: [
      { id: "sql", nome: "SQL (PostgreSQL, MySQL)", nivel: null },
      { id: "nosql", nome: "NoSQL (MongoDB, Redis)", nivel: null },
      { id: "orm", nome: "ORMs (SQLAlchemy, Prisma)", nivel: null },
    ],
  },
]

export function AutoavaliacaoCompetencias({
  areaId,
  onComplete,
  isLoading = false,
}: AutoavaliacaoCompetenciasProps) {
  // Obter competências da área selecionada ou usar defaults
  const area = areaId ? getAreaById(areaId) : null
  const categoriasInicial: CategoriaCompetencias[] = area
    ? area.categorias.map((cat) => ({
        id: cat.id,
        nome: cat.nome,
        competencias: cat.competencias.map((comp) => ({
          id: comp.id,
          nome: comp.nome,
          nivel: null,
        })),
      }))
    : CATEGORIAS_COMPETENCIAS

  const [competencias, setCompetencias] = useState<CategoriaCompetencias[]>(categoriasInicial)
  const [submitting, setSubmitting] = useState(false)
  const [expandedCategorias, setExpandedCategorias] = useState<string[]>(
    categoriasInicial.length > 0 ? [categoriasInicial[0].id] : []
  )
  const [showEscalaDialog, setShowEscalaDialog] = useState(false)
  const [tempoInicio] = useState(Date.now())

  const handleNivelChange = (categoriaId: string, competenciaId: string, nivel: number) => {
    setCompetencias(
      competencias.map((cat) =>
        cat.id === categoriaId
          ? {
              ...cat,
              competencias: cat.competencias.map((comp) =>
                comp.id === competenciaId 
                  ? { ...comp, nivel: comp.nivel === nivel ? null : nivel } 
                  : comp
              ),
            }
          : cat
      )
    )
  }

  const competenciasDeclaradas = competencias.flatMap((cat) =>
    cat.competencias.filter((comp) => comp.nivel !== null)
  )

  const toggleCategoria = (categoriaId: string) => {
    setExpandedCategorias((prev) =>
      prev.includes(categoriaId)
        ? prev.filter((id) => id !== categoriaId)
        : [...prev, categoriaId]
    )
  }

  const getNivelInfo = (nivel: number | null) => {
    if (nivel === null) return null
    return ESCALA_PROFICIENCIA.find((e) => e.nivel === nivel)
  }

  // Calcular tempo estimado
  const tempoDecorrido = Math.floor((Date.now() - tempoInicio) / 1000 / 60)
  const tempoEstimado = "5-15 min"

  const renderCategorias = () => (
    <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
      {competencias.map((categoria) => {
        const avaliadas = categoria.competencias.filter((c) => c.nivel !== null).length
        const isOpen = expandedCategorias.includes(categoria.id)

        return (
          <div key={categoria.id} className="rounded-lg border bg-background/70">
            <button
              type="button"
              onClick={() => toggleCategoria(categoria.id)}
              className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-foreground truncate">{categoria.nome}</h3>
                <p className="text-xs text-muted-foreground">
                  {avaliadas > 0 ? `${avaliadas} avaliada(s)` : "Nenhuma avaliada"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {avaliadas > 0 && (
                  <Badge variant="default" className="bg-[#03565C] text-white">
                    {avaliadas}/{categoria.competencias.length}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="border-t divide-y">
                {categoria.competencias.map((competencia) => {
                  const nivelInfo = getNivelInfo(competencia.nivel)
                  
                  return (
                    <div key={competencia.id} className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{competencia.nome}</p>
                          {nivelInfo && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">{nivelInfo.nome}</span> - {nivelInfo.descricao}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Escala de Níveis 0-4 */}
                      <div className="flex flex-wrap gap-1.5">
                        {ESCALA_PROFICIENCIA.map((escala) => (
                          <TooltipProvider key={escala.nivel}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleNivelChange(categoria.id, competencia.id, escala.nivel)
                                  }}
                                  disabled={isLoading}
                                  className={`
                                    px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border
                                    ${competencia.nivel === escala.nivel 
                                      ? escala.corSelecionado 
                                      : `${escala.cor} hover:opacity-80`
                                    }
                                    ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                  `}
                                >
                                  {escala.nivel} - {escala.nome}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px]">
                                <p className="font-semibold">{escala.nome}</p>
                                <p className="text-xs">{escala.descricao}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Enviar autoavaliação para API
      const payload = {
        respostas: competenciasDeclaradas.map((comp) => ({
          habilidade: comp.nome,
          nivel: comp.nivel,
          descricao: comp.descricaoExperiencia || null,
          anos_experiencia: comp.anosExperiencia || null
        }))
      }
      
      try {
        // Salvar autoavaliação na API (só se houver token - skip durante cadastro)
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        if (token) {
          await api.post("/api/v1/autoavaliacao/salvar", payload)
        }
      } catch (error: any) {
        console.error("Erro ao salvar autoavaliação:", error)
        // Continuar mesmo com erro (fallback)
      }
      
      onComplete(competenciasDeclaradas)
    } catch (error) {
      console.error("Erro no submit:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full animate-in fade-in-50 slide-in-from-right-2 duration-300">
      {/* Header */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Autoavaliação de Competências</h2>
          <button
            type="button"
            onClick={() => setShowEscalaDialog(true)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            Ver escala
          </button>
        </div>
        <p className="text-muted-foreground">
          Avalie seu nível de proficiência em cada competência usando a escala 0-4
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Tempo estimado: {tempoEstimado}
          </span>
          {tempoDecorrido > 0 && (
            <span>Tempo decorrido: {tempoDecorrido} min</span>
          )}
        </div>
      </div>

      {/* Resumo da Escala */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs font-medium text-muted-foreground mb-2">Escala de Proficiência:</p>
        <div className="flex flex-wrap gap-1.5">
          {ESCALA_PROFICIENCIA.map((e) => (
            <Badge key={e.nivel} variant="outline" className={`text-xs ${e.cor}`}>
              {e.nivel}: {e.nome}
            </Badge>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {renderCategorias()}

        {/* Resumo */}
        {competenciasDeclaradas.length > 0 && (
          <div className="p-3 bg-[#25D9B8]/10 border border-[#24BFB0]/30 rounded-lg">
            <p className="text-sm font-medium text-[#03565C]">
              {competenciasDeclaradas.length} competência(s) avaliada(s)
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {competenciasDeclaradas.slice(0, 5).map((c) => (
                <Badge key={c.id} variant="secondary" className="text-xs">
                  {c.nome}: N{c.nivel}
                </Badge>
              ))}
              {competenciasDeclaradas.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{competenciasDeclaradas.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={competenciasDeclaradas.length === 0 || isLoading || submitting}
          className="w-full h-11 gap-2 bg-[#03565C] hover:bg-[#024950]"
        >
          {submitting ? "Salvando..." : isLoading ? "Carregando..." : "Finalizar Cadastro"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </form>

      {/* Dialog com escala completa */}
      <Dialog open={showEscalaDialog} onOpenChange={setShowEscalaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escala de Proficiência (0-4)</DialogTitle>
            <DialogDescription>
              Use esta escala para avaliar seu nível em cada competência de forma consistente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {ESCALA_PROFICIENCIA.map((e) => (
              <div key={e.nivel} className={`p-3 rounded-lg border ${e.cor}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg">{e.nivel}</span>
                  <span className="font-semibold">{e.nome}</span>
                </div>
                <p className="text-sm opacity-80">{e.descricao}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { ESCALA_PROFICIENCIA }
