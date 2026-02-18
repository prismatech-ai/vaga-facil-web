"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Mail, Phone, MapPin, FileText } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import api, { getUserIdFromToken } from "@/lib/api"

interface CandidatoData {
  id: number
  full_name: string
  email: string
  cpf: string
  phone: string
  rg: string
  birth_date: string
  genero: string
  estado_civil: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  location: string
  is_pcd: boolean
  tipo_pcd: string
  necessidades_adaptacao: string
  bio: string
  linkedin_url: string
  portfolio_url: string
  resume_url: string
  area_atuacao: string
  percentual_completude: number
  onboarding_completo: boolean
}

export default function ConfiguracoesCandidatoPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    genero: "",
    dataNascimento: "",
    resumoProfissional: "",
    linkedin: "",
    github: "",
    site: "",
    curriculo: "",
    cpf: "",
    cidade: "",
    estado: "",
  })

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setIsLoading(true)
        const token = localStorage.getItem("token")
        const userId = getUserIdFromToken(token)
        
        // Usar a API client que automaticamente adiciona user_id
        const data: CandidatoData = await api.get("/api/v1/candidates/me")
      
        setFormData({
          nome: data.full_name || "",
          email: data.email || "",
          telefone: data.phone || "",
          genero: data.genero || "",
          dataNascimento: data.birth_date || "",
          resumoProfissional: data.bio || "",
          linkedin: data.linkedin_url || "",
          github: "",
          site: data.portfolio_url || "",
          curriculo: data.resume_url || "",
          cpf: data.cpf || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
        })
      } catch (err: any) {

        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    carregarDados()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      setError("")
      
      // Preparar dados para envio à API
      const dataToSave = {
        full_name: formData.nome,
        email: formData.email,
        phone: formData.telefone,
        genero: formData.genero,
        birth_date: formData.dataNascimento,
        bio: formData.resumoProfissional,
        linkedin_url: formData.linkedin,
        portfolio_url: formData.site,
        resume_url: formData.curriculo,
        cidade: formData.cidade,
        estado: formData.estado,
      }
      
      // Enviar dados usando o cliente API que adiciona user_id automaticamente
      await api.post("/api/v1/candidates/onboarding/dados-profissionais", dataToSave)
      
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    } catch (err: any) {

      setError(err.message || "Erro ao salvar. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações da Conta</h1>
          <p className="text-gray-600 mt-2">Carregando seus dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações da Conta</h1>
        <p className="text-gray-600 mt-2">Gerencie suas informações pessoais e profissionais</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            ❌ {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {isSaved && (
        <Alert className="border-green-200 bg-green-50">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✓ Configurações salvas com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {/* Personal Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Seus dados básicos de perfil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                value={formData.cpf}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genero">Gênero</Label>
              <Select value={formData.genero} onValueChange={(value) => handleSelectChange("genero", value)}>
                <SelectTrigger id="genero">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                  <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de Nascimento</Label>
              <Input
                id="dataNascimento"
                name="dataNascimento"
                type="date"
                value={formData.dataNascimento}
                onChange={handleChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Localização</CardTitle>
          <CardDescription>Sua localização de atuação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Informações Profissionais</CardTitle>
          <CardDescription>Dados sobre sua carreira e projetos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resumoProfissional">Resumo Profissional</Label>
            <Textarea
              id="resumoProfissional"
              name="resumoProfissional"
              value={formData.resumoProfissional}
              onChange={handleChange}
              rows={4}
              placeholder="Conte sobre sua experiência, habilidades e objetivos..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                name="linkedin"
                type="url"
                value={formData.linkedin}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/seu-perfil"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="github">GitHub</Label>
              <Input
                id="github"
                name="github"
                type="url"
                value={formData.github}
                onChange={handleChange}
                placeholder="https://github.com/seu-usuario"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site">Website Pessoal</Label>
              <Input
                id="site"
                name="site"
                type="url"
                value={formData.site}
                onChange={handleChange}
                placeholder="https://seu-site.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="curriculo" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Currículo
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="curriculo"
                  name="curriculo"
                  value={formData.curriculo}
                  disabled
                  className="bg-gray-50"
                />
                <Button variant="outline" size="sm">
                  Alterar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Info */}
      <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
        <AlertCircle className="h-4 w-4 text-[#03565C]" />
        <AlertDescription className="text-[#03565C] space-y-2">
          <p>
            <strong>Sua privacidade é importante:</strong> Seus dados pessoais (nome, email, telefone) permanecerão privados até que você aceite uma entrevista.
          </p>
          <p>
            Links profissionais (LinkedIn, GitHub, site) e informações de carreira podem ser vistos por empresas interessadas.
          </p>
        </AlertDescription>
      </Alert>

      {/* Save Button */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="gap-2 bg-[#03565C] hover:bg-[#024147] px-8"
        >
          {isLoading ? "Salvando..." : "Salvar Configurações"}
        </Button>
        <Button variant="outline">Cancelar</Button>
      </div>
    </div>
  )
}
