import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { useConfigStore } from '../store/configStore'
import { useChatStore } from '../store/chatStore'

const POLL_MS = 3000

// Recomendación de num_ctx por tiers de VRAM disponible (heurística práctica)
function recommendCtx(vramFreeBytes) {
  const gb = vramFreeBytes / (1024 ** 3)
  if (gb >= 12) return 16384
  if (gb >=  6) return 8192
  if (gb >=  3) return 4096
  if (gb >=  1) return 2048
  return 1024
}

export function fmtBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export function useLLMStats() {
  const showLLMStats = useConfigStore(s => s.showLLMStats)
  const provider     = useConfigStore(s => s.provider)
  const baseUrl      = useConfigStore(s => s.baseUrl)
  const apiBase      = useConfigStore(s => s.apiBase)
  const apiKey       = useConfigStore(s => s.apiKey)
  const configModel  = useConfigStore(s => s.model)
  const numCtx       = useConfigStore(s => s.numCtx)
  const messages     = useChatStore(s => s.messages)
  const streaming    = useChatStore(s => s.streamingContent)

  const [psData,  setPsData]  = useState(null)  // respuesta de /models/ps
  const [sysData, setSysData] = useState(null)  // respuesta de /system/stats
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!showLLMStats) {
      clearInterval(intervalRef.current)
      return
    }

    async function poll() {
      setLoading(true)
      try {
        // Ambas llamadas en paralelo
        const [ps, sys] = await Promise.allSettled([
          api.models.ps({ provider: provider || 'ollama', baseUrl: baseUrl || undefined, apiBase: apiBase || undefined, apiKey: apiKey || undefined }),
          api.system.stats(),
        ])
        if (ps.status  === 'fulfilled') setPsData(ps.value)
        if (sys.status === 'fulfilled') setSysData(sys.value)
      } finally {
        setLoading(false)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(intervalRef.current)
  }, [showLLMStats, provider, baseUrl, apiBase, apiKey])

  // ── Modelo activo ────────────────────────────────────────────────────────────
  const activeModel   = psData?.models?.[0] ?? null
  const serverModel   = activeModel?.name ?? null
  const modelMismatch = serverModel && configModel && serverModel !== configModel

  // ── GPU (del sistema, no del LLM server) ────────────────────────────────────
  const gpu      = sysData?.gpus?.[0] ?? null
  const vramTotal = gpu?.vram_total ?? 0
  const vramUsed  = gpu?.vram_used  ?? 0
  const vramFree  = gpu?.vram_free  ?? 0
  const vramPct   = vramTotal > 0 ? Math.round(vramUsed / vramTotal * 100) : null

  // ── RAM del sistema ──────────────────────────────────────────────────────────
  const ram      = sysData?.ram ?? null
  const ramTotal = ram?.ram_total ?? 0
  const ramUsed  = ram?.ram_used  ?? 0
  const ramFree  = ram?.ram_free  ?? 0
  const ramPct   = ramTotal > 0 ? Math.round(ramUsed / ramTotal * 100) : null

  // ── RAM offload (Ollama — layers en RAM cuando no cabe en VRAM) ──────────────
  const modelTotalSize = activeModel?.size      ?? 0
  const modelVramSize  = activeModel?.size_vram ?? 0
  const ramOffload     = modelTotalSize > 0 ? Math.max(0, modelTotalSize - modelVramSize) : 0

  // ── Contexto ─────────────────────────────────────────────────────────────────
  // Auto ctx basado en VRAM libre (más preciso que solo VRAM usada)
  const recCtx   = vramFree > 0 ? recommendCtx(vramFree) : null
  const totalChars = messages.reduce((a, m) => a + (m.content?.length ?? 0), 0)
                   + (streaming?.length ?? 0)
  const ctxUsed  = Math.ceil(totalChars / 4)
  const ctxLimit = numCtx > 0 ? numCtx : recCtx
  const ctxPct   = ctxLimit ? Math.min(100, Math.round(ctxUsed / ctxLimit * 100)) : null

  return {
    loading,
    // Modelo
    serverModel,
    configModel,
    modelMismatch,
    hasModel: !!activeModel,
    gpuName: gpu?.name ?? null,
    // VRAM (del sistema)
    vramTotal, vramUsed, vramFree, vramPct,
    vramTotalFmt: fmtBytes(vramTotal),
    vramUsedFmt:  fmtBytes(vramUsed),
    vramFreeFmt:  fmtBytes(vramFree),
    // RAM offload (Ollama layers en RAM)
    ramOffload,
    ramOffloadFmt: fmtBytes(ramOffload),
    // RAM sistema
    ramTotal, ramUsed, ramFree, ramPct,
    ramTotalFmt: fmtBytes(ramTotal),
    ramUsedFmt:  fmtBytes(ramUsed),
    hasSystemStats: !!sysData,
    // Contexto
    recCtx, ctxUsed, ctxLimit, ctxPct,
  }
}
