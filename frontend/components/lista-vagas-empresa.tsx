"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Users, TrendingUp, Briefcase } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Vaga {
  id: string
  titulo: string
  area: string
  descricao: string
  dataCriacao: string
  candidatosAlinhados: number
  candidatosComInteresse: number
  competenciasFiltros: string[]
  status: "aberta" | "fechada"
}

interface ListaVagasEmpresaProps {
  vagas?: Vaga[]
  onCreateVaga: () => void
  onViewVaga: (vagaId: string) => void
  onViewKanban: (vagaId: string) => void
  isLoading?: boolean
}

export function ListaVagasEmpresa({
  vagas = [],
  onCreateVaga,
  onViewVaga,
  onViewKanban,
  isLoading = false,
}: ListaVagasEmpresaProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const vagasFiltradas = vagas.filter(
    (vaga) =>
      vaga.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaga.area.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const vagasAbertas = vagas.filter((v) => v.status === "aberta").length
  const totalCandidatos = vagas.reduce((acc, v) => acc + v.candidatosAlinhados, 0)
  const totalComInteresse = vagas.reduce((acc, v) => acc + v.candidatosComInteresse, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Minhas Vagas</h1>
              <p className="text-gray-600 mt-1">Gerencie suas ofertas de emprego</p>
            </div>
            <Button
              onClick={onCreateVaga}
              disabled={isLoading}
              className="gap-2 bg-[#03565C] hover:bg-[#024147] py-6 text-base"
            >
              <Plus className="h-4 w-4" />
              Nova Vaga
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-l-4 border-l-[#03565C]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Vagas Abertas</p>
                  <p className="text-3xl font-bold text-[#03565C] mt-1">{vagasAbertas}</p>
                </div>
                <Briefcase className="h-8 w-8 text-[#03565C] opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Candidatos Alinhados</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{totalCandidatos}</p>
                </div>
                <Users className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#24BFB0]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Com Interesse Marcado</p>
                  <p className="text-3xl font-bold text-[#03565C] mt-1">{totalComInteresse}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#24BFB0] opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info */}
        <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10 mb-8">
          <AlertCircle className="h-4 w-4 text-[#03565C]" />
          <AlertDescription className="text-[#03565C]">
            <strong>Candidatos Alinhados:</strong> Número de candidatos que declaram ter as
            competências que você está buscando. Seus dados ainda estão anônimos até você demonstrar
            interesse em uma entrevista.
          </AlertDescription>
        </Alert>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Buscar vagas por título ou área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Vagas List */}
        {vagasFiltradas.length === 0 ? (
          <Card className="text-center py-16">
            <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma vaga encontrada</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? "Nenhuma vaga corresponde aos seus critérios de busca"
                : "Você não tem vagas abertas ainda"}
            </p>
            <Button onClick={onCreateVaga} className="gap-2 bg-[#03565C] hover:bg-[#024147]">
              <Plus className="h-4 w-4" />
              Criar Primeira Vaga
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {vagasFiltradas.map((vaga) => (
              <Card key={vaga.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{vaga.titulo}</h3>
                        <Badge variant={vaga.status === "aberta" ? "default" : "secondary"}>
                          {vaga.status === "aberta" ? "Aberta" : "Fechada"}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{vaga.descricao}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {vaga.competenciasFiltros.map((comp) => (
                          <Badge key={comp} variant="secondary" className="text-xs">
                            {comp}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-gray-600">Candidatos Alinhados</p>
                          <p className="text-lg font-bold text-[#03565C]">{vaga.candidatosAlinhados}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Com Interesse</p>
                          <p className="text-lg font-bold text-green-600">{vaga.candidatosComInteresse}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Data de Criação</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {new Date(vaga.dataCriacao).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-32">
                      <Button
                        onClick={() => onViewKanban(vaga.id)}
                        disabled={isLoading}
                        className="gap-2 bg-[#03565C] hover:bg-[#024147] text-sm"
                      >
                        <Users className="h-4 w-4" />
                        Status
                      </Button>
                      <Button
                        onClick={() => onViewVaga(vaga.id)}
                        disabled={isLoading}
                        variant="outline"
                        className="text-sm"
                      >
                        Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
