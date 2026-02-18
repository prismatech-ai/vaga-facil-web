"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ChevronRight, Pencil } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface Competencia {
  id: string
  nome: string
  nivel: 1 | 2 | 3 | 4
}

interface ResumoAutoavaliacaoProps {
  competencias: Competencia[]
  onEdit: () => void
  onContinue: () => void
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
  2: "bg-[#25D9B8]/20 text-[#03565C] border-[#24BFB0]",
  3: "bg-[#24BFB0]/20 text-[#03565C] border-[#03565C]",
  4: "bg-[#03565C]/10 text-[#03565C] border-[#03565C]",
}

// Estimativa de tempo de teste por nível
const tempoTestePorNivel = {
  1: 5,
  2: 10,
  3: 15,
  4: 20,
}

export function ResumoAutoavaliacao({
  competencias,
  onEdit,
  onContinue,
  isLoading = false,
}: ResumoAutoavaliacaoProps) {
  const tempoTotalEstimado = competencias.reduce(
    (acc, comp) => acc + tempoTestePorNivel[comp.nivel],
    0
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary/30 py-8">
      <Card className="w-full max-w-2xl shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-[#03565C] to-[#24BFB0] text-white">
          <CardTitle className="text-2xl text-white">Resumo da Autoavaliação</CardTitle>
          <CardDescription className="text-white/90">
            Revise suas competências antes de iniciar os testes
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Progress Indicator */}
          <div className="mb-8 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Etapa 2 de 3</span>
              <span className="text-gray-500">Resumo</span>
            </div>
            <Progress value={66} className="h-2" />
          </div>

          {/* Competências Declaradas */}
          <div className="space-y-4 mb-8">
            <h3 className="font-bold text-lg text-gray-900">
              Você declarou {competencias.length} competência(s):
            </h3>

            <div className="space-y-3">
              {competencias.map((competencia) => (
                <div
                  key={competencia.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{competencia.nome}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Nível {competencia.nivel} - {NIVEL_LABELS[competencia.nivel]}
                    </p>
                  </div>
                  <Badge
                    className={`${NIVEL_CORES[competencia.nivel]} border text-xs font-semibold`}
                  >
                    {NIVEL_LABELS[competencia.nivel]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Estimativa de Tempo */}
          <Alert className="border-amber-200 bg-amber-50 mb-8">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <div className="font-semibold mb-1">Tempo estimado para testes: ~{tempoTotalEstimado} minutos</div>
              <p className="text-sm">
                A próxima etapa envolve testes técnicos para validar cada competência declarada.
                Você pode fazer todos os testes de uma vez ou distribuir ao longo do tempo.
              </p>
            </AlertDescription>
          </Alert>

          {/* Info */}
          <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10 mb-8">
            <AlertCircle className="h-4 w-4 text-[#03565C]" />
            <AlertDescription className="text-[#03565C] text-sm">
              Suas competências serão usadas para buscar vagas alinhadas com seus interesses. Quanto mais precisa sua autoavaliação, melhores as recomendações.
            </AlertDescription>
          </Alert>

          {/* CTAs */}
          <div className="flex gap-3">
            <Button
              onClick={onEdit}
              disabled={isLoading}
              variant="outline"
              className="flex-1 gap-2 py-6 text-base"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              onClick={onContinue}
              disabled={isLoading}
              className="flex-1 gap-2 bg-[#03565C] hover:bg-[#024147] py-6 text-base"
            >
              {isLoading ? "Carregando..." : "Continuar"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
