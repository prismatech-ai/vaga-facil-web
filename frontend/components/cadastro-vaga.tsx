"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, X, CheckCircle2, HelpCircle, Briefcase, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { TODAS_AREAS, getAreaById } from "@/lib/areas-competencias"
import { useIbgeLocations } from "@/hooks/use-ibge-locations"

interface CompetenciaFiltro {
  id: string
  nome: string
  nivelMinimo: 1 | 2 | 3 | 4
  descricao?: string
}

interface CadastroVagaProps {
  onSubmit?: (vaga: any) => void
  isLoading?: boolean
}

const ESCOLARIDADE_OPCOES = [
  "Ensino Fundamental",
  "Ensino Médio",
  "Técnico",
  "Graduação",
  "Pós-graduação",
  "Mestrado",
  "Doutorado",
]

const NIVEL_SENIORIDADE_OPCOES = [
  { value: "estagiario", label: "Estagiário" },
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
  { value: "coordenador", label: "Coordenador/Líder" },
  { value: "gerente", label: "Gerente" },
]

// Agrupar competências por categoria dentro de uma área
const getCompetenciasPorArea = (areaId: string) => {
  const area = getAreaById(areaId)
  if (!area) return {}
  
  // Retorna um objeto onde as chaves são nomes de categorias e os valores são arrays de nomes de competências
  const competenciasPorCategoria: Record<string, string[]> = {}
  
  area.categorias.forEach((categoria) => {
    competenciasPorCategoria[categoria.nome] = categoria.competencias.map((comp) => comp.nome)
  })
  
  return competenciasPorCategoria
}

