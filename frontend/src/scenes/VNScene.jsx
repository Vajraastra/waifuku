import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useChat }          from '../hooks/useChat'
import { useChatStore }     from '../store/chatStore'
import { useConfigStore }   from '../store/configStore'
import { useThemeStore }    from '../store/themeStore'
import { useProviderStatus } from '../hooks/useProviderStatus'
import { THEME_LIST }       from '../lib/themes'
import { api }              from '../lib/api'
import { CharacterSprite }  from '../components/CharacterSprite'
import { InputBar }         from '../components/InputBar'
import { LLMStatsHUD }      from '../components/LLMStatsHUD'

export function VNScene() {
  const { chatId }    = useParams()
  const navigate      = useNavigate()
  const [character, setCharacter] = useState(null)

  const { messages, isPending, isStreaming, streamingContent, sendMessage, regenerate, loadHistory } = useChat(chatId)
  const updateMessage    = useChatStore(s => s.updateMessage)
  const removeMessage    = useChatStore(s => s.removeMessage)
  const sceneBackground  = useConfigStore(s => s.sceneBackground)
  const chatOpacity      = useConfigStore(s => s.chatOpacity)
  const chatFontSize     = useConfigStore(s => s.chatFontSize)
  const showLLMStats     = useConfigStore(s => s.showLLMStats)

  // Carga personaje desde el chat — funciona aunque se navegue por URL directa
  useEffect(() => {
    if (!chatId) return
    api.chats.get(chatId)
      .then(chat => chat.character_id ? api.characters.get(chat.character_id) : null)
      .then(char => { if (char) setCharacter(char) })
      .catch(console.error)
  }, [chatId])

  useEffect(() => {
    if (!chatId) return
    api.chats.messages(chatId).then(loadHistory).catch(console.error)
  }, [chatId])

  const bgUrl = sceneBackground ? api.backgrounds.url(sceneBackground) : null

  return (
    <div style={{
      ...S.root,
      ...(bgUrl ? {
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : {}),
    }}>
      <style>{`
        @keyframes waifuku-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes waifuku-bounce { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
      `}</style>
      <SceneTopBar character={character} chatId={chatId} navigate={navigate} hasBg={!!bgUrl} />

      {/* main tiene position:relative para que InputBar se posicione dentro */}
      <div style={{ ...S.main, background: bgUrl ? 'transparent' : undefined }}>
        <ChatPanel
          messages={messages}
          character={character}
          isPending={isPending}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          onRegenerate={regenerate}
          onEditMessage={updateMessage}
          onDeleteMessage={removeMessage}
          chatId={chatId}
          disabled={isPending || isStreaming}
          chatOpacity={chatOpacity}
          chatFontSize={chatFontSize ?? 0.88}
          hasBg={!!bgUrl}
        />
        <SpritePanel character={character} transparent={!!bgUrl} />
        <InputBar onSend={sendMessage} disabled={isStreaming || !chatId} hasBg={!!bgUrl} chatOpacity={chatOpacity} />
      </div>

      {showLLMStats && <LLMStatsHUD hasBg={!!bgUrl} />}
    </div>
  )
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function SceneTopBar({ character, chatId, navigate, hasBg }) {
  const { t }               = useTranslation()
  const showLLMStats        = useConfigStore(s => s.showLLMStats)
  const setConfig           = useConfigStore(s => s.setConfig)
  const { themeId, setTheme } = useThemeStore()
  const { status, label: providerLabel } = useProviderStatus()
  const [showSettings, setShowSettings] = useState(false)
  const settingsBtnRef = useRef(null)

  // Cierra el panel al hacer click fuera
  useEffect(() => {
    if (!showSettings) return
    function onClickOut(e) {
      if (!e.target.closest('[data-scene-settings]')) setShowSettings(false)
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [showSettings])

  async function handleNewChat() {
    if (!character) return
    try {
      const chat = await api.chats.create({
        character_id: character.id,
        title: `Chat con ${character.name}`,
      })
      navigate(`/chat/${chat.id}`)
    } catch (e) {
      console.error(e)
    }
  }

  const topBarStyle = hasBg ? {
    ...S.topBar,
    background: 'rgba(8, 8, 18, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  } : S.topBar

  return (
    <div style={topBarStyle}>

      {/* Izquierda — Volver */}
      <button style={S.backBtn} onClick={() => navigate('/characters')}>
        {t('common.back')}
      </button>

      {/* Centro — avatar + nombre + modelo */}
      <div style={S.topCenter}>
        {character?.avatar_path && (
          <img src={api.characters.avatarUrl(character.id)} alt={character.name} style={S.topAvatar} />
        )}
        {character?.name && <span style={S.charName}>{character.name}</span>}
      </div>

      {/* Derecha — estado provider + selector tema | acciones */}
      <div style={S.topActions}>
        <SceneProviderDot status={status} provider={providerLabel} />

        <select
          value={themeId}
          onChange={e => setTheme(e.target.value)}
          style={S.themeSelect}
        >
          {THEME_LIST.map(th => (
            <option key={th.id} value={th.id}>{th.icon} {th.label}</option>
          ))}
        </select>

        <div style={S.topDivider} />

        <button style={S.actionBtn} onClick={handleNewChat} title={t('vn.new_chat')}>
          + {t('vn.new_chat')}
        </button>

        {/* Botón de stats HUD */}
        <button
          style={{
            ...S.actionBtn,
            ...S.actionBtnIcon,
            ...(showLLMStats ? { borderColor: 'var(--color-cyan)', color: 'var(--color-cyan)' } : {}),
          }}
          title={t('vn.stats_hud')}
          onClick={() => setConfig({ showLLMStats: !showLLMStats })}
        >
          ▦
        </button>

        {/* Botón ⚙ + popover inline */}
        <div style={{ position: 'relative' }} data-scene-settings>
          <button
            ref={settingsBtnRef}
            style={{
              ...S.actionBtn,
              ...S.actionBtnIcon,
              ...(showSettings ? { borderColor: 'var(--color-accent)', color: 'var(--color-accent)' } : {}),
            }}
            title={t('vn.scene_settings')}
            onClick={() => setShowSettings(v => !v)}
          >
            ⚙
          </button>

          {showSettings && <SceneSettingsPanel hasBg={hasBg} />}
        </div>
      </div>
    </div>
  )
}

function SceneSettingsPanel({ hasBg }) {
  const { t }        = useTranslation()
  const chatOpacity  = useConfigStore(s => s.chatOpacity)
  const chatFontSize = useConfigStore(s => s.chatFontSize)
  const setConfig    = useConfigStore(s => s.setConfig)

  function NumInput({ value, min, max, step, onChange }) {
    const [raw, setRaw] = useState(String(value))
    function commit(v) {
      const n = parseFloat(v)
      if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)))
    }
    return (
      <input
        type="number"
        min={min} max={max} step={step}
        value={raw}
        onChange={e => { setRaw(e.target.value); commit(e.target.value) }}
        onBlur={e => { commit(e.target.value); setRaw(String(parseFloat(e.target.value) || value)) }}
        style={S.settingsNumInput}
      />
    )
  }

  return (
    <div style={S.settingsPanel}>
      <div style={S.settingsPanelTitle}>{t('vn.scene_settings')}</div>

      {/* Opacidad del chat */}
      <div style={S.settingsRow}>
        <span style={S.settingsLabel}>
          {t('vn.opacity_label')}
          {!hasBg && <span style={S.settingsHint}> {t('vn.opacity_hint')}</span>}
        </span>
        <span style={S.settingsVal}>{Math.round((chatOpacity ?? 0.85) * 100)}%</span>
      </div>
      <div style={S.settingsSliderRow}>
        <input
          type="range" min="0.3" max="1" step="0.05"
          value={chatOpacity ?? 0.85}
          onChange={e => setConfig({ chatOpacity: parseFloat(e.target.value) })}
          style={S.settingsSlider}
          disabled={!hasBg}
        />
        <NumInput
          value={+(chatOpacity ?? 0.85).toFixed(2)}
          min={0.3} max={1} step={0.05}
          onChange={v => setConfig({ chatOpacity: v })}
        />
      </div>

      <div style={S.settingsDivider} />

      {/* Tamaño de fuente */}
      <div style={S.settingsRow}>
        <span style={S.settingsLabel}>{t('vn.font_size_label')}</span>
        <span style={S.settingsVal}>{(chatFontSize ?? 0.88).toFixed(2)} rem</span>
      </div>
      <div style={S.settingsSliderRow}>
        <input
          type="range" min="0.75" max="1.15" step="0.01"
          value={chatFontSize ?? 0.88}
          onChange={e => setConfig({ chatFontSize: parseFloat(e.target.value) })}
          style={S.settingsSlider}
        />
        <NumInput
          value={+(chatFontSize ?? 0.88).toFixed(2)}
          min={0.75} max={1.15} step={0.01}
          onChange={v => setConfig({ chatFontSize: v })}
        />
      </div>

      {/* Preview */}
      <div style={S.settingsPreview}>
        <span style={{ fontSize: `${chatFontSize ?? 0.88}rem`, fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--color-text)', lineHeight: 1.7 }}>
          {t('vn.preview_text')}
        </span>
      </div>
    </div>
  )
}

function SceneProviderDot({ status, provider }) {
  const color = status === 'online' ? 'var(--color-accent)'
              : status === 'offline' ? '#ef4444'
              : 'var(--color-border)'
  const glow  = status !== 'checking'
    ? `0 0 8px color-mix(in srgb, ${color} 35%, transparent)`
    : 'none'
  return (
    <div title={`${provider} · ${status}`} style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.2rem 0.6rem', borderRadius: '999px',
      border: `1px solid ${color}`, background: 'var(--color-surface-2)',
      boxShadow: glow, transition: 'border-color 0.3s, box-shadow 0.3s',
      cursor: 'default', userSelect: 'none',
    }}>
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%', background: color,
        boxShadow: status !== 'checking' ? `0 0 4px ${color}` : 'none',
        transition: 'background 0.3s', flexShrink: 0,
      }} />
      <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-ui)', color: 'var(--color-text-2)', letterSpacing: '0.3px' }}>
        {provider}
      </span>
      <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-ui)', color, letterSpacing: '0.3px', opacity: 0.9 }}>
        {status === 'checking' ? '···' : status}
      </span>
    </div>
  )
}

