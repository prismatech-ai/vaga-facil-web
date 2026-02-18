"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SelecionaArea } from "@/components/seleciona-area"
import { AutoavaliacaoCompetencias } from "@/components/autoavaliacao-competencias"
import { ResumeUpload } from "@/components/resume-upload"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { TODAS_AREAS, getAreaById } from "@/lib/areas-competencias"
import { AlertCircle, Mail, Phone, MapPin, User } from "lucide-react"

interface CandidatoData {
  id?: number
  cpf?: string
  full_name?: string
  email?: string
  phone?: string
  rg?: string
  birth_date?: string
  genero?: string
  estado_civil?: string
  location?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  is_pcd?: boolean
  tipo_pcd?: string
  necessidades_adaptacao?: string
  resume_url?: string
  linkedin_url?: string
  portfolio_url?: string
  bio?: string
  area_atuacao?: string
  experiencia_profissional?: string
  formacao_escolaridade?: string
  formacoes_academicas?: Array<{
    instituicao: string
    curso: string
    nivel: string
    status: string
    ano_conclusao: number
  }>
  trabalho_temporario?: {
    temInteresse?: boolean
    paradas_industriais?: boolean
    manutencao_equipamentos?: boolean
    projetos_temp?: boolean
    outletsserviços?: boolean
    disponibilidadeGeo?: string
    restricoes_saude?: string
    experiencia_temp?: string
  }
  onboarding_completo?: boolean
  percentual_completude?: number
  created_at?: string
  updated_at?: string
}

interface TrabalhoTemporarioData {
  temInteresse: boolean
  paradas_industriais: boolean
  manutencao_equipamentos: boolean
  projetos_temp: boolean
  outletsserviços: boolean
  disponibilidadeGeo: string
  restricoes_saude: string
  experiencia_temp: string
}

