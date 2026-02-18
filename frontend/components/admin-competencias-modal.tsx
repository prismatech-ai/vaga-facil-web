"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Trash2, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { TODAS_AREAS } from "@/lib/areas-competencias"

interface Competencia {
  id: string
  nome: string
  area: string
  descricao?: string
  createdAt?: string
}

interface AdminCompetenciasModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminCompetenciasModal({ open, onOpenChange }: AdminCompetenciasModalProps) {
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [loading, setLoading] = useState(false)
  const [areaFiltro, setAreaFiltro] = useState<string>("")
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [criacaoCarregando, setCriacaoCarregando] = useState(false)

  const [novaCompetencia, setNovaCompetencia] = useState({
    area: "",
    nome: "",
    descricao: "",
  })

  const [editandoCompetencia, setEditandoCompetencia] = useState<Competencia | null>(null)

  // Carregar competências ao abrir o modal
  useEffect(() => {
    if (open) {
      carregarCompetencias()
    }
  }, [open])

  const carregarCompetencias = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      if (!token) {
        toast.error("Token não encontrado")
        return
      }

      const url = areaFiltro && areaFiltro !== "todos"
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/competencias-por-area/${areaFiltro}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/competencias`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        toast.error("Sessão expirada")
        return
      }

      if (!response.ok) {
        throw new Error("Erro ao carregar competências")
      }

      const data = await response.json()
      setCompetencias(Array.isArray(data) ? data : data.competencias || [])
    } catch (error) {
      toast.error("Erro ao carregar competências", {
        description: error instanceof Error ? error.message : "Ocorreu um erro",
      })
    } finally {
      setLoading(false)
    }
  }

  const criarCompetencia = async () => {
    if (!novaCompetencia.area || !novaCompetencia.nome) {
      toast.error("Preenchimento incompleto", {
        description: "Preencha a área e o nome da competência",
      })
      return
    }

    try {
      setCriacaoCarregando(true)
      const token = localStorage.getItem("token")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/competencias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: novaCompetencia.nome,
          area: novaCompetencia.area,
          descricao: novaCompetencia.descricao || "",
        }),
      })

      if (response.status === 401) {
        toast.error("Sessão expirada")
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Erro ao criar competência")
      }

      toast.success("Competência criada com sucesso!")
      setNovaCompetencia({ area: "", nome: "", descricao: "" })
      await carregarCompetencias()
    } catch (error) {
      toast.error("Erro ao criar competência", {
        description: error instanceof Error ? error.message : "Ocorreu um erro",
      })
    } finally {
      setCriacaoCarregando(false)
    }
  }

  const atualizarCompetencia = async (id: string) => {
    if (!editandoCompetencia || !editandoCompetencia.nome) {
      toast.error("Preenchimento incompleto")
      return
    }

    try {
      setCriacaoCarregando(true)
      const token = localStorage.getItem("token")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/competencias/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nome: editandoCompetencia.nome,
            area: editandoCompetencia.area,
            descricao: editandoCompetencia.descricao || "",
          }),
        }
      )

      if (response.status === 401) {
        toast.error("Sessão expirada")
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Erro ao atualizar competência")
      }

      toast.success("Competência atualizada com sucesso!")
      setEditandoId(null)
      setEditandoCompetencia(null)
      await carregarCompetencias()
    } catch (error) {
      toast.error("Erro ao atualizar competência", {
        description: error instanceof Error ? error.message : "Ocorreu um erro",
      })
    } finally {
      setCriacaoCarregando(false)
    }
  }

  const deletarCompetencia = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta competência?")) {
      return
    }

    try {
      const token = localStorage.getItem("token")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/competencias/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.status === 401) {
        toast.error("Sessão expirada")
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Erro ao deletar competência")
      }

      toast.success("Competência deletada com sucesso!")
      await carregarCompetencias()
    } catch (error) {
      toast.error("Erro ao deletar competência", {
        description: error instanceof Error ? error.message : "Ocorreu um erro",
      })
    }
  }

  const getAreaNome = (areaId: string) => {
    return TODAS_AREAS.find((a) => a.id === areaId)?.nome || areaId
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Competências</DialogTitle>
          <DialogDescription>
            Crie, edite e delete competências para usar nos testes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção de Criação */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold mb-4">Nova Competência</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nova-area">Área</Label>
                <Select
                  value={novaCompetencia.area}
                  onValueChange={(value) =>
                    setNovaCompetencia({ ...novaCompetencia, area: value })
                  }
                >
                  <SelectTrigger id="nova-area">
                    <SelectValue placeholder="Selecione uma área" />
                  </SelectTrigger>
                  <SelectContent>
                    {TODAS_AREAS.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nova-competencia">Nome</Label>
                <Input
                  id="nova-competencia"
                  value={novaCompetencia.nome}
                  onChange={(e) =>
                    setNovaCompetencia({ ...novaCompetencia, nome: e.target.value })
                  }
                  placeholder="Ex: Controladores Lógicos Programáveis"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nova-descricao">Descrição (Opcional)</Label>
                <Textarea
                  id="nova-descricao"
                  value={novaCompetencia.descricao}
                  onChange={(e) =>
                    setNovaCompetencia({ ...novaCompetencia, descricao: e.target.value })
                  }
                  placeholder="Descrição da competência..."
                  rows={2}
                />
              </div>
            </div>
            <Button
              onClick={criarCompetencia}
              disabled={criacaoCarregando || !novaCompetencia.area || !novaCompetencia.nome}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              {criacaoCarregando ? "Criando..." : "Criar Competência"}
            </Button>
          </div>

          {/* Seção de Filtro */}
          <div className="space-y-2">
            <Label htmlFor="filtro-area">Filtrar por Área</Label>
            <Select value={areaFiltro || "todos"} onValueChange={(value) => setAreaFiltro(value === "todos" ? "" : value)}>
              <SelectTrigger id="filtro-area">
                <SelectValue placeholder="Todas as áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as áreas</SelectItem>
                {TODAS_AREAS.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seção de Lista */}
          <div className="space-y-2">
            <h3 className="font-semibold">Competências</h3>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : competencias.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma competência encontrada. Crie uma acima!
                </AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competencias.map((comp) =>
                      editandoId === comp.id ? (
                        <TableRow key={comp.id}>
                          <TableCell>
                            <Input
                              value={editandoCompetencia?.nome || ""}
                              onChange={(e) =>
                                setEditandoCompetencia({
                                  ...editandoCompetencia!,
                                  nome: e.target.value,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={editandoCompetencia?.area || ""}
                              onValueChange={(value) =>
                                setEditandoCompetencia({
                                  ...editandoCompetencia!,
                                  area: value,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TODAS_AREAS.map((area) => (
                                  <SelectItem key={area.id} value={area.id}>
                                    {area.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Textarea
                              value={editandoCompetencia?.descricao || ""}
                              onChange={(e) =>
                                setEditandoCompetencia({
                                  ...editandoCompetencia!,
                                  descricao: e.target.value,
                                })
                              }
                              className="min-h-[40px]"
                              rows={2}
                            />
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              onClick={() => atualizarCompetencia(comp.id)}
                              disabled={criacaoCarregando}
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditandoId(null)
                                setEditandoCompetencia(null)
                              }}
                            >
                              Cancelar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={comp.id}>
                          <TableCell className="font-medium">{comp.nome}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getAreaNome(comp.area)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {comp.descricao || "-"}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditandoId(comp.id)
                                setEditandoCompetencia(comp)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deletarCompetencia(comp.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
