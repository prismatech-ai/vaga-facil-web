"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Unlock, Mail, Phone, FileText, Briefcase, ChevronLeft, Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface Competencia {
  nome: string
  nivelDeclarado: 1 | 2 | 3 | 4
  testeScore?: number
}

interface DadosPessoais {
  nome: string
  email: string
  telefone?: string
  curriculo?: string
  github?: string
  linkedin?: string
}

interface DetalhesCandidatoDadosLiberadosProps {
  candidatoId: string
  dadosPessoais: DadosPessoais
  competencias: Competencia[]
  dateAceituEntrevista?: string
  onBack: () => void
  isLoading?: boolean
}

const NIVEL_LABELS = {
  1: "Iniciante",
  2: "Intermediário",
  3: "Avançado",
  4: "Expert",
}

const NIVEL_CORES = {
  1: "bg-yellow-100 text-yellow-800 border-yellow-300",
  2: "bg-[#25D9B8]/20 text-[#03565C] border-[#24BFB0]/30",
  3: "bg-[#24BFB0]/20 text-[#03565C] border-[#24BFB0]/30",
  4: "bg-[#03565C]/10 text-[#03565C] border-[#03565C]/30",
}

export function DetalhesCandidatoDadosLiberados({
  candidatoId = "",
  dadosPessoais = {
    nome: "",
    email: "",
    telefone: "",
    curriculo: "",
    github: "",
    linkedin: "",
  },
  competencias = [],
  dateAceituEntrevista = "",
  onBack,
  isLoading = false,
}: DetalhesCandidatoDadosLiberadosProps) {
  const { toast } = useToast()
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadCurriculo = async () => {
    setIsDownloading(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const apiUrl = process.env.NEXT_PUBLIC_API_URL

      // Solicita URL assinada do backend
      const response = await fetch(
        `${apiUrl}/api/v1/companies/candidato/${candidatoId}/curriculo-download`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) {
        let errorText = "Erro desconhecido"
        try {
          const errorData = await response.json()
          errorText = errorData.detail || JSON.stringify(errorData)
        } catch (e) {
          errorText = `HTTP ${response.status}`
        }
        throw new Error(`Falha ao obter URL de download: ${errorText}`)
      }

      const { download_url } = await response.json()
      
      // Abre em novo abá
      window.open(download_url, "_blank")
      
      toast({
        title: "Sucesso",
        description: "Iniciando download do currículo...",
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao baixar currículo"
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <Button
          onClick={onBack}
          variant="ghost"
          className="gap-2 mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Kanban
        </Button>

        {/* Privacy Notification */}
        <Alert className="border-green-200 bg-green-50 mb-6">
          <Unlock className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Dados Liberados!</strong> O candidato aceitou a entrevista e você agora tem acesso
            aos seus dados pessoais. Entrevista aceita em:{" "}
            <span className="font-semibold">
              {new Date(dateAceituEntrevista).toLocaleDateString("pt-BR")}
            </span>
          </AlertDescription>
        </Alert>

        <Card className="shadow-lg border-0 mb-6">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Perfil Completo do Candidato
            </CardTitle>
            <CardDescription className="text-green-100">
              Todos os dados pessoais visíveis
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8 space-y-8">
            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">Informações Pessoais</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <Card className="border border-gray-200">
                  <CardContent className="pt-4">
                    <p className="text-xs text-gray-600 mb-1">Nome Completo</p>
                    <p className="text-lg font-bold text-gray-900">{dadosPessoais.nome}</p>
                  </CardContent>
                </Card>

                {/* Email */}
                <Card className="border border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Email</p>
                        <a
                          href={`mailto:${dadosPessoais.email}`}
                          className="text-lg font-bold text-[#03565C] hover:underline"
                        >
                          {dadosPessoais.email}
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Telefone */}
                {dadosPessoais.telefone && (
                  <Card className="border border-gray-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Telefone</p>
                          <a
                            href={`tel:${dadosPessoais.telefone}`}
                            className="text-lg font-bold text-gray-900 hover:underline"
                          >
                            {dadosPessoais.telefone}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Currículo */}
                {dadosPessoais.curriculo && (
                  <Card className="border border-gray-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600 mb-2">Currículo</p>
                          <Button
                            onClick={handleDownloadCurriculo}
                            disabled={isDownloading}
                            className="gap-2 bg-[#03565C] hover:bg-[#024147]"
                            size="sm"
                          >
                            <Download className="h-4 w-4" />
                            {isDownloading ? "Baixando..." : "Baixar Currículo"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Links Profissionais */}
              {(dadosPessoais.github || dadosPessoais.linkedin) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Links Profissionais</h4>
                  <div className="flex flex-wrap gap-3">
                    {dadosPessoais.github && (
                      <a
                        href={dadosPessoais.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-semibold"
                      >
                        <Briefcase className="h-4 w-4" />
                        GitHub
                      </a>
                    )}
                    {dadosPessoais.linkedin && (
                      <a
                        href={dadosPessoais.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-[#03565C] text-white rounded-lg hover:bg-[#024147] text-sm font-semibold"
                      >
                        <Briefcase className="h-4 w-4" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Competências e Testes */}
            <div className="space-y-4 border-t border-gray-200 pt-8">
              <h3 className="font-bold text-lg text-gray-900">Competências e Resultados de Testes</h3>
              <div className="grid grid-cols-1 gap-3">
                {competencias.map((comp) => (
                  <div
                    key={comp.nome}
                    className={`p-4 rounded-lg border-2 border-gray-200 ${NIVEL_CORES[comp.nivelDeclarado]}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{comp.nome}</h4>
                      <Badge
                        className={`${NIVEL_CORES[comp.nivelDeclarado]} border text-xs`}
                      >
                        {NIVEL_LABELS[comp.nivelDeclarado]}
                      </Badge>
                    </div>

                    {comp.testeScore !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Score no Teste:</span>
                        <span className="font-bold text-green-600">{comp.testeScore}/10</span>
                      </div>
                    )}

                    {comp.testeScore === undefined && (
                      <div className="text-sm text-gray-600">
                        Teste não realizado
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ID Anônimo (para referência) */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 border-t pt-8">
              <p className="text-xs text-gray-600 mb-1">ID Original do Candidato</p>
              <p className="font-mono text-gray-900 font-bold">{candidatoId}</p>
            </div>

            {/* Info */}
            <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
              <AlertCircle className="h-4 w-4 text-[#03565C]" />
              <AlertDescription className="text-[#03565C] text-sm space-y-2">
                <p>
                  <strong>Próximos passos:</strong> Você pode agora agendar a entrevista entrando em
                  contato pelo email ou telefone fornecido.
                </p>
                <p>
                  Certifique-se de seguir as regulamentações da LGPD e proteja os dados pessoais do
                  candidato adequadamente.
                </p>
              </AlertDescription>
            </Alert>

            {/* CTAs */}
            <div className="flex gap-3">
              <a
                href={`mailto:${dadosPessoais.email}`}
                className="flex-1"
              >
                <Button className="w-full gap-2 bg-[#03565C] hover:bg-[#024147] py-6 text-base text-white">
                  <Mail className="h-4 w-4" />
                  Enviar Email
                </Button>
              </a>
              {dadosPessoais.telefone && (
                <a
                  href={`tel:${dadosPessoais.telefone}`}
                  className="flex-1"
                >
                  <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 py-6 text-base text-white">
                    <Phone className="h-4 w-4" />
                    Ligar
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
