"use client"

import { useEffect, useState } from "react"

interface IbgeEstado {
  id: number
  sigla: string
  nome: string
}

interface IbgeCidade {
  id: number
  nome: string
}

const IBGE_API_BASE = "https://servicodados.ibge.gov.br/api/v1/localidades"

export function useIbgeLocations(selectedUf?: string) {
  const [estados, setEstados] = useState<IbgeEstado[]>([])
  const [cidades, setCidades] = useState<IbgeCidade[]>([])
  const [loadingEstados, setLoadingEstados] = useState(true)
  const [loadingCidades, setLoadingCidades] = useState(false)

  useEffect(() => {
    let mounted = true

    const carregarEstados = async () => {
      setLoadingEstados(true)
      try {
        const response = await fetch(`${IBGE_API_BASE}/estados?orderBy=nome`)
        if (!response.ok) {
          throw new Error("Falha ao carregar estados")
        }

        const data: IbgeEstado[] = await response.json()
        if (mounted) {
          setEstados(data)
        }
      } catch {
        if (mounted) {
          setEstados([])
        }
      } finally {
        if (mounted) {
          setLoadingEstados(false)
        }
      }
    }

    carregarEstados()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const carregarCidades = async (uf: string) => {
      setLoadingCidades(true)
      try {
        const response = await fetch(`${IBGE_API_BASE}/estados/${uf}/municipios`)
        if (!response.ok) {
          throw new Error("Falha ao carregar cidades")
        }

        const data: IbgeCidade[] = await response.json()
        if (mounted) {
          setCidades(data)
        }
      } catch {
        if (mounted) {
          setCidades([])
        }
      } finally {
        if (mounted) {
          setLoadingCidades(false)
        }
      }
    }

    if (!selectedUf) {
      setCidades([])
      setLoadingCidades(false)
      return () => {
        mounted = false
      }
    }

    carregarCidades(selectedUf)

    return () => {
      mounted = false
    }
  }, [selectedUf])

  return {
    estados,
    cidades,
    loadingEstados,
    loadingCidades,
  }
}
