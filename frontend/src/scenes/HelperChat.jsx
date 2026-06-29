import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate }                   from 'react-router-dom'
import { useTranslation }                           from 'react-i18next'
import { useChat }                                  from '../hooks/useChat'
import { useConfigStore }                           from '../store/configStore'
import { useModelDownload }                         from '../hooks/useModelDownload'
import { ModelDownloadPopup }                       from '../components/ModelDownloadPopup'
import { api }                                      from '../lib/api'
import { InputBar }                                 from '../components/InputBar'

/* ── Herramientas disponibles ────────────────────────────────────────────────
   requires_models: IDs del MODEL_REGISTRY del backend.
   [] = sin modelos → el toggle activa directamente.
   Con modelos → si alguno falta, muestra el popup de descarga.
─────────────────────────────────────────────────────────────────────────── */
const TOOL_DEFS = [
  { id: 'web_search',    icon: '🌐', key: 'web_search',    requires_models: [] },
  { id: 'url_reader',    icon: '🔗', key: 'url_reader',    requires_models: [] },
  { id: 'image_search',  icon: '🖼', key: 'image_search',  requires_models: [] },
  { id: 'vision_filter', icon: '👁', key: 'vision_filter', requires_models: ['arcface_w600k'] },
]

/* ── Estilos ─────────────────────────────────────────────────────────────────── */
const S = {
  root: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100vh',
    width:         '100vw',
    background:    'var(--color-bg)',
    fontFamily:    'var(--font-ui)',
    color:         'var(--color-text)',
    overflow:      'hidden',
  },

  // TopBar
  topBar: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 1.25rem',
    height:         '52px',
    flexShrink:     0,
    background:     'var(--color-surface)',
    borderBottom:   '1px solid var(--color-border)',
    zIndex:         25,
    position:       'relative',
  },
  backBtn: {
    background:    'transparent',
    border:        '1px solid var(--color-border)',
    borderRadius:  'var(--radius-sm)',
    color:         'var(--color-text-muted)',
    fontSize:      '0.75rem',
    padding:       '0.25rem 0.6rem',
    cursor:        'pointer',
    letterSpacing: '0.5px',
  },
  topCenter: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.6rem',
  },
  topAvatar: {
    width:        '28px',
    height:       '28px',
    borderRadius: '50%',
    objectFit:    'cover',
    border:       '1px solid var(--color-border-accent)',
  },
  charName: {
    fontSize:      '0.85rem',
    fontWeight:    600,
    letterSpacing: '0.5px',
    color:         'var(--color-text)',
  },
  modeBadge: {
    fontSize:      '0.6rem',
    letterSpacing: '2px',
    color:         'var(--color-cyan, var(--color-accent))',
    background:    'color-mix(in srgb, var(--color-cyan, var(--color-accent)) 12%, transparent)',
    border:        '1px solid color-mix(in srgb, var(--color-cyan, var(--color-accent)) 30%, transparent)',
    borderRadius:  '20px',
    padding:       '0.15rem 0.5rem',
  },
  modelBadge: {
    fontSize:   '0.72rem',
    color:      'var(--color-accent)',
    background: 'var(--color-accent-dim)',
    padding:    '0.2rem 0.6rem',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },

  // Body
  body: {
    display:  'flex',
    flex:     1,
    overflow: 'hidden',
  },

  // Sidebar
  sidebar: {
    width:         '220px',
    flexShrink:    0,
    display:       'flex',
    flexDirection: 'column',
    gap:           '0',
    background:    'var(--color-surface)',
    borderRight:   '1px solid var(--color-border)',
    overflowY:     'auto',
  },
  sidebarHeader: {
    padding:     '1rem',
    display:     'flex',
    flexDirection:'column',
    alignItems:  'center',
    gap:         '0.5rem',
    borderBottom:'1px solid var(--color-border)',
  },
  sidebarAvatar: {
    width:        '64px',
    height:       '64px',
    borderRadius: '50%',
    objectFit:    'cover',
    border:       '2px solid var(--color-border-accent)',
  },
  sidebarCharName: {
    fontSize:      '0.85rem',
    fontWeight:    600,
    letterSpacing: '0.5px',
    textAlign:     'center',
    color:         'var(--color-text)',
  },
  sidebarModeBadge: {
    fontSize:      '0.58rem',
    letterSpacing: '1.5px',
    color:         'var(--color-cyan, var(--color-accent))',
    textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize:      '0.6rem',
    letterSpacing: '2px',
    color:         'var(--color-text-faint)',
    textTransform: 'uppercase',
    padding:       '0.75rem 1rem 0.4rem',
  },
  toolRow: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0.5rem 1rem',
    gap:            '0.5rem',
  },
  toolLabel: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.4rem',
    fontSize:   '0.78rem',
    color:      'var(--color-text)',
    flex:       1,
  },
  toolIcon: {
    fontSize: '0.9rem',
    lineHeight: 1,
  },
  betaChip: {
    fontSize:      '0.55rem',
    letterSpacing: '1px',
    color:         'var(--color-text-faint)',
    background:    'var(--color-surface-2)',
    border:        '1px solid var(--color-border)',
    borderRadius:  '4px',
    padding:       '0.1rem 0.35rem',
  },

  // Chat area
  chatArea: {
    flex:     1,
    display:  'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  messages: {
    flex:          1,
    overflowY:     'auto',
    padding:       '1.25rem 1.5rem',
    paddingBottom: '130px',
    display:       'flex',
    flexDirection: 'column',
    gap:           '1rem',
  },

  // Empty state
  empty: {
    flex:           1,
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '0.4rem',
    color:          'var(--color-text-faint)',
    paddingBottom:  '80px',
  },
  emptyTitle: {
    fontSize:      '1rem',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color:         'var(--color-text-muted)',
  },
  emptySub: {
    fontSize: '0.8rem',
  },

  // Burbujas
  msgWrapper: (role) => ({
    display:       'flex',
    flexDirection: 'column',
    alignItems:    role === 'user' ? 'flex-end' : 'flex-start',
  }),
  roleTag: (role) => ({
    fontSize:      '0.62rem',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color:         role === 'user' ? 'var(--color-accent)' : 'var(--color-text-muted)',
    marginBottom:  '0.25rem',
  }),
  bubble: (role) => ({
    maxWidth:     '72%',
    background:   role === 'user' ? 'var(--color-accent-dim)' : 'var(--color-surface)',
    border:       `1px solid ${role === 'user' ? 'var(--color-border-accent)' : 'var(--color-border)'}`,
    borderRadius: role === 'user'
      ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
      : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
    padding:    '0.7rem 1rem',
    lineHeight: 1.65,
    fontSize:   '0.9rem',
    color:      'var(--color-text)',
    whiteSpace: 'pre-wrap',
    wordBreak:  'break-word',
  }),
  cursor: {
    display:       'inline-block',
    width:         '2px',
    height:        '1em',
    background:    'var(--color-accent)',
    marginLeft:    '2px',
    verticalAlign: 'text-bottom',
    animation:     'blink 1s step-end infinite',
  },

  // Agent step log
  agentLog: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.2rem',
    padding:       '0.6rem 0.9rem',
    background:    'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))',
    border:        '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
    borderRadius:  'var(--radius-sm)',
    marginBottom:  '0.4rem',
    maxWidth:      '72%',
  },
  agentStep: (status) => ({
    display:    'flex',
    alignItems: 'center',
    gap:        '0.4rem',
    fontSize:   '0.72rem',
    color:      status === 'error'   ? '#fca5a5'
               : status === 'done'   ? 'var(--color-accent)'
               :                       'var(--color-text-muted)',
  }),
}

