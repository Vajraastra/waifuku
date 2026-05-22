import { useState, useEffect, useCallback } from 'react'
import { useConfigStore } from '../store/configStore'
import { api } from '../lib/api'
import { SERVER_PROFILES, getProfileById } from '../lib/serverProfiles'

/**
 * Devuelve el nombre amigable del servidor activo.
 * Prioridad: perfil activo por id → perfil por puerto → hostname genérico.
 */
export function resolveProviderLabel(provider, baseUrl, serverProfileId) {
  // 1. Perfil activo conocido (guardado en config) — solo si el tipo coincide con el provider real
  if (serverProfileId && serverProfileId !== 'custom') {
    const profile = getProfileById(serverProfileId)
    if (profile && profile.type === provider) return profile.name
  }

  if (provider !== 'openai_compat') {
    return provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Servidor'
  }

  if (!baseUrl) return 'OpenAI'

  // 2. Fallback: detectar por puerto usando SERVER_PROFILES
  try {
    const url  = new URL(baseUrl)
    const port = parseInt(url.port, 10)
    const byPort = SERVER_PROFILES.find(p => p.probePort === port)
    if (byPort) return byPort.name

    const host = url.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return `local:${url.port || 80}`
    }
    return host
  } catch {
    return 'OpenAI compat'
  }
}

export function useProviderStatus(intervalMs = 8_000) {
  const provider        = useConfigStore(s => s.provider)
  const baseUrl         = useConfigStore(s => s.baseUrl)
  const apiBase         = useConfigStore(s => s.apiBase)
  const apiKey          = useConfigStore(s => s.apiKey)
  const serverProfileId = useConfigStore(s => s.serverProfileId)

  const [status, setStatus] = useState('checking')

  const check = useCallback(async () => {
    try {
      const data = await api.models.list({ provider, baseUrl, apiBase, apiKey })
      setStatus(data?.error ? 'offline' : 'online')
    } catch {
      setStatus('offline')
    }
  }, [provider, baseUrl, apiBase, apiKey])

  useEffect(() => {
    setStatus('checking')
    check()
    const id = setInterval(check, intervalMs)
    return () => clearInterval(id)
  }, [check, intervalMs])

  // El perfil conoce el nombre real del servidor
  const label = resolveProviderLabel(provider, baseUrl, serverProfileId)

  return { status, label, refresh: check }
}
