import { useState, useCallback, useEffect, useRef } from 'react'
import { useConfigStore } from '../store/configStore'
import { useProviderStatus } from '../hooks/useProviderStatus'
import { useThemeStore } from '../store/themeStore'
import { api } from '../lib/api'
import { PRESETS, CHAT_TEMPLATES, getModelHint } from '../lib/modelPresets'
import { SERVER_PROFILES, profileFromDiscovery, getProfileById } from '../lib/serverProfiles'
import { THEMES, DEFAULT_THEME } from '../lib/themes'
import { entryStagger } from '../lib/animations'

/* ── Estilos ──────────────────────────────────────────────────────────────── */
const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
    fontFamily: 'var(--font-ui)',
    color: 'var(--color-text)',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    gap: '0.25rem',
    padding: '0.75rem 2rem 0',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    flexShrink: 0,
  },
  tabBtn: (active) => ({
    padding: '0.5rem 1.25rem',
    background: active ? 'var(--color-surface)' : 'transparent',
    border: active ? '1px solid var(--color-border)' : '1px solid transparent',
    borderBottom: active ? '1px solid var(--color-surface)' : '1px solid transparent',
    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
    color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-ui)',
    cursor: active ? 'default' : 'pointer',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    position: 'relative',
    bottom: '-1px',
    transition: 'color 0.15s',
  }),
  tabContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  // Tab Servidor — una sola columna centrada
  serverPage: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    padding: '1.75rem 2rem',
    overflowY: 'auto',
    flex: 1,
    maxWidth: '620px',
  },
  // Tab Modelo — dos columnas
  modelPage: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    padding: '1.75rem 2rem',
    height: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    overflowY: 'auto',
    paddingRight: '0.5rem',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.6rem 2rem',
    borderTop: '1px solid var(--color-border)',
    flexShrink: 0,
    background: 'var(--color-bg)',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1.25rem',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '0.67rem',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--color-text-2)',
  },
  input: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    padding: '0.45rem 0.7rem',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-ui)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    padding: '0.45rem 0.7rem',
    fontSize: '0.88rem',
    fontFamily: 'var(--font-ui)',
    outline: 'none',
    width: '100%',
    cursor: 'pointer',
  },
  modelRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  fetchBtn: (loading) => ({
    padding: '0.45rem 0.8rem',
    background: loading ? 'var(--color-surface-2)' : 'var(--color-accent-dim)',
    border: '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-sm)',
    color: loading ? 'var(--color-text-muted)' : 'var(--color-accent)',
    fontSize: '0.72rem',
    cursor: loading ? 'wait' : 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-ui)',
  }),
  testBtn: (loading) => ({
    padding: '0.45rem 0.8rem',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: loading ? 'var(--color-text-muted)' : 'var(--color-text-2)',
    fontSize: '0.72rem',
    cursor: loading ? 'wait' : 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-ui)',
  }),
  testResult: (ok) => ({
    fontSize: '0.72rem',
    color: ok ? 'var(--color-green, #86efac)' : '#fca5a5',
    marginTop: '0.3rem',
  }),
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.6rem 0.75rem',
    background: 'var(--color-surface-2)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  toggleLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  toggleTitle: {
    fontSize: '0.82rem',
    color: 'var(--color-text)',
  },
  toggleDesc: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
  },
  toggle: (on) => ({
    width: '36px',
    height: '20px',
    borderRadius: '10px',
    background: on ? 'var(--color-accent)' : 'var(--color-border)',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.2s',
  }),
  toggleKnob: (on) => ({
    position: 'absolute',
    top: '3px',
    left: on ? '19px' : '3px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
    pointerEvents: 'none',
  }),
  templateBadge: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    padding: '0.6rem 0.75rem',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
  },
  templateName: {
    fontSize: '0.75rem',
    color: 'var(--color-accent)',
    letterSpacing: '1px',
  },
  templateExample: {
    fontFamily: 'monospace',
    fontSize: '0.65rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  templateNote: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  hint: {
    padding: '0.75rem',
    background: 'var(--color-accent-dim)',
    border: '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  hintLabel: {
    fontSize: '0.67rem',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'var(--color-accent)',
  },
  hintNote: {
    fontSize: '0.77rem',
    color: 'var(--color-text-2)',
    lineHeight: 1.5,
  },
  hintVals: {
    fontSize: '0.72rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'monospace',
  },
  hintApply: {
    fontSize: '0.74rem',
    color: 'var(--color-accent)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
    alignSelf: 'flex-start',
    fontFamily: 'var(--font-ui)',
  },
  errorMsg: {
    fontSize: '0.72rem',
    color: '#fca5a5',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.5rem',
  },
  presetBtn: (active) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    padding: '0.65rem 0.75rem',
    background: active ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
    border: `1px solid ${active ? 'var(--color-border-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s, border-color 0.15s',
    fontFamily: 'var(--font-ui)',
  }),
  presetIcon: {
    fontSize: '0.8rem',
    color: 'var(--color-accent)',
    fontFamily: 'monospace',
  },
  presetLabel: (active) => ({
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--color-accent)' : 'var(--color-text)',
  }),
  presetDesc: {
    fontSize: '0.65rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.3,
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  slider: {
    flex: 1,
    accentColor: 'var(--color-accent)',
    cursor: 'pointer',
  },
  sliderVal: {
    fontSize: '0.82rem',
    color: 'var(--color-accent)',
    minWidth: '48px',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  dangerBtn: (loading) => ({
    padding: '0.45rem 0.8rem',
    background: 'transparent',
    border: '1px solid #fca5a5',
    borderRadius: 'var(--radius-sm)',
    color: loading ? 'var(--color-text-muted)' : '#fca5a5',
    fontSize: '0.72rem',
    cursor: loading ? 'wait' : 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-ui)',
  }),
  confirmBtn: {
    padding: '0.45rem 0.8rem',
    background: '#fca5a5',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#000',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-ui)',
  },
  codeBlock: {
    display: 'block',
    padding: '0.45rem 0.7rem',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'monospace',
    fontSize: '0.7rem',
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    userSelect: 'all',
  },
  // Selector de perfiles de servidor
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.45rem',
  },
  profileBtn: (active) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.2rem',
    padding: '0.55rem 0.4rem',
    background: active ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
    border: `1px solid ${active ? 'var(--color-border-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    fontFamily: 'var(--font-ui)',
    textAlign: 'center',
  }),
  profileIcon: {
    fontSize: '1.1rem',
    lineHeight: 1,
  },
  profileName: (active) => ({
    fontSize: '0.68rem',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--color-accent)' : 'var(--color-text)',
    lineHeight: 1.2,
  }),
  profileDesc: {
    fontSize: '0.6rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.2,
  },
  apiBaseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  apiBaseLabel: {
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    whiteSpace: 'nowrap',
    fontFamily: 'monospace',
    minWidth: '80px',
  },
  refreshBtn: {
    padding: '0.2rem 0.5rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    flexShrink: 0,
    lineHeight: 1,
    fontFamily: 'var(--font-ui)',
  },
  refreshBtnLarge: {
    padding: '0.45rem 1rem',
    background: 'transparent',
    border: '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-accent)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginTop: '0.4rem',
    fontFamily: 'var(--font-ui)',
  },
  activeModelBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    background: 'var(--color-accent-dim)',
    border: '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-sm)',
  },
  activeModelLabel: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  activeModelName: {
    fontSize: '0.85rem',
    color: 'var(--color-accent)',
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  selectModelBtn: (isActive) => ({
    padding: '0.4rem 1rem',
    background: isActive ? 'var(--color-surface-2)' : 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--color-text-muted)' : '#000',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: isActive ? 'default' : 'pointer',
    fontFamily: 'var(--font-ui)',
    transition: 'all 0.15s',
  }),
  btnSave: {
    padding: '0.5rem 1.5rem',
    background: 'var(--color-accent)',
    color: '#000',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '1px',
    fontFamily: 'var(--font-ui)',
  },
  savedMsg: {
    fontSize: '0.8rem',
    color: 'var(--color-green, #86efac)',
  },
  // Discovery
  discoveryCard: (found) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    padding: '0.9rem 1rem',
    background: found ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
    border: `1px solid ${found ? 'var(--color-border-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)',
  }),
  discoveryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  discoveryInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    minWidth: 0,
  },
  discoveryName: {
    fontSize: '0.85rem',
    color: 'var(--color-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  discoveryUrl: {
    fontSize: '0.72rem',
    color: 'var(--color-text-muted)',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  discoveryModels: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
  },
  connectBtn: (connected) => ({
    padding: '0.4rem 0.9rem',
    background: connected ? 'transparent' : 'var(--color-accent)',
    border: connected ? '1px solid var(--color-border)' : 'none',
    borderRadius: 'var(--radius-sm)',
    color: connected ? 'var(--color-text-muted)' : '#000',
    fontSize: '0.78rem',
    fontWeight: connected ? 400 : 600,
    cursor: connected ? 'default' : 'pointer',
    fontFamily: 'var(--font-ui)',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  }),
}

/* ── Subcomponentes ───────────────────────────────────────────────────────── */

const STATUS_COLOR = {
  online:   'var(--color-accent)',
  offline:  '#ef4444',
  checking: 'var(--color-text-muted)',
}
const STATUS_LABEL = {
  online:   'online',
  offline:  'offline',
  checking: 'comprobando…',
}

function StatusRow({ status, provider }) {
  const color   = STATUS_COLOR[status] ?? STATUS_COLOR.checking
  const profile = getProfileById(provider)
  const label   = profile ? profile.name : (provider || 'Servidor')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0,
        ...(status === 'online' ? { boxShadow: `0 0 6px ${color}` } : {}),
      }} />
      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-2)' }}>
        {label} · {STATUS_LABEL[status] ?? '…'}
      </span>
    </div>
  )
}

function PsModelRow({ model }) {
  const vramMb  = model.size_vram ? (model.size_vram / 1024 / 1024).toFixed(0) : null
  const totalMb = model.size      ? (model.size / 1024 / 1024).toFixed(0)      : null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.4rem 0.6rem',
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      gap: '0.5rem',
    }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontFamily: 'monospace' }}>
        {model.name}
      </span>
      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
        {vramMb ? `${vramMb} MB VRAM` : totalMb ? `${totalMb} MB` : ''}
      </span>
    </div>
  )
}

function DiscoveryPanel({ currentUrl, onConnect }) {
  const [scanning, setScanning] = useState(false)
  const [servers,  setServers]  = useState(null) // null = nunca escaneado

  async function scan() {
    setScanning(true)
    try {
      const res = await api.models.discover()
      setServers(res.servers ?? [])
    } catch {
      setServers([])
    } finally {
      setScanning(false)
    }
  }

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={S.cardTitle}>Descubrimiento local</div>
        <button style={S.fetchBtn(scanning)} onClick={scan} disabled={scanning}>
          {scanning ? 'Escaneando…' : '⬡ Escanear red local'}
        </button>
      </div>

      <span style={{ fontSize: '0.77rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
        Detecta automáticamente servidores LLM corriendo en tu máquina (Ollama, LM Studio, Jan, llama.cpp, etc.).
        Con un clic puedes conectarte al servidor encontrado.
      </span>

      {servers === null && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Presiona "Escanear" para buscar servidores en los puertos estándar.
        </span>
      )}

      {servers !== null && servers.length === 0 && (
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          No se encontraron servidores. Asegúrate de que Ollama u otro servidor esté corriendo.
        </span>
      )}

      {servers !== null && servers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            {servers.length} servidor{servers.length > 1 ? 'es' : ''} encontrado{servers.length > 1 ? 's' : ''}:
          </span>
          {servers.map(srv => {
            const connected = currentUrl === srv.url
            return (
              <div key={srv.url} style={S.discoveryCard(connected)}>
                <div style={S.discoveryRow}>
                  <div style={S.discoveryInfo}>
                    <span style={S.discoveryName}>
                      <span>{profileFromDiscovery(srv)?.icon ?? '◈'}</span>
                      <span>{srv.name}</span>
                    </span>
                    <span style={S.discoveryUrl}>{srv.url}</span>
                  </div>
                  <button
                    style={S.connectBtn(connected)}
                    onClick={() => !connected && onConnect(srv)}
                    disabled={connected}
                  >
                    {connected ? '✓ Conectado' : 'Conectar'}
                  </button>
                </div>
                {srv.models?.length > 0 && (
                  <span style={S.discoveryModels}>
                    {srv.models.slice(0, 4).join(', ')}
                    {srv.models.length > 4 ? ` +${srv.models.length - 4} más` : ''}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export function ModelConfig() {
  const cfg = useConfigStore()
  const { themeId } = useThemeStore()
  const tabRef = useRef(null)

  const [tab, setTab] = useState('server') // 'server' | 'model'

  useEffect(() => {
    const anim = (THEMES[themeId] ?? THEMES[DEFAULT_THEME]).anim
    entryStagger(tabRef.current, anim, 0)
  }, [tab, themeId])

  const [form, setForm] = useState({
    serverProfileId: cfg.serverProfileId || 'ollama',
    provider:        cfg.provider,
    baseUrl:         cfg.baseUrl,
    apiBase:         cfg.apiBase ?? '',
    model:           cfg.model,
    apiKey:          cfg.apiKey,
    temperature:     cfg.temperature,
    maxTokens:       cfg.maxTokens,
    topP:            cfg.topP,
    topK:            cfg.topK,
    repeatPenalty:   cfg.repeatPenalty,
    thinking:        cfg.thinking,
  })

  const [availableModels, setAvailableModels] = useState([])
  const [loadingModels,   setLoadingModels]   = useState(false)
  const [modelError,      setModelError]      = useState(null)
  const [activePreset,    setActivePreset]    = useState(null)
  const [saved,           setSaved]           = useState(false)
  const [testing,         setTesting]         = useState(false)
  const [testResult,      setTestResult]      = useState(null)

  const { status: providerStatus, refresh: refreshStatus } = useProviderStatus()

  const [psData,    setPsData]    = useState(null)
  const [psLoading, setPsLoading] = useState(false)

  const fetchPs = useCallback(async () => {
    setPsLoading(true)
    try {
      const res = await api.models.ps({
        provider: form.provider,
        baseUrl:  form.baseUrl,
        apiBase:  form.apiBase,
      })
      setPsData(res)
    } catch {
      setPsData({ models: [], error: 'Error al consultar' })
    } finally {
      setPsLoading(false)
    }
  }, [form.provider, form.baseUrl, form.apiBase])

  useEffect(() => { fetchPs() }, [fetchPs])

  const [uninstallStep,   setUninstallStep]   = useState('idle')
  const [uninstallResult, setUninstallResult] = useState(null)
  const [purgeStep,       setPurgeStep]       = useState('idle')
  const [purgeResult,     setPurgeResult]     = useState(null)
  const [modelSaved,      setModelSaved]      = useState(false)

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setActivePreset(null)
    setSaved(false)
    setTestResult(null)
  }

  function selectModel() {
    if (!form.model) return
    cfg.setConfig({ model: form.model })
    setModelSaved(true)
    setTimeout(() => setModelSaved(false), 2000)
  }

  const testModel = useCallback(async () => {
    if (!form.model) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.models.test({
        provider: form.provider,
        model:    form.model,
        baseUrl:  form.baseUrl,
        apiBase:  form.apiBase,
        apiKey:   form.apiKey,
      })
      setTestResult(res.ok
        ? { ok: true,  message: `OK · ${res.time_ms} ms` }
        : { ok: false, message: res.error }
      )
    } catch (e) {
      setTestResult({ ok: false, message: e.message })
    } finally {
      setTesting(false)
    }
  }, [form.provider, form.model, form.baseUrl, form.apiBase, form.apiKey])

  // Seleccionar perfil de servidor: actualiza provider, baseUrl, apiBase
  function handleProfileSelect(profile) {
    setForm(f => ({
      ...f,
      serverProfileId: profile.id,
      provider:        profile.type,
      baseUrl:         profile.defaultHost,
      apiBase:         profile.apiBase,
    }))
    setAvailableModels([])
    setModelError(null)
    setActivePreset(null)
    setSaved(false)
  }

  // Conectar desde discovery: asigna el perfil correcto automáticamente
  function handleDiscoveryConnect(srv) {
    const profile = profileFromDiscovery(srv)
    setForm(f => ({
      ...f,
      serverProfileId: profile.id,
      provider:        profile.type,
      baseUrl:         srv.url,
      apiBase:         profile.apiBase,
    }))
    setAvailableModels(srv.models ?? [])
    setModelError(null)
    setActivePreset(null)
    setSaved(false)
    setTab('model')
  }

  const fetchModels = useCallback(async () => {
    setLoadingModels(true)
    setModelError(null)
    try {
      const res = await api.models.list({
        provider: form.provider,
        baseUrl:  form.baseUrl,
        apiBase:  form.apiBase,
        apiKey:   form.apiKey,
      })
      if (res.error) { setModelError(res.error); setAvailableModels([]) }
      else setAvailableModels(res.models ?? [])
    } catch (e) {
      setModelError(e.message)
    } finally {
      setLoadingModels(false)
    }
  }, [form.provider, form.baseUrl, form.apiBase, form.apiKey])

  function applyPreset(preset) {
    setForm(f => ({
      ...f,
      temperature:   preset.temperature,
      topP:          preset.topP,
      topK:          preset.topK,
      maxTokens:     preset.maxTokens,
      repeatPenalty: preset.repeatPenalty,
    }))
    setActivePreset(preset.id)
    setSaved(false)
  }

  function applyHint(hint) {
    setForm(f => ({
      ...f,
      temperature:   hint.temperature,
      topP:          hint.topP,
      topK:          hint.topK,
      maxTokens:     hint.maxTokens,
      repeatPenalty: hint.repeatPenalty,
      thinking:      hint.thinking,
    }))
    setActivePreset(null)
    setSaved(false)
  }

  async function handleUninstall() {
    if (uninstallStep === 'idle') {
      setUninstallStep('confirm')
      setUninstallResult(null)
      setTimeout(() => setUninstallStep(s => s === 'confirm' ? 'idle' : s), 4000)
      return
    }
    if (uninstallStep !== 'confirm') return
    setUninstallStep('loading')
    setUninstallResult(null)
    try {
      const res = await api.models.uninstall({ name: form.model, baseUrl: form.baseUrl })
      if (res.ok) {
        const removed    = form.model
        const remaining  = availableModels.filter(m => m !== removed)
        setUninstallResult({ ok: true, message: `"${removed}" eliminado` })
        setAvailableModels(remaining)
        setField('model', remaining[0] ?? '')
      } else {
        setUninstallResult({ ok: false, message: res.error })
      }
    } catch (e) {
      setUninstallResult({ ok: false, message: e.message })
    } finally {
      setUninstallStep('idle')
    }
  }

  async function handlePurge() {
    if (purgeStep === 'idle') {
      setPurgeStep('confirm')
      setPurgeResult(null)
      setTimeout(() => setPurgeStep(s => s === 'confirm' ? 'idle' : s), 4000)
      return
    }
    if (purgeStep !== 'confirm') return
    setPurgeStep('loading')
    setPurgeResult(null)
    try {
      const res = await api.models.purgeBlobs()
      if (res.ok) {
        const mb  = (res.freed_bytes / 1024 / 1024).toFixed(1)
        const msg = res.deleted === 0
          ? 'No hay blobs huérfanos'
          : `${res.deleted} blob${res.deleted > 1 ? 's' : ''} eliminado${res.deleted > 1 ? 's' : ''} · ${mb} MB liberados`
        setPurgeResult({ ok: true, message: msg })
      } else {
        setPurgeResult({ ok: false, message: res.error })
      }
    } catch (e) {
      setPurgeResult({ ok: false, message: e.message })
    } finally {
      setPurgeStep('idle')
    }
  }

  function handleSave() {
    cfg.setConfig({
      serverProfileId: form.serverProfileId,
      provider:        form.provider,
      baseUrl:         form.baseUrl,
      apiBase:         form.apiBase,
      model:           form.model,
      apiKey:          form.apiKey,
      temperature:     parseFloat(form.temperature),
      maxTokens:       parseInt(form.maxTokens, 10),
      topP:            parseFloat(form.topP),
      topK:            parseInt(form.topK, 10),
      repeatPenalty:   parseFloat(form.repeatPenalty),
      thinking:        form.thinking,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const modelHint = getModelHint(form.model)
  const template  = modelHint ? CHAT_TEMPLATES[modelHint.template] : null

  return (
    <div style={S.page}>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div style={S.tabBar}>
        <button style={S.tabBtn(tab === 'server')} onClick={() => setTab('server')}>
          Servidor
        </button>
        <button style={S.tabBtn(tab === 'model')} onClick={() => setTab('model')}>
          Modelo
        </button>
      </div>

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      <div ref={tabRef} style={S.tabContent}>

        {/* ════ TAB SERVIDOR ════ */}
        {tab === 'server' && (
          <div style={S.serverPage}>

            {/* Selector de perfil */}
            <div data-entry style={S.card}>
              <div style={S.cardTitle}>Servidor LLM</div>
              <span style={{ fontSize: '0.77rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Selecciona el servidor activo. Cada perfil usa los endpoints correctos automáticamente.
              </span>
              <div style={S.profileGrid}>
                {SERVER_PROFILES.map(profile => {
                  const active = form.serverProfileId === profile.id
                  return (
                    <button
                      key={profile.id}
                      style={S.profileBtn(active)}
                      onClick={() => handleProfileSelect(profile)}
                    >
                      <span style={S.profileIcon}>{profile.icon}</span>
                      <span style={S.profileName(active)}>{profile.name}</span>
                      <span style={S.profileDesc}>{profile.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Conexión */}
            <div data-entry style={S.card}>
              <div style={S.cardTitle}>Conexión</div>

              <div style={S.row}>
                <label style={S.label}>Host</label>
                <input
                  style={S.input} type="text"
                  value={form.baseUrl}
                  placeholder={getProfileById(form.serverProfileId)?.defaultHost || 'http://localhost:...'}
                  onChange={e => setField('baseUrl', e.target.value)}
                />
              </div>

              {form.provider !== 'ollama' && (
                <div style={S.row}>
                  <label style={S.label}>Prefijo API</label>
                  <div style={S.apiBaseRow}>
                    <span style={S.apiBaseLabel}>{form.baseUrl || 'http://host'}</span>
                    <input
                      style={{ ...S.input, fontFamily: 'monospace' }} type="text"
                      value={form.apiBase}
                      placeholder="/v1"
                      onChange={e => setField('apiBase', e.target.value)}
                    />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    URL completa de inferencia: <code style={{ fontFamily: 'monospace' }}>
                      {(form.baseUrl || 'http://host').replace(/\/$/, '')}{form.apiBase || '/v1'}/chat/completions
                    </code>
                  </span>
                </div>
              )}

              {form.provider !== 'ollama' && (
                <div style={S.row}>
                  <label style={S.label}>API Key</label>
                  <input style={S.input} type="password" value={form.apiKey} placeholder="sk-… (opcional para servidores locales)"
                    onChange={e => setField('apiKey', e.target.value)} />
                </div>
              )}
            </div>

            {/* Estado del servicio */}
            <div data-entry style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={S.cardTitle}>Estado del servicio</div>
                <button
                  style={S.refreshBtn}
                  disabled={psLoading}
                  onClick={() => { refreshStatus(); fetchPs() }}
                >
                  {psLoading ? '…' : '↻ Actualizar'}
                </button>
              </div>

              <StatusRow status={providerStatus} provider={form.serverProfileId} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={S.label}>Modelos en memoria</span>
                {psData?.error && <span style={S.errorMsg}>{psData.error}</span>}
                {psData && !psData.error && psData.models?.length === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {form.provider === 'ollama'
                      ? 'Ningún modelo cargado en VRAM (se carga al primer mensaje)'
                      : 'Sin modelos activos reportados'}
                  </span>
                )}
                {psData?.models?.map(m => <PsModelRow key={m.name} model={m} />)}
              </div>
            </div>

            {/* Descubrimiento local */}
            <DiscoveryPanel
              currentUrl={form.baseUrl}
              onConnect={handleDiscoveryConnect}
            />

          </div>
        )}

        {/* ════ TAB MODELO ════ */}
        {tab === 'model' && (
          <div style={S.modelPage}>

            {/* Columna izquierda */}
            <div style={S.col}>

              {/* Modelo */}
              <div data-entry style={S.card}>
                <div style={S.cardTitle}>Modelo</div>

                <div style={S.activeModelBadge}>
                  <span style={S.activeModelLabel}>Modelo activo</span>
                  <span style={S.activeModelName}>{cfg.model || '—'}</span>
                </div>

                <div style={S.row}>
                  <div style={S.labelRow}>
                    <label style={S.label}>Seleccionar modelo</label>
                    {modelError && <span style={S.errorMsg}>{modelError}</span>}
                  </div>
                  <div style={S.modelRow}>
                    {availableModels.length > 0 ? (
                      <select style={S.select} value={form.model} onChange={e => setField('model', e.target.value)}>
                        {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : (
                      <input style={S.input} type="text" value={form.model} placeholder="llama3.2"
                        onChange={e => setField('model', e.target.value)} />
                    )}
                    <button style={S.fetchBtn(loadingModels)} onClick={fetchModels} disabled={loadingModels}>
                      {loadingModels ? '...' : 'Ver lista'}
                    </button>
                    <button style={S.testBtn(testing)} onClick={testModel} disabled={testing || !form.model}>
                      {testing ? '...' : 'Probar'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
                    <button
                      style={S.selectModelBtn(form.model === cfg.model)}
                      onClick={selectModel}
                      disabled={!form.model || form.model === cfg.model}
                    >
                      Seleccionar modelo
                    </button>
                    {modelSaved && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-green, #86efac)' }}>
                        ✓ Modelo seleccionado
                      </span>
                    )}
                    {form.model && form.model !== cfg.model && !modelSaved && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        (sin guardar)
                      </span>
                    )}
                  </div>

                  {testResult && (
                    <div style={S.testResult(testResult.ok)}>
                      {testResult.ok ? '✓' : '✗'} {testResult.message}
                    </div>
                  )}

                  {form.provider === 'ollama' && form.model && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                      {uninstallStep === 'confirm'
                        ? <button style={S.confirmBtn} onClick={handleUninstall}>¿Confirmar?</button>
                        : <button style={S.dangerBtn(uninstallStep === 'loading')} onClick={handleUninstall} disabled={uninstallStep === 'loading'}>
                            {uninstallStep === 'loading' ? '...' : 'Desinstalar'}
                          </button>
                      }
                      {uninstallResult && (
                        <span style={{ fontSize: '0.72rem', color: uninstallResult.ok ? 'var(--color-green, #86efac)' : '#fca5a5' }}>
                          {uninstallResult.ok ? '✓' : '✗'} {uninstallResult.message}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {modelHint?.supportsThinking && (
                  <div style={S.toggleRow}>
                    <div style={S.toggleLabel}>
                      <span style={S.toggleTitle}>Thinking mode</span>
                      <span style={S.toggleDesc}>
                        {form.thinking ? 'Activado — razonamiento interno visible' : 'Desactivado — respuesta directa'}
                      </span>
                    </div>
                    <button style={S.toggle(form.thinking)} onClick={() => setField('thinking', !form.thinking)}>
                      <div style={S.toggleKnob(form.thinking)} />
                    </button>
                  </div>
                )}

                {modelHint && (
                  <div style={S.hint}>
                    <span style={S.hintLabel}>{modelHint.label} — config sugerida</span>
                    <span style={S.hintNote}>{modelHint.note}</span>
                    <span style={S.hintVals}>
                      temp {modelHint.temperature.toFixed(2)} · top_p {modelHint.topP.toFixed(2)}
                      {modelHint.topK > 0 ? ` · top_k ${modelHint.topK}` : ''} · {modelHint.maxTokens.toLocaleString()} tokens
                      {modelHint.repeatPenalty !== 1.0 ? ` · rep ${modelHint.repeatPenalty}` : ''}
                    </span>
                    <button style={S.hintApply} onClick={() => applyHint(modelHint)}>
                      Aplicar sugerencia
                    </button>
                  </div>
                )}
              </div>

              {template && (
                <div style={S.card}>
                  <div style={S.cardTitle}>Chat Template</div>
                  <div style={S.templateBadge}>
                    <span style={S.templateName}>{template.label}</span>
                    <code style={S.templateExample}>{template.example}</code>
                    <span style={S.templateNote}>{template.note}</span>
                  </div>
                </div>
              )}

            </div>

            {/* Columna derecha */}
            <div style={S.col}>

              <div data-entry style={S.card}>
                <div style={S.cardTitle}>Presets de inferencia</div>
                <div style={S.presetGrid}>
                  {PRESETS.map(p => (
                    <button key={p.id} style={S.presetBtn(activePreset === p.id)} onClick={() => applyPreset(p)}>
                      <span style={S.presetIcon}>{p.icon}</span>
                      <span style={S.presetLabel(activePreset === p.id)}>{p.label}</span>
                      <span style={S.presetDesc}>{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div data-entry style={S.card}>
                <div style={S.cardTitle}>Parámetros</div>

                <div style={S.row}>
                  <label style={S.label}>Temperature</label>
                  <div style={S.sliderRow}>
                    <input type="range" style={S.slider} min="0" max="2" step="0.05"
                      value={form.temperature} onChange={e => setField('temperature', e.target.value)} />
                    <span style={S.sliderVal}>{parseFloat(form.temperature).toFixed(2)}</span>
                  </div>
                </div>

                <div style={S.row}>
                  <label style={S.label}>Top P</label>
                  <div style={S.sliderRow}>
                    <input type="range" style={S.slider} min="0" max="1" step="0.01"
                      value={form.topP} onChange={e => setField('topP', e.target.value)} />
                    <span style={S.sliderVal}>{parseFloat(form.topP).toFixed(2)}</span>
                  </div>
                </div>

                <div style={S.row}>
                  <div style={S.labelRow}>
                    <label style={S.label}>Top K</label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-faint)' }}>
                      {parseInt(form.topK) < 0 ? 'auto (default modelo)' : ''}
                    </span>
                  </div>
                  <div style={S.sliderRow}>
                    <input type="range" style={S.slider} min="-1" max="200" step="1"
                      value={form.topK} onChange={e => setField('topK', e.target.value)} />
                    <span style={S.sliderVal}>{parseInt(form.topK) < 0 ? 'auto' : form.topK}</span>
                  </div>
                </div>

                <div style={S.row}>
                  <label style={S.label}>Repeat Penalty</label>
                  <div style={S.sliderRow}>
                    <input type="range" style={S.slider} min="1.0" max="1.5" step="0.01"
                      value={form.repeatPenalty} onChange={e => setField('repeatPenalty', e.target.value)} />
                    <span style={S.sliderVal}>{parseFloat(form.repeatPenalty).toFixed(2)}</span>
                  </div>
                </div>

                <div style={S.row}>
                  <label style={S.label}>Max Tokens</label>
                  <div style={S.sliderRow}>
                    <input type="range" style={S.slider} min="128" max="16384" step="128"
                      value={form.maxTokens} onChange={e => setField('maxTokens', e.target.value)} />
                    <span style={S.sliderVal}>{parseInt(form.maxTokens).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {form.provider === 'ollama' && (
                <div style={S.card}>
                  <div style={S.cardTitle}>Instalar modelo</div>
                  <span style={{ fontSize: '0.77rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    Instala modelos directamente desde la terminal y luego recarga la lista.
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Desde Ollama registry o HuggingFace:</span>
                    <code style={S.codeBlock}>ollama pull nombre-modelo:tag</code>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>Desde archivo GGUF local:</span>
                    <code style={S.codeBlock}>{'ollama create mi-modelo -f - <<\'EOF\'\nFROM /ruta/al/modelo.gguf\nEOF'}</code>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>Clonar modelo existente:</span>
                    <code style={S.codeBlock}>ollama cp modelo-origen mi-modelo:latest</code>
                  </div>
                  <button style={S.refreshBtnLarge} onClick={fetchModels} disabled={loadingModels}>
                    {loadingModels ? 'Recargando…' : 'Recargar lista de modelos'}
                  </button>
                </div>
              )}

              {form.provider === 'ollama' && (
                <div style={S.card}>
                  <div style={S.cardTitle}>Mantenimiento de caché</div>
                  <span style={{ fontSize: '0.77rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    Elimina blobs huérfanos — archivos que quedaron en disco después de reinstalaciones
                    fallidas. Útil cuando un modelo persiste corrompido aunque se reinstale.
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {purgeStep === 'confirm'
                      ? <button style={S.confirmBtn} onClick={handlePurge}>¿Confirmar purga?</button>
                      : <button
                          style={S.dangerBtn(purgeStep === 'loading')}
                          onClick={handlePurge}
                          disabled={purgeStep === 'loading'}
                        >
                          {purgeStep === 'loading' ? 'Purgando…' : 'Purgar blobs huérfanos'}
                        </button>
                    }
                    {purgeResult && (
                      <span style={{ fontSize: '0.72rem', color: purgeResult.ok ? 'var(--color-green, #86efac)' : '#fca5a5' }}>
                        {purgeResult.ok ? '✓' : '✗'} {purgeResult.message}
                      </span>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* ── Footer siempre visible ──────────────────────────────────────── */}
      <div style={S.footer}>
        <button style={S.btnSave} onClick={handleSave}>Guardar</button>
        {saved && <span style={S.savedMsg}>Configuración guardada</span>}
      </div>

    </div>
  )
}
