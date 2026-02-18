"use client"

import React, { useEffect, useState } from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut, Menu, Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Logo } from "@/components/logo"

function useSidebarSafe() {
  try {
    const { useSidebar } = require("@/components/ui/sidebar")
    return useSidebar()
  } catch {
    return null
  }
}

export function DashboardHeader() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const sidebar = useSidebarSafe()
  const [notificacoes, setNotificacoes] = useState(0)

  useEffect(() => {
    // TODO: Implementar fetch de notificações da API
    // Por enquanto, simular com um número aleatório
    const unreadCount = Math.floor(Math.random() * 5)
    setNotificacoes(unreadCount)
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: "Administrador",
      empresa: "Empresa",
      candidato: "Candidato",
    }
    return labels[role as keyof typeof labels] || role
  }

  return (
    <header className="border-b bg-card w-full">
      <div className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={sidebar.toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Logo width={140} className="hidden sm:block" />
          <Logo width={100} className="sm:hidden" />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" />
            {notificacoes > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs" 
                variant="destructive"
              >
                {notificacoes}
              </Badge>
            )}
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.nome}</p>
            <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role || "")}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.nome ? getInitials(user.nome) : "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
