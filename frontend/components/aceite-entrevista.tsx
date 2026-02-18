"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Lock, Unlock, Shield } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface AceiteEntrevistaProps {
  conviteId: string
  empresaNome: string
  vagaTitulo: string
  dataConvite: string
  competenciasRequeridas: string[]
  onAccept: (conviteId: string) => void
  onReject: (conviteId: string) => void
  isLoading?: boolean
}

export function AceiteEntrevista({
  conviteId,
  empresaNome = "",
  vagaTitulo = "",
  dataConvite = "",
  competenciasRequeridas = [],
  onAccept,
  onReject,
  isLoading = false,
}: AceiteEntrevistaProps) {
  const [step, setStep] = useState<"confirmacao" | "privacidade" | "finalizado">("confirmacao")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleAccept = () => {
    setStep("privacidade")
  }

  const handleConfirmAccept = () => {
    setShowConfirmDialog(false)
    setStep("finalizado")
    onAccept(conviteId)
  }

  const handleReject = () => {
    setShowConfirmDialog(false)
    onReject(conviteId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-4">
        {/* Step 1: Confirmação de Interesse */}
        {step === "confirmacao" && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white">
              <CardTitle className="text-2xl">Uma Empresa Está Interessada em Você!</CardTitle>
              <CardDescription className="text-white/80">
                Você recebeu um convite para participar de uma entrevista
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-8 space-y-6">
              {/* Alert Principal */}
              <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
                <AlertCircle className="h-4 w-4 text-[#03565C]" />
                <AlertDescription className="text-[#03565C] text-base font-medium">
                  Ao aceitar esta entrevista, você autoriza o compartilhamento de seus dados pessoais
                  com a empresa para que ela possa entrar em contato e agendar a entrevista.
                </AlertDescription>
              </Alert>

              {/* Convite Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Posição</p>
                  <p className="text-xl font-bold text-gray-900">{vagaTitulo}</p>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Empresa</p>
                  <p className="text-lg font-semibold text-gray-900">{empresaNome}</p>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Competências Alinhadas</p>
                  <div className="flex flex-wrap gap-2">
                    {competenciasRequeridas.map((comp) => (
                      <span
                        key={comp}
                        className="px-3 py-1 bg-[#25D9B8]/20 text-[#03565C] rounded-full text-sm font-medium"
                      >
                        ✓ {comp}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Data do Convite</p>
                  <p className="text-gray-900">{new Date(dataConvite).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => window.location.href = "/dashboard/candidato"}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1 py-6 text-base"
                >
                  ← Voltar ao Dashboard
                </Button>
                <Button
                  onClick={() => handleReject()}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex-1 py-6 text-base"
                >
                  Recusar
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isLoading}
                  className="flex-1 gap-2 bg-[#03565C] hover:bg-[#024147] py-6 text-base text-white"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Aceitar Entrevista
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Aviso de Privacidade */}
        {step === "privacidade" && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Lock className="h-6 w-6" />
                Aviso Importante de Privacidade
              </CardTitle>
              <CardDescription className="text-amber-100">
                Leia com atenção antes de continuar
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-8 space-y-6">
              {/* Privacy Warnings */}
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-900 mb-1">Dados Pessoais Serão Compartilhados</h4>
                      <p className="text-sm text-red-800">
                        Ao aceitar este convite, você está dando permissão para que a empresa acesse:
                      </p>
                      <ul className="text-sm text-red-800 mt-2 ml-4 list-disc space-y-1">
                        <li>Seu nome completo</li>
                        <li>Seu email pessoal</li>
                        <li>Seu currículo e histórico profissional</li>
                        <li>Resultados dos testes técnicos</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 mb-1">Sem Volta Atrás</h4>
                      <p className="text-sm text-amber-800">
                        Uma vez compartilhado, seus dados não podem ser recuperados. Você aceitou a
                        participação neste processo de seleção.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#25D9B8]/10 border border-[#24BFB0]/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-[#03565C] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-[#03565C] mb-1">Proteção de Dados</h4>
                      <p className="text-sm text-[#024147]">
                        A empresa está comprometida com a Lei Geral de Proteção de Dados (LGPD). Seus
                        dados serão usados apenas para fins do processo de seleção.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowConfirmDialog(true)
                      }
                    }}
                    className="w-4 h-4 mt-1 rounded border-gray-300 text-[#03565C]"
                  />
                  <span className="text-sm text-gray-700">
                    <strong>Entendo e aceito</strong> que meus dados pessoais serão compartilhados com
                    a empresa para fins do processo de seleção.
                  </span>
                </label>
              </div>

              {/* Info */}
              <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
                <AlertCircle className="h-4 w-4 text-[#03565C]" />
                <AlertDescription className="text-[#03565C] text-sm">
                  A empresa pode entrar em contato por email para agendar a entrevista.
                </AlertDescription>
              </Alert>

              {/* CTAs */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setStep("confirmacao")}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1 py-6 text-base"
                >
                  Voltar
                </Button>
                <Button
                  disabled={true}
                  className="flex-1 gap-2 bg-gray-400 cursor-not-allowed py-6 text-base"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar (marque a caixa)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Sucesso */}
        {step === "finalizado" && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" />
                Entrevista Aceita com Sucesso!
              </CardTitle>
              <CardDescription className="text-green-100">
                Seus dados foram liberados para a empresa
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Unlock className="h-16 w-16 text-green-600" />
                </div>
                <p className="text-gray-900 text-lg">
                  Seus dados pessoais foram compartilhados com
                </p>
                <p className="text-3xl font-bold text-gray-900">{empresaNome}</p>
                <p className="text-gray-600">para a posição de <strong>{vagaTitulo}</strong></p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-3">
                <h4 className="font-bold text-green-900 text-base">O que acontece agora:</h4>
                <ol className="text-sm text-green-800 space-y-2 ml-4 list-decimal">
                  <li>A empresa receberá seus dados pessoais e currículo</li>
                  <li>Você receberá um email para agendar a entrevista</li>
                  <li>Acompanhe o processo pelo seu dashboard</li>
                </ol>
              </div>

              <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
                <AlertCircle className="h-4 w-4 text-[#03565C]" />
                <AlertDescription className="text-[#03565C] text-sm">
                  <strong>Nenhuma ação adicional necessária.</strong> Você pode continuar explorando outras
                  oportunidades enquanto aguarda o contato da empresa.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => window.location.href = "/dashboard/candidato"}
                className="w-full gap-2 bg-green-600 hover:bg-green-700 py-6 text-base text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aceite da Entrevista?</DialogTitle>
            <DialogDescription>
              Seus dados pessoais serão compartilhados com a empresa. Você controla completamente esta
              decisão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                <strong>Aviso:</strong> Ao confirmar, seus dados serão permanentemente compartilhados.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-3">
            <Button onClick={() => setShowConfirmDialog(false)} variant="outline">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAccept}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? "Processando..." : "Sim, Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
