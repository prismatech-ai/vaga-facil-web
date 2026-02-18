"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Search, Download } from "lucide-react"

interface Candidato {
  id: string
  nome: string
  email: string
  statusProcesso: string
  competencias: string[]
  dataContato: string
}

export default function CandidatosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [candidatos, setCandidatos] = useState<Candidato[]>([])

  const candidatosFiltrados = candidatos.filter((c: any) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const statusMap = {
      "entrevista-aceita": { label: "Entrevista Aceita", className: "bg-green-600" },
      "com-interesse": { label: "Com Interesse", className: "bg-[#03565C]" },
      "em-avaliacao": { label: "Em Avaliação", className: "bg-yellow-600" },
    }
    return statusMap[status as keyof typeof statusMap] || { label: "Desconhecido", className: "bg-gray-600" }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Candidatos</h1>
        <p className="text-gray-600 mt-2">Gerencie os candidatos que demonstraram interesse nas suas vagas</p>
      </div>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="border-[#24BFB0]/30 bg-[#25D9B8]/10">
        <AlertCircle className="h-4 w-4 text-[#03565C]" />
        <AlertDescription className="text-[#03565C]">
          <strong>Candidatos Aceitos:</strong> Aqui aparecem apenas os candidatos que aceitaram compartilhar seus dados pessoais após aceitar sua entrevista.
        </AlertDescription>
      </Alert>

      {/* Candidatos List */}
      {candidatosFiltrados.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-12 text-center">
            <p className="text-gray-600">Nenhum candidato encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {candidatosFiltrados.map((candidato) => {
            const status = getStatusBadge(candidato.statusProcesso)
            return (
              <Card key={candidato.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{candidato.nome}</h3>
                          <p className="text-sm text-gray-600">{candidato.email}</p>
                        </div>
                        <Badge className={`${status.className} text-white`}>
                          {status.label}
                        </Badge>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-2">Competências</p>
                        <div className="flex gap-2 flex-wrap">
                          {candidato.competencias.map((comp) => (
                            <Badge key={comp} variant="outline" className="bg-[#25D9B8]/10 border-[#24BFB0]/30 text-[#03565C]">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Contato em: {new Date(candidato.dataContato).toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    <Button className="gap-2 bg-[#03565C] hover:bg-[#024147]">
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
