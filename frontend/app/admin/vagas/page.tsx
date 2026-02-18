"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Trash2, Search, Briefcase, Building2, MapPin, Plus, X, Target, Pencil } from "lucide-react"
import type { Vaga, Candidatura, Candidato } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { toast } from "sonner"

export default function AdminVagasPage() {
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [candidaturasPorVaga, setCandidaturasPorVaga] = useState<Record<string, Candidatura[]>>({})
  const [loading, setLoading] = useState(true)
  const [loadingCandidaturas, setLoadingCandidaturas] = useState(false)
  const [error, setError] = useState('')
  const [busca, setBusca] = useState("")
  const [statusFiltro, setStatusFiltro] = useState<"" | "aberta" | "fechada">("")
  const [currentPageVagas, setCurrentPageVagas] = useState(1)
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("")
  const [periodoFiltro, setPeriodoFiltro] = useState<"" | "7" | "30">("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [empresaIdForm, setEmpresaIdForm] = useState<string>("")
  const [usuarioIdForm, setUsuarioIdForm] = useState<string>("none")
  const [tituloForm, setTituloForm] = useState("")
  const [descricaoForm, setDescricaoForm] = useState("")
  const [requisitosForm, setRequisitosForm] = useState("")
  const [localizacaoForm, setLocalizacaoForm] = useState("")
  const [tipoForm, setTipoForm] = useState<"CLT" | "PJ" | "Estágio" | "Temporário">("CLT")

  const [habilidadesForm, setHabilidadesForm] = useState<string[]>([])
  const [novaHabilidade, setNovaHabilidade] = useState("")
  const [anosExpMinForm, setAnosExpMinForm] = useState(0)
  const [anosExpMaxForm, setAnosExpMaxForm] = useState(10)
  const [salarioMinForm, setSalarioMinForm] = useState<number | undefined>()
  const [salarioMaxForm, setSalarioMaxForm] = useState<number | undefined>()
  const [empresas, setEmpresas] = useState<Array<{ id: string; razao_social?: string; nome?: string; cnpj?: string }>>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)
  const [editingVagaId, setEditingVagaId] = useState<string | null>(null)

  useEffect(() => {
    fetchVagas()
    fetchEmpresas()
  }, [])

  const fetchEmpresas = async () => {
    try {
      setLoadingEmpresas(true)
      
      const token = localStorage.getItem('token')
      if (!token) {
        return
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/companies/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (response.ok) {
        const data = await response.json()
      
        const empresasData = Array.isArray(data) ? data : (data.companies || data.data || [])
        setEmpresas(empresasData)
      } else {
      }
    } catch (err) {
    } finally {
      setLoadingEmpresas(false)
    }
  }

  const fetchVagas = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (typeof window === 'undefined') {
        return
      }
      
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Token não encontrado. Faça login novamente.')
        setLoading(false)
        return
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })
     
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao carregar vagas`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor (não é JSON)')
      }

      const data = await response.json()
      const vagasData = Array.isArray(data) ? data : (data.vagas || data.data || [])
      
      // Mapear os dados da API para o formato esperado
      const vagasMapeadas = vagasData.map((v: any) => ({
        id: v.id,
        empresaId: v.company_id || v.empresaId,
        empresaNome: v.company?.name || v.company?.razao_social || v.empresa_nome || v.empresaNome || 'Empresa',
        titulo: v.title || v.titulo || '',
        descricao: v.description || v.descricao || '',
        requisitos: v.requirements || v.requisitos || '',
        localizacao: v.location || v.localizacao || '',
        tipo: v.job_type || v.tipo || 'CLT',
        salarioMin: v.salary_min || v.salarioMin,
        salarioMax: v.salary_max || v.salarioMax,
        status: v.status || 'aberta',
        createdAt: v.created_at ? new Date(v.created_at) : (v.createdAt || new Date()),
        habilidadesRequeridas: v.required_skills || v.habilidadesRequeridas || [],
        anosExperienciaMin: v.years_experience_min || v.anosExperienciaMin,
        anosExperienciaMax: v.years_experience_max || v.anosExperienciaMax,
      }))
      
      setVagas(vagasMapeadas)
      setCurrentPageVagas(1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar vagas'
      setError(errorMessage)
      setVagas([])
    } finally {
      setLoading(false)
    }
  }

  const candidatos = useMemo<Candidato[]>(() => [], [])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      aberta: "default",
      fechada: "secondary",
    }
    return variants[status] || "outline"
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberta: "Aberta",
      fechada: "Fechada",
    }
    return labels[status] || status
  }

  const calcularMatch = (candidato: Candidato, vaga: Vaga): number => {
    let score = 0
    let maxScore = 0

    // Match de habilidades (peso 40%)
    if (vaga.habilidadesRequeridas && vaga.habilidadesRequeridas.length > 0) {
      maxScore += 40
      const habilidadesCandidato = candidato.habilidades || []
      const habilidadesMatch = vaga.habilidadesRequeridas.filter((h) =>
        habilidadesCandidato.some((hc) => {
          const skillName = typeof hc === 'string' ? hc : (typeof hc === 'object' && hc ? ((hc as any).nome || (hc as any).name || (hc as any).titulo || String(hc)) : '')
          return skillName.toLowerCase().includes(h.toLowerCase())
        }),
      ).length
      score += (habilidadesMatch / vaga.habilidadesRequeridas.length) * 40
    }

    // Match de anos de experiência (peso 30%)
    if (vaga.anosExperienciaMin !== undefined) {
      maxScore += 30
      const anosExp = candidato.anosExperiencia || 0
      if (anosExp >= vaga.anosExperienciaMin) {
        const maxExp = vaga.anosExperienciaMax || vaga.anosExperienciaMin + 10
        if (anosExp <= maxExp) {
          score += 30 // Dentro da faixa ideal
        } else {
          score += 20 // Acima da faixa, mas qualificado
        }
      } else {
        const percentual = anosExp / vaga.anosExperienciaMin
        score += percentual * 30
      }
    }

    // Match de localização (peso 30%)
    if (vaga.localizacao && candidato.localizacao) {
      maxScore += 30
      const vagaLoc = vaga.localizacao.toLowerCase()
      const candLoc = candidato.localizacao.toLowerCase()
      if (candLoc.includes(vagaLoc) || vagaLoc.includes(candLoc)) {
        score += 30
      } else if (vagaLoc.includes("remoto") || candLoc.includes("remoto")) {
        score += 20
      }
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  }

  const fetchCandidaturasDaVaga = async (vagaId: string) => {
    try {
      setLoadingCandidaturas(true)
      
      const token = localStorage.getItem('token')
      if (!token) return
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas/${vagaId}/candidaturas`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Erro ao carregar candidaturas da vaga`)
      }

      const data = await response.json()
      const candidaturasList = data.candidaturas || []
      
      // Mapear os dados para o formato esperado
      const candidaturasMapeadas: Candidatura[] = candidaturasList.map((c: any) => ({
        id: c.id,
        vagaId: vagaId,
        candidatoId: c.candidate?.id,
        status: c.status,
        createdAt: c.created_at ? new Date(c.created_at) : new Date(),
        candidato: {
          id: c.candidate?.id,
          nome: c.candidate?.nome,
          email: c.candidate?.email,
          habilidades: typeof c.candidate?.habilidades === 'string' 
            ? c.candidate.habilidades.split(',').map((h: string) => h.trim())
            : c.candidate?.habilidades || []
        }
      }))

      setCandidaturasPorVaga(prev => ({
        ...prev,
        [vagaId]: candidaturasMapeadas
      }))
    } catch (err) {
    } finally {
      setLoadingCandidaturas(false)
    }
  }

  const vagasFiltradas = useMemo(() => {
    const now = new Date()
    const dias = periodoFiltro ? Number.parseInt(periodoFiltro, 10) : 0
    const cutoff = dias ? new Date(now.getTime() - dias * 24 * 60 * 60 * 1000) : null
    const buscaLower = busca.trim().toLowerCase()
    return vagas.filter((v) => {
      const matchBusca =
        !buscaLower ||
        v.titulo.toLowerCase().includes(buscaLower) ||
        v.descricao.toLowerCase().includes(buscaLower) ||
        v.requisitos.toLowerCase().includes(buscaLower)
      const matchStatus = !statusFiltro || v.status === statusFiltro
      const matchEmpresa = !empresaFiltro || v.empresaId === empresaFiltro
      const matchPeriodo = !cutoff || v.createdAt >= cutoff
      return matchBusca && matchStatus && matchEmpresa && matchPeriodo
    })
  }, [vagas, busca, statusFiltro, empresaFiltro, periodoFiltro])

  const abrirDetalhes = async (vaga: Vaga) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setVagaSelecionada(vaga)
        setDialogOpen(true)
        fetchCandidaturasDaVaga(vaga.id)
        return
      }

      // Buscar detalhes completos da vaga
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas/${vaga.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      )

      if (response.ok) {
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
      } else {
        // Fallback para dados já carregados
        setVagaSelecionada(vaga)
      }
    } catch (err) {
      // Fallback para dados já carregados
      setVagaSelecionada(vaga)
    }
    
    setDialogOpen(true)
    // Carregar candidaturas da vaga
    fetchCandidaturasDaVaga(vaga.id)
  }

  const removerVaga = (id: string) => {
    handleDeleteVaga(parseInt(id))
  }

  const empresaNome = (empresaId: string, vagaEmpresaNome?: string) => {
    // Se já tem o nome da empresa na vaga, usa isso
    if (vagaEmpresaNome && vagaEmpresaNome !== 'Empresa') {
      return vagaEmpresaNome
    }
    // Senão, busca no array de empresas
    const e = empresas.find((u: any) => u.id === empresaId)
    // @ts-ignore
    return (e?.nomeEmpresa as string) || e?.nome || e?.razao_social || "Empresa"
  }

  const contagemPorStatus = (lista: Candidatura[]) => {
    return lista.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {})
  }

  const adicionarHabilidade = () => {
    if (novaHabilidade.trim() && !habilidadesForm.includes(novaHabilidade.trim())) {
      setHabilidadesForm([...habilidadesForm, novaHabilidade.trim()])
      setNovaHabilidade("")
    }
  }

  const removerHabilidade = (hab: string) => {
    setHabilidadesForm(habilidadesForm.filter((h) => h !== hab))
  }

  const resetForm = () => {
    setEmpresaIdForm("")
    setUsuarioIdForm("none")
    setTituloForm("")
    setDescricaoForm("")
    setRequisitosForm("")
    setLocalizacaoForm("")
    setTipoForm("CLT")
    setHabilidadesForm([])
    setNovaHabilidade("")
    setAnosExpMinForm(0)
    setAnosExpMaxForm(10)
    setSalarioMinForm(undefined)
    setSalarioMaxForm(undefined)
    setEditingVagaId(null)
  }

  const carregarVagaParaEdicao = (vaga: Vaga) => {
    setEmpresaIdForm(vaga.empresaId)
    setUsuarioIdForm("none")
    setTituloForm(vaga.titulo)
    setDescricaoForm(vaga.descricao)
    setRequisitosForm(vaga.requisitos)
    setLocalizacaoForm(vaga.localizacao)
    setTipoForm(vaga.tipo)
    setHabilidadesForm(vaga.habilidadesRequeridas || [])
    setAnosExpMinForm(vaga.anosExperienciaMin || 0)
    setAnosExpMaxForm(vaga.anosExperienciaMax || 10)
    setSalarioMinForm(vaga.salarioMin)
    setSalarioMaxForm(vaga.salarioMax)
    setEditingVagaId(vaga.id)
    setCreateOpen(true)
  }

  const handleDeleteVaga = async (vagaId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Token não encontrado')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas/${vagaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        toast.error('Sessão expirada')
        setTimeout(() => window.location.href = '/login', 2000)
        return
      }

      if (!response.ok) {
        throw new Error(`Erro ao deletar vaga: ${response.statusText}`)
      }

      toast.success('Vaga deletada com sucesso')
      fetchVagas()
    } catch (err) {
      toast.error('Erro ao deletar vaga', {
        description: (err as Error).message,
        duration: 5000
      })
    }
  }

  const handlePublishVaga = async (vagaId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Token não encontrado')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas/${vagaId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        toast.error('Sessão expirada')
        setTimeout(() => window.location.href = '/login', 2000)
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || response.statusText)
      }

      toast.success('Vaga publicada com sucesso')
      fetchVagas()
    } catch (err) {

      toast.error('Erro ao publicar vaga', {
        description: (err as Error).message,
        duration: 5000
      })
    }
  }

  const handleCloseVaga = async (vagaId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Token não encontrado')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas/${vagaId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        toast.error('Sessão expirada')
        setTimeout(() => window.location.href = '/login', 2000)
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || response.statusText)
      }

      toast.success('Vaga fechada com sucesso')
      fetchVagas()
    } catch (err) {

      toast.error('Erro ao fechar vaga', {
        description: (err as Error).message,
        duration: 5000
      })
    }
  }

  const handleUpdateVaga = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error('Token não encontrado')
        return
      }

      const payload = {
        title: tituloForm,
        description: descricaoForm,
        requirements: requisitosForm,
        location: localizacaoForm,
        job_type: tipoForm,
        salary_min: salarioMinForm || 0,
        salary_max: salarioMaxForm || 0,
        salary_currency: "BRL",
        remote: false,
        benefits: "",
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas/${editingVagaId}?company_id=${parseInt(empresaIdForm)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.status === 401) {
        toast.error('Sessão expirada')
        setTimeout(() => window.location.href = '/login', 2000)
        return
      }

      if (!response.ok) {
        const responseText = await response.text()

        let errorMessage = `Erro ${response.status}: ${response.statusText}`
        try {
          const errorData = JSON.parse(responseText)
          if (errorData.detail) {
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : JSON.stringify(errorData.detail)
          }
        } catch (e) {
          if (responseText) errorMessage = responseText
        }
        
        toast.error('Erro ao atualizar vaga', {
          description: errorMessage,
          duration: 5000,
        })
        return
      }

      const vagaAtualizada = await response.json()
    
      setCreateOpen(false)
      resetForm()
      
      toast.success('Vaga atualizada com sucesso', {
        description: `${tituloForm} foi atualizada`,
        duration: 4000,
      })

      fetchVagas()
    } catch (err) {

      toast.error('Erro ao atualizar vaga', {
        description: (err as Error).message,
        duration: 5000,
      })
    }
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Vagas</h1>
            <p className="text-gray-600 mt-2">Gerencie vagas com requisitos detalhados e matching de candidatos</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-[#03565C] hover:bg-[#024a4f]">
            <Plus className="h-4 w-4 mr-2" />
            Nova Vaga
          </Button>
        </div>

        {/* Filtros */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Filtros</CardTitle>
            <CardDescription>Filtre por empresa, status, período e busca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="busca">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="busca"
                    placeholder="Título, descrição ou requisitos..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select value={empresaFiltro} onValueChange={(v) => setEmpresaFiltro(v === "all" ? "" : v)}>
                  <SelectTrigger id="empresa">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {empresas.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {/* @ts-ignore */}
                        {(e.nomeEmpresa as string) || e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro((v === "all" ? "" : v) as any)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="fechada">Fechada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodo">Período</Label>
                <Select value={periodoFiltro} onValueChange={(v) => setPeriodoFiltro((v === "all" ? "" : v) as any)}>
                  <SelectTrigger id="periodo">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Dialog Criar/Editar Vaga */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVagaId ? "Editar Vaga" : "Registrar Nova Vaga"}</DialogTitle>
            <DialogDescription>{editingVagaId ? "Atualize os detalhes da vaga" : "Preencha os requisitos detalhados para melhor matching com candidatos"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Select
                  value={empresaIdForm}
                  onValueChange={(v) => {
                    setEmpresaIdForm(v)
                    if (!usuarioIdForm) setUsuarioIdForm(v)
                  }}
                >
                  <SelectTrigger id="empresa">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingEmpresas ? (
                      <div className="p-2 text-center text-sm text-gray-500">
                        Carregando empresas...
                      </div>
                    ) : empresas.length === 0 ? (
                      <div className="p-2 text-center text-sm text-gray-500">
                        Nenhuma empresa encontrada
                      </div>
                    ) : (
                      empresas.map((e: any) => (
                        <SelectItem key={e.id} value={e.id.toString()}>
                          {e.razao_social || e.nome || `Empresa ${e.id}`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="usuario">Usuário Responsável <span className="text-xs text-gray-500">(Opcional)</span></Label>
                <Select value={usuarioIdForm} onValueChange={setUsuarioIdForm}>
                  <SelectTrigger id="usuario">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {empresas.map((e: any) => (
                      <SelectItem key={e.id} value={e.id.toString()}>
                        {e.razao_social || e.nome || `Empresa ${e.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={tituloForm}
                  onChange={(e) => setTituloForm(e.target.value)}
                  placeholder="Ex: Desenvolvedor Full Stack"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="local">Localização</Label>
                <Input
                  id="local"
                  value={localizacaoForm}
                  onChange={(e) => setLocalizacaoForm(e.target.value)}
                  placeholder="Ex: São Paulo - SP ou Remoto"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Contrato</Label>
                <Select value={tipoForm} onValueChange={(v) => setTipoForm(v as any)}>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="Estágio">Estágio</SelectItem>
                    <SelectItem value="Temporário">Temporário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Habilidades Requeridas</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: React, Python, Solda..."
                  value={novaHabilidade}
                  onChange={(e) => setNovaHabilidade(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), adicionarHabilidade())}
                />
                <Button type="button" onClick={adicionarHabilidade} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {habilidadesForm.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {habilidadesForm.map((hab) => (
                    <Badge key={hab} variant="secondary" className="gap-1">
                      {hab}
                      <button onClick={() => removerHabilidade(hab)} className="ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Anos de Experiência: {anosExpMinForm} - {anosExpMaxForm} anos
              </Label>
              <div className="flex gap-4 items-center">
                <span className="text-sm text-muted-foreground w-8">0</span>
                <Slider
                  min={0}
                  max={20}
                  step={1}
                  value={[anosExpMinForm, anosExpMaxForm]}
                  onValueChange={(values) => {
                    setAnosExpMinForm(values[0])
                    setAnosExpMaxForm(values[1])
                  }}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-8">20+</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salarioMin">Salário Mínimo (R$)</Label>
                <Input
                  id="salarioMin"
                  type="number"
                  placeholder="Ex: 5000"
                  value={salarioMinForm || ""}
                  onChange={(e) => setSalarioMinForm(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salarioMax">Salário Máximo (R$)</Label>
                <Input
                  id="salarioMax"
                  type="number"
                  placeholder="Ex: 10000"
                  value={salarioMaxForm || ""}
                  onChange={(e) => setSalarioMaxForm(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                rows={4}
                value={descricaoForm}
                onChange={(e) => setDescricaoForm(e.target.value)}
                placeholder="Descreva as responsabilidades e contexto da vaga..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requisitos">Requisitos Adicionais</Label>
              <Textarea
                id="requisitos"
                rows={3}
                value={requisitosForm}
                onChange={(e) => setRequisitosForm(e.target.value)}
                placeholder="Outros requisitos, certificações, idiomas..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setCreateOpen(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!empresaIdForm || !tituloForm.trim() || !localizacaoForm.trim() || !descricaoForm.trim()}
                onClick={async () => {
                  if (editingVagaId) {
                    await handleUpdateVaga()
                  } else {
                    try {
                      const token = localStorage.getItem('token')
                      if (!token) {
                        toast.error('Token não encontrado', {
                          description: 'Faça login novamente.',
                          duration: 4000,
                        })
                        return
                      }

                      const payload = {
                        title: tituloForm,
                        description: descricaoForm,
                        requirements: requisitosForm,
                        location: localizacaoForm,
                        job_type: tipoForm,
                        salary_min: salarioMinForm || 0,
                        salary_max: salarioMaxForm || 0,
                        salary_currency: "BRL",
                        remote: false,
                        benefits: "",
                        status: "rascunho"
                      }

                      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/vagas?company_id=${parseInt(empresaIdForm)}`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                      })

                      if (response.status === 401) {
                        toast.error('Sessão expirada', {
                          description: 'Sua sessão expirou. Por favor, faça login novamente.',
                          duration: 5000,
                        })
                        setTimeout(() => {
                          window.location.href = '/login'
                        }, 2000)
                        return
                      }

                      if (!response.ok) {
                        const responseText = await response.text()

                        let errorMessage = `Erro ${response.status}: ${response.statusText}`
                        try {
                          const errorData = JSON.parse(responseText)
                          if (errorData.detail) {
                            errorMessage = typeof errorData.detail === 'string' 
                              ? errorData.detail 
                              : JSON.stringify(errorData.detail)
                          }
                        } catch (e) {
                          if (responseText) errorMessage = responseText
                        }
                        
                        toast.error('Erro ao criar vaga', {
                          description: errorMessage,
                          duration: 5000,
                      })
                      return
                    }

                    const novaVaga = await response.json()
                  
                    setCreateOpen(false)
                    resetForm()
                    
                    // Recarregar lista de vagas
                    await fetchVagas()
                    
                    toast.success('Vaga criada com sucesso!', {
                      description: `A vaga "${novaVaga.title || tituloForm}" foi criada em modo rascunho.`,
                      duration: 4000,
                    })
                    } catch (error) {

                      toast.error('Erro ao criar vaga', {
                        description: 'Não foi possível criar a vaga. Tente novamente.',
                        duration: 4000,
                      })
                    }
                  }
                }}
              >
                {editingVagaId ? "Atualizar Vaga" : "Registrar Vaga"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabela de Vagas */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900">Vagas</CardTitle>
          <CardDescription>{vagasFiltradas.length} resultados</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Candidaturas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Carregando vagas...
                    </TableCell>
                  </TableRow>
                ) : vagasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">
                      Nenhuma vaga encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const itemsPerPage = 10
                    const startIndex = (currentPageVagas - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const vagasPaginadas = vagasFiltradas.slice(startIndex, endIndex)
                    
                    return vagasPaginadas.map((vaga) => {
                      const totalCands = candidaturasPorVaga[vaga.id]?.length ?? 0
                      return (
                        <TableRow key={vaga.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-gray-900">{vaga.titulo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-gray-700">{empresaNome(vaga.empresaId, vaga.empresaNome)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {vaga.localizacao}
                          </div>
                        </TableCell>
                        <TableCell>{vaga.tipo}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(vaga.status)}>{getStatusLabel(vaga.status)}</Badge>
                        </TableCell>
                        <TableCell>{totalCands}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => abrirDetalhes(vaga)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => carregarVagaParaEdicao(vaga)}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removerVaga(vaga.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                  })()
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Paginação */}
          {vagasFiltradas.length > 10 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPageVagas - 1) * 10) + 1} a {Math.min(currentPageVagas * 10, vagasFiltradas.length)} de {vagasFiltradas.length} vagas
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPageVagas === 1}
                  onClick={() => setCurrentPageVagas(prev => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(vagasFiltradas.length / 10) }, (_, i) => i + 1).map((page) => (
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
                  disabled={currentPageVagas * 10 >= vagasFiltradas.length}
                  onClick={() => setCurrentPageVagas(prev => prev + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Detalhes da Vaga */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Vaga</DialogTitle>
            <DialogDescription>
              {vagaSelecionada?.titulo} • {vagaSelecionada && empresaNome(vagaSelecionada.empresaId, vagaSelecionada.empresaNome)}
            </DialogDescription>
          </DialogHeader>
          {vagaSelecionada && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informações</CardTitle>
                    <CardDescription>Dados principais</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Localização:</span> {vagaSelecionada.localizacao}
                    </div>
                    <div>
                      <span className="font-medium">Tipo:</span> {vagaSelecionada.tipo}
                    </div>
                    {(vagaSelecionada.salarioMin || vagaSelecionada.salarioMax) && (
                      <div>
                        <span className="font-medium">Faixa salarial:</span>{" "}
                        {vagaSelecionada.salarioMin && `R$ ${vagaSelecionada.salarioMin.toLocaleString("pt-BR")}`}
                        {vagaSelecionada.salarioMin && vagaSelecionada.salarioMax && " - "}
                        {vagaSelecionada.salarioMax && `R$ ${vagaSelecionada.salarioMax.toLocaleString("pt-BR")}`}
                      </div>
                    )}
                    {vagaSelecionada.anosExperienciaMin !== undefined && (
                      <div>
                        <span className="font-medium">Experiência:</span> {vagaSelecionada.anosExperienciaMin} -{" "}
                        {vagaSelecionada.anosExperienciaMax || vagaSelecionada.anosExperienciaMin + 10} anos
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Métricas</CardTitle>
                    <CardDescription>Resumo das candidaturas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {(() => {
                      const lista = candidaturasPorVaga[vagaSelecionada.id] ?? []
                      const cont = contagemPorStatus(lista)
                      const total = lista.length
                      return (
                        <>
                          <div>
                            <span className="font-medium">Total:</span> {total}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(cont).map(([k, v]) => (
                              <Badge key={k} variant="outline">
                                {k.replace("_", " ")}: {v}
                              </Badge>
                            ))}
                            {total === 0 && <span className="text-muted-foreground">Sem candidaturas</span>}
                          </div>
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Candidaturas</CardTitle>
                  <CardDescription>Lista de candidatos que se candidataram</CardDescription>
                </CardHeader>
                  <CardContent>
                    {loadingCandidaturas ? (
                      <div className="text-center py-4 text-muted-foreground">Carregando candidaturas...</div>
                    ) : (
                      <div className="space-y-2">
                        {(candidaturasPorVaga[vagaSelecionada.id] ?? []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma candidatura ainda</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-2">Nome</th>
                                  <th className="text-left py-2 px-2">Email</th>
                                  <th className="text-left py-2 px-2">Habilidades</th>
                                  <th className="text-left py-2 px-2">Status</th>
                                  <th className="text-left py-2 px-2">Data</th>
                                  <th className="text-right py-2 px-2">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(candidaturasPorVaga[vagaSelecionada.id] ?? []).map((cand) => (
                                  <tr key={cand.id} className="border-b hover:bg-muted/50">
                                    <td className="py-2 px-2">{cand.candidato?.nome || 'N/A'}</td>
                                    <td className="py-2 px-2 text-xs">{cand.candidato?.email || 'N/A'}</td>
                                    <td className="py-2 px-2">
                                      <div className="flex flex-wrap gap-1">
                                        {(cand.candidato?.habilidades || []).slice(0, 2).map((hab, idx) => (
                                          <Badge key={`${idx}-${hab}`} variant="secondary" className="text-xs">
                                            {hab}
                                          </Badge>
                                        ))}
                                        {(cand.candidato?.habilidades || []).length > 2 && (
                                          <Badge variant="outline" className="text-xs">+{(cand.candidato?.habilidades || []).length - 2}</Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2">
                                      <Badge variant={cand.status === 'aprovado' ? 'default' : cand.status === 'em_analise' ? 'secondary' : 'outline'}>
                                        {cand.status?.replace('_', ' ') || 'Sem status'}
                                      </Badge>
                                    </td>
                                    <td className="py-2 px-2 text-xs text-muted-foreground">
                                      {cand.createdAt ? new Date(cand.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="sm">
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

              {vagaSelecionada.habilidadesRequeridas && vagaSelecionada.habilidadesRequeridas.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Habilidades Requeridas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {vagaSelecionada.habilidadesRequeridas.map((hab) => (
                        <Badge key={hab} variant="secondary">
                          {hab}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{vagaSelecionada.descricao}</p>
                </CardContent>
              </Card>

              {vagaSelecionada.requisitos && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Requisitos Adicionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{vagaSelecionada.requisitos}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 justify-end mt-4">
                {vagaSelecionada.status === "rascunho" && (
                  <Button 
                    onClick={() => {
                      handlePublishVaga(parseInt(vagaSelecionada.id))
                      setDialogOpen(false)
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Publicar
                  </Button>
                )}
                {vagaSelecionada.status === "aberta" && (
                  <Button 
                    onClick={() => {
                      handleCloseVaga(parseInt(vagaSelecionada.id))
                      setDialogOpen(false)
                    }}
                    variant="destructive"
                  >
                    Fechar
                  </Button>
                )}
                <Button 
                  onClick={() => handleDeleteVaga(parseInt(vagaSelecionada.id))}
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  Deletar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
