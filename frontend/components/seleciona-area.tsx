"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronRight, Search } from "lucide-react"
import { TODAS_AREAS } from "@/lib/areas-competencias"
import { api } from "@/lib/api"

interface SelecionaAreaProps {
  onComplete: (areaIds: string[]) => void
  isLoading?: boolean
  multiple?: boolean
}

// Áreas disponíveis baseadas no mapa de competências
const AREAS_DISPONIVEIS = TODAS_AREAS

export function SelecionaArea({ onComplete, isLoading = false, multiple = true }: SelecionaAreaProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")

  const filteredAreas = AREAS_DISPONIVEIS.filter((area) => {
    const termo = search.trim().toLowerCase()
    if (!termo) return true
    return area.nome.toLowerCase().includes(termo) || area.descricao.toLowerCase().includes(termo)
  })

  const toggleArea = (areaId: string) => {
    if (multiple) {
      setSelectedAreas(prev => 
        prev.includes(areaId) 
          ? prev.filter(a => a !== areaId)
          : [...prev, areaId]
      )
    } else {
      setSelectedAreas([areaId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedAreas.length > 0) {
      setSubmitting(true)
      try {
        // Enviar para API (só se houver token - skip durante cadastro)
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        if (token) {
          await api.post("/api/v1/candidato/area-atuacao", { areas: selectedAreas })
        }
        onComplete(selectedAreas)
      } catch (error: any) {
        // Fallback: usar dados locais se o endpoint não estiver disponível
        onComplete(selectedAreas)
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <div className="w-full animate-in fade-in-50 slide-in-from-right-2 duration-300">
      <div className="space-y-2 mb-6">
        <h2 className="text-2xl font-semibold">Áreas de Interesse</h2>
        <p className="text-muted-foreground">Selecione {multiple ? "uma ou mais áreas" : "a área"} onde você tem maior experiência</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar área de atuação..."
            className="pl-9 h-10"
            disabled={isLoading || submitting}
          />
        </div>

        <div className="rounded-xl border bg-card shadow-sm max-h-[400px] overflow-y-auto">
          <ul className="divide-y divide-border">
            {filteredAreas.map((area) => (
              <li key={area.id}>
                <button
                  type="button"
                  onClick={() => toggleArea(area.id)}
                  disabled={isLoading || submitting}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-all text-left ${
                    selectedAreas.includes(area.id)
                      ? "bg-primary/5"
                      : "hover:bg-muted/50"
                  } ${isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  <div
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedAreas.includes(area.id)
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {selectedAreas.includes(area.id) && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-medium text-sm transition-colors ${
                      selectedAreas.includes(area.id) ? "text-primary" : "text-foreground"
                    }`}>
                      {area.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{area.descricao}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {filteredAreas.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma área encontrada para sua busca.
            </p>
          )}
        </div>

        {selectedAreas.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedAreas.length} {selectedAreas.length === 1 ? "área selecionada" : "áreas selecionadas"}
          </p>
        )}

        <Button
          type="submit"
          disabled={selectedAreas.length === 0 || isLoading || submitting}
          className="w-full h-11 gap-2"
        >
          {submitting ? "Salvando..." : isLoading ? "Carregando..." : "Continuar"}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
