"use client"

import { useState, useEffect } from "react"
import { Building2, Search, Plus, Mail, X, Briefcase, User, Globe, FileText } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Empresa } from "@/lib/types"

type EmpresaAcesso = {
  id: string
  nome: string
  email: string
  createdAt: Date
  conviteEnviado: boolean
}

export default function AdminEmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState({
    busca: "",
    status: "",
  })

  useEffect(() => {
    fetchEmpresas()
  }, [])

  const fetchEmpresas = async () => {
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/empresas`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` || ''
        }
      })


      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao carregar empresas`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor (não é JSON)')
      }

      const data = await response.json()
  

      const empresasData = Array.isArray(data) ? data : (data.empresas || data.data || [])

      // Mapear os dados da API para o formato esperado
      const empresasMapeadas = empresasData.map((e: any) => ({
        id: e.id,
        nome: e.razao_social || '',
        email: e.email || '',
        nomeEmpresa: e.razao_social || '',
        razaoSocial: e.razao_social || e.razaoSocial || '',
        nomeFantasia: e.nome_fantasia || e.nomeFantasia || '',
        cnpj: e.cnpj || '',
        site: e.site || '',
        descricao: e.descricao || e.description || '',
        createdAt: e.created_at ? new Date(e.created_at) : (e.createdAt || new Date()),
      }))

      setEmpresas(empresasMapeadas)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar empresas'
      setError(errorMessage)
      setEmpresas([])
    } finally {
      setLoading(false)
    }
  }

  const [dialogVerOpen, setDialogVerOpen] = useState(false)
  const [modoEdicao, setModoEdicao] = useState<"create" | "edit" | null>(null)
  const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null)

  const [formEmpresa, setFormEmpresa] = useState({
    nomeEmpresa: "",
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    site: "",
    descricao: "",
  })

  // Gestão de acesso (usuários da empresa) - estado local apenas para protótipo
  const [acessosPorEmpresa, setAcessosPorEmpresa] = useState<Record<string, EmpresaAcesso[]>>({})
  const [novoAcesso, setNovoAcesso] = useState({ nome: "", email: "" })
  const [vagasPorEmpresa, setVagasPorEmpresa] = useState<Record<string, number>>({})

  const empresasFiltradas = empresas.filter((e) => {
    const busca = filtros.busca.trim().toLowerCase()
    return (
      !busca ||
      e.nomeEmpresa?.toLowerCase().includes(busca) ||
      e.email.toLowerCase().includes(busca) ||
      e.nome.toLowerCase().includes(busca) ||
      e.cnpj?.toLowerCase().includes(busca)
    )
  })

  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') return '??'
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || '??'
  }

  const abrirVer = (empresa: Empresa) => {
    setEmpresaSelecionada(empresa)
    setDialogVerOpen(true)
  }

  const abrirCriar = () => {
    setEmpresaSelecionada(null)
    setFormEmpresa({
      nomeEmpresa: "",
      razaoSocial: "",
      nomeFantasia: "",
      cnpj: "",
      site: "",
      descricao: "",
    })
    setModoEdicao("create")
  }

  const abrirEditar = (empresa: Empresa) => {
    setDialogVerOpen(false)
    setEmpresaSelecionada(empresa)
    setFormEmpresa({
      nomeEmpresa: empresa.nomeEmpresa ?? "",
      razaoSocial: empresa.razaoSocial ?? "",
      nomeFantasia: empresa.nomeFantasia ?? "",
      cnpj: empresa.cnpj ?? "",
      site: empresa.site ?? "",
      descricao: empresa.descricao ?? "",
    })
    setModoEdicao("edit")
  }

  const salvarEmpresa = () => {
    if (modoEdicao === "create") {
      const novaEmpresa: Empresa = {
        id: Date.now().toString(),
        role: "empresa",
        email: `contato@${(formEmpresa.site || "empresa.com").replace(/^https?:\/\//, "")}`,
        nome: formEmpresa.nomeEmpresa || "Nova Empresa",
        createdAt: new Date(),
        nomeEmpresa: formEmpresa.nomeEmpresa || "Nova Empresa",
        cnpj: formEmpresa.cnpj || "00.000.000/0000-00",
        razaoSocial: formEmpresa.razaoSocial || undefined,
        nomeFantasia: formEmpresa.nomeFantasia || undefined,
        site: formEmpresa.site || undefined,
        descricao: formEmpresa.descricao || undefined,
      }
      setEmpresas((prev) => [novaEmpresa, ...prev])
      setAcessosPorEmpresa((prev) => ({
        ...prev,
        [novaEmpresa.id]: [],
      }))
    } else if (empresaSelecionada) {
      setEmpresas((prev) =>
        prev.map((e) =>
          e.id === empresaSelecionada.id
            ? {
              ...e,
              nomeEmpresa: formEmpresa.nomeEmpresa || e.nomeEmpresa,
              razaoSocial: formEmpresa.razaoSocial || undefined,
              nomeFantasia: formEmpresa.nomeFantasia || undefined,
              cnpj: formEmpresa.cnpj || e.cnpj,
              site: formEmpresa.site || undefined,
              descricao: formEmpresa.descricao || undefined,
            }
            : e,
        ),
      )
    }
    setModoEdicao(null)
  }

  const removerEmpresa = (id: string) => {
    setEmpresas((prev) => prev.filter((e) => e.id !== id))
  }

  const adicionarAcesso = () => {
    if (!empresaSelecionada || !novoAcesso.nome || !novoAcesso.email) return
    setAcessosPorEmpresa((prev) => {
      const atual = prev[empresaSelecionada.id] ?? []
      return {
        ...prev,
        [empresaSelecionada.id]: [
          ...atual,
          {
            id: `${empresaSelecionada.id}-${Date.now()}`,
            nome: novoAcesso.nome,
            email: novoAcesso.email,
            createdAt: new Date(),
            conviteEnviado: false,
          },
        ],
      }
    })
    // Mock: Send invitation email
   
    // Update status to show invitation was sent
    setTimeout(() => {
      setAcessosPorEmpresa((prev) => {
        const atual = prev[empresaSelecionada.id] ?? []
        const updated = atual.map((a) =>
          a.email === novoAcesso.email && !a.conviteEnviado ? { ...a, conviteEnviado: true } : a,
        )
        return {
          ...prev,
          [empresaSelecionada.id]: updated,
        }
      })
    }, 1000)
    setNovoAcesso({ nome: "", email: "" })
  }

  const removerAcesso = (acessoId: string) => {
    if (!empresaSelecionada) return
    setAcessosPorEmpresa((prev) => {
      const atual = prev[empresaSelecionada.id] ?? []
      return {
        ...prev,
        [empresaSelecionada.id]: atual.filter((a) => a.id !== acessoId),
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Empresas</h1>
            <p className="text-gray-600 mt-2">
              Gerencie dados institucionais, vagas publicadas e acessos dos usuários
            </p>
          </div>
          <Button onClick={abrirCriar} className="bg-[#03565C] hover:bg-[#024a4f]">
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>

        {/* Filtros */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Filtros</CardTitle>
            <CardDescription>Busque por nome, email ou CNPJ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="busca">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="busca"
                    placeholder="Nome da empresa, responsável, email..."
                    value={filtros.busca}
                    onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Empresas */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Empresas</CardTitle>
            <CardDescription>
              {loading ? "Carregando..." : `${empresasFiltradas.length} resultados`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            )}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
                <p className="text-gray-600">Carregando empresas...</p>
              </div>
            ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        Nenhuma empresa encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    empresasFiltradas.map((e) => (
                      <TableRow key={e.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-emerald-100 text-emerald-600">
                                {getInitials(e.nomeEmpresa || e.nome)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">{e.nomeEmpresa || "-"}</div>
                              <div className="text-xs text-gray-500">
                                {e.razaoSocial || e.nomeFantasia || "-"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-gray-700">{e.email}</TableCell>
                        <TableCell className="align-top">
                          <span className="text-sm text-gray-500">{e.cnpj || "-"}</span>
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => abrirVer(e)}>
                              <Mail className="h-4 w-4 text-gray-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => abrirEditar(e)}>
                              <User className="h-4 w-4 text-gray-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => removerEmpresa(e.id)}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
      </Card>

      {/* Dialog: Ver Empresa */}
      <Dialog open={dialogVerOpen} onOpenChange={setDialogVerOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-3 pb-4 border-b">
            <DialogTitle className="text-2xl">Detalhes da Empresa</DialogTitle>
            <DialogDescription className="text-base">
              {empresaSelecionada?.nomeEmpresa} • {empresaSelecionada?.cnpj}
            </DialogDescription>
          </DialogHeader>
          {empresaSelecionada && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <Card className="lg:col-span-2 border-2">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Informações Gerais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Nome</span>
                        <p className="font-medium">{empresaSelecionada.nomeEmpresa || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">CNPJ</span>
                        <p className="font-medium">{empresaSelecionada.cnpj || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Razão Social</span>
                        <p className="font-medium">{empresaSelecionada.razaoSocial || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">Nome Fantasia</span>
                        <p className="font-medium">{empresaSelecionada.nomeFantasia || "-"}</p>
                      </div>
                    </div>

                    <div className="pt-2 space-y-3 border-t">
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <span className="text-sm text-muted-foreground">Email</span>
                          <p className="font-medium text-sm">{empresaSelecionada.email}</p>
                        </div>
                      </div>

                      {empresaSelecionada.site && (
                        <div className="flex items-start gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="space-y-1 flex-1">
                            <span className="text-sm text-muted-foreground">Website</span>
                            <a
                              href={
                                empresaSelecionada.site.startsWith("http")
                                  ? empresaSelecionada.site
                                  : `https://${empresaSelecionada.site}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-sm font-medium"
                            >
                              {empresaSelecionada.site}
                            </a>
                          </div>
                        </div>
                      )}

                      {empresaSelecionada.descricao && (
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="space-y-1 flex-1">
                            <span className="text-sm text-muted-foreground">Descrição</span>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {empresaSelecionada.descricao}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-2">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Estatísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Vagas Ativas</p>
                          <p className="text-2xl font-bold">{vagasPorEmpresa[empresaSelecionada.id] ?? 0}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="p-2 rounded-md bg-blue-500/10">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Usuários</p>
                          <p className="text-2xl font-bold">{acessosPorEmpresa[empresaSelecionada.id]?.length ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Usuários da Conta
                  </CardTitle>
                  <CardDescription>Gerencie o acesso dos usuários da empresa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="novo-nome">Nome</Label>
                      <Input
                        id="novo-nome"
                        value={novoAcesso.nome}
                        onChange={(e) => setNovoAcesso((n) => ({ ...n, nome: e.target.value }))}
                        placeholder="Nome do usuário"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="novo-email">Email</Label>
                      <div className="flex gap-2">
                        <Input
                          id="novo-email"
                          type="email"
                          value={novoAcesso.email}
                          onChange={(e) => setNovoAcesso((n) => ({ ...n, email: e.target.value }))}
                          placeholder="email@empresa.com"
                        />
                        <Button type="button" onClick={adicionarAcesso}>
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar Convite
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {acessosPorEmpresa[empresaSelecionada.id]?.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.nome}</TableCell>
                            <TableCell>{a.email}</TableCell>
                            <TableCell>
                              {a.conviteEnviado ? (
                                <Badge variant="outline" className="text-green-600">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-yellow-600">
                                  Convite pendente
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => removerAcesso(a.id)}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {acessosPorEmpresa[empresaSelecionada.id]?.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Nenhum usuário adicionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar/Editar Empresa */}
      <Dialog open={modoEdicao !== null} onOpenChange={() => setModoEdicao(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modoEdicao === "create" ? "Nova Empresa" : "Editar Empresa"}</DialogTitle>
            <DialogDescription>
              {modoEdicao === "create"
                ? "Preencha as informações para cadastrar uma nova empresa"
                : "Atualize as informações da empresa"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                <Input
                  id="nomeEmpresa"
                  value={formEmpresa.nomeEmpresa}
                  onChange={(e) => setFormEmpresa((f) => ({ ...f, nomeEmpresa: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formEmpresa.cnpj}
                  onChange={(e) => setFormEmpresa((f) => ({ ...f, cnpj: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="razao">Razão Social</Label>
                <Input
                  id="razao"
                  value={formEmpresa.razaoSocial}
                  onChange={(e) => setFormEmpresa((f) => ({ ...f, razaoSocial: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fantasia">Nome Fantasia</Label>
                <Input
                  id="fantasia"
                  value={formEmpresa.nomeFantasia}
                  onChange={(e) => setFormEmpresa((f) => ({ ...f, nomeFantasia: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site">Site</Label>
                <Input
                  id="site"
                  value={formEmpresa.site}
                  onChange={(e) => setFormEmpresa((f) => ({ ...f, site: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formEmpresa.descricao}
                  onChange={(e) => setFormEmpresa((f) => ({ ...f, descricao: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setModoEdicao(null)}>
                Cancelar
              </Button>
              <Button type="button" onClick={salvarEmpresa} className="bg-[#03565C] hover:bg-[#024a4f]">
                {modoEdicao === "create" ? "Criar Empresa" : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
