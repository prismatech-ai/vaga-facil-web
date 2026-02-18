// Dashboard route under /admin/dashboard
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Users, Building2, Briefcase, FileText, UserCircle, Eye, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import type { User, Vaga, Candidatura } from "@/lib/types"

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([])
  const [candidatos, setCandidatos] = useState<any[]>([])
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([])
  const [empresas, setEmpresas] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null)
  const [dialogVagaOpen, setDialogVagaOpen] = useState(false)
  const [candidaturaSelecionada, setCandidaturaSelecionada] = useState<Candidatura | null>(null)
  const [dialogCandidaturaOpen, setDialogCandidaturaOpen] = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<User | null>(null)
  const [dialogUsuarioOpen, setDialogUsuarioOpen] = useState(false)
  
  // Paginação
  const [currentPageUsuarios, setCurrentPageUsuarios] = useState(1)
  const [currentPageVagas, setCurrentPageVagas] = useState(1)
  const [currentPageCandidaturas, setCurrentPageCandidaturas] = useState(1)
  const [totalUsuarios, setTotalUsuarios] = useState(0)
  const [totalVagas, setTotalVagas] = useState(0)
  const [totalCandidatos, setTotalCandidatos] = useState(0)
  const [totalCandidaturas, setTotalCandidaturas] = useState(0)
  const [totalEmpresas, setTotalEmpresas] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    loadData()
    
    // Recarregar dados quando a página ficar visível novamente
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const verificarToken = (response: Response) => {
    if (response.status === 401) {
      alert('Sessão expirada. Por favor, faça login novamente.')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setTimeout(() => window.location.href = '/login', 1500)
      return true
    }
    return false
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      if (typeof window === 'undefined') {
        return
      }
      
      const token = localStorage.getItem('token')
      
      if (!token) {
        return
      }
      
      // Calcular skip baseado na página atual
      const skipUsuarios = (currentPageUsuarios - 1) * itemsPerPage
      const skipVagas = (currentPageVagas - 1) * itemsPerPage
      const skipCandidatos = (currentPageUsuarios - 1) * itemsPerPage
      const skipCandidaturas = (currentPageCandidaturas - 1) * itemsPerPage
      const skipEmpresas = (currentPageUsuarios - 1) * itemsPerPage
      
      const [statsResponse, usersResponse, candidatosResponse, vagasResponse, candidaturasResponse, empresasResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/dashboard/stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/usuarios?skip=${skipUsuarios}&limit=${itemsPerPage}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/candidatos?skip=${skipCandidatos}&limit=${itemsPerPage}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas?skip=${skipVagas}&limit=${itemsPerPage}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/candidaturas?skip=${skipCandidaturas}&limit=${itemsPerPage}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/empresas?skip=${skipEmpresas}&limit=${itemsPerPage}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      ])

      // Verificar se alguma resposta retornou 401
      if (verificarToken(statsResponse) || verificarToken(usersResponse) || 
          verificarToken(candidatosResponse) || verificarToken(vagasResponse) || 
          verificarToken(candidaturasResponse) || verificarToken(empresasResponse)) {
        return
      }

     
      const statsData = statsResponse.ok ? await statsResponse.json() : null
      const usersData = usersResponse.ok ? await usersResponse.json() : []
      const candidatosData = candidatosResponse.ok ? await candidatosResponse.json() : []
      const vagasData = vagasResponse.ok ? await vagasResponse.json() : []
      const candidaturasData = candidaturasResponse.ok ? await candidaturasResponse.json() : []
      const empresasData = empresasResponse.ok ? await empresasResponse.json() : []

      setStats(statsData)
      
      // Processar usuários com total
      const usersArray = Array.isArray(usersData) ? usersData : usersData.data || usersData.usuarios || []
      const totalUsersCount = usersData?.total || (Array.isArray(usersData) ? usersData.length : 0)
      setUsers(usersArray)
      setTotalUsuarios(totalUsersCount)
      
      // Processar candidatos com total
      const candidatosArray = Array.isArray(candidatosData) ? candidatosData : candidatosData.data || candidatosData.candidatos || []
      const totalCandidatosCount = candidatosData?.total || (Array.isArray(candidatosData) ? candidatosData.length : 0)
      setCandidatos(candidatosArray)
      setTotalCandidatos(totalCandidatosCount)
      
      // Mapear vagas corretamente
      const vagasArray = Array.isArray(vagasData) ? vagasData : vagasData.data || vagasData.vagas || []
      const totalVagasCount = vagasData?.total || (Array.isArray(vagasData) ? vagasData.length : 0)
      const vagasMapeadas = vagasArray.map((v: any) => ({
        id: v.id,
        titulo: v.title || v.titulo || '',
        empresaId: v.company_id || v.empresaId,
        empresaNome: v.company?.name || v.empresa_nome || 'Empresa',
        descricao: v.description || v.descricao || '',
        localizacao: v.location || v.localizacao || '',
        tipo: v.job_type || v.tipo || 'CLT',
        status: v.status || 'aberta',
        salarioMin: v.salary_min || v.salarioMin,
        salarioMax: v.salary_max || v.salarioMax,
        createdAt: v.created_at ? new Date(v.created_at) : new Date(),
      }))
      setVagas(vagasMapeadas)
      setTotalVagas(totalVagasCount)
      
      // Mapear candidaturas corretamente
      const candidaturasArray = Array.isArray(candidaturasData) ? candidaturasData : candidaturasData.data || candidaturasData.candidaturas || []
      const totalCandidaturasCount = candidaturasData?.total || (Array.isArray(candidaturasData) ? candidaturasData.length : 0)
      const candidaturasMapeadas = candidaturasArray.map((c: any) => ({
        id: c.id,
        vagaId: c.job_id || c.vaga_id || c.vagaId,
        candidatoId: c.candidate_id || c.candidato_id || c.candidatoId,
        status: c.status || 'em_analise',
        createdAt: c.created_at ? new Date(c.created_at) : new Date(),
        // Armazenar dados da API diretamente para evitar lookup
        jobTitle: c.job?.title || c.job_title || '',
        candidatoNome: c.candidate?.full_name || c.candidate?.nome || '',
        mensagem: c.message || c.mensagem || '',
      }))
      setCandidaturas(candidaturasMapeadas)
      setTotalCandidaturas(totalCandidaturasCount)
      
      // Processar empresas com total
      const empresasArray = Array.isArray(empresasData) ? empresasData : empresasData.data || empresasData.empresas || []
      const totalEmpresasCount = empresasData?.total || (Array.isArray(empresasData) ? empresasData.length : 0)
      setEmpresas(empresasArray)
      setTotalEmpresas(totalEmpresasCount)
    } catch (error) {
      setUsers([])
      setCandidatos([])
      setVagas([])
      setCandidaturas([])
      setEmpresas([])
    } finally {
      setLoading(false)
    }
  }, [currentPageUsuarios, currentPageVagas, currentPageCandidaturas, itemsPerPage])

  // Recarregar dados quando mudar de página
  useEffect(() => {
    loadData()
  }, [loadData])

  const vagasAbertas = vagas.filter((v) => v.status === "aberta")

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      aberta: "default",
      fechada: "secondary",
      pendente: "outline",
      em_analise: "secondary",
      aprovado: "default",
      rejeitado: "destructive",
    }
    return variants[status] || "outline"
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberta: "Aberta",
      fechada: "Fechada",
      pendente: "Pendente",
      em_analise: "Em Análise",
      aprovado: "Aprovado",
      rejeitado: "Rejeitado",
    }
    return labels[status] || status
  }

  const handleVerVaga = async (vaga: Vaga) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Token não encontrado')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas/${vaga.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (verificarToken(response)) return

      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes da vaga')
      }

      const detalhes = await response.json()
      
      // Mapear detalhes completos para o objeto Vaga
      const vagaCompleta: Vaga = {
        id: detalhes.id,
        titulo: detalhes.title || vaga.titulo,
        descricao: detalhes.description || vaga.descricao,
        requisitos: detalhes.requirements || vaga.requisitos,
        localizacao: detalhes.location || vaga.localizacao,
        tipo: detalhes.job_type || vaga.tipo,
        empresaId: detalhes.company?.id || vaga.empresaId,
        empresaNome: detalhes.company?.razao_social || vaga.empresaNome,
        status: detalhes.status || vaga.status,
        salarioMin: detalhes.salary_min || vaga.salarioMin,
        salarioMax: detalhes.salary_max || vaga.salarioMax,
        createdAt: detalhes.created_at ? new Date(detalhes.created_at) : vaga.createdAt,
        habilidadesRequeridas: detalhes.required_skills || vaga.habilidadesRequeridas,
        anosExperienciaMin: detalhes.years_experience_min || vaga.anosExperienciaMin,
        anosExperienciaMax: detalhes.years_experience_max || vaga.anosExperienciaMax,
      }
      
      setVagaSelecionada(vagaCompleta)
      setDialogVagaOpen(true)
    } catch (err) {
      // Fallback: usar dados já carregados
      setVagaSelecionada(vaga)
      setDialogVagaOpen(true)
    }
  }

  const handleDeleteVaga = async (vagaId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Token não encontrado')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas/${vagaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (verificarToken(response)) return

      if (!response.ok) {
        throw new Error(`Erro ao deletar vaga`)
      }

      alert('Vaga deletada com sucesso')
      loadData()
    } catch (err) {
      alert('Erro ao deletar vaga')
    }
  }

  const handleVerUsuario = (usuario: User) => {
    setUsuarioSelecionado(usuario)
    setDialogUsuarioOpen(true)
  }

  const handleVerCandidatura = async (candidatura: Candidatura) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Token não encontrado')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/candidaturas/${candidatura.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (verificarToken(response)) return

      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes da candidatura')
      }

      const detalhes = await response.json()
      
      // Mapear detalhes completos para o objeto Candidatura
      const candidaturaCompleta: Candidatura = {
        id: detalhes.id,
        vagaId: detalhes.job_id || candidatura.vagaId,
        candidatoId: detalhes.candidate_id || candidatura.candidatoId,
        status: detalhes.status || candidatura.status,
        createdAt: detalhes.created_at ? new Date(detalhes.created_at) : candidatura.createdAt,
        mensagem: detalhes.cover_letter || detalhes.message || candidatura.mensagem,
        jobTitle: detalhes.job?.title || candidatura.jobTitle,
        candidatoNome: detalhes.candidate?.full_name || candidatura.candidatoNome,
      }
      
      setCandidaturaSelecionada(candidaturaCompleta)
      setDialogCandidaturaOpen(true)
    } catch (err) {
      // Fallback: usar dados já carregados
      setCandidaturaSelecionada(candidatura)
      setDialogCandidaturaOpen(true)
    }
  }

  const handleDeleteCandidatura = async (candidaturaId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        alert('Token não encontrado')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/candidaturas/${candidaturaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (verificarToken(response)) return

      if (!response.ok) {
        throw new Error(`Erro ao deletar candidatura`)
      }

      alert('Candidatura deletada com sucesso')
      loadData()
    } catch (err) {
      alert('Erro ao deletar candidatura')
    }
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-600 mt-2">Visão completa do sistema e gerenciamento de usuários</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total de Candidatos</CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#03565C]">{stats?.total_candidatos ?? 0}</div>
              <p className="text-sm text-gray-600 mt-1">{stats?.candidatos_ultimos_30_dias ?? 0} novos últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Empresas</CardTitle>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Building2 className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#03565C]">{stats?.total_empresas ?? 0}</div>
              <p className="text-sm text-gray-600 mt-1">Cadastradas no sistema</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Vagas Abertas</CardTitle>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Briefcase className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#03565C]">{stats?.total_vagas_abertas ?? 0}</div>
              <p className="text-sm text-gray-600 mt-1">Vagas disponíveis</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Candidaturas</CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#03565C]">{stats?.total_candidaturas ?? 0}</div>
              <p className="text-sm text-gray-600 mt-1">Total de candidaturas</p>
            </CardContent>
          </Card>
        </div>

      {/* Tabs de Gerenciamento */}
        <Tabs defaultValue="usuarios" className="space-y-6">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="usuarios" className="data-[state=active]:bg-white data-[state=active]:text-[#03565C]">Usuários</TabsTrigger>
            <TabsTrigger value="vagas" className="data-[state=active]:bg-white data-[state=active]:text-[#03565C]">Vagas</TabsTrigger>
            <TabsTrigger value="candidaturas" className="data-[state=active]:bg-white data-[state=active]:text-[#03565C]">Candidaturas</TabsTrigger>
          </TabsList>

        {/* Tab de Usuários */}
        <TabsContent value="usuarios" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900">Todos os Usuários</CardTitle>
              <CardDescription>Gerencie todos os usuários cadastrados no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  return users.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${u.role === "empresa" ? "bg-emerald-100" : u.role === "admin" ? "bg-purple-100" : "bg-blue-100"}`}>
                          {u.role === "empresa" ? (
                            <Building2 className="h-5 w-5 text-emerald-600" />
                          ) : u.role === "candidato" ? (
                            <UserCircle className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Users className="h-5 w-5 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{u.nome}</p>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {u.role === "admin" ? "Admin" : u.role === "empresa" ? "Empresa" : "Candidato"}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleVerUsuario(u)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
              
              {/* Paginação Usuários */}
              {totalUsuarios > itemsPerPage && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((currentPageUsuarios - 1) * itemsPerPage) + 1} a {Math.min(currentPageUsuarios * itemsPerPage, totalUsuarios)} de {totalUsuarios} usuários
                  </p>
                  <div className="flex gap-2 items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPageUsuarios === 1}
                      onClick={() => setCurrentPageUsuarios(prev => Math.max(1, prev - 1))}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(totalUsuarios / itemsPerPage) }, (_, i) => i + 1).slice(Math.max(0, currentPageUsuarios - 2), Math.min(Math.ceil(totalUsuarios / itemsPerPage), currentPageUsuarios + 1)).map((page) => (
                        <Button
                          key={page}
                          variant={currentPageUsuarios === page ? "default" : "outline"}
                          size="sm"
                          className="w-9 h-9 p-0"
                          onClick={() => setCurrentPageUsuarios(page)}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={currentPageUsuarios * itemsPerPage >= totalUsuarios}
                      onClick={() => setCurrentPageUsuarios(prev => prev + 1)}
                      className="gap-1"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Vagas */}
        <TabsContent value="vagas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Vagas</CardTitle>
              <CardDescription>Visualize e gerencie todas as vagas publicadas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando vagas...
                </div>
              ) : vagas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma vaga encontrada
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {(() => {
                      return vagas.map((vaga) => {
                        const empresa = users.find((u) => u.id === vaga.empresaId)
                        return (
                          <div
                            key={vaga.id}
                            className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{vaga.titulo}</h3>
                                <Badge variant={getStatusBadge(vaga.status)}>{getStatusLabel(vaga.status)}</Badge>
                                <Badge variant="outline">{vaga.tipo}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {empresa?.nome} • {vaga.localizacao}
                              </p>
                              <p className="text-sm line-clamp-2">{vaga.descricao}</p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button variant="ghost" size="sm" onClick={() => handleVerVaga(vaga)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteVaga(vaga.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                  
                  {/* Paginação Vagas */}
                  {totalVagas > itemsPerPage && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPageVagas - 1) * itemsPerPage) + 1} a {Math.min(currentPageVagas * itemsPerPage, totalVagas)} de {totalVagas} vagas
                      </p>
                      <div className="flex gap-2 items-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={currentPageVagas === 1}
                          onClick={() => setCurrentPageVagas(prev => Math.max(1, prev - 1))}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.ceil(totalVagas / itemsPerPage) }, (_, i) => i + 1).slice(Math.max(0, currentPageVagas - 2), Math.min(Math.ceil(totalVagas / itemsPerPage), currentPageVagas + 1)).map((page) => (
                            <Button
                              key={page}
                              variant={currentPageVagas === page ? "default" : "outline"}
                              size="sm"
                              className="w-9 h-9 p-0"
                              onClick={() => setCurrentPageVagas(page)}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={currentPageVagas * itemsPerPage >= totalVagas}
                          onClick={() => setCurrentPageVagas(prev => prev + 1)}
                          className="gap-1"
                        >
                          Próximo
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Candidaturas */}
        <TabsContent value="candidaturas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Candidaturas</CardTitle>
              <CardDescription>Acompanhe todas as candidaturas do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando candidaturas...
                </div>
              ) : candidaturas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma candidatura encontrada
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {(() => {
                      return candidaturas.map((candidatura) => (
                    <div
                      key={candidatura.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{candidatura.jobTitle}</h3>
                          <Badge variant={getStatusBadge(candidatura.status)}>
                            {getStatusLabel(candidatura.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Candidato: {candidatura.candidatoNome}</p>
                        {candidatura.mensagem && <p className="text-sm line-clamp-2">{candidatura.mensagem}</p>}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="ghost" size="sm" onClick={() => handleVerCandidatura(candidatura)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCandidatura(candidatura.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                      ))
                    })()}
                  </div>
                  
                  {/* Paginação Candidaturas */}
                  {totalCandidaturas > itemsPerPage && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPageCandidaturas - 1) * itemsPerPage) + 1} a {Math.min(currentPageCandidaturas * itemsPerPage, totalCandidaturas)} de {totalCandidaturas} candidaturas
                      </p>
                      <div className="flex gap-2 items-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={currentPageCandidaturas === 1}
                          onClick={() => setCurrentPageCandidaturas(prev => Math.max(1, prev - 1))}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.ceil(totalCandidaturas / itemsPerPage) }, (_, i) => i + 1).slice(Math.max(0, currentPageCandidaturas - 2), Math.min(Math.ceil(totalCandidaturas / itemsPerPage), currentPageCandidaturas + 1)).map((page) => (
                            <Button
                              key={page}
                              variant={currentPageCandidaturas === page ? "default" : "outline"}
                              size="sm"
                              className="w-9 h-9 p-0"
                              onClick={() => setCurrentPageCandidaturas(page)}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={currentPageCandidaturas * itemsPerPage >= totalCandidaturas}
                          onClick={() => setCurrentPageCandidaturas(prev => prev + 1)}
                          className="gap-1"
                        >
                          Próximo
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Detalhes da Vaga */}
      <Dialog open={dialogVagaOpen} onOpenChange={setDialogVagaOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{vagaSelecionada?.titulo}</DialogTitle>
            <DialogDescription>
              {vagaSelecionada?.empresaNome} • {vagaSelecionada?.localizacao}
            </DialogDescription>
          </DialogHeader>
          {vagaSelecionada && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground">{vagaSelecionada.descricao}</p>
              </div>
              
              {vagaSelecionada.requisitos && (
                <div>
                  <h4 className="font-semibold mb-2">Requisitos</h4>
                  <p className="text-sm text-muted-foreground">{vagaSelecionada.requisitos}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Tipo de Contrato</h4>
                  <p className="text-sm text-muted-foreground">{vagaSelecionada.tipo}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Status</h4>
                  <Badge variant={getStatusBadge(vagaSelecionada.status)}>
                    {getStatusLabel(vagaSelecionada.status)}
                  </Badge>
                </div>
              </div>

              {(vagaSelecionada.salarioMin || vagaSelecionada.salarioMax) && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Faixa Salarial</h4>
                  <p className="text-sm text-muted-foreground">
                    R$ {vagaSelecionada.salarioMin?.toLocaleString('pt-BR')} - R$ {vagaSelecionada.salarioMax?.toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da Candidatura */}
      <Dialog open={dialogCandidaturaOpen} onOpenChange={setDialogCandidaturaOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Candidatura</DialogTitle>
          </DialogHeader>
          {candidaturaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Vaga</h4>
                  <p className="text-sm">{candidaturaSelecionada.jobTitle}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Candidato</h4>
                  <p className="text-sm">{candidaturaSelecionada.candidatoNome}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Status</h4>
                  <Badge variant={getStatusBadge(candidaturaSelecionada.status)}>
                    {getStatusLabel(candidaturaSelecionada.status)}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Data de Candidatura</h4>
                  <p className="text-sm text-muted-foreground">
                    {candidaturaSelecionada.createdAt?.toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {candidaturaSelecionada.mensagem && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Mensagem</h4>
                  <p className="text-sm text-muted-foreground">{candidaturaSelecionada.mensagem}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Usuário */}
      <Dialog open={dialogUsuarioOpen} onOpenChange={setDialogUsuarioOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do usuário cadastrado no sistema
            </DialogDescription>
          </DialogHeader>
          {usuarioSelecionado && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome</label>
                  <p className="text-base font-semibold">{usuarioSelecionado.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-base">{usuarioSelecionado.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Função</label>
                  <p className="text-base">
                    {usuarioSelecionado.role === "admin" ? "Admin" : usuarioSelecionado.role === "empresa" ? "Empresa" : "Candidato"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="text-base">{usuarioSelecionado.telefone || "Não informado"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
