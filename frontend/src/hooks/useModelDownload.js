import { useState, useCallback } from 'react'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/**
 * Hook para verificar estado de modelos ML y descargarlos con progreso en tiempo real.
 *
 * modelStatus: { [model_id]: { id, name, size_mb, installed, ... } }
 * downloading:  { [model_id]: { progress 0-1, downloaded_mb, total_mb } }
 */
export function useModelDownload() {
  const [modelStatus,  setModelStatus]  = useState(null)   // null = no cargado aún
  const [downloading,  setDownloading]  = useState({})
  const [error,        setError]        = useState(null)

  // Carga el estado actual de todos los modelos desde el backend
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/agent/models`)
      const data = await res.json()
      setModelStatus(data)
      return data
    } catch (e) {
      setError(e.message)
      return null
    }
  }, [])

  // Inicia la descarga de un modelo; emite progreso vía SSE
  const downloadModel = useCallback(async (modelId, { onDone, onError } = {}) => {
    setError(null)
    setDownloading(prev => ({
      ...prev,
      [modelId]: { progress: 0, downloaded_mb: 0, total_mb: 0 },
    }))

    try {
      const response = await fetch(`${BASE}/api/v1/agent/models/${modelId}/download`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''   // guarda línea incompleta

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let evt
          try { evt = JSON.parse(raw) } catch { continue }

          if (evt.status === 'downloading') {
            setDownloading(prev => ({ ...prev, [modelId]: evt }))
          } else if (evt.status === 'extracting') {
            setDownloading(prev => ({ ...prev, [modelId]: { ...prev[modelId], extracting: true } }))
          } else if (evt.status === 'done') {
            setDownloading(prev => { const n = { ...prev }; delete n[modelId]; return n })
            // Actualiza el estado para reflejar que ya está instalado
            setModelStatus(prev => prev
              ? { ...prev, [modelId]: { ...prev[modelId], installed: true } }
              : prev
            )
            onDone?.(modelId)
          } else if (evt.status === 'error') {
            throw new Error(evt.message ?? 'Error desconocido')
          }
        }
      }
    } catch (e) {
      setDownloading(prev => { const n = { ...prev }; delete n[modelId]; return n })
      setError(e.message)
      onError?.(modelId, e.message)
    }
  }, [])

  // Descarga una lista de modelos en secuencia
  const downloadAll = useCallback(async (modelIds, callbacks = {}) => {
    for (const id of modelIds) {
      await new Promise((resolve) => {
        downloadModel(id, {
          onDone:  (mid) => { callbacks.onDone?.(mid);  resolve() },
          onError: (mid, msg) => { callbacks.onError?.(mid, msg); resolve() },
        })
      })
    }
    callbacks.onAllDone?.()
  }, [downloadModel])

  return {
    modelStatus,
    downloading,
    error,
    fetchStatus,
    downloadModel,
    downloadAll,
  }
}
