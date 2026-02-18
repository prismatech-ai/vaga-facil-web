'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, Shield, Mail, User, Calendar, Loader2, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'

interface Admin {
  id: string
  nome: string
  email: string
  criadoEm: string
  status: 'ativo' | 'inativo'
}

export default function AdministradoresPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
  })

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      setLoadingPage(true)
      setError('')
      
      if (typeof window === 'undefined') {
        return
      }
      
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Token não encontrado. Faça login novamente.')
        setLoadingPage(false)
        return
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/list-admins`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })
     

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao carregar administradores`)
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Resposta inválida do servidor (não é JSON)')
      }

      const data = await response.json()
      const adminsArray = Array.isArray(data) ? data : (data.administradores || data.data || [])
      // Mapear os dados do backend para o formato esperado
      const adminsFormatados = adminsArray.map((admin: any) => ({
        id: admin.id.toString(),
        nome: admin.email.split('@')[0], // Usar parte do email como nome
        email: admin.email,
        criadoEm: admin.criado_em,
        status: admin.status || (admin.is_active ? 'ativo' : 'inativo')
      }))
      setAdmins(adminsFormatados)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar administradores'
      setError(errorMessage)
      setAdmins([])
    } finally {
      setLoadingPage(false)
    }
  }

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validatePassword = (senha: string) => {
    if (senha.length < 8) {
      return 'A senha deve ter no mínimo 8 caracteres'
    }
    if (!/[A-Z]/.test(senha)) {
      return 'A senha deve conter pelo menos uma letra maiúscula'
    }
    if (!/[a-z]/.test(senha)) {
      return 'A senha deve conter pelo menos uma letra minúscula'
    }
    if (!/[0-9]/.test(senha)) {
      return 'A senha deve conter pelo menos um número'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.nome || !formData.email || !formData.senha) {
      setError('Todos os campos são obrigatórios')
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Email inválido')
      return
    }

    const passwordError = validatePassword(formData.senha)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const body = {
        email: formData.email,
        password: formData.senha,
      }
     
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao cadastrar administrador')
      }

      const newAdmin: Admin = {
        id: data.id || Date.now().toString(),
        nome: formData.nome,
        email: formData.email,
        criadoEm: new Date().toISOString(),
        status: 'ativo',
      }

      setAdmins([...admins, newAdmin])
      setSuccess('Administrador cadastrado com sucesso!')
      setFormData({ nome: '', email: '', senha: '' })
      setTimeout(() => {
        setDialogOpen(false)
        setSuccess('')
        fetchAdmins()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar administrador')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!adminToDelete) return

    setLoading(true)
    setError('')

    try {
     
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/administradores/${adminToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Erro ao excluir administrador')
      }

      setAdmins(admins.filter((admin) => admin.id !== adminToDelete.id))
      setSuccess('Administrador excluído com sucesso!')
      setTimeout(() => {
        setSuccess('')
        fetchAdmins()
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir administrador')
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
      setAdminToDelete(null)
    }
  }

  const confirmDelete = (admin: Admin) => {
    setAdminToDelete(admin)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administradores</h1>
          <p className="text-muted-foreground">
            Gerencie os administradores do sistema
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Administrador
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Administrador</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar uma nova conta de administrador
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    {success}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    placeholder="Digite o nome completo"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="admin@exemplo.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) =>
                      setFormData({ ...formData, senha: e.target.value })
                    }
                    placeholder="Digite a senha"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Mínimo 8 caracteres, incluindo maiúsculas, minúsculas e números
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    setFormData({ nome: '', email: '', senha: '' })
                    setError('')
                    setSuccess('')
                  }}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Administradores
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-xs text-muted-foreground">
              Usuários com acesso administrativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {admins.filter((a) => a.status === 'ativo').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Administradores ativos no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <Shield className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {admins.filter((a) => a.status === 'inativo').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Administradores inativos
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Administradores</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os administradores cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data de Cadastro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingPage ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando administradores...
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum administrador cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        {admin.nome}
                      </div>
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {admin.criadoEm ? format(new Date(admin.criadoEm.replace('+00', 'Z').split('.')[0] + 'Z'), 'dd/MM/yyyy') : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          admin.status === 'ativo' ? 'default' : 'secondary'
                        }
                      >
                        {admin.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(admin)}
                        disabled={admins.length === 1}
                        title={
                          admins.length === 1
                            ? 'Não é possível excluir o último administrador'
                            : 'Excluir administrador'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o administrador{' '}
              <strong>{adminToDelete?.nome}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