// ── Panel de chat (Twitch-style) ──────────────────────────────────────────────

function ChatPanel({ messages, character, isPending, isStreaming, streamingContent,
                     onRegenerate, onEditMessage, onDeleteMessage, chatId, disabled,
                     chatOpacity, chatFontSize, hasBg }) {
  const { t }  = useTranslation()
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingContent, isPending])

  const hasMessages = messages.length > 0
  const greeting    = !hasMessages && character?.first_mes

  // Identifica últimos mensajes editables
  const lastUserIdx      = [...messages].map((m,i) => m.role === 'user'      ? i : -1).filter(i => i >= 0).at(-1)
  const lastAssistantIdx = [...messages].map((m,i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).at(-1)

  const panelBg = hasBg
    ? `rgba(8, 8, 18, ${chatOpacity})`
    : 'var(--color-bg)'
  const borderColor = hasBg
    ? `rgba(255,255,255,0.08)`
    : 'var(--color-border)'
  const charAvatarUrl = character?.avatar_path ? api.characters.avatarUrl(character.id) : null
  const fadeColor = hasBg ? `rgba(8,8,18,${chatOpacity})` : 'var(--color-bg)'

  return (
    <div style={{
      ...S.chatPanel,
      background: panelBg,
      borderRightColor: borderColor,
      backdropFilter: hasBg ? 'blur(10px)' : 'none',
      WebkitBackdropFilter: hasBg ? 'blur(10px)' : 'none',
    }}>
      <div style={S.chatScroll}>
        {greeting && (
          <ChatLine
            role="assistant"
            content={character.first_mes}
            name={character.name}
            charAvatarUrl={charAvatarUrl}
            chatFontSize={chatFontSize}
            isGreeting
          />
        )}
        {messages.map((msg, idx) => (
          <ChatLine
            key={msg.id}
            role={msg.role}
            content={msg.content}
            name={msg.role === 'assistant' ? character?.name : t('vn.user_name')}
            charAvatarUrl={msg.role === 'assistant' ? charAvatarUrl : null}
            isLastUser={idx === lastUserIdx && !isStreaming && !isPending}
            isLastAssistant={idx === lastAssistantIdx && !isStreaming && !isPending}
            onEdit={async (newContent) => {
              await api.chats.updateMessage(chatId, msg.id, newContent)
              onEditMessage(msg.id, newContent)
            }}
            onDelete={async () => {
              await api.chats.deleteMessage(chatId, msg.id)
              onDeleteMessage(msg.id)
            }}
            onRegenerate={idx === lastAssistantIdx ? onRegenerate : null}
            disabled={disabled}
            chatFontSize={chatFontSize}
          />
        ))}
        {/* Indicador de pending (entre envío y primer token) */}
        {isPending && !isStreaming && (
          <div style={S.pendingLine}>
            {[0, 0.2, 0.4].map((delay, i) => (
              <span key={i} style={{
                ...S.pendingDot,
                animation: `waifuku-bounce 1.2s ${delay}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        )}
        {isStreaming && (
          <ChatLine
            role="assistant"
            content={streamingContent}
            name={character?.name ?? '…'}
            charAvatarUrl={charAvatarUrl}
            chatFontSize={chatFontSize}
            isStreaming
          />
        )}
        <div ref={endRef} />
      </div>

      {/* Fade inferior — suaviza el corte con el InputBar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: `linear-gradient(to bottom, transparent, ${fadeColor})`,
        pointerEvents: 'none',
        zIndex: 1,
      }} />
    </div>
  )
}

function renderNarration(text) {
  if (!text) return <span style={{ color: 'var(--color-text-muted)' }}>…</span>
  const parts = text.split(/(\*[^*\n]+\*)/)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2
      ? <em key={i} style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{part.slice(1, -1)}</em>
      : part
  )
}

function ChatLine({ role, content, name, isStreaming, isGreeting,
                    isLastUser, isLastAssistant, onEdit, onDelete, onRegenerate,
                    disabled, charAvatarUrl, chatFontSize }) {
  const { t }   = useTranslation()
  const isUser  = role === 'user'
  const nameClr = isUser ? 'var(--color-cyan, #7dd3fc)' : 'var(--color-accent)'
  const [hovered,  setHovered]  = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(content)
  const [saving,   setSaving]   = useState(false)
  const canEdit   = (isLastUser || isLastAssistant) && !isGreeting && !isStreaming
  const canDelete = !isGreeting && !isStreaming

  async function saveEdit() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === content) { setEditing(false); return }
    setSaving(true)
    try { await onEdit(trimmed) } catch (e) { console.error(e) }
    setSaving(false)
    setEditing(false)
  }
  function cancelEdit() { setDraft(content); setEditing(false) }
  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') cancelEdit()
  }

  const cardStyle = {
    ...S.msgCard,
    ...(isUser ? S.msgCardUser : S.msgCardAssistant),
    opacity: isGreeting ? 0.65 : 1,
  }

  return (
    <div style={cardStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {/* Header: mini-avatar + nombre */}
      <div style={S.msgHeader}>
        {!isUser && charAvatarUrl ? (
          <img src={charAvatarUrl} alt={name} style={S.miniAvatar} />
        ) : !isUser ? (
          <div style={S.miniAvatarPlaceholder} />
        ) : null}
        <span style={{ ...S.chatName, color: nameClr }}>
          {name ?? (isUser ? t('vn.user_name') : '…')}
        </span>
      </div>

      {/* Cuerpo del mensaje */}
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            style={S.editTextarea}
          />
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button style={S.editSaveBtn} onClick={saveEdit} disabled={saving}>
              {saving ? '…' : t('vn.msg_save')}
            </button>
            <button style={S.editCancelBtn} onClick={cancelEdit}>{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <div style={{ ...S.chatText, fontSize: `${chatFontSize ?? 0.88}rem` }}>
          {renderNarration(content)}
          {isStreaming && <span style={S.cursor} />}
        </div>
      )}

      {/* Botones de acción al hover */}
      {hovered && !editing && !disabled && (canEdit || canDelete) && (
        <div style={S.msgActions}>
          {canEdit && (
            <button style={S.msgActionBtn} onClick={() => { setDraft(content); setEditing(true) }} title={t('vn.msg_edit')}>✎</button>
          )}
          {isLastAssistant && onRegenerate && (
            <button style={S.msgActionBtn} onClick={onRegenerate} title={t('vn.msg_regen')}>↺</button>
          )}
          {canDelete && (
            <button style={{ ...S.msgActionBtn, color: '#f87171' }} onClick={onDelete} title={t('vn.msg_delete')}>✕</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Panel del sprite ──────────────────────────────────────────────────────────

function SpritePanel({ character, transparent }) {
  return (
    <div style={{ ...S.spritePanel, background: transparent ? 'transparent' : 'var(--color-bg)' }}>
      <CharacterSprite
        src={character?.avatar_path ? api.characters.avatarUrl(character.id) : null}
        name={character?.name ?? ''}
      />
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const S = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    background: 'var(--color-bg)',
    overflow: 'hidden',
    fontFamily: 'var(--font-ui)',
  },

  // Top bar
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0 1rem',
    height: '48px',
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
    zIndex: 10,
  },
  backBtn: {
    padding: '0.38rem 1rem',
    background: 'var(--color-accent-dim)',
    border: '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-accent)',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-ui)',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  topCenter: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
  },
  topAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid var(--color-border-accent)',
    flexShrink: 0,
  },
  charName: {
    fontFamily: 'var(--font-dialog)',
    fontSize: '1rem',
    color: 'var(--color-text)',
    letterSpacing: '1px',
  },
  topActions: {
    display: 'flex',
    gap: '0.4rem',
    flexShrink: 0,
  },
  actionBtn: {
    padding: '0.32rem 0.75rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    fontSize: '0.78rem',
    fontFamily: 'var(--font-ui)',
    cursor: 'pointer',
    letterSpacing: '0.3px',
  },
  actionBtnIcon: {
    padding: '0.32rem 0.6rem',
  },
  themeSelect: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-2)',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-ui)',
    padding: '0.2rem 0.4rem',
    cursor: 'pointer',
    outline: 'none',
  },
  topDivider: {
    width: '1px',
    height: '20px',
    background: 'var(--color-border)',
    flexShrink: 0,
    alignSelf: 'center',
  },

  // Settings popover
  settingsPanel: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '280px',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    zIndex: 100,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  settingsPanelTitle: {
    fontSize: '0.65rem',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-ui)',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: '0.1rem',
  },
  settingsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  settingsLabel: {
    fontSize: '0.78rem',
    color: 'var(--color-text-2)',
    fontFamily: 'var(--font-ui)',
  },
  settingsHint: {
    fontSize: '0.68rem',
    color: 'var(--color-text-muted)',
  },
  settingsVal: {
    fontSize: '0.75rem',
    color: 'var(--color-accent)',
    fontFamily: 'monospace',
  },
  settingsSliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  settingsSlider: {
    flex: 1,
    accentColor: 'var(--color-accent)',
    cursor: 'pointer',
    height: '4px',
  },
  settingsNumInput: {
    width: '68px',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    padding: '0.15rem 0.35rem',
    textAlign: 'right',
    outline: 'none',
  },
  settingsDivider: {
    height: '1px',
    background: 'var(--color-border)',
    margin: '0.1rem 0',
  },
  settingsPreview: {
    padding: '0.45rem 0.65rem',
    background: 'var(--color-surface-2)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    marginTop: '0.1rem',
  },

  // Layout principal — position:relative contiene el InputBar absoluto
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  },

  // Panel izquierdo — chat
  chatPanel: {
    width: '42%',
    minWidth: '280px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    overflow: 'hidden',
  },
  chatScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '1rem 1rem 0.5rem',
    paddingBottom: '128px',   // espacio para el InputBar overlay en tamaño default
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--color-border) transparent',
  },
  // Message cards
  msgCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    padding: '0.55rem 0.75rem 0.55rem 0.85rem',
    borderRadius: 'var(--radius-sm)',
    borderLeft: '2px solid transparent',
    position: 'relative',
    transition: 'background 0.15s',
  },
  msgCardAssistant: {
    borderLeftColor: 'var(--color-accent)',
    background: 'rgba(var(--color-accent-rgb, 168,85,247), 0.06)',
  },
  msgCardUser: {
    borderLeftColor: 'var(--color-cyan, #7dd3fc)',
    background: 'rgba(125,211,252, 0.04)',
    opacity: 0.9,
  },
  msgHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  miniAvatar: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1px solid var(--color-border-accent)',
    flexShrink: 0,
  },
  miniAvatarPlaceholder: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'var(--color-accent-dim)',
    border: '1px solid var(--color-border-accent)',
    flexShrink: 0,
  },
  chatName: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '0.8rem',
    fontWeight: 700,
    flexShrink: 0,
    letterSpacing: '0.3px',
  },
  chatText: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '0.88rem',
    color: 'var(--color-text)',
    lineHeight: 1.7,
    wordBreak: 'break-word',
  },
  cursor: {
    display: 'inline-block',
    width: '2px',
    height: '0.9em',
    background: 'var(--color-accent)',
    marginLeft: '2px',
    verticalAlign: 'text-bottom',
    animation: 'waifuku-blink 1s step-end infinite',
  },

  // Pending indicator
  pendingLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0.2rem 0',
  },
  pendingDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--color-accent)',
    opacity: 0.6,
    animation: 'waifuku-blink 1.2s step-end infinite',
  },

  // Edición inline
  editTextarea: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '0.85rem',
    lineHeight: 1.65,
    padding: '0.4rem 0.6rem',
    resize: 'vertical',
    outline: 'none',
    minHeight: '60px',
    width: '100%',
    boxSizing: 'border-box',
  },
  editSaveBtn: {
    padding: '0.2rem 0.7rem',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#000',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
  },
  editCancelBtn: {
    padding: '0.2rem 0.7rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
  },

  // Botones de acción en hover
  msgActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    display: 'flex',
    gap: '0.2rem',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.1rem 0.25rem',
    border: '1px solid var(--color-border)',
  },
  msgActionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0.1rem 0.3rem',
    borderRadius: '3px',
    fontFamily: 'var(--font-ui)',
    lineHeight: 1,
  },

  // Panel derecho — sprite
  spritePanel: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--color-bg)',
  },
}
