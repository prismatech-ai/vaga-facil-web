/**
 * Componente de upload de currículo para candidato
 */

'use client'

import React, { useState, useRef } from 'react'
import { useS3Upload } from '@/hooks/use-s3-upload'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Upload, X, Check, AlertCircle, File } from 'lucide-react'

interface ResumeUploadProps {
  onSuccess?: (url: string, fileName: string) => void
  onError?: (error: Error) => void
  label?: string
  acceptTypes?: string
}

export function ResumeUpload({
  onSuccess,
  onError,
  label = 'Selecionar Currículo',
  acceptTypes = '.pdf',
}: ResumeUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { isLoading, progress, error, success, uploadedFile, upload, reset } = useS3Upload({
    endpoint: '/api/v1/uploads/resume',
    acceptTypes: 'application/pdf',
    maxFileSizeMB: 50,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      reset()
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
    }
  }

  const handleClear = () => {
    setSelectedFile(null)
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isCompleted = success && uploadedFile

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
          accept={acceptTypes}
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
          aria-label="Upload de currículo"
        />

        {!isCompleted ? (
          <>
            <div className="flex justify-center mb-3">
              {isLoading ? (
                <Spinner className="h-10 w-10 text-blue-500" />
              ) : (
                <Upload className="h-10 w-10 text-gray-400" />
              )}
            </div>

            <p className="text-sm font-medium text-gray-700 mb-1">
              {selectedFile ? selectedFile.name : 'Arraste seu currículo aqui'}
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
              Máximo 10MB • {acceptTypes.replace('.', '').toUpperCase()}
            </p>

            {selectedFile && !isLoading && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  onClick={handleUpload}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  Confirmar Upload
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
            <div className="flex justify-center mb-3">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700 mb-1">Currículo salvo com sucesso!</p>
            <p className="text-xs text-gray-600 mb-4">{uploadedFile.fileName}</p>
            <Button
              type="button"
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Alterar Currículo
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

      {uploadedFile && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <File className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-900 truncate">{uploadedFile.fileName}</p>
            <p className="text-xs text-blue-700">{(uploadedFile.fileSize / 1024).toFixed(2)}KB</p>
          </div>
        </div>
      )}
    </div>
  )
}
