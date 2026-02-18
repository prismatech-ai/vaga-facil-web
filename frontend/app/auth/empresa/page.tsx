"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, Building2, CheckCircle2, UserCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Logo } from "@/components/logo";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function CadastroEmpresaPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogErrorMessage, setDialogErrorMessage] = useState("");

  // Dados da empresa
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [setor, setSetor] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const formatCNPJ = (value: string) => {
    const cnpjNumbers = value.replace(/\D/g, "");
    if (cnpjNumbers.length <= 2) return cnpjNumbers;
    if (cnpjNumbers.length <= 5)
      return cnpjNumbers.slice(0, 2) + "." + cnpjNumbers.slice(2);
    if (cnpjNumbers.length <= 8)
      return (
        cnpjNumbers.slice(0, 2) +
        "." +
        cnpjNumbers.slice(2, 5) +
        "." +
        cnpjNumbers.slice(5)
      );
    if (cnpjNumbers.length <= 12)
      return (
        cnpjNumbers.slice(0, 2) +
        "." +
        cnpjNumbers.slice(2, 5) +
        "." +
        cnpjNumbers.slice(5, 8) +
        "/" +
        cnpjNumbers.slice(8)
      );
    return (
      cnpjNumbers.slice(0, 2) +
      "." +
      cnpjNumbers.slice(2, 5) +
      "." +
      cnpjNumbers.slice(5, 8) +
      "/" +
      cnpjNumbers.slice(8, 12) +
      "-" +
      cnpjNumbers.slice(12, 14)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !confirmPassword) {
      setError("Email e senha são obrigatórios");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (!razaoSocial || !cnpj) {
      setError("Razão Social e CNPJ são obrigatórios");
      return;
    }

    setIsLoading(true);

    try {
      const companyData = {
        email,
        password,
        nome: nomeFantasia || razaoSocial,
        role: "empresa",
        razaoSocial: razaoSocial || "",
        cnpj: cnpj.replace(/\D/g, "") || "",
        setor: setor || "",
        cepempresa: "",
        pessoaDeContato: "",
        foneempresa: "",
      };

    
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(companyData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Extrair mensagem detalhada do erro
        let errorMessage = `Erro ${response.status} ao registrar empresa`;
        
        if (errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((err: any) => {
                if (err.msg) return `${err.loc?.join(" > ") || "Campo"}: ${err.msg}`;
                return String(err);
              })
              .join("; ");
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        throw new Error(errorMessage);
      }

      setShowSuccessDialog(true);
    } catch (err: any) {
      const message = err?.message || "Erro ao criar conta. Tente novamente.";
      setError(message);
      setDialogErrorMessage(message);
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (!email || !password || !confirmPassword) {
      setError("Email e senha são obrigatórios");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setError("");
    setStep(2);
  };

  const previousStep = () => {
    setError("");
    setStep(1);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Painel Esquerdo - Visual */}
      <div className="hidden lg:flex relative overflow-hidden bg-zinc-900 flex-col justify-between p-10">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Floating Elements */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 left-16 w-24 h-24 bg-primary/15 rounded-full blur-2xl animate-pulse delay-1000" />

        {/* Content */}
        <div className="relative z-10">
          <Link href="/" className="inline-block">
            <Logo width={160} variant="white" />
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-3">
              Cadastro de Empresa
            </h1>
            <p className="text-zinc-400 text-lg">
              Crie sua conta empresarial e encontre os melhores talentos
            </p>
          </div>

          {/* Step Indicators */}
          <div className="space-y-4">
            <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
              step === 1 
                ? "bg-white/10 border border-white/20" 
                : "bg-white/5 border border-transparent"
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 1 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"
              }`}>
                <UserCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className={`font-medium ${step === 1 ? "text-white" : "text-zinc-400"}`}>
                  Etapa 1
                </p>
                <p className="text-sm text-zinc-500">Dados de acesso</p>
              </div>
            </div>

            <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
              step === 2 
                ? "bg-white/10 border border-white/20" 
                : "bg-white/5 border border-transparent"
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 2 ? "bg-primary text-primary-foreground" : "bg-white/10 text-white"
              }`}>
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className={`font-medium ${step === 2 ? "text-white" : "text-zinc-400"}`}>
                  Etapa 2
                </p>
                <p className="text-sm text-zinc-500">Dados da empresa</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-zinc-500 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Processo seguro e criptografado</span>
        </div>
      </div>

      {/* Painel Direito - Formulário */}
      <div className="flex flex-col min-h-screen bg-background">
        {/* Header Mobile */}
        <div className="lg:hidden p-6 border-b">
          <Logo width={140} />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md space-y-6">
            {/* Back Link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para página inicial
            </Link>

            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">
                {step === 1 ? "Dados de Acesso" : "Dados da Empresa"}
              </h2>
              <p className="text-muted-foreground">
                {step === 1 
                  ? "Crie suas credenciais de acesso" 
                  : "Informe os dados da sua empresa"}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Etapa {step} de 2</span>
                <span className="text-muted-foreground">{step === 1 ? "Credenciais" : "Empresa"}</span>
              </div>
              <Progress value={step === 1 ? 50 : 100} className="h-2" />
            </div>

            {/* Form */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in-50 duration-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-2 duration-200">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Senha *</Label>
                        <Input
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-10"
                        />
                        {password && (
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <div className={`h-1.5 flex-1 rounded-full ${password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'bg-green-500' : password.length >= 6 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            <span className={password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'text-green-600' : password.length >= 6 ? 'text-yellow-600' : 'text-red-600'}>
                              {password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'Forte' : password.length >= 6 ? 'Média' : 'Fraca'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Confirmar Senha *</Label>
                        <Input
                          type="password"
                          placeholder="Repita sua senha"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="h-10"
                        />
                        {confirmPassword && (
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <CheckCircle2 className={`h-3.5 w-3.5 ${password === confirmPassword ? "text-green-600" : "text-red-500"}`} />
                            <span className={password === confirmPassword ? 'text-green-600' : 'text-red-600'}>
                              {password === confirmPassword ? 'Senhas iguais' : 'Não coincidem'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button type="button" onClick={nextStep} className="w-full h-11 mt-2">
                      Continuar
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4 animate-in fade-in-50 slide-in-from-left-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Razão Social *</Label>
                        <Input
                          value={razaoSocial}
                          onChange={(e) => setRazaoSocial(e.target.value)}
                          placeholder="Nome oficial"
                          className="h-10"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Nome Fantasia</Label>
                        <Input
                          value={nomeFantasia}
                          onChange={(e) => setNomeFantasia(e.target.value)}
                          placeholder="Nome comercial"
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">CNPJ *</Label>
                        <Input
                          placeholder="00.000.000/0000-00"
                          value={cnpj}
                          onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                          maxLength={18}
                          className="h-10"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Setor</Label>
                        <Input
                          placeholder="Ex: Tecnologia"
                          value={setor}
                          onChange={(e) => setSetor(e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <Button type="button" variant="outline" className="h-11" onClick={previousStep}>
                        Voltar
                      </Button>
                      <Button type="submit" disabled={isLoading} className="h-11">
                        {isLoading ? "Criando..." : "Criar Conta"}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Fazer login
              </Link>
            </p>
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
            <DialogTitle className="text-xl">Conta criada com sucesso!</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Sua empresa foi cadastrada na plataforma. Agora você pode fazer login e começar a recrutar talentos.
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
  );
}