export function CadastroVaga({ onSubmit, isLoading = false }: CadastroVagaProps) {
  const router = useRouter()
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [area, setArea] = useState("")
  const [estado, setEstado] = useState("")
  const [cidade, setCidade] = useState("")
  const [salarioMin, setSalarioMin] = useState("")
  const [salarioMax, setSalarioMax] = useState("")
  const [experienciaMinima, setExperienciaMinima] = useState("")
  const [escolaridadeMinima, setEscolaridadeMinima] = useState("")
  const [nivelSenioridade, setNivelSenioridade] = useState("")
  const [tipoVaga, setTipoVaga] = useState("CLT")
  const [remoto, setRemoto] = useState(false)
  const [beneficios, setBeneficios] = useState("")
  const [competencias, setCompetencias] = useState<CompetenciaFiltro[]>([])
  const [competenciaTemp, setCompetenciaTemp] = useState<{ nome: string; nivelMinimo: 1 | 2 | 3 | 4 }>({
    nome: "",
    nivelMinimo: 2,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const { estados, cidades, loadingEstados, loadingCidades } = useIbgeLocations(estado)

  const competenciasArea = area ? getCompetenciasPorArea(area) : {}

  const handleAddCompetencia = () => {
    if (!competenciaTemp.nome) {
      setErrors({ ...errors, competencia: "Selecione uma competência" })
      return
    }

    if (competencias.find((c) => c.nome === competenciaTemp.nome)) {
      setErrors({ ...errors, competencia: "Esta competência já foi adicionada" })
      return
    }

    setCompetencias([
      ...competencias,
      {
        id: competenciaTemp.nome.toLowerCase().replace(/\s+/g, "-"),
        nome: competenciaTemp.nome,
        nivelMinimo: competenciaTemp.nivelMinimo,
      },
    ])
    setCompetenciaTemp({ nome: "", nivelMinimo: 2 })
    setErrors({ ...errors, competencia: "" })
  }

  const handleRemoveCompetencia = (id: string) => {
    setCompetencias(competencias.filter((c) => c.id !== id))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!titulo.trim()) newErrors.titulo = "Título é obrigatório"
    if (!descricao.trim()) newErrors.descricao = "Descrição é obrigatória"
    if (!area) newErrors.area = "Área é obrigatória"
    if (!estado) newErrors.estado = "Estado é obrigatório"
    if (!cidade) newErrors.cidade = "Cidade é obrigatória"
    if (competencias.length === 0) newErrors.competencias = "Adicione pelo menos uma competência"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      // Construir requisitos como string (para o campo requirements legado)
      const requisitos = [
        experienciaMinima && `${experienciaMinima} anos de experiência`,
        escolaridadeMinima && `Escolaridade: ${escolaridadeMinima}`,
        competencias.length > 0 && `Competências: ${competencias.map(c => `${c.nome} (Nível ${c.nivelMinimo})`).join(", ")}`
      ].filter(Boolean).join("\n")

      // Mapear competências para o formato esperado pela API
      // Será necessário buscar os IDs das competências do backend
      const requisitosArray = competencias.map((comp) => ({
        competencia_id: comp.id, // Será o nome da competência por enquanto
        nivel_minimo: String(comp.nivelMinimo),
        teste_obrigatorio: 0
      }))

      // POST /api/v1/jobs/
      const payload = {
        title: titulo,
        description: descricao,
        area_atuacao: area,
        requirements: requisitos || descricao,
        benefits: beneficios || "A definir",
        location: `${cidade}, ${estado}`,
        remote: remoto,
        job_type: tipoVaga,
        salary_min: salarioMin ? parseInt(salarioMin) : 0,
        salary_max: salarioMax ? parseInt(salarioMax) : 0,
        salary_currency: "BRL",
        // Campos estruturados
        nivel_senioridade: nivelSenioridade || null,
        escolaridade_minima: escolaridadeMinima || null,
        experiencia_minima_anos: experienciaMinima ? parseInt(experienciaMinima) : 0,
        screening_questions: [],
        requisitos: requisitosArray
      }

      const response = await api.post("/api/v1/jobs/", payload)
      
      if (response && typeof response === "object" && "id" in response) {

        router.push("/empresa/jobs/list")
      }
    } catch (error) {
      setErrors({ ...errors, submit: "Erro ao criar vaga. Tente novamente." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#25D9B8]/5 to-white px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Botão Voltar */}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="gap-2 text-gray-900 border-gray-300 hover:bg-[#25D9B8] hover:text-white hover:border-[#25D9B8] font-medium"
        >
          ← Voltar para Vagas
        </Button>

        <Card className="shadow-sm border border-gray-200">
          <CardHeader className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white">
            <CardTitle className="text-2xl">Registrar Nova Vaga</CardTitle>
            <CardDescription className="text-white/80">
              Defina as competências que os candidatos devem ter
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">Título da Vaga *</Label>
                <Input
                  id="titulo"
                  placeholder="ex: Senior React Developer"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value)
                    if (errors.titulo) setErrors({ ...errors, titulo: "" })
                  }}
                  disabled={loading || isLoading}
                  className={errors.titulo ? "border-red-500" : ""}
                />
                {errors.titulo && <p className="text-sm text-red-500">{errors.titulo}</p>}
              </div>

              {/* Área */}
              <div className="space-y-2">
                <Label htmlFor="area">Área de Atuação *</Label>
                <Select 
                  value={area} 
                  onValueChange={(value) => {
                    setArea(value)
                    setCompetencias([]) // Limpar competências ao mudar área
                  }}
                >
                  <SelectTrigger id="area" className={errors.area ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {TODAS_AREAS.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.area && <p className="text-sm text-red-500">{errors.area}</p>}
              </div>

              {/* Estado e Cidade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado">Estado *</Label>
                  <Select
                    value={estado}
                    onValueChange={(value) => {
                      setEstado(value)
                      setCidade("")
                    }}
                    disabled={loadingEstados}
                  >
                    <SelectTrigger id="estado" className={errors.estado ? "border-red-500" : ""}>
                      <SelectValue placeholder={loadingEstados ? "Carregando estados..." : "Selecione o estado"} />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map((item) => (
                        <SelectItem key={item.id} value={item.sigla}>
                          {item.sigla} - {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.estado && <p className="text-sm text-red-500">{errors.estado}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Select value={cidade} onValueChange={setCidade} disabled={!estado || loadingCidades}>
                    <SelectTrigger id="cidade" className={errors.cidade ? "border-red-500" : ""}>
                      <SelectValue
                        placeholder={
                          !estado
                            ? "Selecione o estado primeiro"
                            : loadingCidades
                            ? "Carregando cidades..."
                            : "Selecione a cidade"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {cidades.map((item) => (
                        <SelectItem key={item.id} value={item.nome}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.cidade && <p className="text-sm text-red-500">{errors.cidade}</p>}
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição da Vaga * (mínimo 10 caracteres)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva a vaga, responsabilidades, e o que procura..."
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value)
                    if (errors.descricao) setErrors({ ...errors, descricao: "" })
                  }}
                  disabled={loading || isLoading}
                  className={`min-h-32 ${errors.descricao ? "border-red-500" : ""} ${descricao.length < 10 ? "border-orange-300" : ""}`}
                />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {descricao.length < 10 ? (
                      <span className="text-orange-600 font-medium">
                        ⚠️ {10 - descricao.length} caracteres faltando
                      </span>
                    ) : (
                      <span className="text-green-600 font-medium">✅ Descrição válida</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{descricao.length}/10</span>
                </div>
                {errors.descricao && <p className="text-sm text-red-500">{errors.descricao}</p>}
              </div>

              {/* Faixa Salarial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salarioMin">Salário Mínimo (R$)</Label>
                  <Input
                    id="salarioMin"
                    type="number"
                    placeholder="2.000"
                    value={salarioMin}
                    onChange={(e) => setSalarioMin(e.target.value)}
                    disabled={loading || isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salarioMax">Salário Máximo (R$)</Label>
                  <Input
                    id="salarioMax"
                    type="number"
                    placeholder="5.000"
                    value={salarioMax}
                    onChange={(e) => setSalarioMax(e.target.value)}
                    disabled={loading || isLoading}
                  />
                </div>
              </div>

              {/* Experiência e Escolaridade */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experiencia">Anos de Experiência Mínima</Label>
                  <Input
                    id="experiencia"
                    type="number"
                    min="0"
                    placeholder="2"
                    value={experienciaMinima}
                    onChange={(e) => {
                      // Garante que o valor não seja negativo
                      const value = e.target.value
                      if (value === '' || parseInt(value) >= 0) {
                        setExperienciaMinima(value)
                      }
                    }}
                    disabled={loading || isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="escolaridade">Escolaridade Mínima</Label>
                  <Select value={escolaridadeMinima} onValueChange={setEscolaridadeMinima}>
                    <SelectTrigger id="escolaridade">
                      <SelectValue placeholder="Selecione a escolaridade" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESCOLARIDADE_OPCOES.map((esc) => (
                        <SelectItem key={esc} value={esc}>
                          {esc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Nível de Senioridade e Tipo de Vaga */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="senioridade">Nível de Senioridade</Label>
                  <Select value={nivelSenioridade} onValueChange={setNivelSenioridade}>
                    <SelectTrigger id="senioridade">
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEL_SENIORIDADE_OPCOES.map((nivel) => (
                        <SelectItem key={nivel.value} value={nivel.value}>
                          {nivel.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoVaga">Tipo de Contratação</Label>
                  <Select value={tipoVaga} onValueChange={setTipoVaga}>
                    <SelectTrigger id="tipoVaga">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="Estágio">Estágio</SelectItem>
                      <SelectItem value="Temporário">Temporário</SelectItem>
                      <SelectItem value="Freelancer">Freelancer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remoto e Benefícios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modalidade de Trabalho</Label>
                  <Select value={remoto ? "remoto" : "presencial"} onValueChange={(v) => setRemoto(v === "remoto")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="remoto">Remoto</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beneficios">Benefícios</Label>
                  <Input
                    id="beneficios"
                    placeholder="VR, VT, Plano de Saúde..."
                    value={beneficios}
                    onChange={(e) => setBeneficios(e.target.value)}
                    disabled={loading || isLoading}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Competências Requeridas</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Selecione as competências que você busca nos candidatos. {area && "Mostrando competências de: " + getAreaById(area)?.nome}
                </p>
              </div>

              {/* Adicionar Competência */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="competencia">Adicionar Competência *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={competenciaTemp.nome}
                      onValueChange={(v) => setCompetenciaTemp({ ...competenciaTemp, nome: v })}
                      disabled={!area}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={area ? "Selecione uma competência" : "Selecione uma área primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(competenciasArea).map(([categoryName, competencies]) => (
                          <React.Fragment key={categoryName}>
                            {/* Category Header */}
                            <div className="px-3 py-2 text-sm font-bold text-gray-900 bg-gray-50 border-b border-gray-200">
                              {categoryName}
                            </div>
                            {/* Competencies in this category */}
                            {competencies.map((comp) => (
                              <SelectItem key={`${categoryName}-${comp}`} value={comp}>
                                <span className="pl-2">{comp}</span>
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        ))}
                        {Object.entries(competenciasArea).length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            Selecione uma área primeiro
                          </div>
                        )}
                      </SelectContent>
                    </Select>

                    <Select
                      value={String(competenciaTemp.nivelMinimo)}
                      onValueChange={(v) =>
                        setCompetenciaTemp({ ...competenciaTemp, nivelMinimo: parseInt(v) as 1 | 2 | 3 | 4 })
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Iniciante (1)</SelectItem>
                        <SelectItem value="2">Intermediário (2)</SelectItem>
                        <SelectItem value="3">Avançado (3)</SelectItem>
                        <SelectItem value="4">Expert (4)</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      onClick={handleAddCompetencia}
                      disabled={loading || isLoading || !area}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                  {errors.competencia && <p className="text-sm text-red-500">{errors.competencia}</p>}
                </div>

                {/* Competências Adicionadas */}
                {competencias.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Competências Adicionadas ({competencias.length}):
                    </p>
                    <div className="space-y-2">
                      {competencias.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{comp.nome}</p>
                            <p className="text-xs text-gray-600">
                              Nível Mínimo:{" "}
                              {comp.nivelMinimo === 1
                                ? "Iniciante"
                                : comp.nivelMinimo === 2
                                  ? "Intermediário"
                                  : comp.nivelMinimo === 3
                                    ? "Avançado"
                                    : "Expert"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCompetencia(comp.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errors.competencias && <p className="text-sm text-red-500">{errors.competencias}</p>}
              </div>

              {/* Resumo dos Requisitos */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Resumo dos Requisitos</h3>
                
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  {/* Experiência */}
                  {experienciaMinima && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Anos de Experiência</p>
                        <p className="text-sm text-gray-600">{experienciaMinima} anos mínimos</p>
                      </div>
                    </div>
                  )}

                  {/* Escolaridade */}
                  {escolaridadeMinima && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Escolaridade</p>
                        <p className="text-sm text-gray-600">{escolaridadeMinima}</p>
                      </div>
                    </div>
                  )}

                  {/* Competências */}
                  {competencias.length > 0 && (
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900">Competências Técnicas</p>
                        <div className="mt-2 space-y-1">
                          {competencias.map((comp) => (
                            <div key={comp.id} className="text-sm text-gray-600">
                              <span className="font-medium">{comp.nome}</span>
                              <span className="text-gray-500"> — Nível mínimo: {
                                comp.nivelMinimo === 1
                                  ? "Iniciante"
                                  : comp.nivelMinimo === 2
                                    ? "Intermediário"
                                    : comp.nivelMinimo === 3
                                      ? "Avançado"
                                      : "Expert"
                              }</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {!experienciaMinima && !escolaridadeMinima && competencias.length === 0 && (
                    <p className="text-sm text-gray-500 italic">Nenhum requisito adicionado ainda</p>
                  )}
                </div>
              </div>

              {/* Info */}
              <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
                <AlertCircle className="h-4 w-4 text-[#03565C]" />
                <AlertDescription className="text-[#03565C] text-sm">
                  <strong>Como funciona:</strong> Essa vaga será visível apenas para candidatos que
                  declarem as competências especificadas no nível mínimo (ou superior). Candidatos
                  permanecerão anônimos até que você demonstre interesse. Os requisitos serão enviados estruturados para o backend.
                </AlertDescription>
              </Alert>

              {/* CTA */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading || isLoading || descricao.length < 10}
                  className="flex-1 gap-2 bg-[#03565C] hover:bg-[#024147] py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  title={descricao.length < 10 ? "A descrição deve ter no mínimo 10 caracteres" : ""}
                >
                  {loading || isLoading ? "Criando..." : "Criar Vaga"}
                  {!(loading || isLoading) && <ChevronRight className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="px-6 py-6 text-base"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
