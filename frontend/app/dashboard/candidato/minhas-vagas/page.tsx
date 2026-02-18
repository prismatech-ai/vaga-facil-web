"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Search, Star } from "lucide-react"

export default function MinhasVagasPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "interessado" | "aplicado">("todas")
  const [vagas, setVagas] = useState([])

  const vagasFiltradas = vagas.filter((v: any) => {
    const matchSearch =
      v.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.empresa.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus =
      filtroStatus === "todas" || v.statusCandidato === filtroStatus

    return matchSearch && matchStatus
  })

  const getStatusColor = (status: string) => {
    const statusMap = {
      interessado: { label: "Interessado", color: "bg-[#03565C]" },
      aplicado: { label: "Aplicado", color: "bg-green-600" },
    }
    return statusMap[status as keyof typeof statusMap] || { label: "Desconhecido", color: "bg-gray-600" }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Minhas Vagas</h1>
        <p className="text-gray-600 mt-2">Acompanhe as vagas para as quais você se enquadra</p>
      </div>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por título ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {["todas", "interessado", "aplicado"].map((status) => (
                <Button
                  key={status}
                  variant={filtroStatus === status ? "default" : "outline"}
                  className={
                    filtroStatus === status
                      ? "bg-[#03565C] hover:bg-[#024147]"
                      : ""
                  }
                  onClick={() => setFiltroStatus(status as typeof filtroStatus)}
                >
                  {status === "todas"
                    ? "Todas"
                    : status === "interessado"
                      ? "Interessado"
                      : "Aplicado"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
        <AlertCircle className="h-4 w-4 text-[#03565C]" />
        <AlertDescription className="text-[#03565C]">
          <strong>Vagas Alinhadas:</strong> Você está vendo apenas vagas para as quais possui as competências mínimas declaradas.
        </AlertDescription>
      </Alert>

      {/* Vagas List */}
      {vagasFiltradas.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-12 text-center">
            <p className="text-gray-600">Nenhuma vaga encontrada com seus critérios</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {vagasFiltradas.map((vaga) => {
            const status = getStatusColor(vaga.statusCandidato)
            return (
              <Card key={vaga.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{vaga.titulo}</h3>
                          <p className="text-sm text-gray-600">{vaga.empresa}</p>
                        </div>
                        <Badge className={`${status.color} text-white`}>
                          {status.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-700">{vaga.descricao}</p>

                      <div>
                        <p className="text-xs text-gray-600 mb-2">Competências Alinhadas</p>
                        <div className="flex gap-2 flex-wrap">
                          {vaga.competenciasAlinhadas.map((comp) => (
                            <Badge
                              key={comp}
                              variant="outline"
                              className="bg-[#25D9B8]/10 border-[#24BFB0]/30 text-[#03565C]"
                            >
                              ✓ {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Postada em: {new Date(vaga.dataVaga).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    <Button className="gap-2 bg-[#03565C] hover:bg-[#024147] whitespace-nowrap">
                      <Star className="h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
