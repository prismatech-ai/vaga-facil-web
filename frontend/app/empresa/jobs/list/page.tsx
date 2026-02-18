"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Trash2, Edit2, Eye, Lock, Unlock, Plus } from "lucide-react"

interface Job {
  id: number
  company_id: number
  title: string
  description: string
  requirements: string
  benefits: string
  location: string
  remote: boolean
  job_type: string
  salary_min: string
  salary_max: string
  salary_currency: string
  status: "rascunho" | "publicado" | "fechado"
  views_count: number
  applications_count: number
  created_at: string
  updated_at: string
  published_at?: string
  closed_at?: string
}

export default function JobsListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null)
  const [publishingJobId, setPublishingJobId] = useState<number | null>(null)
  const [closingJobId, setClosingJobId] = useState<number | null>(null)
  const [publishedCount, setPublishedCount] = useState(0)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    benefits: "",
    location: "",
    remote: false,
    job_type: "",
    salary_min: "",
    salary_max: "",
    salary_currency: "BRL",
  })

  // Carregar vagas ao montar
  useEffect(() => {
    loadJobs()
    loadPublishedCount()
  }, [])

  const loadJobs = async () => {
    setIsLoading(true)
    try {
      const response = await api.get("/api/v1/jobs/")
      const jobsData = Array.isArray((response as any).data) ? (response as any).data : response
      setJobs(Array.isArray(jobsData) ? jobsData : [])
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar vagas",
        variant: "destructive",
      })
      setJobs([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadPublishedCount = async () => {
    try {
      const response = await api.get("/api/v1/jobs/?status=aberta")
      const jobsData = Array.isArray((response as any).data) ? (response as any).data : response
      const count = Array.isArray(jobsData) ? jobsData.length : 0
      setPublishedCount(count)
    } catch (error: any) {
      setPublishedCount(0)
    }
  }

  const handleEdit = (job: Job) => {
    setEditingJob(job)
    setIsEditDialogOpen(true)
    setFormData({
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits,
      location: job.location,
      remote: job.remote,
      job_type: job.job_type,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_currency: job.salary_currency,
    })
  }

  const handleSaveEdit = async () => {
    if (!editingJob) return

    setIsLoadingAction(true)
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        benefits: formData.benefits,
        location: formData.location,
        remote: formData.remote,
        job_type: formData.job_type,
        salary_min: Number(formData.salary_min) || 0,
        salary_max: Number(formData.salary_max) || 0,
        salary_currency: formData.salary_currency,
        status: editingJob.status,
      }

      const response = await api.put(`/api/v1/jobs/${editingJob.id}`, payload)

      setJobs(jobs.map(j => j.id === editingJob.id ? { ...j, ...formData } : j))
      setEditingJob(null)
      setIsEditDialogOpen(false)

      toast({
        title: "Sucesso",
        description: "Vaga atualizada com sucesso!",
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao atualizar vaga",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAction(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingJobId) return

    setIsLoadingAction(true)
    try {
      const job = jobs.find(j => j.id === deletingJobId)
      await api.delete(`/api/v1/jobs/${deletingJobId}`)

      setJobs(jobs.filter(j => j.id !== deletingJobId))
      setDeletingJobId(null)

      toast({
        title: "Sucesso",
        description: "Vaga deletada com sucesso!",
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao deletar vaga",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAction(false)
    }
  }

  const handlePublish = async () => {
    if (!publishingJobId) return

    setIsLoadingAction(true)
    try {
      const job = jobs.find(j => j.id === publishingJobId)
      const response = await api.post(`/api/v1/jobs/${publishingJobId}/publish`)

      setJobs(jobs.map(j => j.id === publishingJobId ? { ...j, status: "publicado" } : j))
      setPublishingJobId(null)

      toast({
        title: "Sucesso",
        description: "Vaga publicada com sucesso!",
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao publicar vaga",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAction(false)
    }
  }

  const handleClose = async () => {
    if (!closingJobId) return

    setIsLoadingAction(true)
    try {
      const job = jobs.find(j => j.id === closingJobId)
      const response = await api.post(`/api/v1/jobs/${closingJobId}/close`)

      setJobs(jobs.map(j => j.id === closingJobId ? { ...j, status: "fechado" } : j))
      setClosingJobId(null)

      toast({
        title: "Sucesso",
        description: "Vaga fechada com sucesso!",
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Erro ao fechar vaga",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAction(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "publicado":
        return "bg-green-100 text-green-800"
      case "rascunho":
        return "bg-yellow-100 text-yellow-800"
      case "fechado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "publicado":
        return "Publicado"
      case "rascunho":
        return "Rascunho"
      case "fechado":
        return "Fechado"
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Minhas Vagas</h1>
          <p className="text-gray-600">Gerencie todas as suas oportunidades de emprego</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => router.push("/dashboard/empresa")} 
            variant="outline"
          >
            Voltar ao Dashboard
          </Button>
          <Button onClick={() => router.push("/empresa/jobs/create")} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Vaga
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Vagas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Publicadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {publishedCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {jobs.filter(j => j.status === "rascunho").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">Nenhuma vaga criada ainda</p>
              <Button onClick={() => router.push("/empresa/jobs/create")}>
                Criar Primeira Vaga
              </Button>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{job.title}</CardTitle>
                      <Badge className={getStatusColor(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                    <CardDescription>{job.location} {job.remote && "• Remoto"}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-gray-700 mb-4 line-clamp-2">{job.description}</p>
                <div className="flex flex-wrap gap-2 text-xs mb-4">
                  <span className="bg-gray-100 px-2 py-1 rounded">{job.job_type}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    R$ {job.salary_min} - R$ {job.salary_max}
                  </span>
                </div>
              </CardContent>
              <CardHeader className="pb-3 pt-0 border-t">
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/empresa/jobs/${job.id}`)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </Button>

                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(job)}
                        disabled={job.status === "fechado"}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Editar Vaga: {editingJob?.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2">
                          <Label>Título</Label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Descrição</Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Requisitos</Label>
                          <Textarea
                            value={formData.requirements}
                            onChange={(e) =>
                              setFormData({ ...formData, requirements: e.target.value })
                            }
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Benefícios</Label>
                          <Textarea
                            value={formData.benefits}
                            onChange={(e) =>
                              setFormData({ ...formData, benefits: e.target.value })
                            }
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Localização</Label>
                            <Input
                              value={formData.location}
                              onChange={(e) =>
                                setFormData({ ...formData, location: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo de Vaga</Label>
                            <Input
                              value={formData.job_type}
                              onChange={(e) =>
                                setFormData({ ...formData, job_type: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Salário Mínimo</Label>
                            <Input
                              type="number"
                              value={formData.salary_min}
                              onChange={(e) =>
                                setFormData({ ...formData, salary_min: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Salário Máximo</Label>
                            <Input
                              type="number"
                              value={formData.salary_max}
                              onChange={(e) =>
                                setFormData({ ...formData, salary_max: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Moeda</Label>
                            <Select
                              value={formData.salary_currency}
                              onValueChange={(value) =>
                                setFormData({ ...formData, salary_currency: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BRL">BRL</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="remote"
                              checked={formData.remote}
                              onChange={(e) =>
                                setFormData({ ...formData, remote: e.target.checked })
                              }
                            />
                            <Label htmlFor="remote" className="mb-0">
                              Trabalho Remoto
                            </Label>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={isLoadingAction}>
                          {isLoadingAction ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {job.status === "rascunho" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPublishingJobId(job.id)}
                      disabled={isLoadingAction}
                      className="gap-2 text-green-600 hover:text-green-700"
                    >
                      <Unlock className="h-4 w-4" />
                      Publicar
                    </Button>
                  )}

                  {job.status === "publicado" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setClosingJobId(job.id)}
                      disabled={isLoadingAction}
                      className="gap-2 text-orange-600 hover:text-orange-700"
                    >
                      <Lock className="h-4 w-4" />
                      Fechar
                    </Button>
                  )}

                  <AlertDialog open={deletingJobId === job.id} onOpenChange={(open) => !open && setDeletingJobId(null)}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Vaga</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja deletar a vaga "{job.title}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex gap-2 justify-end">
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isLoadingAction}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isLoadingAction ? "Deletando..." : "Deletar"}
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingJobId(job.id)}
                    disabled={isLoadingAction}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Deletar
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Confirm Dialogs */}
      <AlertDialog open={publishingJobId !== null} onOpenChange={(open) => !open && setPublishingJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar Vaga</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja publicar esta vaga? Ela ficará visível para os candidatos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={isLoadingAction}>
              {isLoadingAction ? "Publicando..." : "Publicar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={closingJobId !== null} onOpenChange={(open) => !open && setClosingJobId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Vaga</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja fechar esta vaga? Ela não receberá mais candidaturas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isLoadingAction} className="bg-orange-600 hover:bg-orange-700">
              {isLoadingAction ? "Fechando..." : "Fechar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

