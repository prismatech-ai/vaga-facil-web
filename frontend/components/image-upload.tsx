/**
 * Componente de upload de imagem genérica
 */

'use client'

import React, { useState, useRef } from 'react'
import { useS3Upload } from '@/hooks/use-s3-upload'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Upload, X, Check, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface ImageUploadProps {
  folder?: string // Opcional: 'portfolio', 'gallery', etc
  onSuccess?: (url: string, fileName: string) => void
  onError?: (error: Error) => void
  label?: string
  maxFileSizeMB?: number
  currentImageUrl?: string
}

export function ImageUpload({
  folder = 'general',
  onSuccess,
  onError,
  label = 'Selecionar Imagem',
  maxFileSizeMB = 10,
  currentImageUrl,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)

  const { isLoading, progress, error, success, uploadedFile, upload, reset } = useS3Upload({
    endpoint: '/api/v1/uploads/image',
    acceptTypes: 'image/jpeg,image/png,image/gif,image/webp',
    maxFileSizeMB,
    queryParams: {
      folder,
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      reset()

      // Criar preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      const result = await upload(selectedFile)
      onSuccess?.(result.url, result.fileName)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro no upload')
      onError?.(error)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setSelectedFile(file)
      reset()

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    setPreview(currentImageUrl || null)
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isCompleted = success && uploadedFile && !selectedFile

  return (
    <div className="w-full max-w-md space-y-4">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isCompleted
            ? 'border-green-300 bg-green-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
          aria-label="Upload de imagem"
        />

        {!isCompleted ? (
          <>
            {preview ? (
              <div className="relative h-32 w-32 mx-auto mb-4">
                <Image
                  src={preview}
                  alt="Preview da imagem"
                  fill
                  className="object-cover rounded"
                  priority
                />
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                {isLoading ? (
                  <Spinner className="h-10 w-10 text-blue-500" />
                ) : (
                  <Upload className="h-10 w-10 text-gray-400" />
                )}
              </div>
            )}

            <p className="text-sm font-medium text-gray-700 mb-1">
              {selectedFile ? 'Imagem selecionada' : 'Arraste a imagem aqui'}
            </p>

            <p className="text-xs text-gray-500 mb-4">ou</p>

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="mb-3"
            >
              {isLoading ? 'Enviando...' : label}
            </Button>

            <p className="text-xs text-gray-500">
              JPG, PNG, GIF, WebP • Máximo {maxFileSizeMB}MB
            </p>

            {selectedFile && !isLoading && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                <Button
                  type="button"
                  onClick={handleUpload}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  Confirmar Upload
                </Button>
                <Button
                  type="button"
                  onClick={handleClear}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            )}

            {isLoading && progress > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Upload em progresso</span>
                  <span className="text-xs font-medium text-gray-600">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700 mb-1">Imagem salva com sucesso!</p>
            <Button
              type="button"
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Enviar Outra Imagem
            </Button>
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
