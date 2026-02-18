/**
 * Configuração de upload para AWS S3
 * Usando upload direto via backend
 */

export interface S3UploadConfig {
  endpoint: string
  acceptTypes: string
  maxFileSize?: number // em bytes
  maxFileSizeMB?: number // em MB (padrão: 10MB)
  queryParams?: Record<string, string> // Parâmetros adicionais para query string
}

export interface UploadResponse {
  url: string
  fileName: string
  fileSize: number
  uploadedAt: string
}

/**
 * Faz upload direto do arquivo para o backend
 * O backend cuida de salvar no S3
 */
export async function uploadToS3(
  config: S3UploadConfig,
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  try {
    // Validações
    const maxSize = (config.maxFileSizeMB || 10) * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error(
        `Arquivo muito grande. Máximo permitido: ${config.maxFileSizeMB || 10}MB`
      )
    }

    // Verificar tipo de arquivo
    if (config.acceptTypes && !isAcceptedFileType(file.type, config.acceptTypes)) {
      throw new Error(`Tipo de arquivo não permitido: ${file.type}`)
    }

    // Construir URL com query params
    let url = `${process.env.NEXT_PUBLIC_API_URL}${config.endpoint}`
    if (config.queryParams && Object.keys(config.queryParams).length > 0) {
      const params = new URLSearchParams(config.queryParams)
      url += `?${params.toString()}`
    }

    // Preparar FormData
    const formData = new FormData()
    formData.append('file', file)

    // Adicionar token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers: HeadersInit = {}
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Fazer upload com XMLHttpRequest para rastrear progresso
    const response = await new Promise<{url: string; fileName: string}>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Rastrear progresso
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100
            onProgress(percentComplete)
          }
        })
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const data = JSON.parse(xhr.responseText)
            // Tentar extrair URL de vários formatos possíveis
            const fileUrl = 
              data.url ||
              data.file_url ||
              data.s3_url ||
              data.presigned_url ||
              data.uploaded_url
            
            if (!fileUrl) {
              reject(new Error('Backend não retornou URL do arquivo'))
              return
            }
            
            resolve({
              url: fileUrl,
              fileName: data.fileName || data.file_name || file.name
            })
          } catch (e) {
            reject(new Error('Erro ao processar resposta do servidor'))
          }
        } else {
          reject(new Error(`Erro no upload: ${xhr.status} ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Erro na requisição de upload'))
      })

      xhr.open('POST', url, true)
      
      // Adicionar headers customizados
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string)
      })

      xhr.send(formData)
    })

    return {
      url: response.url,
      fileName: response.fileName,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    }
  } catch (error) {
    throw error
  }
}

/**
 * Valida se o tipo de arquivo é aceito
 */
function isAcceptedFileType(fileType: string, acceptTypes: string): boolean {
  const acceptedTypes = acceptTypes.split(',').map((type) => type.trim())

  return acceptedTypes.some((accepted) => {
    if (accepted === '*/*') return true
    if (accepted.endsWith('/*')) {
      const prefix = accepted.slice(0, -2)
      return fileType.startsWith(prefix)
    }
    return fileType === accepted
  })
}

/**
 * Deleta arquivo do S3 via backend
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/uploads/file?file_url=${encodeURIComponent(fileUrl)}`
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    })

    if (!response.ok) {
      throw new Error(`Erro ao deletar: ${response.status}`)
    }
  } catch (error) {

    throw error
  }
}
