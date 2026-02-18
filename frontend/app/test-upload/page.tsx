/**
 * Exemplo de teste local para os componentes de upload
 * Coloque este arquivo em app/test-upload/page.tsx
 * Acesse em http://localhost:3000/test-upload
 */

'use client'

import React, { useState, useEffect } from 'react'
import { ResumeUpload } from '@/components/resume-upload'
import { LogoUpload } from '@/components/logo-upload'
import { FileUpload } from '@/components/file-upload'
import { ProfileImageUpload } from '@/components/profile-image-upload'
import { DocumentUpload } from '@/components/document-upload'
import { ImageUpload } from '@/components/image-upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function TestUploadPage() {
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [portfolioImageUrl, setPortfolioImageUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<Array<{ type: 'success' | 'error'; text: string }>>([])
  const [windowLocation, setWindowLocation] = useState<string>('')
  const [token, setToken] = useState<string>('')

  useEffect(() => {
    // Initialize browser-only values
    setWindowLocation(window.location.href)
    setToken(localStorage.getItem('token') || '')
  }, [])

  const addMessage = (type: 'success' | 'error', text: string) => {
    setMessages((prev) => [...prev, { type, text }])
    setTimeout(() => {
      setMessages((prev) => prev.slice(1))
    }, 5000)
  }

  const handleResumeSuccess = (url: string, fileName: string) => {
    setResumeUrl(url)
    addMessage('success', `✅ Currículo salvo: ${fileName}`)

  }

  const handleLogoSuccess = (url: string, fileName: string) => {
    setLogoUrl(url)
    addMessage('success', `✅ Logo salva: ${fileName}`)

  }

  const handleFileSuccess = (url: string, fileName: string) => {
    setFileUrl(url)
    addMessage('success', `✅ Arquivo salvo: ${fileName}`)

  }

  const handleProfileImageSuccess = (url: string, fileName: string) => {
    setProfileImageUrl(url)
    addMessage('success', `✅ Foto de perfil salva: ${fileName}`)

  }

  const handleDocumentSuccess = (url: string, fileName: string) => {
    setDocumentUrl(url)
    addMessage('success', `✅ Certificado salvo: ${fileName}`)

  }

  const handlePortfolioImageSuccess = (url: string, fileName: string) => {
    setPortfolioImageUrl(url)
    addMessage('success', `✅ Imagem de portfólio salva: ${fileName}`)

  }

  const handleError = (error: Error) => {
    addMessage('error', `❌ Erro: ${error.message}`)

  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">🧪 Teste de Upload S3</h1>
        <p className="text-gray-600">
          Página de testes para validar os componentes de upload para AWS S3
        </p>
      </div>

      {/* Mensagens */}
      <div className="space-y-2">
        {messages.map((msg, i) => (
          <Alert
            key={i}
            className={
              msg.type === 'success'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }
          >
            {msg.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={msg.type === 'success' ? 'text-green-800' : 'text-red-800'}
            >
              {msg.text}
            </AlertDescription>
          </Alert>
        ))}
      </div>

      {/* Grid de Componentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: ResumeUpload */}
        <Card>
          <CardHeader>
            <CardTitle>📄 Upload de Currículo</CardTitle>
            <CardDescription>Teste do componente ResumeUpload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResumeUpload
              onSuccess={handleResumeSuccess}
              onError={handleError}
              label="Selecionar PDF"
            />
            {resumeUrl && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-600 font-medium mb-2">URL Obtida:</p>
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all text-xs"
                >
                  {resumeUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: LogoUpload */}
        <Card>
          <CardHeader>
            <CardTitle>🎨 Upload de Logo</CardTitle>
            <CardDescription>Teste do componente LogoUpload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LogoUpload
              onSuccess={handleLogoSuccess}
              onError={handleError}
              label="Selecionar Imagem"
            />
            {logoUrl && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-600 font-medium mb-2">URL Obtida:</p>
                <a
                  href={logoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all text-xs"
                >
                  {logoUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: FileUpload Genérico */}
        <Card>
          <CardHeader>
            <CardTitle>📦 Upload Genérico</CardTitle>
            <CardDescription>Teste do componente FileUpload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              endpoint="/api/v1/uploads/document"
              acceptTypes=".pdf,.doc,.docx,.txt"
              onSuccess={handleFileSuccess}
              onError={handleError}
              label="Selecionar Arquivo"
              maxFileSizeMB={15}
            />
            {fileUrl && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-600 font-medium mb-2">URL Obtida:</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all text-xs"
                >
                  {fileUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: ProfileImageUpload */}
        <Card>
          <CardHeader>
            <CardTitle>👤 Foto de Perfil</CardTitle>
            <CardDescription>Teste do componente ProfileImageUpload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileImageUpload
              onSuccess={handleProfileImageSuccess}
              onError={handleError}
              label="Selecionar Foto"
            />
            {profileImageUrl && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-600 font-medium mb-2">URL Obtida:</p>
                <a
                  href={profileImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all text-xs"
                >
                  {profileImageUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 5: DocumentUpload */}
        <Card>
          <CardHeader>
            <CardTitle>📜 Certificados</CardTitle>
            <CardDescription>Teste do componente DocumentUpload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DocumentUpload
              documentType="certifications"
              onSuccess={handleDocumentSuccess}
              onError={handleError}
              label="Selecionar Certificado"
            />
            {documentUrl && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-600 font-medium mb-2">URL Obtida:</p>
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all text-xs"
                >
                  {documentUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 6: ImageUpload */}
        <Card>
          <CardHeader>
            <CardTitle>🖼️ Portfólio</CardTitle>
            <CardDescription>Teste do componente ImageUpload</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              folder="portfolio"
              onSuccess={handlePortfolioImageSuccess}
              onError={handleError}
              label="Selecionar Imagem"
            />
            {portfolioImageUrl && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-600 font-medium mb-2">URL Obtida:</p>
                <a
                  href={portfolioImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 break-all text-xs"
                >
                  {portfolioImageUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instruções */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-900">⚠️ Instruções de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-yellow-800">
          <p>
            <strong>1. Backend</strong> - Certifique-se de que o backend está rodando e os endpoints
            estão implementados:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>POST /api/v1/uploads/profile-image</li>
            <li>POST /api/v1/uploads/logo</li>
            <li>POST /api/v1/uploads/resume</li>
            <li>POST /api/v1/uploads/document?document_type=certifications</li>
            <li>POST /api/v1/uploads/image?folder=portfolio</li>
            <li>DELETE /api/v1/uploads/file</li>
          </ul>

          <p className="mt-3">
            <strong>2. Credenciais AWS</strong> - Verifique se as variáveis de ambiente estão
            configuradas:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>AWS_ACCESS_KEY_ID</li>
            <li>AWS_SECRET_ACCESS_KEY</li>
            <li>AWS_S3_BUCKET_NAME</li>
            <li>AWS_S3_REGION</li>
          </ul>

          <p className="mt-3">
            <strong>3. CORS</strong> - Configure CORS no backend para aceitar seu domínio:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>http://localhost:3000 (desenvolvimento)</li>
            <li>https://seudominio.com (produção)</li>
          </ul>

          <p className="mt-3">
            <strong>4. Teste</strong> - Tente fazer upload:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Arraste um arquivo ou clique para selecionar</li>
            <li>Observe a barra de progresso</li>
            <li>Verifique a URL retornada</li>
            <li>Clique na URL para confirmar que o arquivo foi salvo</li>
          </ul>
        </CardContent>
      </Card>

      {/* Console de Debug */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <CardTitle className="text-gray-900">🔍 Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-gray-600">
          <p>
            <strong>Frontend URL:</strong> {windowLocation}
          </p>
          <p>
            <strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Não configurada'}
          </p>
          <p>
            <strong>Token:</strong>{' '}
            {token ? token.substring(0, 20) + '...' : 'Não encontrado'}
          </p>
          <p className="text-xs text-gray-500 mt-3">
            ℹ️ Abra o console do navegador (F12) para ver logs detalhados
          </p>
        </CardContent>
      </Card>

      {/* Links Úteis */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">📚 Links Úteis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-blue-800">
            📖{' '}
            <a
              href="/S3_UPLOAD_README.md"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              S3_UPLOAD_README.md
            </a>
            {' - Guia rápido'}
          </p>
          <p className="text-sm text-blue-800">
            📖{' '}
            <a
              href="/docs/UPLOAD_GUIDE.md"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              docs/UPLOAD_GUIDE.md
            </a>
            {' - Documentação completa'}
          </p>
          <p className="text-sm text-blue-800">
            📖{' '}
            <a
              href="/docs/BACKEND_EXAMPLES.md"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              docs/BACKEND_EXAMPLES.md
            </a>
            {' - Exemplos backend'}
          </p>
          <p className="text-sm text-blue-800">
            📖{' '}
            <a
              href="/IMPLEMENTATION_SUMMARY.md"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              IMPLEMENTATION_SUMMARY.md
            </a>
            {' - Sumário de implementação'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
