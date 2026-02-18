"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, ChevronRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useIbgeLocations } from "@/hooks/use-ibge-locations"

interface RegistroCandidatoStep1Props {
  onComplete: (data: { 
    nome: string
    email: string
    cpf: string
    senha: string
    telefone: string
    dataNascimento: string
    genero: string
    cidade: string
    estado: string
    temNecessidadesEspeciais?: boolean
    tipoNecessidade?: string
    adaptacoes?: string
  }) => void
  isLoading?: boolean
}

export function RegistroCandidatoStep1({
  onComplete,
  isLoading = false,
}: RegistroCandidatoStep1Props) {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [senha, setSenha] = useState("")
  const [telefone, setTelefone] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")
  const [genero, setGenero] = useState("")
  const [cidade, setCidade] = useState("")
  const [estado, setEstado] = useState("")
  const [temNecessidadesEspeciais, setTemNecessidadesEspeciais] = useState(false)
  const [tipoNecessidade, setTipoNecessidade] = useState("")
  const [adaptacoes, setAdaptacoes] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { estados, cidades, loadingEstados, loadingCidades } = useIbgeLocations(estado)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!nome.trim()) newErrors.nome = "Nome é obrigatório"
    if (!email.trim()) newErrors.email = "Email é obrigatório"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Email inválido"
    if (!telefone.trim()) newErrors.telefone = "Telefone é obrigatório"
    if (!cpf.trim()) newErrors.cpf = "CPF é obrigatório"
    if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) && !/^\d{11}$/.test(cpf)) newErrors.cpf = "CPF inválido"
    if (!dataNascimento.trim()) newErrors.dataNascimento = "Data de nascimento é obrigatória"
    if (!genero.trim()) newErrors.genero = "Gênero é obrigatório"
    if (!cidade.trim()) newErrors.cidade = "Cidade é obrigatória"
    if (!estado.trim()) newErrors.estado = "Estado é obrigatório"
    if (!senha.trim()) newErrors.senha = "Senha é obrigatória"
    if (senha.length < 6) newErrors.senha = "Mínimo 6 caracteres"
    if (!confirmarSenha.trim()) newErrors.confirmarSenha = "Confirme sua senha"
    if (senha !== confirmarSenha) newErrors.confirmarSenha = "As senhas não coincidem"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onComplete({ 
        nome, 
        email, 
        cpf,
        senha,
        telefone,
        dataNascimento,
        genero,
        cidade,
        estado,
        temNecessidadesEspeciais,
        tipoNecessidade: temNecessidadesEspeciais ? tipoNecessidade : undefined,
        adaptacoes: temNecessidadesEspeciais ? adaptacoes : undefined,
      })
    }
  }

  return (
    <div className="w-full animate-in fade-in-50 slide-in-from-right-2 duration-300">
      <div className="space-y-2 mb-6">
        <h2 className="text-2xl font-semibold">Dados Pessoais</h2>
        <p className="text-muted-foreground">Preencha suas informações básicas para continuar</p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {/* Progress Indicator */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Etapa 1 de 3</span>
            <span className="text-muted-foreground">Cadastro</span>
          </div>
          <Progress value={33} className="h-2" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome e Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome" className="text-sm">Nome Completo *</Label>
            <Input
              id="nome"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value)
                if (errors.nome) setErrors({ ...errors, nome: "" })
              }}
              disabled={isLoading}
              className={`h-10 ${errors.nome ? "border-red-500" : ""}`}
              autoFocus
            />
            {errors.nome && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.nome}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: "" })
              }}
              disabled={isLoading}
              className={`h-10 ${errors.email ? "border-red-500" : ""}`}
            />
            {errors.email && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email}
              </p>
            )}
          </div>
        </div>

        {/* CPF e Telefone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cpf" className="text-sm">CPF *</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "")
                if (value.length <= 11) {
                  const formatted = value
                    .replace(/(\d{3})(\d)/, "$1.$2")
                    .replace(/(\d{3})(\d)/, "$1.$2")
                    .replace(/(\d{3})(\d{2})$/, "$1-$2")
                  setCpf(formatted)
                }
                if (errors.cpf) setErrors({ ...errors, cpf: "" })
              }}
              disabled={isLoading}
              className={`h-10 ${errors.cpf ? "border-red-500" : ""}`}
            />
            {errors.cpf && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.cpf}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefone" className="text-sm">Telefone *</Label>
            <Input
              id="telefone"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => {
                setTelefone(e.target.value)
                if (errors.telefone) setErrors({ ...errors, telefone: "" })
              }}
              disabled={isLoading}
              className={`h-10 ${errors.telefone ? "border-red-500" : ""}`}
            />
            {errors.telefone && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.telefone}
              </p>
            )}
          </div>
        </div>

        {/* Data Nascimento e Gênero */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dataNascimento" className="text-sm">Data de Nascimento *</Label>
            <Input
              id="dataNascimento"
              type="date"
              value={dataNascimento}
              onChange={(e) => {
                setDataNascimento(e.target.value)
                if (errors.dataNascimento) setErrors({ ...errors, dataNascimento: "" })
              }}
              disabled={isLoading}
              className={`h-10 ${errors.dataNascimento ? "border-red-500" : ""}`}
            />
            {errors.dataNascimento && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.dataNascimento}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genero" className="text-sm">Gênero *</Label>
            <Select value={genero} onValueChange={(value) => {
              setGenero(value)
              if (errors.genero) setErrors({ ...errors, genero: "" })
            }}>
              <SelectTrigger id="genero" className={`h-10 ${errors.genero ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
                <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
              </SelectContent>
            </Select>
            {errors.genero && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.genero}
              </p>
            )}
          </div>
        </div>

        {/* Estado e Cidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="estado" className="text-sm">Estado *</Label>
            <Select
              value={estado}
              onValueChange={(value) => {
                setEstado(value)
                setCidade("")
                if (errors.estado) setErrors({ ...errors, estado: "" })
                if (errors.cidade) setErrors({ ...errors, cidade: "" })
              }}
              disabled={isLoading || loadingEstados}
            >
              <SelectTrigger id="estado" className={`h-10 ${errors.estado ? "border-red-500" : ""}`}>
                <SelectValue placeholder={loadingEstados ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {estados.map((item) => (
                  <SelectItem key={item.id} value={item.sigla}>
                    {item.sigla} - {item.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.estado && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-2 w-2" />
                Obrigatório
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cidade" className="text-sm">Cidade *</Label>
            <Select
              value={cidade}
              onValueChange={(value) => {
                setCidade(value)
                if (errors.cidade) setErrors({ ...errors, cidade: "" })
              }}
              disabled={isLoading || !estado || loadingCidades}
            >
              <SelectTrigger id="cidade" className={`h-10 ${errors.cidade ? "border-red-500" : ""}`}>
                <SelectValue
                  placeholder={
                    !estado
                      ? "Estado primeiro"
                      : loadingCidades
                      ? "Carregando..."
                      : "Selecione"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {cidades.map((item) => (
                  <SelectItem key={item.id} value={item.nome}>
                    {item.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cidade && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-2 w-2" />
                Obrigatório
              </p>
            )}
          </div>
        </div>

        {/* Senha e Confirmar Senha */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="senha" className="text-sm">Senha *</Label>
            <div className="relative">
              <Input
                id="senha"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value)
                  if (errors.senha) setErrors({ ...errors, senha: "" })
                }}
                disabled={isLoading}
                className={`h-10 pr-10 ${errors.senha ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {errors.senha && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.senha}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmarSenha" className="text-sm">Confirmar Senha *</Label>
            <div className="relative">
              <Input
                id="confirmarSenha"
                type={showPassword ? "text" : "password"}
                placeholder="Repita a senha"
                value={confirmarSenha}
                onChange={(e) => {
                  setConfirmarSenha(e.target.value)
                  if (errors.confirmarSenha) setErrors({ ...errors, confirmarSenha: "" })
                }}
                disabled={isLoading}
                className={`h-10 pr-10 ${errors.confirmarSenha ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {errors.confirmarSenha && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.confirmarSenha}
              </p>
            )}
          </div>
        </div>

        {/* Necessidades Especiais */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="necessidades"
              checked={temNecessidadesEspeciais}
              onCheckedChange={(checked) => {
                setTemNecessidadesEspeciais(checked as boolean)
                if (!checked) {
                  setTipoNecessidade("")
                  setAdaptacoes("")
                }
              }}
            />
            <Label htmlFor="necessidades" className="text-sm cursor-pointer">
              Sou uma pessoa com deficiência (PcD)
            </Label>
          </div>

          {temNecessidadesEspeciais && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1.5">
                <Label htmlFor="tipo-necessidade" className="text-sm">Tipo de Deficiência *</Label>
                <Select value={tipoNecessidade} onValueChange={setTipoNecessidade}>
                  <SelectTrigger id="tipo-necessidade" className="h-10">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auditiva">Auditiva</SelectItem>
                    <SelectItem value="visual">Visual</SelectItem>
                    <SelectItem value="motora">Motora</SelectItem>
                    <SelectItem value="intelectual">Intelectual</SelectItem>
                    <SelectItem value="multipla">Múltipla</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adaptacoes" className="text-sm">Adaptações Necessárias</Label>
                <Textarea
                  id="adaptacoes"
                  placeholder="Descreva brevemente..."
                  value={adaptacoes}
                  onChange={(e) => setAdaptacoes(e.target.value)}
                  disabled={isLoading}
                  className="resize-none text-sm h-10 min-h-[40px]"
                  rows={1}
                />
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 gap-2 mt-4"
        >
          {isLoading ? "Carregando..." : "Continuar"}
          <ChevronRight className="h-4 w-4" />
        </Button>
        </form>
      </div>
    </div>
  )
}
