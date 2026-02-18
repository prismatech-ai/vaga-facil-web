"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Vaga {
  id: string | number
  title?: string
  titulo?: string
  status: string
  description?: string
  descricao?: string
  applications_count?: number
  candidatos_count?: number
  convidados_count?: number
  entrevista_count?: number
  contratados_count?: number
}

interface Candidato {
  id_anonimo: string
  nome?: string
  email?: string
  area_atuacao?: string
  estado?: string
  cidade?: string
  escolaridade?: string
  genero?: string
  is_pcd?: boolean | string
  experiencia?: string
}

export default function KanbanVagaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState("vagas")

  // Filtros de candidatos - Temporários (enquanto o usuário está configurando)
  const [filtroEscolaridadeTemp, setFiltroEscolaridadeTemp] = useState("")
  const [filtroGeneroTemp, setFiltroGeneroTemp] = useState("")
  const [filtroIsPcdTemp, setFiltroIsPcdTemp] = useState("")
  const [filtroExperienciaTemp, setFiltroExperienciaTemp] = useState("")
  const [filtroAreaAtuacaoTemp, setFiltroAreaAtuacaoTemp] = useState("")

  // Filtros aplicados (após clicar em "Filtrar")
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    escolaridade: "",
    genero: "",
    isPcd: "",
    experiencia: "",
    areaAtuacao: ""
  })

  // Opções únicas de filtros extraídas dos candidatos
  const [opcoesEscolaridade, setOpcoesEscolaridade] = useState<string[]>([])
  const [opcoesExperiencia, setOpcoesExperiencia] = useState<string[]>([])

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setIsLoading(true)
      // Paralizar requisições para melhorar performance
      const [vagasResponse, candidatosResponse] = await Promise.all([
        api.get("/api/v1/jobs/"),
        api.get("/api/v1/companies/candidatos-anonimos")
      ])

      // Processar vagas
      const vagasList = (vagasResponse as any).data || vagasResponse
      if (Array.isArray(vagasList)) {
        setVagas(vagasList)
      } else {
        setVagas([])
      }

      // Processar candidatos
      processarCandidatos(candidatosResponse)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao carregar dados"
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      })

    } finally {
      setIsLoading(false)
    }
  }

  const processarCandidatos = (candidatosResponse: any) => {
    try {
      let candidatosList = []
      
      if (candidatosResponse && typeof candidatosResponse === 'object') {
        if (Array.isArray(candidatosResponse)) {
          candidatosList = candidatosResponse
        } else if ((candidatosResponse as any).data && Array.isArray((candidatosResponse as any).data)) {
          candidatosList = (candidatosResponse as any).data
        } else if ((candidatosResponse as any).candidatos && Array.isArray((candidatosResponse as any).candidatos)) {
          candidatosList = (candidatosResponse as any).candidatos
        } else {
          const values = Object.values(candidatosResponse as any)
          if (values.length > 0 && Array.isArray(values[0])) {
            candidatosList = values[0] as any[]
          }
        }
      }
      
      if (Array.isArray(candidatosList) && candidatosList.length > 0) {
        const candidatosProcessados = candidatosList.map((c: any) => ({
          id_anonimo: c.id_anonimo || c.id,
          nome: c.nome,
          email: c.email,
          area_atuacao: c.area_atuacao,
          estado: c.estado,
          cidade: c.cidade,
          escolaridade: c.escolaridade,
          genero: c.genero,
          is_pcd: c.is_pcd,
          experiencia: c.experiencia,
        }))
        setCandidatos(candidatosProcessados)
        
        // Extrair opções únicas de escolaridade
        const escolaridades = Array.from(
          new Set(candidatosProcessados
            .map(c => c.escolaridade)
            .filter(Boolean) as string[])
        ).sort()
        setOpcoesEscolaridade(escolaridades)
        
        // Extrair opções únicas de experiência
        const experiencias = Array.from(
          new Set(candidatosProcessados
            .map(c => c.experiencia)
            .filter(Boolean) as string[])
        ).sort()
        setOpcoesExperiencia(experiencias)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao processar candidatos"

    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aberta":
      case "open":
      case "ativa":
        return "bg-green-100 text-green-800"
      case "fechada":
      case "closed":
        return "bg-red-100 text-red-800"
      case "rascunho":
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const limparFiltros = () => {
    setFiltroEscolaridadeTemp("")
    setFiltroGeneroTemp("")
    setFiltroIsPcdTemp("")
    setFiltroExperienciaTemp("")
    setFiltroAreaAtuacaoTemp("")
    setFiltrosAplicados({
      escolaridade: "",
      genero: "",
      isPcd: "",
      experiencia: "",
      areaAtuacao: ""
    })
  }

  const aplicarFiltros = () => {
    setFiltrosAplicados({
      escolaridade: filtroEscolaridadeTemp,
      genero: filtroGeneroTemp,
      isPcd: filtroIsPcdTemp,
      experiencia: filtroExperienciaTemp,
      areaAtuacao: filtroAreaAtuacaoTemp
    })
  }

  const candidatosFiltrados = candidatos.filter((candidato) => {
    // Filtro por escolaridade
    if (filtrosAplicados.escolaridade && candidato.escolaridade !== filtrosAplicados.escolaridade) {
      return false
    }
    // Filtro por gênero (case-insensitive e aceita variações)
    if (filtrosAplicados.genero) {
      const generoNormalizado = candidato.genero?.toLowerCase().trim() || ""
      let filtroNormalizado = filtrosAplicados.genero.toLowerCase()
      
      // Mapear variações de gênero
      const mappingGenero: { [key: string]: string[] } = {
        "masculino": ["masculino", "m", "male", "homem"],
        "feminino": ["feminino", "f", "female", "mulher"],
        "outro": ["outro", "o", "other", "não informado", "prefiro não dizer"]
      }
      
      let encontrou = false
      for (const [chave, valores] of Object.entries(mappingGenero)) {
        if (filtroNormalizado === chave || valores.includes(filtroNormalizado)) {
          if (valores.includes(generoNormalizado)) {
            encontrou = true
            break
          }
        }
      }
      
      if (!encontrou) return false
    }
    // Filtro por PCD
    if (filtrosAplicados.isPcd) {
      const isPcd = candidato.is_pcd === true || candidato.is_pcd === "true" || candidato.is_pcd === "sim"
      if (filtrosAplicados.isPcd === "sim" && !isPcd) return false
      if (filtrosAplicados.isPcd === "nao" && isPcd) return false
    }
    // Filtro por experiência
    if (filtrosAplicados.experiencia && candidato.experiencia !== filtrosAplicados.experiencia) {
      return false
    }
    // Filtro por área de atuação
    if (filtrosAplicados.areaAtuacao && candidato.area_atuacao?.toLowerCase() !== filtrosAplicados.areaAtuacao.toLowerCase()) {
      return false
    }
    return true
  })

  return (
    <div className="w-full min-h-screen">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Status</h1>
            <p className="text-gray-600">Visualize e gerencie suas vagas e candidatos</p>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-8 border-2 border-teal-200">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
            <CardTitle className="text-lg text-gray-900">Filtros por Candidato</CardTitle>
            <p className="text-xs text-gray-600 mt-1">Selecione os filtros desejados e clique em "Filtrar" para aplicar</p>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Primeira linha de filtros */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Escolaridade</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md text-sm h-10"
                    value={filtroEscolaridadeTemp}
                    onChange={(e) => setFiltroEscolaridadeTemp(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {opcoesEscolaridade.map((esc) => (
                      <option key={esc} value={esc}>{esc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gênero</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md text-sm h-10"
                    value={filtroGeneroTemp}
                    onChange={(e) => setFiltroGeneroTemp(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">PCD</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md text-sm h-10"
                    value={filtroIsPcdTemp}
                    onChange={(e) => setFiltroIsPcdTemp(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Experiência</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md text-sm h-10"
                    value={filtroExperienciaTemp}
                    onChange={(e) => setFiltroExperienciaTemp(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {opcoesExperiencia.map((exp) => (
                      <option key={exp} value={exp}>{exp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Área de Atuação</label>
                  <select 
                    className="w-full px-3 py-2 border rounded-md text-sm h-10"
                    value={filtroAreaAtuacaoTemp}
                    onChange={(e) => setFiltroAreaAtuacaoTemp(e.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Eletrônica">Eletrônica</option>
                    <option value="Mecânica">Mecânica</option>
                    <option value="Civil">Civil</option>
                    <option value="Informática">Informática</option>
                    <option value="TI">TI</option>
                    <option value="Administração">Administração</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Vendas">Vendas</option>
                    <option value="RH">RH</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Logística">Logística</option>
                  </select>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  variant="default" 
                  size="sm"
                  className="flex-1 h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                  onClick={aplicarFiltros}
                >
                  🔍 Filtrar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 h-10 font-semibold"
                  onClick={limparFiltros}
                >
                  🔄 Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas de Filtros */}
        {(filtrosAplicados.escolaridade || filtrosAplicados.genero || filtrosAplicados.isPcd || filtrosAplicados.experiencia || filtrosAplicados.areaAtuacao) && (
          <Card className="mb-8 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-gray-900">📊 Resultado dos Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Total de Candidatos</p>
                  <p className="text-3xl font-bold text-blue-600">{candidatos.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-teal-500">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Candidatos com Filtros</p>
                  <p className="text-3xl font-bold text-teal-600">{candidatosFiltrados.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-red-500">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Excluídos pelos Filtros</p>
                  <p className="text-3xl font-bold text-red-600">{candidatos.length - candidatosFiltrados.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Percentual Retido</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {candidatos.length > 0 ? ((candidatosFiltrados.length / candidatos.length) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs Navigation */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="vagas">Vagas</TabsTrigger>
            <TabsTrigger value="candidatos">Candidatos</TabsTrigger>
          </TabsList>

          {/* Conteúdo - Aba Vagas */}
          <TabsContent value="vagas" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                  <p className="mt-4 text-gray-600">Carregando vagas...</p>
                </div>
              </div>
            ) : vagas.length === 0 ? (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="py-12">
                  <div className="text-center">
                    <p className="text-gray-500 mb-4">Nenhuma vaga criada ainda</p>
                    <Button 
                      onClick={() => router.push("/empresa/jobs/create")}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      Criar Primeira Vaga
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {vagas.map((vaga) => (
                  <Card 
                    key={vaga.id} 
                    className="overflow-hidden border-2 border-white shadow-lg hover:shadow-xl transition-shadow"
                  >
                    {/* Header da Vaga */}
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-2xl text-gray-900">
                            {vaga.title || vaga.titulo || "Vaga sem título"}
                          </CardTitle>
                          <p className="text-sm text-gray-600 mt-1">Vagas gerenciadas e candidatos em progresso</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(vaga.status)}>
                            {vaga.status === "aberta" || vaga.status === "open" || vaga.status === "ativa"
                              ? "Aberta"
                              : vaga.status === "fechada" || vaga.status === "closed"
                                ? "Fechada"
                                : "Rascunho"}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => router.push(`/empresa/jobs/${vaga.id}`)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* 4 Colunas de Métricas */}
                    <CardContent className="pt-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Coluna 1: Total de Candidatos */}
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border-2 border-blue-200 hover:shadow-md transition">
                          <div className="flex flex-col h-full">
                            <div className="text-sm font-bold text-blue-700 mb-2">Total de Candidatos</div>
                            <div className="text-4xl font-bold text-blue-900 mb-1">
                              {vaga.applications_count || vaga.candidatos_count || 0}
                            </div>
                            <div className="text-xs text-blue-600">candidatos interessados</div>
                          </div>
                        </div>

                        {/* Coluna 2: Convidados */}
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 rounded-lg border-2 border-yellow-200 hover:shadow-md transition">
                          <div className="flex flex-col h-full">
                            <div className="text-sm font-bold text-yellow-700 mb-2">Convidados</div>
                            <div className="text-4xl font-bold text-yellow-900 mb-1">0</div>
                            <div className="text-xs text-yellow-600">convites enviados</div>
                          </div>
                        </div>

                        {/* Coluna 3: Em Entrevista */}
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-lg border-2 border-orange-200 hover:shadow-md transition">
                          <div className="flex flex-col h-full">
                            <div className="text-sm font-bold text-orange-700 mb-2">Em Entrevista</div>
                            <div className="text-4xl font-bold text-orange-900 mb-1">0</div>
                            <div className="text-xs text-orange-600">em fase de entrevista</div>
                          </div>
                        </div>

                        {/* Coluna 4: Contratados */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg border-2 border-green-200 hover:shadow-md transition">
                          <div className="flex flex-col h-full">
                            <div className="text-sm font-bold text-green-700 mb-2">Contratados</div>
                            <div className="text-4xl font-bold text-green-900 mb-1">0</div>
                            <div className="text-xs text-green-600">candidatos contratados</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Conteúdo - Aba Candidatos */}
          <TabsContent value="candidatos" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                  <p className="mt-4 text-gray-600">Carregando candidatos...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Seção Consolidada de Candidatos */}
                <Card className="overflow-hidden border-2 border-white shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200">
                    <CardTitle className="text-2xl text-gray-900">
                      Todos os Candidatos
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Lista consolidada de {candidatos.length} candidatos</p>
                  </CardHeader>

                  <CardContent className="pt-6 pb-6">
                    {candidatos.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">Nenhum candidato encontrado</p>
                      </div>
                    ) : candidatosFiltrados.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">Nenhum candidato encontrado com os filtros aplicados</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                        {candidatosFiltrados.map((candidato, index) => (
                          <div 
                            key={candidato.id_anonimo || index} 
                            onClick={() => router.push(`/empresa/candidatos/${candidato.id_anonimo}`)}
                            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-teal-400 hover:shadow-md transition cursor-pointer"
                          >
                            <h4 className="font-semibold text-gray-900 text-sm mb-2">
                              {candidato.id_anonimo}
                            </h4>
                            {candidato.area_atuacao && (
                              <p className="text-xs text-gray-600 mb-1">🎯 {candidato.area_atuacao}</p>
                            )}
                            {candidato.estado && (
                              <p className="text-xs text-gray-600">📍 {candidato.cidade || ""}, {candidato.estado}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
