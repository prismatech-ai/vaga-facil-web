"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { api } from "./api"

type User = {
  id: string
  email: string
  nome: string
  role: "admin" | "empresa" | "candidato"
}

type RegisterData = {
  email: string
  password: string
  nome: string
  role: string
  razaoSocial?: string
  cnpj?: string
  setor?: string
  cepEmpresa?: string
  pessoaDeContato?: string
  foneEmpresa?: string
  telefone?: string
  cpf?: string
  rg?: string
  dataNascimento?: string
  genero?: string
  estadoCivil?: string
  endereco?: {
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
  }
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  register: (data: RegisterData) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const mapUserType = (userType: string): "admin" | "empresa" | "candidato" => {
    const typeMap: Record<string, "admin" | "empresa" | "candidato"> = {
      admin: "admin",
      empresa: "empresa",
      candidato: "candidato",
      user: "candidato",
    }
    return typeMap[userType?.toLowerCase()] || "candidato"
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {

      const response = await api.post<{
        access_token: string
        token_type?: string
        refresh_token?: string
        user_id?: string
        user?: any
      }>("/api/v1/auth/login", { email, password })

      const { access_token, refresh_token, user } = response

      if (!access_token) {

        return false
      }

      // Salvar tokens
      localStorage.setItem("token", access_token)
      if (refresh_token) {
        localStorage.setItem("refresh_token", refresh_token)
      }

      // Se o backend não retornar `user`, decodificamos o JWT
      let resolvedUser: any = user
      if (!resolvedUser) {
        try {
          const payload = JSON.parse(atob(access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))

          resolvedUser = {
            id: payload.sub || payload.id || payload.user_id,
            email: payload.email,
            nome: payload.nome || payload.name,
            user_type: payload.user_type || payload.role || payload.type,
          }
        } catch (decodeErr) {

        }
      }

      if (!resolvedUser) {

        return false
      }

      // Criar userData a partir do objeto resolvido
      const userData: User = {
        id: String(resolvedUser.id ?? email),
        email: resolvedUser.email ?? email,
        nome: resolvedUser.nome ?? (resolvedUser.email ? resolvedUser.email.split("@")[0] : email.split("@")[0]),
        role: mapUserType(resolvedUser.user_type ?? resolvedUser.role ?? "candidato"),
      }

      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))

      return true
    } catch (error) {

      return false
    }
  }

  const register = async (data: RegisterData): Promise<boolean> => {
    try {

      const registerPayload = {
        email: data.email,
        password: data.password,
        user_type: data.role === "empresa" ? "empresa" : "candidato"
      }

      const response = await api.post<any>(
        "/api/v1/auth/register",
        registerPayload
      )

      const responseKeys = response ? Object.keys(response) : []

      // Checar primeiro se a resposta está vazia (201 Created sem corpo)
      if (!response || responseKeys.length === 0) {

        const userData: User = {
          id: data.email,
          email: data.email,
          nome: data.nome || data.email.split("@")[0],
          role: mapUserType(data.role),
        }

        setUser(userData)
        localStorage.setItem("user", JSON.stringify(userData))

        return true
      }

      const token = response?.access_token || response?.token
      const refresh_token = response?.refresh_token

      if (!token) {

        return false
      }

      localStorage.setItem("token", token)
      if (refresh_token) {
        localStorage.setItem("refresh_token", refresh_token)
      }

      let resolvedUser: any = response.user

      if (!resolvedUser) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))

          resolvedUser = {
            id: payload.sub || payload.id || payload.user_id,
            email: payload.email || data.email,
            nome: payload.nome || payload.name || data.nome,
            user_type: payload.user_type || payload.role || payload.type || data.role,
          }
        } catch (decodeErr) {

        }
      }

      if (!resolvedUser) {

        return false
      }

      const userData: User = {
        id: String(resolvedUser.id ?? data.email),
        email: resolvedUser.email ?? data.email,
        nome: resolvedUser.nome ?? data.nome ?? data.email.split("@")[0],
        role: mapUserType(resolvedUser.user_type ?? resolvedUser.role ?? data.role),
      }

      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))

      return true
    } catch (error) {

      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
