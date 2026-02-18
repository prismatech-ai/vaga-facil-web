"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { 
  LayoutDashboard, 
  Users,
  Building2,
  Briefcase,
  FileText,
  LogOut,
  Shield,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const menuItems = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/admin/dashboard",
    },
    {
      title: "Candidatos",
      url: "/admin/candidatos",
      icon: Users,
      active: pathname?.includes("/candidatos"),
    },
    {
      title: "Empresas",
      url: "/admin/empresas",
      icon: Building2,
      active: pathname?.includes("/empresas"),
    },
    {
      title: "Vagas",
      url: "/admin/vagas",
      icon: Briefcase,
      active: pathname?.includes("/vagas"),
    },
    {
      title: "Testes",
      url: "/admin/testes",
      icon: FileText,
      active: pathname?.includes("/testes"),
    },
  ]

  const getInitials = (name?: string) => {
    if (!name) return "A"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar/95 backdrop-blur">
      <SidebarHeader className="group-data-[collapsible=icon]:p-2">
        <div className="rounded-lg border bg-background/70 p-3 transition-all group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
            <Avatar className="h-9 w-9 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {getInitials(user?.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-semibold truncate">{user?.nome || "Admin"}</p>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-primary" />
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={item.active} className="h-10 rounded-lg">
                  <Link href={item.url}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="h-10 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
