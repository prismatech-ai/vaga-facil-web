"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin-sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Bell, ChevronLeft, ChevronRight } from "lucide-react"
import { Logo } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import { Toaster } from "sonner"

function SidebarEdgeToggle() {
  const { open, toggleSidebar, isMobile } = useSidebar()

  if (isMobile) return null

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={open ? "Fechar sidebar" : "Abrir sidebar"}
      className="absolute -left-3 top-1/2 z-[60] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow-md transition-all hover:bg-muted"
    >
      {open ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
    </button>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()

  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
      return
    }

    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])


  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

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

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="relative overflow-visible">
        <SidebarEdgeToggle />
        <header className="sticky top-0 z-10 border-b bg-card">
          <div className="flex h-16 items-center gap-4 px-4">
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo width={120} />
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => router.push("/admin/notificacoes")}
                >
                  <Bell className="h-5 w-5" />
                  {notificacoesNaoLidas > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {notificacoesNaoLidas}
                    </Badge>
                  )}
                </Button>

                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user?.nome}</p>
                  <p className="text-xs text-muted-foreground">Administrador</p>
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
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-white">
          <div className="p-6">{children}</div>
        </main>
      </SidebarInset>
      <Toaster position="top-right" richColors />
    </SidebarProvider>
  )
}
