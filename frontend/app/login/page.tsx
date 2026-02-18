"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Building2, UserRound } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Logo } from "@/components/logo"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [showSignupType, setShowSignupType] = useState(false)

  const handleSignupChoice = (type: "empresa" | "candidato") => {
    setShowSignupType(false)
    if (type === "empresa") {
      router.push("/auth/empresa")
    } else {
      router.push("/auth/quick-register")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login(email, password)

      if (success) {
        const storedUser = localStorage.getItem("user")

        if (storedUser) {
          const user = JSON.parse(storedUser)

          // suportar diferentes formatos: `role` (novo), `user_type` (backend) ou `type`
          const role = user.user_type

          if (role === "admin") {
            router.push("/admin/dashboard")
          } else if (role === "candidato" || role === "candidate") {
            router.push("/dashboard/candidato")
          } else if (role === "empresa" || role === "company") {
            router.push("/dashboard/empresa")
          } else {
            router.push("/dashboard")
          }

        }
      } else {
        setError("Email ou senha incorretos")
      }
    } catch (err: any) {

      const errorMessage = err?.message || "Erro ao fazer login. Tente novamente."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError("")
    setResetSuccess(false)
    setIsResetting(true)

    try {
      // Usar novo endpoint que envia email via Resend
      await api.post("/api/v1/auth/forgot-password", { email: resetEmail })
      setResetSuccess(true)
      setResetEmail("")
    } catch (err: any) {
      setResetError(err.message || "Erro ao enviar email de recuperação")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Lado esquerdo - Escuro com gradiente e efeitos */}
      <div className="hidden md:flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-emerald-950 p-8 lg:p-12 text-white">
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
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
              Processos seletivos com{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                mais velocidade
              </span>
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Junte-se a empresas que já otimizam seus processos de recrutamento com análises automatizadas.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-300 text-sm lg:text-base">Login rápido com redirecionamento por perfil</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-300 text-sm lg:text-base">Recuperação de senha com envio por email</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-300 text-sm lg:text-base">Cadastro guiado por tipo de usuário</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-gray-600 text-sm">
          © 2025 Vaga Fácil. Todos os direitos reservados.
        </div>
      </div>

      {/* Lado direito - Claro com formulário */}
      <div className="flex flex-col min-h-screen bg-background">
        <div className="p-6 lg:p-8">
          <Link href="/" className="inline-flex text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Voltar ao início
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-6">
            <div className="md:hidden flex items-center justify-center mb-6">
              <Logo width={160} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Bem-vindo de volta</h2>
              <p className="text-muted-foreground">Entre na sua conta para continuar</p>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in-50 duration-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    required
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    required
                    className="h-11"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Não tem uma conta? </span>
                  <button
                    type="button"
                    onClick={() => setShowSignupType(true)}
                    className="text-primary hover:underline font-semibold"
                  >
                    Cadastre-se
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showSignupType} onOpenChange={setShowSignupType}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipo de Cadastro</DialogTitle>
            <DialogDescription>
              Escolha o tipo de conta que deseja criar
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            <Button
              onClick={() => handleSignupChoice("candidato")}
              variant="outline"
              className="flex flex-col items-center gap-2 h-28 shadow-sm hover:shadow-md transition-all"
            >
              <UserRound className="w-6 h-6" />
              <span className="text-sm font-medium">Candidato</span>
              <span className="text-[11px] text-muted-foreground">Buscar oportunidades</span>
            </Button>
            <Button
              onClick={() => handleSignupChoice("empresa")}
              variant="outline"
              className="flex flex-col items-center gap-2 h-28 shadow-sm hover:shadow-md transition-all"
            >
              <Building2 className="w-6 h-6" />
              <span className="text-sm font-medium">Empresa</span>
              <span className="text-[11px] text-muted-foreground">Recrutar talentos</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu email para receber as instruções de redefinição de senha
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            {resetSuccess && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Email enviado com sucesso! Verifique sua caixa de entrada.
                </AlertDescription>
              </Alert>
            )}

            {resetError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{resetError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                disabled={resetSuccess}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmail("")
                  setResetSuccess(false)
                  setResetError("")
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isResetting || resetSuccess}
                className="flex-1"
              >
                {isResetting ? "Enviando..." : resetSuccess ? "Enviado" : "Enviar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
