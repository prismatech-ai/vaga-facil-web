"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { LogoUpload } from "@/components/logo-upload"
import { api } from "@/lib/api"

interface EmpresaData {
  id?: number
  razaoSocial?: string
  cnpj?: string
  email?: string
  telefone?: string
  nomeFantasia?: string
  setor?: string
  cidade?: string
  estado?: string
  logo_url?: string
}

export default function MeuPerfilEmpresaPage() {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  
  const [empresaData, setEmpresaData] = useState<EmpresaData>({
    razaoSocial: "Carregando...",
    cnpj: "Carregando...",
  })

  const [formData, setFormData] = useState<EmpresaData>({})

  useEffect(() => {
    fetchEmpresaData()
  }, [])

  const fetchEmpresaData = async () => {
    try {
      setIsLoading(true)
      const response = await api.get("/api/v1/companies/me")
      const data = (response as any).data || response
      setEmpresaData(data)
      setFormData({
        email: data.email,
        telefone: data.telefone,
        cidade: data.cidade,
        estado: data.estado,
      })
      if (data.logo_url) {
        setLogoUrl(data.logo_url)
      }
    } catch (error) {

      // Dados padrão para desenvolvimento
      setEmpresaData({
        razaoSocial: "Empresa Exemplo LTDA",
        cnpj: "12.345.678/0001-90",
        nomeFantasia: "Empresa Exemplo",
        setor: "Manufatura",
        email: "contato@empresa.com",
        telefone: "(11) 98765-4321",
      })
      setFormData({
        email: "contato@empresa.com",
        telefone: "(11) 98765-4321",
        cidade: "São Paulo",
        estado: "SP",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const payload = {
        email: formData.email,
        telefone: formData.telefone,
        cidade: formData.cidade,
        estado: formData.estado,
      }
      await api.patch("/api/v1/companies/me", payload)
      setEmpresaData(prev => ({ ...prev, ...formData }))
      setIsEditing(false)
      setSuccessMessage("Informações atualizadas com sucesso!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {

      alert("Erro ao salvar as alterações")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData(empresaData)
    setIsEditing(false)
  }

  const handleLogoSuccess = async (url: string, fileName: string) => {
    try {
      setLogoUrl(url)
      // Atualizar logo_url no banco de dados
      await api.patch("/api/v1/companies/me", {
        logo_url: url,
      })
      setEmpresaData(prev => ({ ...prev, logo_url: url }))
      setSuccessMessage("Logo atualizada com sucesso!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {

      alert("Erro ao salvar a logo. Tente novamente.")
    }
  }

  const handleLogoError = (error: Error) => {

    alert(`Erro: ${error.message}`)
  }

  const handleDownloadLogo = async (url: string) => {
    try {
      // Extrair KEY do S3 da URL completa
      // De: https://vagafacil-bucket.s3.us-east-2.amazonaws.com/uploads/logos/...
      // Para: uploads/logos/...
      const urlObj = new URL(url)
      const key = urlObj.pathname.substring(1) // Remove a barra inicial
      
      // Fazer requisição ao backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const downloadUrl = `${apiUrl}/api/v1/uploads/download?key=${encodeURIComponent(key)}`
      
      // Fazer requisição ao backend
      const token = localStorage.getItem('token')
      const response = await fetch(downloadUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.detail || 'Erro ao baixar logo')
        } catch {
          throw new Error('Erro ao baixar logo')
        }
      }

      // Verificar Content-Type para saber se é JSON ou arquivo direto
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        // Backend retornou JSON com URL assinada
        const data = await response.json()
        const signedUrl = data.url || data.signed_url
        if (signedUrl) {
          // Abrir em nova aba para download
          window.open(signedUrl, '_blank')
        } else {
          throw new Error('URL assinada não encontrada')
        }
      } else {
        // Backend retornou o arquivo direto
        const blob = await response.blob()
        
        // Extrair nome do arquivo do header Content-Disposition ou usar padrão
        const contentDisposition = response.headers.get('content-disposition')
        let fileName = 'logo.png'
        
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
          if (fileNameMatch) {
            fileName = decodeURIComponent(fileNameMatch[1])
          } else {
            const simpleMatch = contentDisposition.match(/filename=([^;]+)/)
            if (simpleMatch) {
              fileName = simpleMatch[1].replace(/"/g, '')
            }
          }
        } else {
          // Se não houver Content-Disposition, extrair extensão da URL
          const fileExtension = key.substring(key.lastIndexOf('.'))
          fileName = `logo${fileExtension}`
        }
        
        // Criar link de download e simular clique
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao baixar logo'
      alert(message)
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
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Meu Perfil</h1>
        <p className="text-gray-600">Gerencie suas informações empresariais</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Informações da Empresa - Seção Read-Only */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>Dados cadastrados da sua organização (não podem ser alterados)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Razão Social</Label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-medium">
                {empresaData.razaoSocial}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">CNPJ</Label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-medium">
                {empresaData.cnpj}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Logo da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Logo da Empresa</CardTitle>
            <CardDescription>Faça upload da logo para sua página de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="w-full max-w-md">
              <LogoUpload
                onSuccess={handleLogoSuccess}
                onError={handleLogoError}
                currentLogoUrl={logoUrl || undefined}
                onDownload={handleDownloadLogo}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informações de Contato - Seção Editável */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Informações de Contato</CardTitle>
              <CardDescription>Seus dados de contato para comunicação</CardDescription>
            </div>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  disabled={!isEditing || isSaving}
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="(XX) XXXXX-XXXX"
                  disabled={!isEditing || isSaving}
                  value={formData.telefone || ""}
                  onChange={(e) => handleInputChange("telefone", e.target.value)}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  placeholder="SP"
                  disabled={!isEditing || isSaving}
                  value={formData.estado || ""}
                  onChange={(e) => handleInputChange("estado", e.target.value)}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="São Paulo"
                  disabled={!isEditing || isSaving}
                  value={formData.cidade || ""}
                  onChange={(e) => handleInputChange("cidade", e.target.value)}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <Spinner className="h-4 w-4" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
