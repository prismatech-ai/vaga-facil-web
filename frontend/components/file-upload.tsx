/**
 * Componente genérico de upload para S3
 * Pode ser usado para qualquer tipo de arquivo
 */

'use client'

import React, { useState, useRef } from 'react'
import { useS3Upload } from '@/hooks/use-s3-upload'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Upload, X, Check, AlertCircle } from 'lucide-react'

interface FileUploadProps {
  endpoint: string
  acceptTypes: string
  onSuccess?: (url: string, fileName: string) => void
  onError?: (error: Error) => void
  label?: string
  maxFileSizeMB?: number
  allowMultiple?: boolean
}

export function FileUpload({
  endpoint,
  acceptTypes,
  onSuccess,
  onError,
  label = 'Selecionar arquivo',
  maxFileSizeMB = 10,
  allowMultiple = false,
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const { isLoading, progress, error, success, uploadedFile, upload, reset } = useS3Upload({
    endpoint,
    acceptTypes,
    maxFileSizeMB,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(allowMultiple ? files : [files[0]])
      reset()
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      // Upload apenas o primeiro arquivo selecionado por vez
      const file = selectedFiles[0]
      const result = await upload(file)

      if (allowMultiple) {
        // Remover arquivo da lista após upload bem-sucedido
        setSelectedFiles((prev) => prev.slice(1))
      } else {
        setSelectedFiles([])
      }

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
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      setSelectedFiles(allowMultiple ? files : [files[0]])
      reset()
    }
  }

  const handleClear = () => {
    setSelectedFiles([])
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const isCompleted = success && uploadedFile && selectedFiles.length === 0

  return (
    <div className="w-full space-y-4">
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
          multiple={allowMultiple}
          className="hidden"
          aria-label="Upload de arquivo"
        />

        {selectedFiles.length === 0 && !isCompleted ? (
          <>
            <div className="flex justify-center mb-3">
              {isLoading ? (
                <Spinner className="h-10 w-10 text-blue-500" />
              ) : (
                <Upload className="h-10 w-10 text-gray-400" />
              )}
            </div>

            <p className="text-sm font-medium text-gray-700 mb-1">
              Arraste arquivos aqui
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
              Máximo {maxFileSizeMB}MB
            </p>
          </>
        ) : selectedFiles.length > 0 && !isCompleted ? (
          <>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Arquivos selecionados:</h4>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)}KB</p>
                    </div>
                    {!isLoading && (
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="ml-2 p-1 hover:bg-gray-100 rounded"
                        aria-label="Remover arquivo"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isLoading && progress > 0 && (
              <div className="mb-4">
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

            {!isLoading && (
              <div className="pt-4 border-t border-gray-200 space-y-2">
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
          </>
        ) : isCompleted ? (
          <>
            <div className="flex justify-center mb-3">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-700 mb-1">Arquivo salvo com sucesso!</p>
            <p className="text-xs text-gray-600 mb-4">{uploadedFile.fileName}</p>
            <Button
              type="button"
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Enviar outro arquivo
            </Button>
          </>
        ) : null}
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
