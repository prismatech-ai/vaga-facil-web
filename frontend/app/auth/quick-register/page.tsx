"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { RegistroCandidatoStep1 } from "@/components/registro-candidato-step1"
import { SelecionaArea } from "@/components/seleciona-area"
import { AutoavaliacaoCompetencias } from "@/components/autoavaliacao-competencias"
import { Logo } from "@/components/logo"
import { useToast } from "@/hooks/use-toast"
import { UserRound, ListChecks, Sparkles, ArrowLeft, CheckCircle2, XCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Step = "dados-pessoais" | "seleciona-area" | "avaliacao-competencias"

interface DadosPessoais {
  full_name: string
  email: string
  password: string
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
  is_pcd: boolean
  tipo_pcd: string
  necessidades_adaptacao: string
}

interface Resposta {
  questao_id: number
  resposta: string
}

interface TesteHabilidades {
  test_id: number
  respostas: Resposta[]
  tempo_decorrido: number
}

export default function QuickRegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>("dados-pessoais")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [, setCompetenciasAvaliadas] = useState<any[]>([])
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [dialogErrorMessage, setDialogErrorMessage] = useState("")
  
  const [dadosPessoais, setDadosPessoais] = useState<DadosPessoais>({
    full_name: "",
    email: "",
    password: "",
    cpf: "",
    phone: "",
    rg: "",
    birth_date: "",
    genero: "",
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
  })

  const handleDadosPessoaisComplete = async (data: any) => {
    setError("")
    try {
      setDadosPessoais({
        full_name: data.nome || "",
        email: data.email || "",
        password: data.senha || "",
        cpf: data.cpf || "",
        phone: data.telefone || "",
        rg: "",
        birth_date: data.dataNascimento || "",
        genero: data.genero || "",
        estado_civil: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: data.cidade || "",
        estado: data.estado || "",
        is_pcd: data.temNecessidadesEspeciais || false,
        tipo_pcd: data.tipoNecessidade || "",
        necessidades_adaptacao: data.adaptacoes || "",
      })

      setStep("seleciona-area")
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelecionaAreaComplete = (areas: string[]) => {
    setSelectedAreas(areas)
    setStep("avaliacao-competencias")
  }

  const handleCompetenciasComplete = async (competencias: any[]) => {
    setCompetenciasAvaliadas(competencias)
    setIsLoading(true)
    setError("")

    try {
      const cpfLimpo = dadosPessoais.cpf?.replace(/\D/g, "") || ""
      if (!dadosPessoais.full_name || !dadosPessoais.email || !dadosPessoais.password) {
        throw new Error("Dados pessoais incompletos. Volte ao passo 1 e revise o cadastro.")
      }
      if (cpfLimpo.length !== 11) {
        throw new Error("CPF inválido. Verifique o CPF informado no passo 1.")
      }

      const registerPayload = {
        email: dadosPessoais.email || "",
        password: dadosPessoais.password || "",
        nome: dadosPessoais.full_name || "",
        role: "candidato",
        telefone: dadosPessoais.phone || "",
        cpf: cpfLimpo,
        dataNascimento: dadosPessoais.birth_date || "",
        genero: dadosPessoais.genero || "",
        razaoSocial: "",
        cnpj: "",
        rg: "",
        estadoCivil: "",
        setor: "",
        cepempresa: "",
        pessoaDeContato: "",
        foneempresa: "",
        endereco: {
          cep: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: dadosPessoais.cidade || "",
          estado: dadosPessoais.estado || "",
        },
      }

      const registerUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`
      const registerResponse = await fetch(registerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerPayload),
      })

      if (!registerResponse.ok) {
        let errorData: any = {}
        try {
          errorData = await registerResponse.json()
        } catch {
          const text = await registerResponse.text()
          errorData = { text }
        }

        let errorMessage = `Erro ${registerResponse.status} ao registrar`
        if (errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((err: any) => {
                if (err.msg) return `${err.loc?.join(" > ") || "Campo"}: ${err.msg}`
                return String(err)
              })
              .join("; ")
          }
        } else if (errorData.message) {
          errorMessage = errorData.message
        }

        const isDuplicate =
          registerResponse.status === 400 &&
          /email já cadastrado|cpf já cadastrado/i.test(errorMessage)

        if (isDuplicate) {
          toast({
            title: "Conta já cadastrada",
            description: "Este email/CPF já existe. Faça login para continuar.",
          })
          router.push("/login")
          return
        }

        throw new Error(errorMessage)
      }

      setShowSuccessDialog(true)
    } catch (err: any) {
      const message = err?.message || "Erro ao concluir cadastro. Tente novamente."
      setError(message)
      setDialogErrorMessage(message)
      setShowErrorDialog(true)
    } finally {
      setIsLoading(false)
    }
  }

  // Calcular progresso
  const steps: Step[] = ["dados-pessoais", "seleciona-area", "avaliacao-competencias"]
  const currentStepIndex = steps.indexOf(step)
  const progress = ((currentStepIndex + 1) / steps.length) * 100
  const dadosCompletos = Boolean(
    dadosPessoais.full_name &&
    dadosPessoais.email &&
    dadosPessoais.password &&
    dadosPessoais.cidade &&
    dadosPessoais.estado
  )
  const areasCompletas = selectedAreas.length > 0

  const canNavigateToStep = (targetStep: Step) => {
    if (targetStep === "dados-pessoais") return true
    if (targetStep === "seleciona-area") return dadosCompletos
    if (targetStep === "avaliacao-competencias") return dadosCompletos && areasCompletas
    return false
  }

  const handleStepClick = (targetStep: Step) => {
    if (canNavigateToStep(targetStep)) {
      setStep(targetStep)
      return
    }

    if (targetStep === "seleciona-area") {
      toast({
        title: "Complete os dados obrigatórios",
        description: "Preencha e conclua a etapa de Dados para avançar.",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Complete as etapas anteriores",
      description: "Finalize Dados e selecione ao menos uma Área para avançar.",
      variant: "destructive",
    })
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Lado esquerdo - Escuro com gradiente e efeitos */}
      <div className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 p-8 xl:p-12 text-white">
        {/* Efeitos decorativos de fundo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full blur-3xl" />
        
        {/* Grid pattern sutil */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10">
          <Logo width={170} variant="white" />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              Crie sua conta e{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                encontre sua vaga
              </span>
            </h1>
            <p className="text-gray-400 text-base xl:text-lg leading-relaxed max-w-md">
              Cadastro rápido em 3 etapas simples. Comece agora e tenha acesso às melhores oportunidades.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4">
            <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${step === "dados-pessoais" ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-white/5 border border-white/10"}`}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${step === "dados-pessoais" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : dadosCompletos ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10"}`}>
                {dadosCompletos && step !== "dados-pessoais" ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <UserRound className={`w-5 h-5 ${step === "dados-pessoais" ? "text-white" : "text-gray-400"}`} />
                )}
              </div>
              <div>
                <span className={`text-sm font-medium ${step === "dados-pessoais" ? "text-emerald-400" : dadosCompletos ? "text-emerald-400" : "text-gray-400"}`}>Etapa 1</span>
                <p className="text-white text-sm">Dados Pessoais</p>
              </div>
            </div>

            <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${step === "seleciona-area" ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-white/5 border border-white/10"}`}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${step === "seleciona-area" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : areasCompletas ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10"}`}>
                {areasCompletas && step !== "seleciona-area" ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <ListChecks className={`w-5 h-5 ${step === "seleciona-area" ? "text-white" : "text-gray-400"}`} />
                )}
              </div>
              <div>
                <span className={`text-sm font-medium ${step === "seleciona-area" ? "text-emerald-400" : areasCompletas ? "text-emerald-400" : "text-gray-400"}`}>Etapa 2</span>
                <p className="text-white text-sm">Áreas de Interesse</p>
              </div>
            </div>

            <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${step === "avaliacao-competencias" ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-white/5 border border-white/10"}`}>
              <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${step === "avaliacao-competencias" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-white/10"}`}>
                <Sparkles className={`w-5 h-5 ${step === "avaliacao-competencias" ? "text-white" : "text-gray-400"}`} />
              </div>
              <div>
                <span className={`text-sm font-medium ${step === "avaliacao-competencias" ? "text-emerald-400" : "text-gray-400"}`}>Etapa 3</span>
                <p className="text-white text-sm">Autoavaliação</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-gray-600 text-sm">
          © 2025 Vaga Fácil. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado direito - Claro com formulário */}
      <div className="flex flex-col min-h-screen bg-background">
        <div className="p-4 lg:p-6 flex items-center justify-between">
          <Link href="/" className="inline-flex text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao início
          </Link>
          
          {/* Progress mobile */}
          <div className="lg:hidden flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Etapa {currentStepIndex + 1}/3</span>
            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center p-4 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-lg">
            {/* Logo mobile */}
            <div className="lg:hidden flex items-center justify-center mb-6">
              <Logo width={160} />
            </div>

            {/* Step indicators mobile */}
            <div className="lg:hidden mb-6 flex gap-2">
              <button
                type="button"
                onClick={() => handleStepClick("dados-pessoais")}
                className={`flex-1 h-10 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${currentStepIndex === 0 ? "border-primary bg-primary/10 text-primary" : dadosCompletos ? "border-emerald-500/50 text-emerald-600" : "text-muted-foreground"}`}
              >
                <UserRound className="h-3.5 w-3.5" />
                Dados
              </button>
              <button
                type="button"
                onClick={() => handleStepClick("seleciona-area")}
                disabled={!canNavigateToStep("seleciona-area") && step === "dados-pessoais"}
                className={`flex-1 h-10 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${currentStepIndex === 1 ? "border-primary bg-primary/10 text-primary" : areasCompletas ? "border-emerald-500/50 text-emerald-600" : "text-muted-foreground"} ${!canNavigateToStep("seleciona-area") && step === "dados-pessoais" ? "opacity-50" : ""}`}
              >
                <ListChecks className="h-3.5 w-3.5" />
                Áreas
              </button>
              <button
                type="button"
                onClick={() => handleStepClick("avaliacao-competencias")}
                disabled={!canNavigateToStep("avaliacao-competencias")}
                className={`flex-1 h-10 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${currentStepIndex === 2 ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"} ${!canNavigateToStep("avaliacao-competencias") ? "opacity-50" : ""}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Avaliação
              </button>
            </div>

            {/* Conteúdo do step */}
            <div className="w-full">
              {step === "dados-pessoais" && (
                <RegistroCandidatoStep1
                  onComplete={handleDadosPessoaisComplete}
                  isLoading={isLoading}
                />
              )}

              {step === "seleciona-area" && (
                <SelecionaArea
                  onComplete={handleSelecionaAreaComplete}
                  isLoading={isLoading}
                  multiple={true}
                />
              )}

              {step === "avaliacao-competencias" && (
                <AutoavaliacaoCompetencias
                  areaId={selectedAreas[0]}
                  onComplete={handleCompetenciasComplete}
                  isLoading={isLoading}
                />
              )}
            </div>

            {/* Link para login */}
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link href="/login" className="text-primary hover:underline font-semibold">
                Faça login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Sucesso */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl">Cadastro realizado com sucesso!</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Sua conta foi criada na plataforma. Faça login para começar a explorar as vagas disponíveis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={() => router.push("/login")} className="w-full h-11">
              Ir para Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Erro */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Erro no cadastro</DialogTitle>
            <DialogDescription className="text-center pt-2">
              {dialogErrorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowErrorDialog(false)} className="w-full sm:w-auto">
              Tentar novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
