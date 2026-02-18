/**
 * Hook customizado para gerenciar uploads no S3
 */

import { useState, useCallback } from 'react'
import { uploadToS3, S3UploadConfig, UploadResponse } from '@/lib/s3-upload'

export interface UseS3UploadState {
  isLoading: boolean
  progress: number
  error: Error | null
  success: boolean
  uploadedFile: UploadResponse | null
}

export interface UseS3UploadReturn extends UseS3UploadState {
  upload: (file: File) => Promise<UploadResponse>
  reset: () => void
}

/**
 * Hook para gerenciar upload de arquivos no S3
 */
export function useS3Upload(config: S3UploadConfig): UseS3UploadReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null)

  const upload = useCallback(
    async (file: File): Promise<UploadResponse> => {
      try {
        setIsLoading(true)
        setError(null)
        setSuccess(false)
        setProgress(0)

        const response = await uploadToS3(config, file, (progress) => {
          setProgress(progress)
        })

        setUploadedFile(response)
        setSuccess(true)

        return response
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro desconhecido no upload')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [config]
  )

  const reset = useCallback(() => {
    setIsLoading(false)
    setProgress(0)
    setError(null)
    setSuccess(false)
    setUploadedFile(null)
  }, [])

  return {
    isLoading,
    progress,
    error,
    success,
    uploadedFile,
    upload,
    reset,
  }
}
