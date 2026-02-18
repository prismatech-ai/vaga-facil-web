// Copied from old candidatos page
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Eye, Pencil, Search, Trash2, MapPin, LinkIcon, Mail, Filter, Award } from "lucide-react"
import type { Candidato } from "@/lib/types"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function AdminCandidatosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPageCandidatos, setCurrentPageCandidatos] = useState(1)
  const [filtros, setFiltros] = useState({
    busca: "",
    localizacao: "",
    habilidade: "",
  })

  const [dialogVerOpen, setDialogVerOpen] = useState(false)
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false)
  const [conviteDialogOpen, setConviteDialogOpen] = useState(false)
  const [emailConvite, setEmailConvite] = useState("")
  const [nomeConvite, setNomeConvite] = useState("")
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<Candidato | null>(null)
  const [formEdicao, setFormEdicao] = useState({
    nome: "",
    email: "",
    telefone: "",
    localizacao: "",
    linkedin: "",
    habilidades: "",
    areaAtuacao: "",
  })

  useEffect(() => {
    fetchCandidatos()
  }, [])

  // Recarregar candidatos quando filtros mudam
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidatos()
    }, 500) // Debounce de 500ms para não fazer muitas requisições

    return () => clearTimeout(timer)
  }, [filtros])

  const fetchCandidatos = async () => {
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
      
      // Construir query string com filtros
      const params = new URLSearchParams()
      if (filtros.busca) params.append('busca', filtros.busca)
      if (filtros.localizacao) params.append('localizacao', filtros.localizacao)
      if (filtros.habilidade) params.append('habilidade', filtros.habilidade)
      
      const queryString = params.toString()
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/candidatos${queryString ? '?' + queryString : ''}`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao carregar candidatos`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor (não é JSON)')
      }

      const data = await response.json()
     
      const candidatosArray = Array.isArray(data) ? data : (data.candidatos || data.usuarios || data.data || [])
      
      setCandidatos(candidatosArray)
      setCurrentPageCandidatos(1)
      setLoading(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar candidatos'
      setError(errorMessage)
      setCandidatos([])
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const abrirVer = async (cand: Candidato) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setCandidatoSelecionado(cand)
        setDialogVerOpen(true)
        return
      }

      // Buscar detalhes completos do candidato
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/candidatos/${cand.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      )

      if (response.ok) {
        const candidatoCompleto = await response.json()
        
        // Mapear detalhes completos para o objeto Candidato
        const candidatoComDados: Candidato = {
          ...cand,
          nome: candidatoCompleto.full_name || candidatoCompleto.nome || cand.nome,
          email: candidatoCompleto.email || cand.email,
          telefone: candidatoCompleto.phone || candidatoCompleto.telefone || cand.telefone,
          localizacao: candidatoCompleto.location || candidatoCompleto.localizacao || cand.localizacao,
          linkedin_url: candidatoCompleto.linkedin_url || cand.linkedin_url,
          habilidades: candidatoCompleto.habilidades || cand.habilidades,
          nivelDesejado: candidatoCompleto.area_atuacao || candidatoCompleto.areaAtuacao || cand.nivelDesejado,
          anosExperiencia: candidatoCompleto.anos_experiencia || cand.anosExperiencia,
          curriculo: candidatoCompleto.resume_url || cand.curriculo,
          bio: candidatoCompleto.bio || cand.bio,
          portfolio_url: candidatoCompleto.portfolio_url || cand.portfolio_url,
          cpf: candidatoCompleto.cpf,
          birth_date: candidatoCompleto.birth_date,
          genero: candidatoCompleto.genero,
          estado_civil: candidatoCompleto.estado_civil,
          is_pcd: candidatoCompleto.is_pcd,
          tipo_pcd: candidatoCompleto.tipo_pcd,
          onboarding_completo: candidatoCompleto.onboarding_completo,
        }
        
        setCandidatoSelecionado(candidatoComDados)
      } else {
        // Fallback para dados já carregados
        setCandidatoSelecionado(cand)
      }
    } catch (err) {
      // Fallback para dados já carregados
      setCandidatoSelecionado(cand)
    }
    
    setDialogVerOpen(true)
  }

  const abrirEditar = async (cand: Candidato) => {
    setCandidatoSelecionado(cand)
    
    // Tentar buscar dados completos do candidato
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setFormEdicao({
          nome: cand.nome ?? "",
          email: cand.email ?? "",
          telefone: cand.telefone ?? "",
          localizacao: cand.localizacao ?? "",
          linkedin: cand.linkedin ?? cand.linkedin_url ?? "",
          habilidades: Array.isArray(cand.habilidades) ? cand.habilidades.join(", ") : (typeof cand.habilidades === 'string' ? cand.habilidades : ""),
          areaAtuacao: cand.nivelDesejado ?? "",
        })
        setDialogEditarOpen(true)
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/candidatos/${cand.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      )

      if (response.ok) {
        const candidatoCompleto = await response.json()
        setFormEdicao({
          nome: candidatoCompleto.nome ?? cand.nome ?? "",
          email: candidatoCompleto.email ?? cand.email ?? "",
          telefone: candidatoCompleto.telefone ?? candidatoCompleto.phone ?? cand.telefone ?? "",
          localizacao: candidatoCompleto.localizacao ?? candidatoCompleto.location ?? cand.localizacao ?? "",
          linkedin: candidatoCompleto.linkedin ?? candidatoCompleto.linkedin_url ?? cand.linkedin ?? "",
          habilidades: Array.isArray(candidatoCompleto.habilidades) ? candidatoCompleto.habilidades.map((h: any) => typeof h === 'string' ? h : h.name || h.titulo).join(", ") : (typeof candidatoCompleto.habilidades === 'string' ? candidatoCompleto.habilidades : ""),
          areaAtuacao: candidatoCompleto.areaAtuacao ?? candidatoCompleto.area_atuacao ?? cand.nivelDesejado ?? "",
        })
      } else {
        // Fallback para dados do candidato da lista
        setFormEdicao({
          nome: cand.nome ?? "",
          email: cand.email ?? "",
          telefone: cand.telefone ?? "",
          localizacao: cand.localizacao ?? "",
          linkedin: cand.linkedin ?? cand.linkedin_url ?? "",
          habilidades: Array.isArray(cand.habilidades) ? cand.habilidades.join(", ") : (typeof cand.habilidades === 'string' ? cand.habilidades : ""),
          areaAtuacao: cand.nivelDesejado ?? "",
        })
      }
    } catch (err) {
      // Fallback para dados do candidato da lista
      setFormEdicao({
        nome: cand.nome ?? "",
        email: cand.email ?? "",
        telefone: cand.telefone ?? "",
        localizacao: cand.localizacao ?? "",
        linkedin: cand.linkedin ?? cand.linkedin_url ?? "",
        habilidades: Array.isArray(cand.habilidades) ? cand.habilidades.join(", ") : (typeof cand.habilidades === 'string' ? cand.habilidades : ""),
        areaAtuacao: cand.nivelDesejado ?? "",
      })
    }
    
    setDialogEditarOpen(true)
  }

  const salvarEdicao = async () => {
    if (!candidatoSelecionado) return
    
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast({
          title: 'Erro',
          description: 'Token não encontrado',
          variant: 'destructive',
        })
        return
      }

      const habilidades = (formEdicao.habilidades ?? "")
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean)

      const payload = {
        nome: formEdicao.nome,
        email: formEdicao.email,
        telefone: formEdicao.telefone || null,
        localizacao: formEdicao.localizacao || null,
        linkedin: formEdicao.linkedin || null,
        habilidades: habilidades,
        area_atuacao: formEdicao.areaAtuacao || null,
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/candidatos/${candidatoSelecionado.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      )

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao atualizar candidato`)
      }

      // Atualizar localmente após sucesso
      setCandidatos((prev) =>
        prev.map((c) =>
          c.id === candidatoSelecionado.id
            ? {
                ...c,
                nome: formEdicao.nome,
                email: formEdicao.email,
                telefone: formEdicao.telefone || undefined,
                localizacao: formEdicao.localizacao || undefined,
                linkedin: formEdicao.linkedin || undefined,
                habilidades,
                nivelDesejado: formEdicao.areaAtuacao,
              }
            : c,
        ) as Candidato[]
      )

      toast({
        title: 'Sucesso',
        description: 'Candidato atualizado com sucesso',
      })

      setDialogEditarOpen(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar candidato'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const removerCandidato = (id: string) => {
    setCandidatos((prev) => prev.filter((c) => c.id !== id))
  }

  const enviarConvite = async () => {
    if (!emailConvite.trim()) return
    
    try {
      
      const response = await api.post('/api/v1/admin/candidatos/convidar', {
        email: emailConvite.trim(),
        nome: nomeConvite.trim() || undefined
      })

      toast({
        title: 'Sucesso',
        description: `Convite enviado para ${emailConvite}`,
      })
      
      // Reset form
      setEmailConvite("")
      setNomeConvite("")
      setConviteDialogOpen(false)
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao enviar convite'

      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      })
    }
  }

  const limparFiltros = () => {
    setFiltros({
      busca: "",
      localizacao: "",
      habilidade: "",
    })
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Candidatos</h1>
            <p className="text-gray-600 mt-2">
              Lista completa de candidatos com filtros avançados e ações administrativas
            </p>
          </div>
          <Button onClick={() => setConviteDialogOpen(true)} className="bg-[#03565C] hover:bg-[#024a4f]">
            <Mail className="h-4 w-4 mr-2" />
            Convidar Candidato
          </Button>
        </div>

        {/* Filtros */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg text-gray-900">Filtros Avançados</CardTitle>
                <CardDescription>Busque e filtre candidatos por características específicas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="busca">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="busca"
                    placeholder="Nome, email ou palavras-chave..."
                    value={filtros.busca}
                    onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  placeholder="Ex: São Paulo - SP"
                  value={filtros.localizacao}
                  onChange={(e) => setFiltros({ ...filtros, localizacao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="habilidade">Habilidade</Label>
                <Input
                  id="habilidade"
                  placeholder="Ex: React, Solda, Elétrica..."
                  value={filtros.habilidade}
                  onChange={(e) => setFiltros({ ...filtros, habilidade: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Convite */}
        <Dialog open={conviteDialogOpen} onOpenChange={setConviteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Convidar Candidato</DialogTitle>
              <DialogDescription>
                Informe os dados do candidato. Ele receberá um email com link para completar o cadastro incluindo: dados
                básicos, experiências, currículo, autoavaliação e testes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome-convite">Nome do candidato (opcional)</Label>
                <Input
                  id="nome-convite"
                  type="text"
                  placeholder="João Silva"
                  value={nomeConvite}
                  onChange={(e) => setNomeConvite(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-convite">E-mail do candidato</Label>
                <Input
                  id="email-convite"
                  type="email"
                  placeholder="nome@exemplo.com"
                  value={emailConvite}
                  onChange={(e) => setEmailConvite(e.target.value)}
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                <p className="font-medium text-gray-700">O candidato terá acesso a:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Cadastro básico de dados pessoais</li>
                  <li>Experiências profissionais e currículo</li>
                  <li>Autoavaliação de habilidades</li>
                  <li>Testes de competência (após login)</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setConviteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" disabled={!emailConvite.trim()} onClick={enviarConvite} className="bg-[#03565C] hover:bg-[#024a4f]">
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Convite
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tabela de Candidatos */}
        <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Candidatos</CardTitle>
          <CardDescription>{candidatos.length} resultados encontrados</CardDescription>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Área de Atuação</TableHead>
                  <TableHead>Habilidades</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando candidatos...
                    </TableCell>
                  </TableRow>
                ) : candidatos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum candidato encontrado com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const itemsPerPage = 10
                    const startIndex = (currentPageCandidatos - 1) * itemsPerPage
                    const endIndex = startIndex + itemsPerPage
                    const candidatosPaginados = candidatos.slice(startIndex, endIndex)
                    
                    return candidatosPaginados.map((c) => (
                      <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(c.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{c.nome}</div>
                            {c.telefone && <div className="text-xs text-muted-foreground">{c.telefone}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">{c.email}</TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2 text-sm">
                          {c.localizacao && <MapPin className="h-4 w-4 text-muted-foreground" />}
                          {c.localizacao || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2 text-sm">
                          {c.nivelDesejado ? (
                            <>
                              <Award className="h-4 w-4 text-muted-foreground" />
                              {c.nivelDesejado}
                            </>
                          ) : (
                            "-"
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1 max-w-[360px]">
                          {(() => {
                            // Converter string de habilidades para array
                            let habilidadesArray: string[] = []
                            if (typeof c.habilidades === 'string' && c.habilidades && (c.habilidades as string).trim()) {
                              habilidadesArray = (c.habilidades as string).split(',').map((h: string) => h.trim()).filter(Boolean)
                            } else if (Array.isArray(c.habilidades)) {
                              habilidadesArray = (c.habilidades as any[]).map((h: any) => 
                                typeof h === 'string' ? h : (typeof h === 'object' && h ? ((h as any).name || (h as any).titulo || String(h)) : '')
                              ).filter(Boolean)
                            }
                            
                            return (
                              <>
                                {habilidadesArray.slice(0, 3).map((h, idx) => {
                                  const habilidadeStr = typeof h === 'string' ? h : (typeof h === 'object' && h ? ((h as any).name || (h as any).titulo || String(h)) : '')
                                  return (
                                    <Badge key={`${idx}-${habilidadeStr}`} variant="outline" className="text-xs">
                                      {habilidadeStr}
                                    </Badge>
                                  )
                                })}
                                {habilidadesArray.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{habilidadesArray.length - 3}
                                  </Badge>
                                )}
                                {habilidadesArray.length === 0 && (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => abrirVer(c)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => abrirEditar(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removerCandidato(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                    })()
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Paginação */}
          {candidatos.length > 10 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPageCandidatos - 1) * 10) + 1} a {Math.min(currentPageCandidatos * 10, candidatos.length)} de {candidatos.length} candidatos
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPageCandidatos === 1}
                  onClick={() => setCurrentPageCandidatos(prev => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(candidatos.length / 10) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPageCandidatos === page ? "default" : "outline"}
                      size="sm"
                      className="w-9 h-9 p-0"
                      onClick={() => setCurrentPageCandidatos(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPageCandidatos * 10 >= candidatos.length}
                  onClick={() => setCurrentPageCandidatos(prev => prev + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogVerOpen} onOpenChange={setDialogVerOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil do Candidato</DialogTitle>
            <DialogDescription>
              {candidatoSelecionado?.nome} - {candidatoSelecionado?.email}
            </DialogDescription>
          </DialogHeader>
          {candidatoSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informações Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {candidatoSelecionado.telefone && (
                      <p>
                        <span className="font-medium">Telefone:</span> {candidatoSelecionado.telefone}
                      </p>
                    )}
                    {candidatoSelecionado.localizacao && (
                      <p>
                        <span className="font-medium">Localização:</span> {candidatoSelecionado.localizacao}
                      </p>
                    )}
                    {candidatoSelecionado.nivelDesejado && (
                      <p>
                        <span className="font-medium">Área de Atuação:</span> {candidatoSelecionado.nivelDesejado}
                      </p>
                    )}
                    {candidatoSelecionado.linkedin && (
                      <p className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        <a
                          href={candidatoSelecionado.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          LinkedIn
                        </a>
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Cadastro completo:</span>
                      <Badge variant="outline">Sim</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Currículo enviado:</span>
                      <Badge variant="outline">{candidatoSelecionado.curriculo ? "Sim" : "Não"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Testes realizados:</span>
                      <Badge variant="outline">{candidatoSelecionado.testesRealizados?.length ?? 0}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {candidatoSelecionado.curriculo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumo Profissional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{candidatoSelecionado.curriculo}</p>
                  </CardContent>
                </Card>
              )}

              {candidatoSelecionado.habilidades && candidatoSelecionado.habilidades.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Habilidades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        // Converter string de habilidades para array
                        let habilidadesArray: string[] = []
                        if (typeof candidatoSelecionado.habilidades === 'string' && candidatoSelecionado.habilidades && (candidatoSelecionado.habilidades as string).trim()) {
                          habilidadesArray = (candidatoSelecionado.habilidades as string).split(',').map((h: string) => h.trim()).filter(Boolean)
                        } else if (Array.isArray(candidatoSelecionado.habilidades)) {
                          habilidadesArray = (candidatoSelecionado.habilidades as any[]).map((h: any) => 
                            typeof h === 'string' ? h : (typeof h === 'object' && h ? ((h as any).name || (h as any).titulo || String(h)) : '')
                          ).filter(Boolean)
                        }
                        
                        return habilidadesArray.map((habilidade, idx) => (
                          <Badge key={`skill-${idx}-${habilidade}`} variant="secondary">
                            {habilidade}
                          </Badge>
                        ))
                      })()}
                    </div>
                  </CardContent>
                </Card>
              )}

              {candidatoSelecionado.educacao && candidatoSelecionado.educacao.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Formação Acadêmica</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {candidatoSelecionado.educacao.map((edu) => (
                        <div key={edu.id} className="p-3 border rounded-lg">
                          <p className="font-medium">{edu.curso}</p>
                          <p className="text-sm text-muted-foreground">{edu.instituicao}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {edu.nivel}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {edu.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {candidatoSelecionado.experiencias && candidatoSelecionado.experiencias.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Experiência Profissional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {candidatoSelecionado.experiencias.map((exp) => {
                        const formatData = (data: string | Date | null | undefined) => {
                          if (!data) return "Data não informada"
                          const dataObj = typeof data === 'string' ? new Date(data) : data
                          if (isNaN(dataObj.getTime())) return "Data inválida"
                          return dataObj.toLocaleDateString("pt-BR")
                        }
                        return (
                          <div key={exp.id} className="p-3 border rounded-lg">
                            <p className="font-medium">{exp.cargo}</p>
                            <p className="text-sm text-muted-foreground">{exp.empresa}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatData(exp.dataInicio)} -{" "}
                              {exp.atual ? "Atual" : formatData(exp.dataFim)}
                            </p>
                            {exp.descricao && <p className="text-sm mt-2">{exp.descricao}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Candidato */}
      <Dialog open={dialogEditarOpen} onOpenChange={setDialogEditarOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Candidato</DialogTitle>
            <DialogDescription>Atualize informações básicas do candidato</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formEdicao.nome}
                  onChange={(e) => setFormEdicao((f) => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formEdicao.email}
                  onChange={(e) => setFormEdicao((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formEdicao.telefone}
                  onChange={(e) => setFormEdicao((f) => ({ ...f, telefone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  value={formEdicao.localizacao}
                  onChange={(e) => setFormEdicao((f) => ({ ...f, localizacao: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formEdicao.linkedin}
                  onChange={(e) => setFormEdicao((f) => ({ ...f, linkedin: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaAtuacao">Área de Atuação</Label>
                <Input
                  id="areaAtuacao"
                  placeholder="Ex: Desenvolvimento, Design, etc"
                  value={formEdicao.areaAtuacao}
                  onChange={(e) =>
                    setFormEdicao((f) => ({ ...f, areaAtuacao: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="habilidades">Habilidades</Label>
                <Input
                  id="habilidades"
                  placeholder="Separadas por vírgula"
                  value={formEdicao.habilidades}
                  onChange={(e) => setFormEdicao((f) => ({ ...f, habilidades: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setDialogEditarOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={salvarEdicao} className="bg-[#03565C] hover:bg-[#024a4f]">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
