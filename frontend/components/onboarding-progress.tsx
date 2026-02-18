/**
 * Componente Reutilizável de Progresso de Onboarding
 * Usado na página de onboarding e em dashboard para exibir o status
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, AlertCircle } from "lucide-react"
import type { OnboardingProgresso } from "@/lib/types"

interface OnboardingProgressProps {
  progresso: OnboardingProgresso
  showDetails?: boolean
  compact?: boolean
}

export function OnboardingProgress({ progresso, showDetails = true, compact = false }: OnboardingProgressProps) {
  const getEtapaStatus = (completo: boolean) => {
    if (completo) return "completo"
    return "pendente"
  }

  const etapas = [
    {
      id: "perfil_basico",
      label: "Perfil Básico",
      descricao: "Nome e Email",
      completo: progresso.etapas_completas.perfil_basico,
    },
    {
      id: "dados_pessoais",
      label: "Dados Pessoais",
      descricao: "Telefone, Cidade, PCD",
      completo: progresso.etapas_completas.dados_pessoais,
    },
    {
      id: "dados_profissionais",
      label: "Dados Profissionais",
      descricao: "Experiência, Formação, Habilidades",
      completo: progresso.etapas_completas.dados_profissionais,
    },
    {
      id: "teste_habilidades",
      label: "Teste de Habilidades",
      descricao: "Avaliação de Competências",
      completo: progresso.etapas_completas.teste_habilidades,
    },
  ]

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Progress value={progresso.percentual_completude} className="h-2" />
        </div>
        <span className="text-sm font-medium">{progresso.percentual_completude}%</span>
        {progresso.onboarding_completo && <CheckCircle2 className="h-5 w-5 text-green-600" />}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Progresso do Onboarding</CardTitle>
          {progresso.onboarding_completo ? (
            <Badge className="bg-green-100 text-green-800">✓ Completo</Badge>
          ) : (
            <Badge variant="secondary">{progresso.percentual_completude}%</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Progresso Total</span>
            <span className="text-sm text-muted-foreground">{progresso.percentual_completude}%</span>
          </div>
          <Progress value={progresso.percentual_completude} className="h-2" />
        </div>

        {showDetails && (
          <div className="grid gap-3 pt-4">
            {etapas.map((etapa) => (
              <div key={etapa.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex-shrink-0 mt-0.5">
                  {etapa.completo ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${etapa.completo ? "text-green-700" : "text-muted-foreground"}`}>
                    {etapa.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{etapa.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!progresso.onboarding_completo && (
          <div className="flex items-start gap-2 p-3 bg-[#25D9B8]/10 rounded-lg border border-[#24BFB0]/30">
            <AlertCircle className="h-4 w-4 text-[#03565C] mt-0.5 flex-shrink-0" />
            <p className="text-sm text-[#03565C]">
              Complete as etapas pendentes para finalizar seu onboarding e ter acesso a todas as vagas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
