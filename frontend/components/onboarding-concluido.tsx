"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, ChevronRight, Briefcase } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface OnboardingConcluidoProps {
  areaAtuacao: string
  vagasDisponiveisPorArea: Record<string, number>
  onGoDashboard: () => void
  isLoading?: boolean
}

export function OnboardingConcluido({
  areaAtuacao = "frontend",
  vagasDisponiveisPorArea = {},
  onGoDashboard,
  isLoading = false,
}: OnboardingConcluidoProps) {
  const vagasArea = vagasDisponiveisPorArea[areaAtuacao.toLowerCase()] || 0

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-50 to-emerald-50 py-8">
      <Card className="w-full max-w-2xl shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
          <CardTitle className="text-3xl flex items-center gap-2">
            <CheckCircle2 className="h-8 w-8" />
            Parabéns!
          </CardTitle>
          <CardDescription className="text-green-100">
            Seu cadastro foi concluído com sucesso
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8">
          {/* Progress Indicator */}
          <div className="mb-8 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Etapa 3 de 3</span>
              <span className="text-gray-500">Concluído!</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>

          {/* Main Message */}
          <div className="text-center mb-8 space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Bem-vindo ao VagaFácil!
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Você completou todas as etapas do cadastro. Agora o sistema buscará vagas
              alinhadas com suas competências e nível de proficiência.
            </p>
          </div>

          {/* Vagas Disponíveis */}
          <Alert className="border-emerald-200 bg-emerald-50 mb-8">
            <Briefcase className="h-4 w-4 text-emerald-600" />
            <AlertDescription>
              <div className="font-bold text-emerald-900 text-lg">
                {vagasArea} vagas disponíveis em {areaAtuacao}
              </div>
              <p className="text-sm text-emerald-700 mt-2">
                Essas vagas foram abertas por empresas que estão buscando profissionais
                com suas competências. Você receberá notificações quando novas vagas forem
                publicadas.
              </p>
            </AlertDescription>
          </Alert>

          {/* Proximos Passos */}
          <div className="bg-[#25D9B8]/10 border border-[#24BFB0]/30 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-4">Próximos passos:</h3>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <Badge className="bg-[#03565C] text-white w-6 h-6 flex items-center justify-center flex-shrink-0 rounded-full p-0 text-xs">
                  1
                </Badge>
                <span>
                  <strong>Explore seu dashboard</strong> - Veja vagas recomendadas e seu status
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Badge className="bg-[#03565C] text-white w-6 h-6 flex items-center justify-center flex-shrink-0 rounded-full p-0 text-xs">
                  2
                </Badge>
                <span>
                  <strong>Receba convites</strong> - Empresas podem se interessar por seu perfil
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Badge className="bg-[#03565C] text-white w-6 h-6 flex items-center justify-center flex-shrink-0 rounded-full p-0 text-xs">
                  3
                </Badge>
                <span>
                  <strong>Aceite entrevistas</strong> - Você controla quando e com quem compartilha seus dados
                </span>
              </li>
            </ol>
          </div>

          {/* Privacidade Info */}
          <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10 mb-8">
            <CheckCircle2 className="h-4 w-4 text-[#03565C]" />
            <AlertDescription className="text-[#03565C] text-sm">
              <strong>Privacidade garantida:</strong> Suas informações pessoais permanecerão anônimas
              até que você decida compartilhá-las com uma empresa, após aceitar uma entrevista.
            </AlertDescription>
          </Alert>

          {/* CTA */}
          <Button
            onClick={onGoDashboard}
            disabled={isLoading}
            className="w-full gap-2 bg-green-600 hover:bg-green-700 py-6 text-base text-white"
          >
            {isLoading ? "Carregando..." : "Ir para o Dashboard"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
