import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { TokenExpiredListener } from "@/components/token-expired-listener"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Vaga Facil - Vagas de Emprego",
  description: "Plataforma de vagas de emprego",
  generator: "v0.app",
  icons: {
    icon: "/img.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <TokenExpiredListener />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
