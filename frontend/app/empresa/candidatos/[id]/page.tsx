'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertCircle, ArrowLeft, Loader2, Send } from 'lucide-react'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/lib/auth-context'

interface CandidatoDetalhe {
  id?: number  // ID numérico do banco de dados
  id_anonimo: string
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
  bio?: string
  area_atuacao?: string
  experiencia_profissional?: string
  formacao_escolaridade?: string
  consentimento?: boolean
  dados_pessoais_liberados?: boolean
  data_consentimento?: string
  formacoes_academicas?: Array<{
    instituicao: string
    curso: string
    nivel: string
    status: string
    ano_conclusao: number
  }>
  habilidades?: string[]
  nivel_experiencia?: string
  testes?: Array<{
    nome?: string
    resultado?: string
    data?: string
    nota?: number
  }>
  autoavaliacao?: Array<{
    competencia?: string
    nota?: number
    descricao?: string
  }>
  linkedin?: string
  portfolio?: string
}

interface Vaga {
  id: string
  titulo: string
  status: string
  area_atuacao?: string
}

export default function CandidatoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const id = params.id as string

  const [candidato, setCandidato] = useState<CandidatoDetalhe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para convidar candidato
  const [dialogOpen, setDialogOpen] = useState(false)
  const [vagas, setVagas] = useState<Vaga[]>([])
  const [vagasSelecionadas, setVagasSelecionadas] = useState<Set<string>>(new Set())
  const [isConvidando, setIsConvidando] = useState(false)

  useEffect(() => {
    if (!id) return
    
    // Verifica se usuário está autenticado
    if (!user) {
    
      toast({
        title: 'Acesso Negado',
        description: 'Você precisa estar autenticado para acessar essa página.',
        variant: 'destructive',
      })
      router.push('/login')
      return
    }

    const carregarDetalhes = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await api.get(`/api/v1/companies/candidatos-anonimos/detalhes/${id}`)

        let data = response
        
        // Tenta extrair dados de diferentes estruturas
       
        // Logged full object to inspect all fields
        for (const [key, value] of Object.entries(data as any)) {
          const valueType = typeof value
          const isNumeric = typeof value === 'number'
        }

        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setCandidato(data as CandidatoDetalhe)
        } else {
          setError('Candidato não encontrado')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar detalhes do candidato'

        // Trata erro 401 - sessão expirada ou credenciais inválidas
        if (errorMessage.includes('401') || errorMessage.includes('Não autenticado')) {
      
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          
          toast({
            title: 'Sessão Expirada',
            description: 'Suas credenciais expiraram. Por favor, faça login novamente.',
            variant: 'destructive',
          })
          
          // Aguarda um pouco antes de redirecionar para permitir que o toast apareça
          setTimeout(() => {
            router.push('/login')
          }, 1500)
          return
        }
        
        setError(errorMessage)
        toast({
          title: 'Erro',
          description: errorMessage,
          variant: 'destructive',
        })

      } finally {
        setIsLoading(false)
      }
    }

    carregarDetalhes()
  }, [id, toast, user, router])

  // Carrega vagas abertas quando o dialog abre
  const carregarVagas = async () => {
    try {

      const response = await api.get('/api/v1/jobs')

      let vagasList = []
      
      // Tenta extrair array de diferentes estruturas
      if (Array.isArray(response)) {
        vagasList = response
      } else if ((response as any).data && Array.isArray((response as any).data)) {
     
        vagasList = (response as any).data
      } else if ((response as any).vagas && Array.isArray((response as any).vagas)) {
     
        vagasList = (response as any).vagas
      } else if ((response as any).jobs && Array.isArray((response as any).jobs)) {
   
        vagasList = (response as any).jobs
      } else {
        // Tenta extrair primeiro array encontrado
        const values = Object.values(response as any)
        const firstArray = values.find(v => Array.isArray(v))
        if (firstArray) {
          vagasList = firstArray as any[]
        }
      }

      // Log detalhado e mapeamento de cada vaga
      const vagasMapeadas = vagasList.map((v: any) => {
        const titulo = v.title || v.titulo || v.name || v.position || v.job_title || 'Vaga sem título'

        return {
          ...v,
          titulo: titulo
        }
      })
      
      // Filtra apenas vagas abertas
      const vagasAbertas = vagasMapeadas.filter((v: any) => {
        const statusLower = String(v.status).toLowerCase()
        return statusLower === 'aberta' || statusLower === 'open' || statusLower === 'ativa'
      })

      // Se não encontrou vagas abertas, mostra todas (para debug)
      if (vagasAbertas.length === 0 && vagasMapeadas.length > 0) {
     
        setVagas(vagasMapeadas)
      } else {
        setVagas(vagasAbertas)
      }
      
      if (vagasList.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhuma vaga encontrada',
          variant: 'default',
        })
      } else if (vagasAbertas.length === 0) {
        toast({
          title: 'Aviso',
          description: `${vagasList.length} vaga(s) encontrada(s), mas nenhuma com status "aberta"`,
          variant: 'default',
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao carregar vagas'

      // Trata erro 401 ao carregar vagas
      if (errorMsg.includes('401') || errorMsg.includes('Não autenticado')) {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        toast({
          title: 'Sessão Expirada',
          description: 'Sua sessão expirou. Por favor, faça login novamente.',
          variant: 'destructive',
        })
        setTimeout(() => {
          router.push('/login')
        }, 1500)
        return
      }
      
      toast({
        title: 'Erro',
        description: errorMsg,
        variant: 'destructive',
      })
    }
  }

  // Convida candidato para vaga(s)
  const convidarCandidato = async () => {
    if (vagasSelecionadas.size === 0) {
      toast({
        title: 'Aviso',
        description: 'Selecione pelo menos uma vaga',
        variant: 'default',
      })
      return
    }

    try {
      setIsConvidando(true)
      
      // Usar id_anonimo diretamente - não precisa mais buscar ID numérico
      const idAnonimo = candidato?.id_anonimo
      
      if (!idAnonimo) {
        toast({
          title: 'Erro',
          description: 'ID do candidato não encontrado',
          variant: 'destructive',
        })
        return
      }

      // Faz requisição para cada vaga selecionada com novo endpoint que envia email
      const promises = Array.from(vagasSelecionadas).map(jobId => {
        // Usar novo endpoint que envia email via Resend
        return api.post(
          `/api/v1/empresa/vagas/${jobId}/candidatos/${idAnonimo}/interesse`,
          {}
        )
      })

      await Promise.all(promises)
      
      toast({
        title: '✅ Sucesso',
        description: `Candidato convidado para ${vagasSelecionadas.size} vaga(s)! Email(s) enviado(s) com sucesso.`,
      })
      
      setDialogOpen(false)
      setVagasSelecionadas(new Set())
      setVagas([])
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error) || 'Erro ao convidar candidato'

      // Trata erro 401 ao convidar
      if (errorMsg.includes('401') || errorMsg.includes('Não autenticado')) {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        toast({
          title: 'Sessão Expirada',
          description: 'Sua sessão expirou. Por favor, faça login novamente.',
          variant: 'destructive',
        })
        setTimeout(() => {
          router.push('/login')
        }, 1500)
        return
      }
      
      toast({
        title: '❌ Erro',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsConvidando(false)
    }
  }

  // Alterna seleção de vaga
  const toggleVaga = (vagaId: string) => {
    const novasVagas = new Set(vagasSelecionadas)
    if (novasVagas.has(vagaId)) {
      novasVagas.delete(vagaId)
    } else {
      novasVagas.add(vagaId)
    }
    setVagasSelecionadas(novasVagas)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Carregando detalhes do candidato...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !candidato) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Candidato não encontrado'}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const renderExperienciaProfissional = (experienciaStr: string | undefined) => {
    if (!experienciaStr) return null
    
    try {
      // Tenta parsear como JSON
      let experiencias: any[] = []
      
      try {
        const parsed = JSON.parse(experienciaStr)
        if (Array.isArray(parsed)) {
          experiencias = parsed
        } else if (parsed && typeof parsed === 'object') {
          // Se for um objeto único, converte para array
          experiencias = [parsed]
        }
      } catch {
        // Se não conseguir parsear, trata como texto simples
        return (
          <p className="text-base text-gray-900 mt-2 whitespace-pre-wrap">{experienciaStr}</p>
        )
      }
      
      if (!experiencias.length) {
        return <p className="text-gray-500">Nenhuma experiência profissional registrada</p>
      }
      
      return (
        <div className="space-y-4">
          {experiencias.map((exp: any, index: number) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {exp.cargo || exp.position || exp.titulo || 'Cargo não especificado'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {exp.empresa || exp.company || 'Empresa não especificada'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                {(exp.periodo || exp.period) && (
                  <div>
                    <p className="text-gray-500">Período</p>
                    <p className="font-medium text-gray-900">{exp.periodo || exp.period}</p>
                  </div>
                )}
                {(exp.descricao || exp.description) && (
                  <div className="col-span-2">
                    <p className="text-gray-500">Descrição</p>
                    <p className="font-medium text-gray-900 mt-1">{exp.descricao || exp.description}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )
    } catch (error) {

      return (
        <p className="text-base text-gray-900 mt-2 whitespace-pre-wrap">{experienciaStr}</p>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">Detalhes do Candidato</CardTitle>
                  <Badge variant="outline" className="mt-2">
                    {candidato.id_anonimo}
                  </Badge>
                </div>
                <div className="flex gap-2 items-start">
                  {candidato.is_pcd && (
                    <Badge className="bg-purple-100 text-purple-800">
                      PCD {candidato.tipo_pcd && `- ${candidato.tipo_pcd}`}
                    </Badge>
                  )}
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          carregarVagas()
                          setDialogOpen(true)
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Convidar para Vaga
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Convidar Candidato para Vaga</DialogTitle>
                        <DialogDescription>
                          Selecione uma ou mais vagas para convidar o candidato {candidato.id_anonimo}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {vagas.length === 0 ? (
                          <p className="text-gray-600 text-center py-8">Nenhuma vaga aberta disponível</p>
                        ) : (
                          vagas.map((vaga) => (
                            <div
                              key={vaga.id}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                              onClick={() => toggleVaga(vaga.id)}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={vagasSelecionadas.has(vaga.id)}
                                  onChange={() => toggleVaga(vaga.id)}
                                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">{vaga.titulo}</p>
                                  {vaga.area_atuacao && (
                                    <p className="text-sm text-gray-600 mt-1">{vaga.area_atuacao}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-green-700 border-green-200">
                                  Aberta
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDialogOpen(false)
                            setVagasSelecionadas(new Set())
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => convidarCandidato()}
                          disabled={isConvidando || vagasSelecionadas.size === 0}
                        >
                          {isConvidando ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Convidando...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Convidar ({vagasSelecionadas.size})
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidato.birth_date || candidato.genero || candidato.estado_civil || candidato.bio ? (
                <div className="grid grid-cols-2 gap-4">
                  {candidato.birth_date && (
                    <div>
                      <p className="text-sm text-gray-500">Data de Nascimento</p>
                      <p className="text-base font-semibold text-gray-900">
                        {new Date(candidato.birth_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {candidato.genero && (
                    <div>
                      <p className="text-sm text-gray-500">Gênero</p>
                      <p className="text-base font-semibold text-gray-900">{candidato.genero}</p>
                    </div>
                  )}
                  {candidato.estado_civil && (
                    <div>
                      <p className="text-sm text-gray-500">Estado Civil</p>
                      <p className="text-base font-semibold text-gray-900">{candidato.estado_civil}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Nenhuma informação pessoal disponível</p>
              )}
              {candidato.bio && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500">Bio</p>
                  <p className="text-base text-gray-900 mt-2">{candidato.bio}</p>
                </div>
              )}
              {candidato.is_pcd && candidato.necessidades_adaptacao && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500">Necessidades de Adaptação</p>
                  <p className="text-base text-gray-900 mt-2">{candidato.necessidades_adaptacao}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Endereço */}
          {(candidato.logradouro || candidato.cidade) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!candidato.dados_pessoais_liberados && !candidato.consentimento ? (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Endereço Oculto:</strong> O endereço completo do candidato só será visível após ele aceitar a entrevista.
                      {candidato.cidade && candidato.estado && (
                        <p className="mt-2">📍 <strong>Localização:</strong> {candidato.cidade}, {candidato.estado}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {candidato.logradouro && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Rua</p>
                        <p className="text-base font-semibold text-gray-900">{candidato.logradouro}</p>
                      </div>
                    )}
                    {candidato.numero && (
                      <div>
                        <p className="text-sm text-gray-500">Número</p>
                        <p className="text-base font-semibold text-gray-900">{candidato.numero}</p>
                      </div>
                    )}
                    {candidato.complemento && (
                      <div>
                        <p className="text-sm text-gray-500">Complemento</p>
                        <p className="text-base font-semibold text-gray-900">{candidato.complemento}</p>
                      </div>
                    )}
                    {candidato.bairro && (
                      <div>
                        <p className="text-sm text-gray-500">Bairro</p>
                        <p className="text-base font-semibold text-gray-900">{candidato.bairro}</p>
                      </div>
                    )}
                    {candidato.cep && (
                      <div>
                        <p className="text-sm text-gray-500">CEP</p>
                        <p className="text-base font-semibold text-gray-900">{candidato.cep}</p>
                      </div>
                    )}
                    {candidato.cidade && (
                      <div>
                        <p className="text-sm text-gray-500">Cidade</p>
                        <p className="text-base font-semibold text-gray-900">{candidato.cidade}</p>
                      </div>
                    )}
                    {candidato.estado && (
                      <div>
                        <p className="text-sm text-gray-500">Estado</p>
                        <p className="text-base font-semibold text-gray-900">{candidato.estado}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Profissional */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Profissionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidato.area_atuacao || candidato.nivel_experiencia || candidato.experiencia_profissional ? (
                <>
                  {candidato.area_atuacao && (
                    <div>
                      <p className="text-sm text-gray-500">Área de Atuação</p>
                      <Badge className="mt-2 bg-blue-100 text-blue-800">
                        {candidato.area_atuacao}
                      </Badge>
                    </div>
                  )}
                  {candidato.nivel_experiencia && (
                    <div>
                      <p className="text-sm text-gray-500">Nível de Experiência</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{candidato.nivel_experiencia}</p>
                    </div>
                  )}
                  {candidato.experiencia_profissional && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-3">Experiência Profissional</p>
                      {renderExperienciaProfissional(candidato.experiencia_profissional)}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">Nenhuma informação profissional disponível</p>
              )}
            </CardContent>
          </Card>

          {/* Formação Acadêmica */}
          {candidato.formacoes_academicas && candidato.formacoes_academicas.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formações Acadêmicas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {candidato.formacoes_academicas.map((formacao, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{formacao.curso}</p>
                          <p className="text-sm text-gray-600 mt-1">{formacao.instituicao}</p>
                        </div>
                        <Badge variant="outline">{formacao.nivel}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium text-gray-900">{formacao.status}</p>
                        </div>
                        {formacao.ano_conclusao && (
                          <div>
                            <p className="text-gray-500">Ano de Conclusão</p>
                            <p className="font-medium text-gray-900">{formacao.ano_conclusao}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Habilidades */}
          {candidato.habilidades && candidato.habilidades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Habilidades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {candidato.habilidades.map((habilidade, index) => (
                    <Badge key={index} variant="secondary">
                      {habilidade}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Testes Técnicos com Notas */}
          {candidato.testes && candidato.testes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Testes Técnicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {candidato.testes.map((teste, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{teste.nome || `Teste ${index + 1}`}</p>
                          {teste.data && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(teste.data).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        {teste.resultado && (
                          <Badge
                            className={
                              teste.resultado === 'aprovado' || teste.resultado === 'APROVADO'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {teste.resultado}
                          </Badge>
                        )}
                      </div>
                      {teste.nota !== undefined && teste.nota !== null && (
                        <div className="pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-600">Nota</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(teste.nota / 10) * 100}%` }}
                              ></div>
                            </div>
                            <p className="font-semibold text-gray-900 min-w-fit">{teste.nota.toFixed(1)}/10</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Links Públicos */}
          {(candidato.linkedin || candidato.portfolio) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Links Públicos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {candidato.linkedin && (
                  <div>
                    <a
                      href={candidato.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                    >
                      <span>LinkedIn</span>
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                )}
                {candidato.portfolio && (
                  <div>
                    <a
                      href={candidato.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
                    >
                      <span>Portfólio</span>
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Autoavaliação */}
          {candidato.autoavaliacao && candidato.autoavaliacao.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Autoavaliação de Competências</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {candidato.autoavaliacao.map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-gray-900">{item.competencia}</p>
                        {item.nota !== undefined && item.nota !== null && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {item.nota.toFixed(1)}/5
                          </Badge>
                        )}
                      </div>
                      {item.nota && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-green-600 h-1.5 rounded-full"
                                style={{ width: `${(item.nota / 5) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                      {item.descricao && (
                        <p className="text-sm text-gray-600 mt-2">{item.descricao}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