export default function MeuPerfilPage() {
  const [activeTab, setActiveTab] = useState("dados-profissionais")
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [competenciasAvaliadas, setCompetenciasAvaliadas] = useState<any[]>([])
  const [candidatoData, setCandidatoData] = useState<CandidatoData | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoadingCandidato, setIsLoadingCandidato] = useState(false)
  const [isEditingDadosProfissionais, setIsEditingDadosProfissionais] = useState(false)
  const [isSavingDadosProfissionais, setIsSavingDadosProfissionais] = useState(false)
  
  // Estado global para editar todo o perfil
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [formDataDadosProfissionais, setFormDataDadosProfissionais] = useState<CandidatoData>({
    full_name: "",
    email: "",
    phone: "",
    cpf: "",
    birth_date: "",
    genero: "",
    rg: "",
    estado_civil: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    is_pcd: false,
    tipo_pcd: "",
    necessidades_adaptacao: "",
    resume_url: "",
    linkedin_url: "",
    portfolio_url: "",
    bio: ""
  })
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [experienciasProfissionais, setExperienciasProfissionais] = useState<Array<{
    cargo: string
    empresa: string
    periodo: string
    descricao: string
  }>>([])
  const [formacoesAcademicas, setFormacoesAcademicas] = useState<Array<{
    instituicao: string
    curso: string
    nivel: string
    status: string
    ano_conclusao: number
  }>>([])
  const [trabalhoTemporario, setTrabalhoTemporario] = useState<TrabalhoTemporarioData>({
    temInteresse: false,
    paradas_industriais: false,
    manutencao_equipamentos: false,
    projetos_temp: false,
    outletsserviços: false,
    disponibilidadeGeo: "",
    restricoes_saude: "",
    experiencia_temp: "",
  })

  // Estados para Área de Atuação (aba "area")
  const { toast } = useToast()
  const [areaAtuacao, setAreaAtuacao] = useState<{
    area_atuacao: string
    bio: string
    linkedin_url: string
    portfolio_url: string
  } | null>(null)
  const [isEditingArea, setIsEditingArea] = useState(false)
  const [isSavingArea, setIsSavingArea] = useState(false)
  const [isLoadingArea, setIsLoadingArea] = useState(false)
  const [formAreaAtuacao, setFormAreaAtuacao] = useState<{
    area_atuacao: string
    bio: string
    linkedin_url: string
    portfolio_url: string
  }>({
    area_atuacao: "",
    bio: "",
    linkedin_url: "",
    portfolio_url: "",
  })
  
  // Estado para Trabalho Temporário
  const [isEditingTrabalhoTemp, setIsEditingTrabalhoTemp] = useState(false)

  // Estados para Experiências (aba "experiencia")
  const [experienciasAPI, setExperienciasAPI] = useState<Array<{
    id: number
    empresa: string
    cargo: string
    data_inicio: string
    data_fim: string | null
    anos_experiencia: number
    descricao?: string
    ativo?: boolean
  }>>([])
  const [isEditingExperiencias, setIsEditingExperiencias] = useState(false)
  const [isAddingExperiencia, setIsAddingExperiencia] = useState(false)
  const [novaExperiencia, setNovaExperiencia] = useState<{
    empresa: string
    cargo: string
    data_inicio: string
    data_fim: string | null
    descricao: string
  }>({
    empresa: "",
    cargo: "",
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: null,
    descricao: ""
  })
  const [isSavingExperiencias, setIsSavingExperiencias] = useState(false)
  const [isLoadingExperiencias, setIsLoadingExperiencias] = useState(false)
  const [isAddingFormacao, setIsAddingFormacao] = useState(false)
  const [novaFormacao, setNovaFormacao] = useState<{
    instituicao: string
    curso: string
    nivel: string
    status: string
    ano_conclusao: number
  }>({
    instituicao: "",
    curso: "",
    nivel: "",
    status: "",
    ano_conclusao: new Date().getFullYear()
  })
  const [isLoadingFormacoes, setIsLoadingFormacoes] = useState(false)

  // Verificar autenticação
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useAuth()

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login")
    }
  }, [user, isAuthLoading, router])

  const fetchCandidatoData = async () => {
    try {
      setIsLoadingCandidato(true)
      const response = await api.get<CandidatoData>("/api/v1/candidates/me")
    
      setCandidatoData(response)
      
      if (response.id) {
        setUserId(response.id)
      }
      
      // Preencher formulário com dados da API
      const formData = {
        id: response.id,
        cpf: response.cpf || "",
        full_name: response.full_name || "",
        email: response.email || "",
        phone: response.phone || "",
        rg: response.rg || "",
        birth_date: response.birth_date || "",
        genero: response.genero || "",
        estado_civil: response.estado_civil || "",
        location: response.location || "",
        cep: response.cep || "",
        logradouro: response.logradouro || "",
        numero: response.numero || "",
        complemento: response.complemento || "",
        bairro: response.bairro || "",
        cidade: response.cidade || "",
        estado: response.estado || "",
        is_pcd: response.is_pcd || false,
        tipo_pcd: response.tipo_pcd || "",
        necessidades_adaptacao: response.necessidades_adaptacao || "",
        resume_url: response.resume_url || "",
        linkedin_url: response.linkedin_url || "",
        portfolio_url: response.portfolio_url || "",
        bio: response.bio || "",
        experiencia_profissional: response.experiencia_profissional || "",
        formacao_escolaridade: response.formacao_escolaridade || "",
      }
      
      setFormDataDadosProfissionais(formData)
      
      if (response.resume_url) {
        setResumeUrl(response.resume_url)
      }
      
      // Carregar experiências profissionais
      if (response.experiencia_profissional) {
        const exps = typeof response.experiencia_profissional === 'string' ? 
          JSON.parse(response.experiencia_profissional) : 
          response.experiencia_profissional
        setExperienciasAPI(Array.isArray(exps) ? exps : [])
      }
      
      // Carregar formações acadêmicas
    
      if (response.formacoes_academicas) {
        try {
          const formacoes = typeof response.formacoes_academicas === 'string' ? 
            JSON.parse(response.formacoes_academicas) : 
            response.formacoes_academicas
         
          setFormacoesAcademicas(Array.isArray(formacoes) ? formacoes : [])
      
        } catch (e) {
          setFormacoesAcademicas([])
        }
      } else {
       
        setFormacoesAcademicas([])
      }
      
      // Carregar área de atuação - IMPORTANTE: Preencher o formulário também
      const areaData = {
        area_atuacao: response.area_atuacao || "", // Campo que vem da API
        bio: response.bio || "",
        linkedin_url: response.linkedin_url || "",
        portfolio_url: response.portfolio_url || "",
      }
      setAreaAtuacao(areaData)
      setFormAreaAtuacao(areaData) // Isso é importante para o formulário mostrar os dados
      
      // Carregar dados de Trabalho Temporário
      setTrabalhoTemporario(prev => ({
        ...prev,
        temInteresse: response.trabalho_temporario?.temInteresse || false,
        paradas_industriais: response.trabalho_temporario?.paradas_industriais || false,
        manutencao_equipamentos: response.trabalho_temporario?.manutencao_equipamentos || false,
        projetos_temp: response.trabalho_temporario?.projetos_temp || false,
        outletsserviços: response.trabalho_temporario?.outletsserviços || false,
        disponibilidadeGeo: response.trabalho_temporario?.disponibilidadeGeo || "",
        restricoes_saude: response.trabalho_temporario?.restricoes_saude || "",
        experiencia_temp: response.trabalho_temporario?.experiencia_temp || ""
      }))
    } catch (error) {
    } finally {
      setIsLoadingCandidato(false)
    }
  }

  const handleEditDadosProfissionais = () => {
    if (candidatoData) {
      setFormDataDadosProfissionais(candidatoData)
    }
    setIsEditingDadosProfissionais(true)
  }

  const handleCancelDadosProfissionais = () => {
    if (candidatoData) {
      setFormDataDadosProfissionais(candidatoData)
    }
    setIsEditingDadosProfissionais(false)
  }

  const handleSaveDadosProfissionais = async () => {
    try {
      setIsSavingDadosProfissionais(true)
      
      // Salvar apenas os campos válidos via PUT /api/v1/candidates/me
      const payload = {
        full_name: formDataDadosProfissionais.full_name,
        phone: formDataDadosProfissionais.phone,
        rg: formDataDadosProfissionais.rg,
        birth_date: formDataDadosProfissionais.birth_date,
        location: formDataDadosProfissionais.location,
        cep: formDataDadosProfissionais.cep,
        logradouro: formDataDadosProfissionais.logradouro,
        numero: formDataDadosProfissionais.numero,
        complemento: formDataDadosProfissionais.complemento,
        bairro: formDataDadosProfissionais.bairro,
        cidade: formDataDadosProfissionais.cidade,
        estado: formDataDadosProfissionais.estado,
        resume_url: formDataDadosProfissionais.resume_url,
        linkedin_url: formDataDadosProfissionais.linkedin_url,
        portfolio_url: formDataDadosProfissionais.portfolio_url,
        bio: formDataDadosProfissionais.bio,
        // Incluir genero e estado_civil apenas se tiverem valores
        ...(formDataDadosProfissionais.genero && { genero: formDataDadosProfissionais.genero }),
        ...(formDataDadosProfissionais.estado_civil && { estado_civil: formDataDadosProfissionais.estado_civil })
      }
      
    
      await api.put("/api/v1/candidates/me", payload)
      setCandidatoData(prev => prev ? { ...prev, ...payload } : null)
      
      setIsEditingDadosProfissionais(false)
      
      toast({
        title: "✅ Sucesso",
        description: "Dados pessoais salvos com sucesso!",
        variant: "default"
      })
    } catch (error) {
    } finally {
      setIsSavingDadosProfissionais(false)
    }
  }
  const handleInputChangeDadosProfissionais = (field: string, value: any) => {
    setFormDataDadosProfissionais(prev => ({ ...prev, [field]: value }))
  }

  const handleResumeSuccess = async (url: string, fileName: string) => {
    try {
      setResumeUrl(url)
      // Atualizar resume_url no banco de dados
      if (formDataDadosProfissionais) {
        const resumePayload = {
          ...formDataDadosProfissionais,
          resume_url: url,
        }
     
        await api.put("/api/v1/candidates/me", resumePayload)
        setCandidatoData(prev => prev ? { ...prev, resume_url: url } : null)
        setFormDataDadosProfissionais(prev => ({ ...prev, resume_url: url }))
      }
    } catch (error) {
      alert("Erro ao salvar o currículo. Tente novamente.")
    }
  }

  const handleResumeError = (error: Error) => {
    alert(`Erro: ${error.message}`)
  }

  const handleDownloadResume = async () => {
    try {
      if (!resumeUrl) return
      
      // ✅ Extrair KEY do S3 da URL completa
      // De: https://vagafacil-bucket.s3.us-east-2.amazonaws.com/uploads/resumes/79/arquivo.pdf
      // Para: uploads/resumes/79/arquivo.pdf
      const urlObj = new URL(resumeUrl)
      const key = urlObj.pathname.substring(1) // Remove a barra inicial
      
      // ✅ Fazer requisição ao BACKEND, não ao frontend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const downloadUrl = `${apiUrl}/api/v1/uploads/download?key=${encodeURIComponent(key)}`
      
      // ✅ Fazer requisição ao backend e depois abrir em nova aba
      const token = localStorage.getItem('token')
      const response = await fetch(downloadUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.detail || 'Erro ao baixar currículo')
        } catch {
          throw new Error('Erro ao baixar currículo')
        }
      }

      // Verificar Content-Type para saber se é JSON ou arquivo direto
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        // Se backend retornar JSON com URL assinada
        const data = await response.json()
        if (data.url) {
          window.open(data.url, '_blank')
        }
      } else {
        // Se backend retornar arquivo direto (PDF, etc), fazer download
        const blob = await response.blob()
        
        // Extrair nome do arquivo do header Content-Disposition ou usar padrão
        const contentDisposition = response.headers.get('content-disposition')
        let fileName = 'curriculo.pdf'
        
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
      toast({
        title: "❌ Erro",
        description: error instanceof Error ? error.message : "Erro ao baixar o currículo. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  // ========== Handlers para Área de Atuação ==========
  const fetchAreaAtuacao = async () => {
    try {
      setIsLoadingArea(true)
      const url = "/api/v1/candidates/onboarding/me"
      const response = await api.get(url) as any
      const data = {
        area_atuacao: response.area_atuacao || "",
        bio: response.bio || "",
        linkedin_url: response.linkedin_url || "",
        portfolio_url: response.portfolio_url || "",
      }
      setAreaAtuacao(data)
      setFormAreaAtuacao(data)
    } catch (error) {
    } finally {
      setIsLoadingArea(false)
    }
  }

  const handleSaveAreaAtuacao = async () => {
    try {
      setIsSavingArea(true)
      const payload = {
        bio: formAreaAtuacao.bio,
        linkedin_url: formAreaAtuacao.linkedin_url,
        portfolio_url: formAreaAtuacao.portfolio_url,
        area_atuacao: formAreaAtuacao.area_atuacao
      }
      
    
      
      await api.put("/api/v1/candidates/me", payload)
      setCandidatoData(prev => prev ? { ...prev, ...payload } : null)
      setAreaAtuacao(formAreaAtuacao)
      setIsEditingArea(false)
      
      toast({
        title: "✅ Sucesso",
        description: "Área de atuação atualizada com sucesso!",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao salvar. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsSavingArea(false)
    }
  }

  const handleSaveTrabalhoTemporario = async () => {
    try {
      setIsSavingProfile(true)
      
      if (!userId) {
        toast({
          title: "❌ Erro",
          description: "User ID não encontrado. Tente recarregar a página.",
          variant: "destructive"
        })
        return
      }
      
      // Mapear os tipos de trabalho selecionados
      const tiposTrabalho: string[] = []
      if (trabalhoTemporario.paradas_industriais) tiposTrabalho.push("Paradas Industriais")
      if (trabalhoTemporario.manutencao_equipamentos) tiposTrabalho.push("Manutenção de Equipamentos")
      if (trabalhoTemporario.projetos_temp) tiposTrabalho.push("Projetos Temporários")
      if (trabalhoTemporario.outletsserviços) tiposTrabalho.push("Outlets e Serviços Pontuais")
      
      const payload = {
        tem_interesse: trabalhoTemporario.temInteresse,
        tipos_trabalho: tiposTrabalho,
        disponibilidade_geografica: trabalhoTemporario.disponibilidadeGeo,
        restricao_saude: trabalhoTemporario.restricoes_saude,
        experiencia_anterior: trabalhoTemporario.experiencia_temp
      }
      
   
      const response = await api.post(
        "/api/v1/candidates/onboarding/trabalho-temporario",
        payload
      )
      
    
      
      setIsEditingTrabalhoTemp(false)
      
      toast({
        title: "✅ Sucesso",
        description: "Informações de trabalho temporário salvas com sucesso!",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao salvar trabalho temporário. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSaveFormacoes = async () => {
    try {
      setIsSavingProfile(true)
      
      // Salvar Formações Acadêmicas se houver
      if (formacoesAcademicas.length > 0 && userId) {
        const formacoesPayload = {
          formacoes_academicas: formacoesAcademicas.map(f => ({
            instituicao: f.instituicao,
            curso: f.curso,
            nivel: f.nivel,
            status: f.status,
            ano_conclusao: f.ano_conclusao ? parseInt(String(f.ano_conclusao)) : 0
          }))
        }
     
        
        const response = await api.post(
          `/api/v1/candidates/onboarding/formacoes-academicas?user_id=${userId}`,
          formacoesPayload
        )
     
        setIsAddingFormacao(false)
        
        toast({
          title: "✅ Sucesso",
          description: "Formações acadêmicas salvas com sucesso!",
          variant: "default"
        })
      } else {
   
        toast({
          title: "⚠️ Atenção",
          description: "Adicione pelo menos uma formação para salvar.",
          variant: "default"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao salvar formações. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  // ========== Handlers para Experiências ==========
  const fetchExperiencias = async () => {
    // Experiências são carregadas no fetchCandidatoData
    // Esta função não é mais necessária, mas mantida para compatibilidade
  }

  const handleAddExperiencia = async (experiencia: {
    empresa: string
    cargo: string
    data_inicio: string
    data_fim: string
    descricao: string
  }) => {
    try {
      setIsSavingExperiencias(true)
      const novaExperiencia = {
        id: Date.now(),
        empresa: experiencia.empresa,
        cargo: experiencia.cargo,
        data_inicio: experiencia.data_inicio,
        data_fim: experiencia.data_fim,
        descricao: experiencia.descricao,
        anos_experiencia: 0,
        ativo: true
      }
      const novasExperiencias = [...experienciasAPI, novaExperiencia]
      const payload = {
        ...candidatoData,
        experiencia_profissional: JSON.stringify(novasExperiencias)
      }
     
      await api.put("/api/v1/candidates/me", payload)
      setExperienciasAPI(novasExperiencias)
      setCandidatoData(payload as any)
      alert("Experiência adicionada com sucesso!")
    } catch (error) {
      alert("Erro ao adicionar. Tente novamente.")
    } finally {
      setIsSavingExperiencias(false)
    }
  }

  const handleDeleteExperiencia = async (id: number) => {
    try {
      setIsSavingExperiencias(true)
      const experienciasAtualizadas = experienciasAPI.filter((_, idx) => idx !== id)
      const payload = {
        ...candidatoData,
        experiencia_profissional: JSON.stringify(experienciasAtualizadas)
      }
      await api.put("/api/v1/candidates/me", payload)
      setExperienciasAPI(experienciasAtualizadas)
      setCandidatoData(payload as any)
      alert("Experiência removida com sucesso!")
    } catch (error) {
      alert("Erro ao remover. Tente novamente.")
    } finally {
      setIsSavingExperiencias(false)
    }
  }

  useEffect(() => {
    // Carregar dados na primeira vez
    if (!candidatoData) {
      fetchCandidatoData()
    }
  }, [])

  // ========== Handler Global para Salvar Perfil ==========
  const formatarPeriodo = (dataInicio: string, dataFim: string | null): string => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    
    const formatarData = (data: string) => {
      try {
        // Se for formato ISO (YYYY-MM-DD)
        if (data && data.includes("-")) {
          const [ano, mes] = data.split("-")
          const mesNum = parseInt(mes) - 1
          if (mesNum >= 0 && mesNum < 12) {
            return `${meses[mesNum]}/${ano}`
          }
        }
        // Se for data inválida, retorna como está
        return data || ""
      } catch {
        return data || ""
      }
    }
    
    const dataInicioFormatada = formatarData(dataInicio)
    const dataFimFormatada = dataFim ? formatarData(dataFim) : "Atual"
    
    return `${dataInicioFormatada} - ${dataFimFormatada}`
  }

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true)
      
      // 1. Salvar Dados Pessoais via PUT /api/v1/candidates/me
      const candidatoPayload = {
        full_name: formDataDadosProfissionais.full_name,
        phone: formDataDadosProfissionais.phone,
        rg: formDataDadosProfissionais.rg,
        birth_date: formDataDadosProfissionais.birth_date,
        location: formDataDadosProfissionais.location,
        cep: formDataDadosProfissionais.cep,
        logradouro: formDataDadosProfissionais.logradouro,
        numero: formDataDadosProfissionais.numero,
        complemento: formDataDadosProfissionais.complemento,
        bairro: formDataDadosProfissionais.bairro,
        cidade: formDataDadosProfissionais.cidade,
        estado: formDataDadosProfissionais.estado,
        resume_url: formDataDadosProfissionais.resume_url,
        linkedin_url: formDataDadosProfissionais.linkedin_url,
        portfolio_url: formDataDadosProfissionais.portfolio_url,
        bio: formDataDadosProfissionais.bio,
        ...(formDataDadosProfissionais.genero && { genero: formDataDadosProfissionais.genero }),
        ...(formDataDadosProfissionais.estado_civil && { estado_civil: formDataDadosProfissionais.estado_civil })
      }
      
      await api.put("/api/v1/candidates/me", candidatoPayload)
      setCandidatoData(prev => prev ? { ...prev, ...candidatoPayload } : null)
      
      // 2. Salvar Experiências Profissionais se houver
      if (experienciasAPI.length > 0 && userId) {
        const experienciasPayload = {
          experiencias_profissionais: experienciasAPI.map(exp => ({
            cargo: exp.cargo,
            empresa: exp.empresa,
            periodo: formatarPeriodo(exp.data_inicio, exp.data_fim),
            descricao: exp.descricao || ""
          }))
        }
        
        await api.post(
          "/api/v1/candidates/onboarding/experiencias-profissionais",
          experienciasPayload
        )
      }
      
      // 3. Salvar Formações Acadêmicas se houver
      if (formacoesAcademicas.length > 0 && userId) {
        const formacoesPayload = {
          formacoes_academicas: formacoesAcademicas.map(f => ({
            instituicao: f.instituicao,
            curso: f.curso,
            nivel: f.nivel,
            status: f.status,
            ano_conclusao: f.ano_conclusao ? parseInt(String(f.ano_conclusao)) : 0
          }))
        }
        
  
        
        const response = await api.post(
          "/api/v1/candidates/onboarding/formacoes-academicas",
          formacoesPayload
        )
      } else {
       
      }
      
      // Desativar modo edição global
      setIsEditingProfile(false)
      setIsEditingArea(false)
      setIsEditingDadosProfissionais(false)
      setIsEditingExperiencias(false)
      
      toast({
        title: "✅ Sucesso",
        description: "Perfil atualizado com sucesso!",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Erro ao salvar perfil. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCancelProfile = () => {
    setIsEditingProfile(false)
    setIsEditingArea(false)
    setIsEditingDadosProfissionais(false)
  }

  // Verifica se está em modo edição (global ou local)
  const isInEditMode = isEditingProfile || isEditingArea || isEditingDadosProfissionais

  // Quando ativa edição global, ativa também as abas
  useEffect(() => {
    if (isEditingProfile) {
      setIsEditingArea(true)
      setIsEditingDadosProfissionais(true)
    }
  }, [isEditingProfile])

  // Mostrar loading enquanto verifica autenticação
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  // Redirecionar se não autenticado é feito no useEffect
  if (!user) {
    return null
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header com Botões de Ação */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-2">Personalize seu perfil com suas informações profissionais</p>
        </div>
        <div className="flex gap-3">
          {isEditingProfile && (
            <>
              <Button
                variant="outline"
                onClick={handleCancelProfile}
                disabled={isSavingProfile}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSavingProfile ? "Salvando..." : "💾 Salvar Informações"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alert for incomplete profile */}
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Complete seu perfil para aumentar suas chances de ser encontrado pelas empresas. Continue preenchendo as informações abaixo.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dados-profissionais">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="area">Área de Atuação</TabsTrigger>
          <TabsTrigger value="experiencia">Experiência</TabsTrigger>
          <TabsTrigger value="formacoes">Formações</TabsTrigger>
          <TabsTrigger value="trabalho-temp">Temporário</TabsTrigger>
        </TabsList>

        {/* Área de Atuação Tab */}
        <TabsContent value="area" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Área de Atuação</CardTitle>
                  <CardDescription>Gerencie sua área de atuação, bio e redes profissionais</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoadingArea ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
              ) : (
                <div className="space-y-6">
                  {/* Área de Atuação */}
                  <div className="space-y-2">
                    <Label>Área de Atuação</Label>
                    {isEditingArea ? (
                      <Select
                        value={formAreaAtuacao.area_atuacao}
                        onValueChange={(value) =>
                          setFormAreaAtuacao({
                            ...formAreaAtuacao,
                            area_atuacao: value,
                          })
                        }
                      >
                        <SelectTrigger>
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
                    ) : (
                      <Input
                        placeholder="Ex: Desenvolvimento Backend"
                        value={getAreaById(formAreaAtuacao.area_atuacao)?.nome || formAreaAtuacao.area_atuacao}
                        disabled
                        className="bg-gray-50"
                      />
                    )}
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label>Bio / Descrição Profissional</Label>
                    <Textarea
                      placeholder="Descreva seu perfil profissional, experiências e habilidades"
                      value={formAreaAtuacao.bio}
                      disabled={!isEditingArea}
                      onChange={(e) =>
                        setFormAreaAtuacao({
                          ...formAreaAtuacao,
                          bio: e.target.value,
                        })
                      }
                      className={!isEditingArea ? "bg-gray-50" : ""}
                      rows={4}
                    />
                  </div>

                  {/* LinkedIn */}
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input
                      placeholder="https://linkedin.com/in/seu-perfil"
                      value={formAreaAtuacao.linkedin_url}
                      disabled={!isEditingArea}
                      onChange={(e) =>
                        setFormAreaAtuacao({
                          ...formAreaAtuacao,
                          linkedin_url: e.target.value,
                        })
                      }
                      className={!isEditingArea ? "bg-gray-50" : ""}
                    />
                  </div>

                  {/* Portfolio */}
                  <div className="space-y-2">
                    <Label>Portfolio / Website</Label>
                    <Input
                      placeholder="https://seu-portfolio.com"
                      value={formAreaAtuacao.portfolio_url}
                      disabled={!isEditingArea}
                      onChange={(e) =>
                        setFormAreaAtuacao({
                          ...formAreaAtuacao,
                          portfolio_url: e.target.value,
                        })
                      }
                      className={!isEditingArea ? "bg-gray-50" : ""}
                    />
                  </div>

                  {/* Botões de Ação */}
                  {!isEditingArea && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditingArea(true)
                        if (!areaAtuacao) fetchAreaAtuacao()
                      }}
                      className="w-full mt-6"
                    >
                      Atualizar Informações
                    </Button>
                  )}
                  
                  {isEditingArea && (
                    <div className="flex gap-3 justify-end pt-6 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingArea(false)
                          if (areaAtuacao) setFormAreaAtuacao(areaAtuacao)
                        }}
                        disabled={isSavingArea}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveAreaAtuacao}
                        disabled={isSavingArea}
                        className="bg-[#03565C] hover:bg-[#024147]"
                      >
                        {isSavingArea ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experiência Tab */}
        <TabsContent value="experiencia" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Experiências Profissionais</CardTitle>
                  <CardDescription>Visualize e gerencie suas experiências profissionais</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoadingExperiencias ? (
                <div className="text-center py-8 text-gray-500">Carregando experiências...</div>
              ) : experienciasAPI.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Nenhuma experiência cadastrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {experienciasAPI.map((exp, idx) => (
                    <div
                      key={`exp-${exp.id || idx}`}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-900">{exp.cargo}</h4>
                          <p className="text-sm text-gray-600 mt-1">{exp.empresa}</p>
                          <div className="text-sm text-gray-500 mt-2">
                            <p>
                              {new Date(exp.data_inicio).toLocaleDateString("pt-BR")} -{" "}
                              {exp.data_fim
                                ? new Date(exp.data_fim).toLocaleDateString("pt-BR")
                                : "Presente"}
                            </p>
                            <p className="mt-1">
                              <strong>{exp.anos_experiencia} ano(s)</strong> de experiência
                            </p>
                          </div>
                          {exp.descricao && (
                            <p className="text-sm text-gray-600 mt-3 italic">
                              {exp.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {isAddingExperiencia && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">Adicionar Nova Experiência</h3>
                  <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Cargo *</Label>
                        <Input
                          placeholder="Ex: Desenvolvedor Senior"
                          value={novaExperiencia.cargo}
                          onChange={(e) => setNovaExperiencia({ ...novaExperiencia, cargo: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Empresa *</Label>
                        <Input
                          placeholder="Ex: TechCompany Ltd"
                          value={novaExperiencia.empresa}
                          onChange={(e) => setNovaExperiencia({ ...novaExperiencia, empresa: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Início *</Label>
                        <Input
                          type="date"
                          value={novaExperiencia.data_inicio}
                          onChange={(e) => setNovaExperiencia({ ...novaExperiencia, data_inicio: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data de Término (opcional)</Label>
                        <Input
                          type="date"
                          value={novaExperiencia.data_fim || ""}
                          onChange={(e) => setNovaExperiencia({ ...novaExperiencia, data_fim: e.target.value || null })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição (opcional)</Label>
                      <Textarea
                        placeholder="Descreva suas responsabilidades e conquistas"
                        value={novaExperiencia.descricao}
                        onChange={(e) => setNovaExperiencia({ ...novaExperiencia, descricao: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingExperiencia(false)
                        setNovaExperiencia({
                          empresa: "",
                          cargo: "",
                          data_inicio: new Date().toISOString().split('T')[0],
                          data_fim: null,
                          descricao: ""
                        })
                      }}
                      disabled={isSavingExperiencias}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (novaExperiencia.cargo && novaExperiencia.empresa && novaExperiencia.data_inicio) {
                          setExperienciasAPI([...experienciasAPI, {
                            id: Date.now(),
                            ...novaExperiencia,
                            anos_experiencia: 0
                          }])
                          handleSaveProfile()
                          setIsAddingExperiencia(false)
                          setNovaExperiencia({
                            empresa: "",
                            cargo: "",
                            data_inicio: new Date().toISOString().split('T')[0],
                            data_fim: null,
                            descricao: ""
                          })
                        } else {
                          alert("⚠️ Preencha os campos obrigatórios (Cargo, Empresa e Data de Início)")
                        }
                      }}
                      disabled={isSavingExperiencias}
                      className="bg-[#03565C] hover:bg-[#024147]"
                    >
                      {isSavingExperiencias ? "Salvando..." : "Salvar Experiência"}
                    </Button>
                  </div>
                </div>
              )}
              
              {!isAddingExperiencia && (
                <Button
                  variant="outline"
                  onClick={() => setIsAddingExperiencia(true)}
                  className="w-full mt-4"
                >
                  + Adicionar Experiência
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trabalho Temporário Tab */}
        <TabsContent value="trabalho-temp" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro de Trabalho Temporário</CardTitle>
              <CardDescription>Indique seu interesse em oportunidades de paradas industriais e trabalhos temporários</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pergunta Principal */}
              <div className="space-y-3 p-4 border border-amber-200 bg-amber-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="temInteresse"
                    checked={trabalhoTemporario.temInteresse}
                    onCheckedChange={(checked) =>
                      setTrabalhoTemporario({ ...trabalhoTemporario, temInteresse: checked as boolean })
                    }
                  />
                  <Label htmlFor="temInteresse" className="font-semibold text-gray-900 cursor-pointer">
                    Tenho interesse em oportunidades de paradas industriais ou trabalhos temporários
                  </Label>
                </div>
              </div>

              {/* Formulário adicional se marcou sim */}
              {trabalhoTemporario.temInteresse && (
                <div className="space-y-6 p-4 border border-[#24BFB0] bg-[#25D9B8]/10 rounded-lg">
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Ótimo! Responda as perguntas abaixo para que possamos identificar as melhores oportunidades para você.
                    </AlertDescription>
                  </Alert>

                  {/* Tipos de Trabalho Temporário */}
                  <div className="space-y-3">
                    <Label className="font-semibold">Quais tipos de trabalho temporário você se interessa?</Label>
                    <div className="space-y-2 pl-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="paradas"
                          checked={trabalhoTemporario.paradas_industriais}
                          disabled={!isEditingTrabalhoTemp}
                          onCheckedChange={(checked) =>
                            setTrabalhoTemporario({ ...trabalhoTemporario, paradas_industriais: checked as boolean })
                          }
                        />
                        <Label htmlFor="paradas" className="cursor-pointer">
                          Paradas Industriais
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="manutencao"
                          checked={trabalhoTemporario.manutencao_equipamentos}
                          disabled={!isEditingTrabalhoTemp}
                          onCheckedChange={(checked) =>
                            setTrabalhoTemporario({ ...trabalhoTemporario, manutencao_equipamentos: checked as boolean })
                          }
                        />
                        <Label htmlFor="manutencao" className="cursor-pointer">
                          Manutenção de Equipamentos
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="projetos"
                          checked={trabalhoTemporario.projetos_temp}
                          disabled={!isEditingTrabalhoTemp}
                          onCheckedChange={(checked) =>
                            setTrabalhoTemporario({ ...trabalhoTemporario, projetos_temp: checked as boolean })
                          }
                        />
                        <Label htmlFor="projetos" className="cursor-pointer">
                          Projetos Temporários
                        </Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="outlets"
                          checked={trabalhoTemporario.outletsserviços}
                          disabled={!isEditingTrabalhoTemp}
                          onCheckedChange={(checked) =>
                            setTrabalhoTemporario({ ...trabalhoTemporario, outletsserviços: checked as boolean })
                          }
                        />
                        <Label htmlFor="outlets" className="cursor-pointer">
                          Outlets e Serviços Pontuais
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Disponibilidade Geográfica */}
                  <div className="space-y-2">
                    <Label htmlFor="geo" className="font-semibold">
                      Qual sua disponibilidade geográfica? (Estados/Regiões)
                    </Label>
                    <Textarea
                      id="geo"
                      placeholder="Ex: São Paulo (capital), Minas Gerais, Rio de Janeiro"
                      value={trabalhoTemporario.disponibilidadeGeo}
                      disabled={!isEditingTrabalhoTemp}
                      onChange={(e) =>
                        setTrabalhoTemporario({ ...trabalhoTemporario, disponibilidadeGeo: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  {/* Restrições de Saúde */}
                  <div className="space-y-2">
                    <Label htmlFor="restricoes" className="font-semibold">
                      Você possui alguma restrição de saúde ou física para trabalhos que envolvem esforço físico intenso?
                    </Label>
                    <Textarea
                      id="restricoes"
                      placeholder="Descreva qualquer restrição (opcional)"
                      value={trabalhoTemporario.restricoes_saude}
                      disabled={!isEditingTrabalhoTemp}
                      onChange={(e) =>
                        setTrabalhoTemporario({ ...trabalhoTemporario, restricoes_saude: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  {/* Experiência */}
                  <div className="space-y-2">
                    <Label htmlFor="experiencia" className="font-semibold">
                      Fale sobre sua experiência anterior com trabalho temporário/projetos (se houver)
                    </Label>
                    <Textarea
                      id="experiencia"
                      placeholder="Descreva suas experiências (opcional)"
                      value={trabalhoTemporario.experiencia_temp}
                      disabled={!isEditingTrabalhoTemp}
                      onChange={(e) =>
                        setTrabalhoTemporario({ ...trabalhoTemporario, experiencia_temp: e.target.value })
                      }
                      rows={3}
                    />
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4">
                    {!isEditingTrabalhoTemp && (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingTrabalhoTemp(true)}
                        className="w-full"
                      >
                        Atualizar Informações
                      </Button>
                    )}
                    {isEditingTrabalhoTemp && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsEditingTrabalhoTemp(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => {
                            handleSaveTrabalhoTemporario()
                          }}
                          className="bg-[#03565C] hover:bg-[#024147]"
                        >
                          Salvar Informações
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formações Acadêmicas Tab */}
        <TabsContent value="formacoes" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Formações Acadêmicas</CardTitle>
                  <CardDescription>Gerencie suas formações e cursos acadêmicos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {formacoesAcademicas.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Nenhuma formação acadêmica cadastrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formacoesAcademicas.map((formacao, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-900">{formacao.curso}</h4>
                          <p className="text-sm text-gray-600 mt-1">{formacao.instituicao}</p>
                          <div className="text-sm text-gray-500 mt-2">
                            <p><strong>Nível:</strong> {formacao.nivel}</p>
                            <p><strong>Status:</strong> {formacao.status}</p>
                            {formacao.ano_conclusao && <p><strong>Conclusão:</strong> {formacao.ano_conclusao}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isAddingFormacao && (
                <div className="mt-6 pt-6 border-t space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900">Adicionar Nova Formação</h3>
                  <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Instituição *</Label>
                        <Input
                          placeholder="Ex: Universidade de São Paulo"
                          value={novaFormacao.instituicao}
                          onChange={(e) => setNovaFormacao({ ...novaFormacao, instituicao: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Curso *</Label>
                        <Input
                          placeholder="Ex: Engenharia de Software"
                          value={novaFormacao.curso}
                          onChange={(e) => setNovaFormacao({ ...novaFormacao, curso: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nível *</Label>
                        <Input
                          placeholder="Ex: Graduação, Pós-graduação"
                          value={novaFormacao.nivel}
                          onChange={(e) => setNovaFormacao({ ...novaFormacao, nivel: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status *</Label>
                        <Input
                          placeholder="Ex: Concluído, Em andamento"
                          value={novaFormacao.status}
                          onChange={(e) => setNovaFormacao({ ...novaFormacao, status: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ano de Conclusão</Label>
                        <Input
                          type="number"
                          placeholder="Ex: 2023"
                          value={novaFormacao.ano_conclusao}
                          onChange={(e) => setNovaFormacao({ ...novaFormacao, ano_conclusao: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingFormacao(false)
                        setNovaFormacao({
                          instituicao: "",
                          curso: "",
                          nivel: "",
                          status: "",
                          ano_conclusao: new Date().getFullYear()
                        })
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (novaFormacao.instituicao && novaFormacao.curso && novaFormacao.nivel && novaFormacao.status) {
                          setFormacoesAcademicas([...formacoesAcademicas, novaFormacao])
                          handleSaveFormacoes()
                          setNovaFormacao({
                            instituicao: "",
                            curso: "",
                            nivel: "",
                            status: "",
                            ano_conclusao: new Date().getFullYear()
                          })
                        } else {
                          alert("⚠️ Preencha os campos obrigatórios (Instituição, Curso, Nível e Status)")
                        }
                      }}
                      className="bg-[#03565C] hover:bg-[#024147]"
                    >
                      Salvar Formação
                    </Button>
                  </div>
                </div>
              )}
              
              {!isAddingFormacao && (
                <Button
                  variant="outline"
                  onClick={() => setIsAddingFormacao(true)}
                  className="w-full mt-4"
                >
                  + Adicionar Formação
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações Tab */}
        <TabsContent value="dados-profissionais" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
              <CardDescription>Informações pessoais e de endereço</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <>
                {/* Seção de Upload de Currículo */}
                  <div className="space-y-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-lg text-gray-900">Seu Currículo</h3>
                    <p className="text-sm text-gray-600">
                      Faça upload de seu currículo em PDF. As empresas poderão visualizá-lo ao revisar seu perfil.
                    </p>
                    {!resumeUrl && (
                      <div className="mt-4">
                        <ResumeUpload
                          onSuccess={handleResumeSuccess}
                          onError={handleResumeError}
                        />
                      </div>
                    )}
                    {resumeUrl && (
                      <div className="mt-4 p-3 bg-white border border-blue-200 rounded">
                        <p className="text-sm text-gray-600 mb-2">Currículo atual:</p>
                        <Button
                          onClick={handleDownloadResume}
                          variant="outline"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        >
                          📥 Visualizar PDF (Download)
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Informações Pessoais */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg text-gray-900">Informações Pessoais</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Nome */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nome Completo
                        </Label>
                        <Input
                          value={formDataDadosProfissionais.full_name || ""}
                          disabled={!isEditingDadosProfissionais}
                          onChange={(e) => handleInputChangeDadosProfissionais("full_name", e.target.value)}
                          className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </Label>
                        <Input
                          value={formDataDadosProfissionais.email || ""}
                          disabled
                          readOnly
                          className="bg-gray-50 cursor-not-allowed"
                        />
                      </div>

                      {/* Telefone */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Telefone
                        </Label>
                        <Input
                          value={formDataDadosProfissionais.phone || ""}
                          disabled={!isEditingDadosProfissionais}
                          onChange={(e) => handleInputChangeDadosProfissionais("phone", e.target.value)}
                          className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                        />
                      </div>

                      {/* CPF */}
                      <div className="space-y-2">
                        <Label>CPF</Label>
                        <Input
                          value={formDataDadosProfissionais.cpf || ""}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>

                      {/* Data de Nascimento */}
                      <div className="space-y-2">
                        <Label>Data de Nascimento</Label>
                        <Input
                          type="date"
                          value={formDataDadosProfissionais.birth_date || ""}
                          disabled={!isEditingDadosProfissionais}
                          onChange={(e) => handleInputChangeDadosProfissionais("birth_date", e.target.value)}
                          className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                        />
                      </div>

                      {/* Gênero */}
                      <div className="space-y-2">
                        <Label>Gênero</Label>
                        <Select
                          value={formDataDadosProfissionais.genero || ""}
                          onValueChange={(value) => handleInputChangeDadosProfissionais("genero", value)}
                          disabled={!isEditingDadosProfissionais}
                        >
                          <SelectTrigger className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}>
                            <SelectValue placeholder="Selecione uma opção" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                            <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* RG */}
                      <div className="space-y-2">
                        <Label>RG</Label>
                        <Input
                          value={formDataDadosProfissionais.rg || ""}
                          disabled={!isEditingDadosProfissionais}
                          onChange={(e) => handleInputChangeDadosProfissionais("rg", e.target.value)}
                          className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                        />
                      </div>

                      {/* Estado Civil */}
                      <div className="space-y-2">
                        <Label>Estado Civil</Label>
                        <Select
                          value={formDataDadosProfissionais.estado_civil || ""}
                          onValueChange={(value) => handleInputChangeDadosProfissionais("estado_civil", value)}
                          disabled={!isEditingDadosProfissionais}
                        >
                          <SelectTrigger className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}>
                            <SelectValue placeholder="Selecione uma opção" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="casado">Casado(a)</SelectItem>
                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                            <SelectItem value="uniao_estavel">União Estável</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Endereço */}
                  {(formDataDadosProfissionais.cep || formDataDadosProfissionais.logradouro || formDataDadosProfissionais.cidade) && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-lg text-gray-900">Endereço</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>CEP</Label>
                          <Input
                            value={formDataDadosProfissionais.cep || ""}
                            disabled={!isEditingDadosProfissionais}
                            onChange={(e) => handleInputChangeDadosProfissionais("cep", e.target.value)}
                            className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Logradouro</Label>
                          <Input
                            value={formDataDadosProfissionais.logradouro || ""}
                            disabled={!isEditingDadosProfissionais}
                            onChange={(e) => handleInputChangeDadosProfissionais("logradouro", e.target.value)}
                            className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Número</Label>
                          <Input
                            value={formDataDadosProfissionais.numero || ""}
                            disabled={!isEditingDadosProfissionais}
                            onChange={(e) => handleInputChangeDadosProfissionais("numero", e.target.value)}
                            className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Complemento</Label>
                          <Input
                            value={formDataDadosProfissionais.complemento || ""}
                            disabled={!isEditingDadosProfissionais}
                            onChange={(e) => handleInputChangeDadosProfissionais("complemento", e.target.value)}
                            className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Bairro</Label>
                          <Input
                            value={formDataDadosProfissionais.bairro || ""}
                            disabled={!isEditingDadosProfissionais}
                            onChange={(e) => handleInputChangeDadosProfissionais("bairro", e.target.value)}
                            className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Cidade
                          </Label>
                          <Input
                            value={formDataDadosProfissionais.cidade || ""}
                            disabled={!isEditingDadosProfissionais}
                            onChange={(e) => handleInputChangeDadosProfissionais("cidade", e.target.value)}
                            className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Estado</Label>
                          <Input
                            value={formDataDadosProfissionais.estado || ""}
                            disabled={!isEditingDadosProfissionais}
                            onChange={(e) => handleInputChangeDadosProfissionais("estado", e.target.value)}
                            className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Necessidades Especiais */}
                  {formDataDadosProfissionais.is_pcd && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold text-lg text-gray-900">Necessidades Especiais</h3>
                      
                      <div className="space-y-2">
                        <Label>Tipo de Deficiência</Label>
                        <Input
                          value={formDataDadosProfissionais.tipo_pcd || ""}
                          disabled={!isEditingDadosProfissionais}
                          onChange={(e) => handleInputChangeDadosProfissionais("tipo_pcd", e.target.value)}
                          className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adaptações Necessárias</Label>
                        <Textarea
                          value={formDataDadosProfissionais.necessidades_adaptacao || ""}
                          disabled={!isEditingDadosProfissionais}
                          onChange={(e) => handleInputChangeDadosProfissionais("necessidades_adaptacao", e.target.value)}
                          className={!isEditingDadosProfissionais ? "bg-gray-50" : ""}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  {!isEditingDadosProfissionais && (
                    <Button
                      variant="outline"
                      onClick={handleEditDadosProfissionais}
                      className="w-full mt-6"
                    >
                      Atualizar Informações
                    </Button>
                  )}
                  
                  {isEditingDadosProfissionais && (
                    <div className="flex gap-3 justify-end pt-6 border-t">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelDadosProfissionais}
                        disabled={isSavingDadosProfissionais}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSaveDadosProfissionais}
                        disabled={isSavingDadosProfissionais}
                        className="bg-[#03565C] hover:bg-[#024147]"
                      >
                        {isSavingDadosProfissionais ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  )}
              </>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
