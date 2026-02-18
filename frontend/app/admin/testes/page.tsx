"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Pencil, Trash2, Plus, X, GraduationCap, Upload, HelpCircle, FileText } from "lucide-react"
import type { Teste, Questao } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { useEffect, useRef } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TODAS_AREAS, getAreaById } from "@/lib/areas-competencias"
import { AdminCompetenciasModal } from "@/components/admin-competencias-modal"

export default function AdminTestesPage() {
  const [testes, setTestes] = useState<Teste[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [nivelFiltro, setNivelFiltro] = useState<"" | "1" | "2" | "3" | "4" | "5">("")
  const [habilidadeFiltro, setHabilidadeFiltro] = useState("")

  const [dialogCriarEditarOpen, setDialogCriarEditarOpen] = useState(false)
  const [dialogVerOpen, setDialogVerOpen] = useState(false)
  const [dialogNovaCompetenciaOpen, setDialogNovaCompetenciaOpen] = useState(false)
  const [dialogGerenciarCompetenciasOpen, setDialogGerenciarCompetenciasOpen] = useState(false)
  const [modoEdicao, setModoEdicao] = useState<"create" | "edit">("create")
  const [testeSelecionado, setTesteSelecionado] = useState<Teste | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [questoesImportadas, setQuestoesImportadas] = useState<Questao[]>([])
  const [erroImportacao, setErroImportacao] = useState("")
  const [abaPrincipal, setAbaPrincipal] = useState<"manual" | "importacao">("manual")

  const [novaCompetencia, setNovaCompetencia] = useState({
    area_atuacao: "",
    competencia: "",
    descricao: "",
  })
  const [criacaoCarregando, setCriacaoCarregando] = useState(false)
  const [competenciasCarregando, setCompetenciasCarregando] = useState(false)
  const [competenciasPorArea, setCompetenciasPorArea] = useState<Record<string, Array<{id: string; nome: string}>>>({})


  useEffect(() => {
    fetchTestes()
  }, [])

  const fetchTestes = async () => {
    try {
      setLoading(true)
      
      if (typeof window === 'undefined') {
        return
      }
      
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.error('Token não encontrado', {
          description: 'Faça login novamente.',
          duration: 4000,
        })
        setLoading(false)
        return
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/testes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (response.status === 401) {
        toast.error('Sessão expirada', {
          description: 'Sua sessão expirou. Por favor, faça login novamente.',
          duration: 5000,
        })
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
        return
      }

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: Falha ao carregar testes`)
      }

      const data = await response.json()

      // Mapear os dados da API para o formato esperado
      const testesData = Array.isArray(data) ? data : (data.testes || data.data || [])
      
      const testesMapeados = testesData.map((t: any) => {
        // Extrair o número do nível da string (ex: "Nível 3 - Intermediário" -> 3)
        let nivelNum = 1
        if (typeof t.nivel === 'string') {
          const nivelMatch = t.nivel.match(/Nível (\d+)/)
          nivelNum = nivelMatch ? parseInt(nivelMatch[1]) : 1
        } else if (typeof t.nivel === 'number') {
          nivelNum = t.nivel
        }
        
        return {
          id: t.id.toString(),
          nome: t.nome || '',
          descricao: t.descricao || '',
          nivel: nivelNum as 1 | 2 | 3,
          habilidade: t.habilidade || '',
          questoes: (t.questions || t.questoes || []).map((q: any) => {
            // Mapear alternativas da API (podem vir como 'alternatives' ou 'alternativas')
            const alternativasAPI = q.alternatives || q.alternativas || []
            const alternativasTexto = alternativasAPI.map((a: any) => {
              // Se for string, usa direto; se for objeto, pega a propriedade texto
              return typeof a === 'string' ? a : (a.texto || a.text || '')
            })
            
            // Encontrar índice da resposta correta
            const respostaCorretaIdx = alternativasAPI.findIndex((a: any) => 
              typeof a === 'object' ? a.is_correct === true : false
            )

            return {
              id: q.id?.toString() || `${Date.now()}-${Math.random()}`,
              pergunta: q.texto_questao || q.pergunta || '',
              alternativas: alternativasTexto,
              respostaCorreta: respostaCorretaIdx >= 0 ? respostaCorretaIdx : 0,
              nivel: nivelNum as 1 | 2 | 3 | 4,
            }
          }),
          createdAt: t.created_at ? new Date(t.created_at) : new Date(),
          createdBy: t.created_by?.toString() || '1',
        }
      })
      
      setTestes(testesMapeados)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar testes'
      toast.error('Erro ao carregar testes', {
        description: errorMessage,
        duration: 4000,
      })
      setTestes([])
    } finally {
      setLoading(false)
    }
  }

  const converterNivel = (nivel: string): 1 | 2 | 3 => {
    const n = nivel.toLowerCase()
    if (n.includes("bás") || n.includes("bas") || n.includes("iniciante")) return 1
    if (n.includes("inter")) return 2
    return 3
  }

  const respostaParaIndice = (r: string) =>
    ({ A: 0, B: 1, C: 2, D: 3 } as Record<string, number>)[
      r.toUpperCase()
    ] ?? 0

  const processarCSVouXLSX = async (file: File) => {
    setErroImportacao("")
    const rows: any[] = []

    if (file.name.endsWith(".csv")) {
      const text = await file.text()
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      rows.push(...(parsed.data as any[]))
    } else {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      rows.push(...XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]))
    }

    const questoes: Questao[] = []
    const erros: string[] = []

    rows.forEach((r, i) => {
      // Normalizar chaves do objeto para lowercase (remover espaços e acentos)
      const rowNormalizado: any = {}
      Object.keys(r).forEach(key => {
        const keyNormal = key.toLowerCase().trim()
        rowNormalizado[keyNormal] = r[key]
      })

      const habilidade = rowNormalizado.habilidade || rowNormalizado.competencia || ""
      const pergunta = rowNormalizado.pergunta || rowNormalizado.questao || ""

      if (!habilidade || !pergunta) {
        erros.push(`Linha ${i + 2}: habilidade/pergunta ausente`)
        return
      }

      const opcoes = [
        rowNormalizado.opcao_a || rowNormalizado.optiona,
        rowNormalizado.opcao_b || rowNormalizado.optionb,
        rowNormalizado.opcao_c || rowNormalizado.optionc,
        rowNormalizado.opcao_d || rowNormalizado.optiond
      ].filter(Boolean)
      
      if (opcoes.length < 2) {
        erros.push(`Linha ${i + 2}: mínimo 2 opções`)
        return
      }

      const nivel = rowNormalizado.nivel || rowNormalizado.level || "Iniciante"
      const nivelNum = converterNivel(nivel)
      const resposta = rowNormalizado.resposta_correta || rowNormalizado.respostacorreta || rowNormalizado.correct_answer || "A"

      questoes.push({
        id: `import-${Date.now()}-${i}`,
        pergunta: pergunta,
        alternativas: opcoes,
        respostaCorreta: respostaParaIndice(resposta),
        nivelDificuldade: nivelNum === 1 ? "facil" : nivelNum === 2 ? "medio" : "dificil",
        nivel: nivelNum,
        habilidade: habilidade,
      } as Questao)
    })

    if (erros.length) {
      setErroImportacao(erros.slice(0, 5).join("\n"))
      return
    }

    if (questoes.length === 0) {
      setErroImportacao("Nenhuma questão válida foi encontrada no arquivo")
      return
    }

    setQuestoesImportadas(questoes)
    toast.success(`${questoes.length} questões importadas com sucesso!`)
  }

  const [form, setForm] = useState({
    area_atuacao: "",
    competencia: "",
    descricao: "",
    nivel: 1 as 1 | 2 | 3,
    questoes: [] as {
      id: string
      pergunta: string
      alternativas: string[]
      respostaCorreta: number
      nivel: 1 | 2 | 3
    }[],
  })

  const habilidadesUnicas = useMemo(() => {
    const habs = new Set<string>()
    testes.forEach((t) => {
      if (t.habilidade) habs.add(t.habilidade)
    })
    return Array.from(habs).sort()
  }, [testes])

  const testesFiltrados = useMemo(() => {
    const search = busca.trim().toLowerCase()
    return testes.filter((t) => {
      const matchBusca =
        !search ||
        (t.nome?.toLowerCase().includes(search) ?? false) ||
        (t.descricao?.toLowerCase().includes(search) ?? false) ||
        (t.habilidade?.toLowerCase().includes(search) ?? false)
      const matchNivel = !nivelFiltro || t.nivel === Number.parseInt(nivelFiltro)
      const matchHabilidade = !habilidadeFiltro || t.habilidade?.toLowerCase() === habilidadeFiltro.toLowerCase()
      return matchBusca && matchNivel && matchHabilidade
    })
  }, [testes, busca, nivelFiltro, habilidadeFiltro])

  const abrirCriar = () => {
    setModoEdicao("create")
    setTesteSelecionado(null)
    setForm({
      area_atuacao: "",
      competencia: "",
      descricao: "",
      nivel: 1,
      questoes: [],
    })
    setDialogCriarEditarOpen(true)
  }

  const normalizarNivel = (nivel: any): 1 | 2 | 3 => {
    if (nivel === 4) return 3 // Converter 4 para 3 (backward compatibility)
    return (nivel as 1 | 2 | 3) || 2
  }

  const abrirEditar = (t: Teste) => {
    setModoEdicao("edit")
    setTesteSelecionado(t)
    const nivelNormalizado = normalizarNivel(t.nivel)
    setForm({
      area_atuacao: t.area_atuacao || "",
      competencia: t.competencia || "",
      descricao: t.descricao || "",
      nivel: nivelNormalizado,
      questoes: t.questoes.map((q) => ({
        id: q.id,
        pergunta: q.pergunta,
        alternativas: q.alternativas,
        respostaCorreta: q.respostaCorreta,
        nivel: normalizarNivel(q.nivel),
      })),
    })
    setDialogCriarEditarOpen(true)
  }

  const abrirVer = (t: Teste) => {
    setTesteSelecionado(t)
    setDialogVerOpen(true)
  }

  const addQuestao = () => {
    setForm((f) => ({
      ...f,
      questoes: [
        ...f.questoes,
        {
          id: `${Date.now()}-${f.questoes.length}`,
          pergunta: "",
          alternativas: ["", "", "", ""],
          respostaCorreta: 0,
          nivel: f.nivel,
        },
      ],
    }))
  }

  const removeQuestao = (id: string) => {
    setForm((f) => ({ ...f, questoes: f.questoes.filter((q) => q.id !== id) }))
  }

  const updateQuestao = (id: string, updates: Partial<(typeof form.questoes)[0]>) => {
    setForm((f) => ({
      ...f,
      questoes: f.questoes.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }))
  }

  const updateAlternativa = (questaoId: string, index: number, value: string) => {
    setForm((f) => ({
      ...f,
      questoes: f.questoes.map((q) => {
        if (q.id === questaoId) {
          const novasAlternativas = [...q.alternativas]
          novasAlternativas[index] = value
          return { ...q, alternativas: novasAlternativas }
        }
        return q
      }),
    }))
  }

  const carregarCompetenciasPorArea = async (areaId: string) => {
    if (!areaId) return
    
    // Se já foi carregada, usa do cache
    if (competenciasPorArea[areaId]) {
      return
    }

    try {
      setCompetenciasCarregando(true)
      const token = localStorage.getItem("token")

      if (!token) {
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/competencias-por-area/${areaId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const competencias = Array.isArray(data) ? data : data.competencias || []
        
        setCompetenciasPorArea((prev) => ({
          ...prev,
          [areaId]: competencias.map((c: any) => ({
            id: c.id,
            nome: c.nome,
          })),
        }))
      }
    } catch (error) {
    } finally {
      setCompetenciasCarregando(false)
    }
  }

  const criarNovaCompetencia = async () => {
    if (!novaCompetencia.area_atuacao || !novaCompetencia.competencia) {
      toast.error('Preenchimento incompleto', {
        description: 'Preencha a área e o nome da competência.',
        duration: 4000,
      })
      return
    }

    try {
      setCriacaoCarregando(true)
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.error('Token não encontrado. Faça login novamente.')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/competencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nome: novaCompetencia.competencia,
          area: novaCompetencia.area_atuacao,
          descricao: novaCompetencia.descricao || ""
        })
      })

      if (response.status === 401) {
        toast.error('Sessão expirada', {
          description: 'Sua sessão expirou. Por favor, faça login novamente.',
          duration: 5000,
        })
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao criar competência')
      }

      toast.success('Competência criada com sucesso!', {
        duration: 3000,
      })

      // Limpar cache para recarregar competências da área
      if (novaCompetencia.area_atuacao) {
        setCompetenciasPorArea((prev) => {
          const newState = { ...prev }
          delete newState[novaCompetencia.area_atuacao]
          return newState
        })
      }

      setNovaCompetencia({
        area_atuacao: "",
        competencia: "",
        descricao: "",
      })
      setDialogNovaCompetenciaOpen(false)
      // Force reload das áreas (vai pegar os dados atualizados)
      fetchTestes()
    } catch (error) {
      toast.error('Erro ao criar competência', {
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
        duration: 5000,
      })
    } finally {
      setCriacaoCarregando(false)
    }
  }

  const salvar = async () => {
    // Validar dados básicos
    if (!form.area_atuacao || !form.competencia) {
      toast.error('Preenchimento incompleto', {
        description: 'Selecione a área e a competência do teste.',
        duration: 4000,
      })
      return
    }

    // Validar que há questões
    if (form.questoes.length === 0) {
      toast.error('Sem questões', {
        description: 'O teste precisa ter pelo menos uma questão.',
        duration: 4000,
      })
      return
    }

    // Filtrar questões válidas (com pergunta e todas as alternativas preenchidas)
    const questoesValidas = form.questoes.filter((q) => {
      const temPergunta = q.pergunta.trim().length > 0
      const temTodasAlternativas = q.alternativas.length >= 2 && q.alternativas.every((a) => a.trim().length > 0)
      return temPergunta && temTodasAlternativas
    })
    
    // Validar que há pelo menos uma questão válida
    if (questoesValidas.length === 0) {
      toast.error('Questões inválidas', {
        description: 'Cada questão precisa ter uma pergunta e pelo menos 2 alternativas preenchidas.',
        duration: 5000,
      })
      return
    }

    if (modoEdicao === "create") {
      try {
        const token = localStorage.getItem('token')
        
        if (!token) {
          alert('Token não encontrado. Faça login novamente.')
          return
        }

        // Formatar dados para a API
        const payload = {
          area: form.area_atuacao,
          competencia_id: form.competencia,
          nivel: form.nivel,
          descricao: form.descricao || "",
          questions: questoesValidas.map((q, idx) => {
            const alternatives = q.alternativas
              .filter(a => a.trim().length > 0) // Remove alternativas vazias
              .map((texto, altIdx) => ({
                texto: texto.trim(),
                is_correct: altIdx === q.respostaCorreta,
                ordem: altIdx
              }))

            return {
              texto_questao: q.pergunta,
              ordem: idx + 1,
              alternatives: alternatives
            }
          })
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/testes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        })

        if (response.status === 401) {
          toast.error('Sessão expirada', {
            description: 'Sua sessão expirou. Por favor, faça login novamente.',
            duration: 5000,
          })
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
          return
        }

        if (!response.ok) {
          const responseText = await response.text()
          
          let errorMessage = `Erro ${response.status}: ${response.statusText}`
          try {
            const errorData = JSON.parse(responseText)
            if (errorData.detail) {
              errorMessage = typeof errorData.detail === 'string' 
                ? errorData.detail 
                : JSON.stringify(errorData.detail)
            }
          } catch (e) {
            // Se não for JSON válido, usa o responseText
            if (responseText) errorMessage = responseText
          }
          
          toast.error('Erro ao criar teste', {
            description: errorMessage,
            duration: 5000,
          })
          return
        }

        const novoTeste = await response.json()
      
        // Mostrar toast de sucesso ANTES de fechar
        toast.success('Teste criado com sucesso!', {
          description: `O teste foi criado e está disponível para uso.`,
          duration: 3000,
        })
        
        // Recarregar lista de testes
        await fetchTestes()
        
        // DEPOIS fechar o modal e limpar estado
        setTimeout(() => {
          setDialogCriarEditarOpen(false)
          setQuestoesImportadas([])
          setErroImportacao("")
          setAbaPrincipal("manual")
          setForm({
            area_atuacao: "",
            competencia: "",
            descricao: "",
            nivel: 1,
            questoes: [],
          })
        }, 500)
        
        return
      } catch (error) {
      }
    } else if (testeSelecionado) {
      try {
        const token = localStorage.getItem('token')
        
        if (!token) {
          toast.error('Token não encontrado', {
            description: 'Faça login novamente.',
            duration: 4000,
          })
          return
        }

        // Formatar dados para a API
        const payload = {
          area: form.area_atuacao,
          competencia_id: form.competencia,
          nivel: form.nivel,
          descricao: form.descricao || "",
          questions: questoesValidas.map((q, idx) => {
            const alternatives = q.alternativas
              .filter(a => a.trim().length > 0) // Remove alternativas vazias
              .map((texto, altIdx) => ({
                texto: texto.trim(),
                is_correct: altIdx === q.respostaCorreta,
                ordem: altIdx
              }))

            return {
              texto_questao: q.pergunta,
              ordem: idx + 1,
              alternatives: alternatives
            }
          })
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/testes/${testeSelecionado.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        })

        if (response.status === 401) {
          toast.error('Sessão expirada', {
            description: 'Sua sessão expirou. Por favor, faça login novamente.',
            duration: 5000,
          })
          setTimeout(() => {
            window.location.href = '/login'
          }, 2000)
          return
        }

        if (!response.ok) {
          const responseText = await response.text()
          
          let errorMessage = `Erro ${response.status}: ${response.statusText}`
          let isConstraintError = false
          
          try {
            const errorData = JSON.parse(responseText)
            if (errorData.detail) {
              const detail = typeof errorData.detail === 'string' 
                ? errorData.detail 
                : JSON.stringify(errorData.detail)
              
              // Detectar erro de foreign key constraint
              if (detail.includes('ForeignKeyViolation') || detail.includes('foreign key constraint')) {
                isConstraintError = true
                errorMessage = 'Não é possível atualizar este teste devido a restrições do banco de dados.'
              } else {
                errorMessage = detail
              }
            }
          } catch (e) {
            // Se não for JSON válido, usa o responseText
            if (responseText) errorMessage = responseText
          }
          
          toast.error('Erro ao atualizar teste', {
            description: errorMessage,
            duration: isConstraintError ? 8000 : 5000,
            action: isConstraintError ? {
              label: 'Workaround',
              onClick: () => {
                toast.info('Solução alternativa', {
                  description: 'Por favor, delete este teste e crie um novo com as alterações desejadas.',
                  duration: 6000,
                })
              }
            } : undefined
          })
          return
        }

        const testeAtualizado = await response.json()
      
        // Mostrar toast de sucesso ANTES de fechar
        toast.success('Teste atualizado com sucesso!', {
          description: `O teste foi atualizado.`,
          duration: 3000,
        })
        
        // Recarregar lista de testes
        await fetchTestes()
        
        // DEPOIS fechar o modal e limpar estado
        setTimeout(() => {
          setDialogCriarEditarOpen(false)
          setQuestoesImportadas([])
          setErroImportacao("")
          setAbaPrincipal("manual")
          setForm({
            area_atuacao: "",
            competencia: "",
            descricao: "",
            nivel: 1,
            questoes: [],
          })
        }, 500)
      } catch (error) {
        toast.error('Erro ao atualizar teste', {
          description: 'Não foi possível atualizar o teste. Tente novamente.',
          duration: 4000,
        })
      }
    }
  }

  const remover = async (id: string) => {
    // Confirmar antes de excluir
    const teste = testes.find(t => t.id === id)
    if (!teste) return
    
    const confirmacao = window.confirm(`Tem certeza que deseja excluir o teste "${teste.nome}"? Esta ação não pode ser desfeita.`)
    if (!confirmacao) return

    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.error('Token não encontrado', {
          description: 'Faça login novamente.',
          duration: 4000,
        })
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/testes/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401) {
        toast.error('Sessão expirada', {
          description: 'Sua sessão expirou. Por favor, faça login novamente.',
          duration: 5000,
        })
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error('Erro ao excluir teste', {
          description: errorData.detail || 'Não foi possível excluir o teste.',
          duration: 4000,
        })
        return
      }

      // Recarregar lista de testes
      await fetchTestes()
      
      // Mostrar toast de sucesso
      toast.success('Teste excluído com sucesso!', {
        description: `O teste "${teste.nome}" foi removido.`,
        duration: 4000,
      })
    } catch (error) {

      toast.error('Erro ao excluir teste', {
        description: 'Não foi possível excluir o teste. Tente novamente.',
        duration: 4000,
      })
    }
  }

  const getNivelLabel = (nivel: number) => {
    const labels: Record<number, string> = {
      1: "Iniciante",
      2: "Intermediário",
      3: "Avançado",
    }
    return labels[nivel] || `Nível ${nivel}`
  }

  const getNivelColor = (nivel: number) => {
    const colors: Record<number, string> = {
      1: "bg-gray-100 text-gray-700",
      2: "bg-yellow-100 text-yellow-700",
      3: "bg-orange-100 text-orange-700",
    }
    return colors[nivel] || "bg-gray-100 text-gray-700"
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestão de Testes</h1>
            <p className="text-gray-600 mt-2">
              Crie testes com questões de múltipla escolha, níveis de dificuldade e habilidades específicas
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button 
              variant="outline"
              onClick={() => setDialogGerenciarCompetenciasOpen(true)}
            >
              Gerenciar Competências
            </Button>
            <Button onClick={() => {
              setModoEdicao("create")
              setTesteSelecionado(null)
              setAbaPrincipal("manual")
              setQuestoesImportadas([])
              setErroImportacao("")
              setDialogCriarEditarOpen(true)
            }} className="bg-[#03565C] hover:bg-[#024a4f]">
              <Plus className="h-4 w-4 mr-2" />
              Novo Teste
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Filtros</CardTitle>
            <CardDescription>Busque e filtre testes por habilidade, nível e palavras-chave</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="busca">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="busca"
                    placeholder="Nome, habilidade ou descrição..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="habilidade">Habilidade</Label>
                <Select value={habilidadeFiltro} onValueChange={(v) => setHabilidadeFiltro(v === "all" ? "" : v)}>
                  <SelectTrigger id="habilidade">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {habilidadesUnicas.map((hab) => (
                      <SelectItem key={hab} value={hab}>
                        {hab}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">Nível</Label>
                <Select value={nivelFiltro} onValueChange={(v) => setNivelFiltro(v === "all" ? "" : (v as any))}>
                  <SelectTrigger id="nivel">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="1">Nível 1 - Iniciante</SelectItem>
                    <SelectItem value="2">Nível 2 - Intermediário</SelectItem>
                    <SelectItem value="3">Nível 3 - Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">Testes</CardTitle>
            <CardDescription>{testesFiltrados.length} resultados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Habilidade</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Questões</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03565C]"></div>
                          <p className="text-gray-600">Carregando testes...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : testesFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        Nenhum teste cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    testesFiltrados.map((t) => (
                      <TableRow key={t.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          {t.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.habilidade}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getNivelColor(t.nivel)}>{getNivelLabel(t.nivel)}</Badge>
                      </TableCell>
                      <TableCell>{t.questoes?.length ?? 0}</TableCell>
                      <TableCell>{t.createdAt.toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => abrirVer(t)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => abrirEditar(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remover(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogCriarEditarOpen} onOpenChange={setDialogCriarEditarOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modoEdicao === "create" ? "Novo Teste" : "Editar Teste"}</DialogTitle>
            <DialogDescription>{abaPrincipal === "importacao" ? "Questões importadas prontas para vinculação" : "Preencha as informações do teste e adicione questões com alternativas"}</DialogDescription>
          </DialogHeader>

          <Tabs value={abaPrincipal} onValueChange={(v) => setAbaPrincipal(v as any)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="importacao">Importadas ({questoesImportadas.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="area-form">Área de Atuação</Label>
                  <Select
                    value={form.area_atuacao}
                    onValueChange={(value) => {
                      setForm((f) => ({ ...f, area_atuacao: value, competencia: "" }))
                      carregarCompetenciasPorArea(value)
                    }}
                  >
                    <SelectTrigger id="area-form">
                      <SelectValue placeholder="Selecione uma área" />
                    </SelectTrigger>
                    <SelectContent>
                      {TODAS_AREAS.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="competencia-form">Competência</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDialogNovaCompetenciaOpen(true)}
                      className="h-auto p-0 text-blue-600 hover:text-blue-700"
                    >
                      + Nova
                    </Button>
                  </div>
                  <Select
                    value={form.competencia}
                    onValueChange={(value) => setForm((f) => ({ ...f, competencia: value }))}
                    disabled={!form.area_atuacao || competenciasCarregando}
                  >
                    <SelectTrigger id="competencia-form">
                      <SelectValue placeholder={form.area_atuacao ? (competenciasCarregando ? "Carregando..." : "Selecione uma competência") : "Selecione uma área primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {form.area_atuacao && (competenciasPorArea[form.area_atuacao] || []).map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nivel-form">Nível</Label>
                  {abaPrincipal === "importacao" && questoesImportadas.length > 0 ? (
                    <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600 text-sm">
                      {form.nivel ? `Nível ${form.nivel} - ${getNivelLabel(form.nivel)}` : "Será definido pelas questões importadas"}
                    </div>
                  ) : (
                    <Select
                      value={form.nivel.toString()}
                      onValueChange={(v) => setForm((f) => ({ ...f, nivel: Number.parseInt(v) as any }))}
                    >
                      <SelectTrigger id="nivel-form">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Nível 1 - Iniciante</SelectItem>
                        <SelectItem value="2">Nível 2 - Intermediário</SelectItem>
                        <SelectItem value="3">Nível 3 - Avançado</SelectItem>
                        <SelectItem value="4">Nível 4 - Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descreva o objetivo e conteúdo do teste..."
                  rows={2}
                />
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Questões</Label>
                <Button type="button" onClick={addQuestao} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Questão
                </Button>
              </div>

              {form.questoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                  Nenhuma questão adicionada. Clique em "Adicionar Questão" para começar.
                </p>
              ) : (
                <div className="space-y-6">
                  {form.questoes.map((q, idx) => (
                    <Card key={q.id}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">Questão {idx + 1}</CardTitle>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestao(q.id)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`pergunta-${q.id}`}>Pergunta</Label>
                          <Textarea
                            id={`pergunta-${q.id}`}
                            value={q.pergunta}
                            onChange={(e) => updateQuestao(q.id, { pergunta: e.target.value })}
                            placeholder="Escreva a pergunta..."
                            rows={2}
                          />
                        </div>

                        <div className="space-y-3">
                          <Label>Alternativas</Label>
                          <RadioGroup
                            value={q.respostaCorreta.toString()}
                            onValueChange={(v) => updateQuestao(q.id, { respostaCorreta: Number.parseInt(v) })}
                          >
                            {q.alternativas.map((alt, altIdx) => (
                              <div key={altIdx} className="flex items-center gap-3">
                                <RadioGroupItem value={altIdx.toString()} id={`${q.id}-alt-${altIdx}`} />
                                <div className="flex-1">
                                  <Input
                                    value={alt}
                                    onChange={(e) => updateAlternativa(q.id, altIdx, e.target.value)}
                                    placeholder={`Alternativa ${String.fromCharCode(65 + altIdx)}`}
                                  />
                                </div>
                                {q.respostaCorreta === altIdx && (
                                  <Badge variant="default" className="text-xs">
                                    Correta
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </RadioGroup>
                          <p className="text-xs text-muted-foreground">
                            Selecione a alternativa correta clicando no círculo ao lado
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`nivel-questao-${q.id}`}>Nível da Questão</Label>
                          <Select
                            value={q.nivel.toString()}
                            onValueChange={(v) => updateQuestao(q.id, { nivel: Number.parseInt(v) as any })}
                          >
                            <SelectTrigger id={`nivel-questao-${q.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Nível 1 - Iniciante</SelectItem>
                              <SelectItem value="2">Nível 2 - Intermediário</SelectItem>
                              <SelectItem value="3">Nível 3 - Avançado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" type="button" onClick={() => setDialogCriarEditarOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={salvar} disabled={!form.area_atuacao || !form.competencia || form.questoes.length === 0}>
                {modoEdicao === "create" ? "Criar Teste" : "Salvar Alterações"}
              </Button>
            </div>
            </TabsContent>

            <TabsContent value="importacao" className="space-y-4">
              <div className="space-y-4">
                {/* Modelo de Arquivo */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Formato Esperado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-blue-700">
                      Seu arquivo CSV/XLSX deve conter as seguintes colunas:
                    </p>
                    <div className="bg-white rounded border border-blue-200 p-3 overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead>
                          <tr className="border-b border-blue-200">
                            <th className="text-left p-2 font-semibold text-blue-900">habilidade</th>
                            <th className="text-left p-2 font-semibold text-blue-900">nivel</th>
                            <th className="text-left p-2 font-semibold text-blue-900">pergunta</th>
                            <th className="text-left p-2 font-semibold text-blue-900">opcao_a</th>
                            <th className="text-left p-2 font-semibold text-blue-900">opcao_b</th>
                            <th className="text-left p-2 font-semibold text-blue-900">opcao_c</th>
                            <th className="text-left p-2 font-semibold text-blue-900">opcao_d</th>
                            <th className="text-left p-2 font-semibold text-blue-900">resposta_correta</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-blue-100">
                            <td className="p-2 text-blue-700">JavaScript</td>
                            <td className="p-2 text-blue-700">Básico</td>
                            <td className="p-2 text-blue-700">O que é uma variável?</td>
                            <td className="p-2 text-blue-700">Um local para armazenar dados</td>
                            <td className="p-2 text-blue-700">Uma função</td>
                            <td className="p-2 text-blue-700">Um objeto especial</td>
                            <td className="p-2 text-blue-700">Uma biblioteca</td>
                            <td className="p-2 text-blue-700">A</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      <strong>Dicas:</strong> Use "Iniciante", "Intermediário", "Avançado" ou "Expert" para o nível. Use A, B, C ou D para a resposta correta.
                    </p>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2 pb-4 border-b flex-wrap">
                  <Button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Selecionar Arquivo CSV/XLSX
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = '/exemplo_questoes_template.csv'
                      link.download = 'exemplo_questoes_template.csv'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Baixar Modelo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0]
                      if (file) {
                        processarCSVouXLSX(file)
                      }
                    }}
                    className="hidden"
                  />
                  <span className="text-sm text-muted-foreground">
                    Importe questões de um arquivo CSV ou XLSX
                  </span>
                </div>

                {erroImportacao && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{erroImportacao}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="area-import">Área de Atuação</Label>
                    <Select
                      value={form.area_atuacao}
                      onValueChange={(value) => {
                        setForm((f) => ({ ...f, area_atuacao: value, competencia: "" }))
                        carregarCompetenciasPorArea(value)
                      }}
                    >
                      <SelectTrigger id="area-import">
                        <SelectValue placeholder="Selecione uma área" />
                      </SelectTrigger>
                      <SelectContent>
                        {TODAS_AREAS.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="competencia-import">Competência</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDialogNovaCompetenciaOpen(true)}
                        className="h-auto p-0 text-blue-600 hover:text-blue-700"
                      >
                        + Nova
                      </Button>
                    </div>
                    <Select
                      value={form.competencia}
                      onValueChange={(value) => setForm((f) => ({ ...f, competencia: value }))}
                      disabled={!form.area_atuacao || competenciasCarregando}
                    >
                      <SelectTrigger id="competencia-import">
                        <SelectValue placeholder={form.area_atuacao ? (competenciasCarregando ? "Carregando..." : "Selecione uma competência") : "Selecione uma área primeiro"} />
                      </SelectTrigger>
                      <SelectContent>
                        {form.area_atuacao && (competenciasPorArea[form.area_atuacao] || []).map((comp) => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nivel-import">Nível</Label>
                    <Select
                      value={form.nivel.toString()}
                      onValueChange={(v) => setForm((f) => ({ ...f, nivel: Number.parseInt(v) as any }))}
                    >
                      <SelectTrigger id="nivel-import">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Nível 1 - Iniciante</SelectItem>
                        <SelectItem value="2">Nível 2 - Intermediário</SelectItem>
                        <SelectItem value="3">Nível 3 - Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="descricao-import">Descrição</Label>
                    <Textarea
                      id="descricao-import"
                      value={form.descricao}
                      onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                      placeholder="Descreva o objetivo e conteúdo do teste..."
                      rows={2}
                    />
                  </div>
                </div>

                {questoesImportadas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                    Nenhuma questão importada. Volte ao dialog de importação para selecionar um arquivo.
                  </p>
                ) : (
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-green-700 font-medium mb-3">
                        ✓ {questoesImportadas.length} questões prontas para serem vinculadas:
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {questoesImportadas.map((q, idx) => (
                          <p key={idx} className="text-xs text-green-600 truncate">
                            {idx + 1}. {q.pergunta}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setDialogCriarEditarOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    // Adicionar questões importadas ao form
                    setForm((f) => ({
                      ...f,
                      questoes: questoesImportadas.map((q) => ({
                        id: q.id,
                        pergunta: q.pergunta,
                        alternativas: q.alternativas,
                        respostaCorreta: q.respostaCorreta,
                        nivel: normalizarNivel(q.nivel),
                      })),
                    }))
                    toast.success('Questões importadas adicionadas ao teste')
                    salvar()
                  }}
                  disabled={!form.area_atuacao || !form.competencia || questoesImportadas.length === 0}
                >
                  {modoEdicao === "create" ? "Criar Teste com Importados" : "Salvar Alterações"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver */}
      <Dialog open={dialogVerOpen} onOpenChange={setDialogVerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Teste</DialogTitle>
            <DialogDescription>
              {testeSelecionado?.nome} • {testeSelecionado && getNivelLabel(testeSelecionado.nivel)}
            </DialogDescription>
          </DialogHeader>
          {testeSelecionado && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Habilidade:</span> {testeSelecionado.habilidade}
                    </div>
                    <div>
                      <span className="font-medium">Nível:</span>{" "}
                      <Badge className={getNivelColor(testeSelecionado.nivel)}>
                        {getNivelLabel(testeSelecionado.nivel)}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Total de Questões:</span> {testeSelecionado.questoes?.length ?? 0}
                    </div>
                  </CardContent>
                </Card>

                {testeSelecionado.descricao && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Descrição</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{testeSelecionado.descricao}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Questões</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {testeSelecionado.questoes.map((q, idx) => (
                      <div key={q.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <p className="font-medium">
                            {idx + 1}. {q.pergunta}
                          </p>
                          <Badge className={getNivelColor(q.nivel)} variant="outline">
                            {getNivelLabel(q.nivel)}
                          </Badge>
                        </div>
                        <div className="space-y-2 pl-6">
                          {q.alternativas.map((alt, altIdx) => (
                            <div
                              key={altIdx}
                              className={`p-2 rounded ${
                                q.respostaCorreta === altIdx ? "bg-green-50 border-l-2 border-green-500" : ""
                              }`}
                            >
                              <span className="font-medium mr-2">{String.fromCharCode(65 + altIdx)}.</span>
                              {alt}
                              {q.respostaCorreta === altIdx && (
                                <Badge variant="default" className="ml-2 text-xs">
                                  Correta
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Competência */}
      <Dialog open={dialogNovaCompetenciaOpen} onOpenChange={setDialogNovaCompetenciaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Competência</DialogTitle>
            <DialogDescription>
              Crie uma nova competência para usar nos testes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-area">Área de Atuação</Label>
              <Select
                value={novaCompetencia.area_atuacao}
                onValueChange={(value) => setNovaCompetencia({ ...novaCompetencia, area_atuacao: value })}
              >
                <SelectTrigger id="nova-area">
                  <SelectValue placeholder="Selecione uma área" />
                </SelectTrigger>
                <SelectContent>
                  {TODAS_AREAS.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova-competencia-nome">Nome da Competência</Label>
              <Input
                id="nova-competencia-nome"
                value={novaCompetencia.competencia}
                onChange={(e) => setNovaCompetencia({ ...novaCompetencia, competencia: e.target.value })}
                placeholder="Ex: Controladores Lógicos Programáveis"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova-competencia-descricao">Descrição (Opcional)</Label>
              <Textarea
                id="nova-competencia-descricao"
                value={novaCompetencia.descricao}
                onChange={(e) => setNovaCompetencia({ ...novaCompetencia, descricao: e.target.value })}
                placeholder="Descreva a competência..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDialogNovaCompetenciaOpen(false)}
              disabled={criacaoCarregando}
            >
              Cancelar
            </Button>
            <Button 
              onClick={criarNovaCompetencia}
              disabled={criacaoCarregando || !novaCompetencia.area_atuacao || !novaCompetencia.competencia}
              className="bg-[#03565C] hover:bg-[#024a4f]"
            >
              {criacaoCarregando ? "Criando..." : "Criar Competência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Gerenciar Competências */}
      <AdminCompetenciasModal 
        open={dialogGerenciarCompetenciasOpen}
        onOpenChange={setDialogGerenciarCompetenciasOpen}
      />
    </div>
  )
}