/* ── Toggle switch ─────────────────────────────────────────────────────────── */
function ToolToggle({ active, onToggle }) {
  return (
    <div
      onClick={() => onToggle(!active)}
      style={{
        width:        '36px',
        height:       '20px',
        borderRadius: '10px',
        background:   active ? 'var(--color-accent)' : 'var(--color-surface-2)',
        border:       `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        position:     'relative',
        cursor:       'pointer',
        transition:   'background 0.2s, border-color 0.2s',
        flexShrink:   0,
      }}
    >
      <div style={{
        position:   'absolute',
        top:        '2px',
        left:       active ? '17px' : '2px',
        width:      '14px',
        height:     '14px',
        borderRadius: '50%',
        background: active ? '#000' : 'var(--color-text-muted)',
        transition: 'left 0.15s',
      }} />
    </div>
  )
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export function HelperChat() {
  const { chatId }  = useParams()
  const navigate    = useNavigate()
  const { t }       = useTranslation()
  const [character, setCharacter] = useState(null)

  const activeTools   = useConfigStore(s => s.activeTools)
  const setActiveTool = useConfigStore(s => s.setActiveTool)
  const cfg           = useConfigStore()

  // Estado del agente en curso
  const [agentSteps,   setAgentSteps]   = useState([])   // pasos del agente actual
  const [agentRunning, setAgentRunning] = useState(false)

  const handleAgentEvent = useCallback((msg) => {
    switch (msg.type) {
      case 'agent_start':
        setAgentSteps([{ tool: msg.tool, action: `Iniciando ${msg.tool}…`, status: 'running' }])
        setAgentRunning(true)
        break
      case 'agent_step':
        setAgentSteps(prev => [...prev, { tool: msg.tool, action: msg.action, status: msg.status, result_preview: msg.result_preview }])
        break
      case 'agent_done':
      case 'agent_error':
        setAgentRunning(false)
        break
      case 'agent_result':
        // El resultado llega antes de agent_done; no limpiamos aún
        break
    }
  }, [])

  // Activos como array de IDs para el WS
  const activeToolIds = Object.entries(activeTools)
    .filter(([, v]) => v)
    .map(([k]) => k)

  const { messages, isStreaming, streamingContent, sendMessage, loadHistory } =
    useChat(chatId, { helperMode: true, activeTools: activeToolIds, onAgentEvent: handleAgentEvent })

  const { modelStatus, downloading, error: dlError, fetchStatus, downloadAll } = useModelDownload()

  // Estado del popup de descarga
  const [pendingTool,   setPendingTool]   = useState(null)   // { id, label, missingModels }
  const [isDownloading, setIsDownloading] = useState(false)

  const bottomRef = useRef(null)

  // Cargar personaje del chat
  useEffect(() => {
    if (!chatId) return
    api.chats.get(chatId)
      .then(chat => chat.character_id ? api.characters.get(chat.character_id) : null)
      .then(char => { if (char) setCharacter(char) })
      .catch(console.error)
  }, [chatId])

  // Cargar historial
  useEffect(() => {
    if (!chatId) return
    api.chats.messages(chatId).then(loadHistory).catch(console.error)
  }, [chatId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Limpiar pasos del agente al enviar un nuevo mensaje
  const handleSend = useCallback((content) => {
    setAgentSteps([])
    setAgentRunning(false)
    sendMessage(content)
  }, [sendMessage])

  // Lógica de toggle: si hay modelos faltantes → popup; si no → activa directamente
  const handleToolToggle = useCallback(async (tool, wantsOn) => {
    if (!wantsOn) {
      setActiveTool(tool.id, false)
      return
    }
    if (!tool.requires_models?.length) {
      setActiveTool(tool.id, true)
      return
    }
    // Verificar qué modelos faltan
    const status = modelStatus ?? await fetchStatus()
    if (!status) return
    const missing = tool.requires_models
      .map(id => status[id])
      .filter(m => m && !m.installed)

    if (missing.length === 0) {
      setActiveTool(tool.id, true)
    } else {
      setPendingTool({ id: tool.id, label: t(`helper.tools.${tool.key}`), missingModels: missing })
    }
  }, [modelStatus, fetchStatus, setActiveTool, t])

  // Usuario confirma la descarga
  const handleDownloadConfirm = useCallback(() => {
    if (!pendingTool) return
    setIsDownloading(true)
    downloadAll(
      pendingTool.missingModels.map(m => m.id),
      {
        onAllDone: () => {
          setActiveTool(pendingTool.id, true)
          setIsDownloading(false)
          setPendingTool(null)
        },
        onError: () => {
          setIsDownloading(false)
        },
      }
    )
  }, [pendingTool, downloadAll, setActiveTool])

  // Usuario cancela
  const handleDownloadCancel = useCallback(() => {
    if (isDownloading) return
    setPendingTool(null)
  }, [isDownloading])

  return (
    <div style={S.root}>

      {/* Popup de descarga de modelos */}
      {pendingTool && (
        <ModelDownloadPopup
          toolLabel={pendingTool.label}
          models={pendingTool.missingModels}
          downloading={downloading}
          isDownloading={isDownloading}
          error={dlError}
          onConfirm={handleDownloadConfirm}
          onCancel={handleDownloadCancel}
        />
      )}

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      {/* ── Top bar ── */}
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={() => navigate('/characters?mode=helper')}>
          {t('common.back')}
        </button>

        <div style={S.topCenter}>
          {character?.avatar_path && (
            <img src={api.characters.avatarUrl(character.id)} alt={character.name} style={S.topAvatar} />
          )}
          <span style={S.charName}>{character?.name ?? 'Helper'}</span>
          <span style={S.modeBadge}>{t('helper.mode_badge')}</span>
        </div>

        <span style={S.modelBadge}>{cfg.model}</span>
      </div>

      {/* ── Body: sidebar + chat ── */}
      <div style={S.body}>

        {/* Sidebar */}
        <div style={S.sidebar}>
          {character && (
            <div style={S.sidebarHeader}>
              {character.avatar_path && (
                <img src={api.characters.avatarUrl(character.id)} alt={character.name} style={S.sidebarAvatar} />
              )}
              <div style={S.sidebarCharName}>{character.name}</div>
              <div style={S.sidebarModeBadge}>{t('helper.mode_badge')}</div>
            </div>
          )}

          <div style={S.sectionLabel}>{t('helper.tools_section')}</div>

          {TOOL_DEFS.map(tool => (
            <div key={tool.id} style={S.toolRow}>
              <div style={S.toolLabel}>
                <span style={S.toolIcon}>{tool.icon}</span>
                {t(`helper.tools.${tool.key}`)}
                <span style={S.betaChip}>{t('helper.tools_coming')}</span>
              </div>
              <ToolToggle
                active={activeTools?.[tool.id] ?? false}
                onToggle={v => handleToolToggle(tool, v)}
              />
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div style={S.chatArea}>
          <div style={S.messages}>

            {messages.length === 0 && !isStreaming && (
              <div style={S.empty}>
                <div style={S.emptyTitle}>{character?.name ?? 'Helper'}</div>
                <div style={S.emptySub}>{t('helper.empty_sub')}</div>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} style={S.msgWrapper(m.role)}>
                <div style={S.roleTag(m.role)}>
                  {m.role === 'user' ? t('helper.role_user') : t('helper.role_assistant')}
                </div>
                <div style={S.bubble(m.role)}>{m.content}</div>
              </div>
            ))}

            {/* Log de pasos del agente */}
            {agentSteps.length > 0 && (isStreaming || agentRunning) && (
              <div style={{ alignSelf: 'flex-start' }}>
                <div style={S.agentLog}>
                  {agentSteps.map((step, i) => (
                    <div key={i} style={S.agentStep(step.status)}>
                      <span>{step.status === 'running' ? '◌' : step.status === 'error' ? '✗' : '✓'}</span>
                      <span>[{step.tool}] {step.action}</span>
                      {step.result_preview && <span style={{ color: 'var(--color-text-faint)' }}>— {step.result_preview}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isStreaming && (
              <div style={S.msgWrapper('assistant')}>
                <div style={S.roleTag('assistant')}>{t('helper.role_assistant')}</div>
                <div style={S.bubble('assistant')}>
                  {streamingContent}
                  <span style={S.cursor} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <InputBar onSend={handleSend} disabled={isStreaming || !chatId} />
        </div>

      </div>
    </div>
  )
}
