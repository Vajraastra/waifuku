import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { useConfigStore } from '../store/configStore'
import { usePageEntry } from '../hooks/usePageEntry'

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--color-bg)',
    fontFamily: 'var(--font-ui)',
    color: 'var(--color-text)',
  },
  header: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--color-surface)',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '0.75rem',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
  },
  modelBadge: {
    fontSize: '0.72rem',
    color: 'var(--color-accent)',
    background: 'var(--color-accent-dim)',
    padding: '0.2rem 0.6rem',
    borderRadius: '20px',
    letterSpacing: '0.5px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  bubble: (role) => ({
    maxWidth: '78%',
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    background: role === 'user' ? 'var(--color-accent-dim)' : 'var(--color-surface)',
    border: `1px solid ${role === 'user' ? 'var(--color-border-accent)' : 'var(--color-border)'}`,
    borderRadius: role === 'user'
      ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
      : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
    padding: '0.75rem 1rem',
    lineHeight: 1.6,
    fontSize: '0.9rem',
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  }),
  roleTag: (role) => ({
    fontSize: '0.65rem',
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: role === 'user' ? 'var(--color-accent)' : 'var(--color-text-muted)',
    marginBottom: '0.3rem',
  }),
  streamBubble: {
    maxWidth: '78%',
    alignSelf: 'flex-start',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
    padding: '0.75rem 1rem',
    lineHeight: 1.6,
    fontSize: '0.9rem',
    color: 'var(--color-text)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  cursor: {
    display: 'inline-block',
    width: '2px',
    height: '1em',
    background: 'var(--color-accent)',
    marginLeft: '2px',
    verticalAlign: 'text-bottom',
    animation: 'blink 1s step-end infinite',
  },
  inputArea: {
    borderTop: '1px solid var(--color-border)',
    padding: '1rem 1.5rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end',
    background: 'var(--color-surface)',
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text)',
    padding: '0.65rem 0.9rem',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-ui)',
    resize: 'none',
    outline: 'none',
    minHeight: '42px',
    maxHeight: '180px',
    lineHeight: 1.5,
    overflowY: 'auto',
  },
  sendBtn: (disabled) => ({
    padding: '0.6rem 1.25rem',
    background: disabled ? 'var(--color-surface-2)' : 'var(--color-accent)',
    color: disabled ? 'var(--color-text-faint)' : '#000',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.2s, color 0.2s',
    flexShrink: 0,
    alignSelf: 'flex-end',
  }),
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    color: 'var(--color-text-faint)',
  },
  emptyTitle: {
    fontSize: '1rem',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
  },
  emptyDesc: {
    fontSize: '0.8rem',
  },
  errorBar: {
    padding: '0.5rem 1rem',
    background: 'rgba(239,68,68,0.15)',
    borderTop: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5',
    fontSize: '0.8rem',
    flexShrink: 0,
  },
}

export function VanillaChat() {
  const { t } = useTranslation()
  const cfg = useConfigStore()

  const [chatId, setChatId]               = useState(null)
  const [messages, setMessages]           = useState([])
  const [streaming, setStreaming]         = useState('')
  const [thinkingStream, setThinkingStream] = useState('')
  const [inThinking, setInThinking]       = useState(false)
  const [isStreaming, setIsStreaming]     = useState(false)
  const [input, setInput]                 = useState('')
  const [error, setError]                 = useState(null)
  const [starting, setStarting]           = useState(false)

  const wsRef       = useRef(null)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)
  const pageRef     = useRef(null)

  usePageEntry(pageRef)

  // Reutiliza chat de sesión o crea uno nuevo
  useEffect(() => {
    let cancelled = false
    async function initChat() {
      try {
        const savedId = sessionStorage.getItem('vanilla-chat-id')
        if (savedId) {
          try {
            const existing = await api.chats.get(savedId)
            if (!cancelled) {
              setChatId(existing.id)
              setMessages(existing.messages.map(m => ({ role: m.role, content: m.content, id: m.id })))
              return
            }
          } catch { /* chat expirado — crear uno nuevo */ }
        }
        const chat = await api.chats.create({ character_id: null, persona_id: null })
        if (!cancelled) {
          sessionStorage.setItem('vanilla-chat-id', chat.id)
          setChatId(chat.id)
        }
      } catch (e) {
        if (!cancelled) setError(`No se pudo iniciar el chat: ${e.message}`)
      }
    }
    initChat()
    return () => { cancelled = true }
  }, [])

  // Conecta WebSocket cuando chatId está listo
  useEffect(() => {
    if (!chatId) return
    const ws = new WebSocket(`${WS_BASE}/ws/chat/${chatId}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      switch (msg.type) {
        case 'user_message':
          setMessages(prev => [...prev, { role: 'user', content: msg.content, id: msg.message_id }])
          break
        case 'think_start':
          setInThinking(true)
          break
        case 'think_end':
          setInThinking(false)
          break
        case 'think_token':
          setThinkingStream(prev => prev + msg.content)
          break
        case 'token':
          setStreaming(prev => prev + msg.content)
          break
        case 'done':
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: msg.full_content,
            id: msg.message_id,
          }])
          setStreaming('')
          setThinkingStream('')
          setInThinking(false)
          setIsStreaming(false)
          break
        case 'error':
          setError(msg.message)
          setIsStreaming(false)
          setStreaming('')
          setThinkingStream('')
          setInThinking(false)
          break
      }
    }

    ws.onerror = () => setError(t('vanilla.ws_error'))
    ws.onclose = () => { wsRef.current = null }

    return () => { ws.close() }
  }, [chatId])

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const send = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming || !wsRef.current) return
    setError(null)
    setIsStreaming(true)
    setInput('')
    wsRef.current.send(JSON.stringify({
      type: 'generate',
      chat_id: chatId,
      content: text,
      config: {
        provider:       cfg.provider,
        model:          cfg.model,
        base_url:       cfg.baseUrl,
        api_key:        cfg.apiKey,
        temperature:    cfg.temperature,
        max_tokens:     cfg.maxTokens,
        top_p:          cfg.topP,
        top_k:          cfg.topK,
        repeat_penalty: cfg.repeatPenalty,
        thinking:       cfg.thinking,
      },
    }))
  }, [input, isStreaming, chatId, cfg])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function newChat() {
    if (wsRef.current) wsRef.current.close()
    sessionStorage.removeItem('vanilla-chat-id')
    setMessages([])
    setStreaming('')
    setIsStreaming(false)
    setError(null)
    setChatId(null)
    setStarting(true)
    try {
      const chat = await api.chats.create({ character_id: null, persona_id: null })
      sessionStorage.setItem('vanilla-chat-id', chat.id)
      setChatId(chat.id)
    } catch (e) {
      setError(`Error al crear chat: ${e.message}`)
    } finally {
      setStarting(false)
    }
  }

  const disabled = isStreaming || !chatId || starting

  return (
    <div ref={pageRef} style={S.page}>
      <div data-entry style={S.header}>
        <span style={S.headerTitle}>Vanilla Chat</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={S.modelBadge}>{cfg.model}</span>
          <button
            onClick={newChat}
            disabled={isStreaming}
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.2rem 0.6rem',
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              letterSpacing: '1px',
            }}
          >
            {t('vn.new_chat')}
          </button>
        </div>
      </div>

      <div style={S.messages}>
        {messages.length === 0 && !isStreaming && (
          <div style={S.empty}>
            <span style={S.emptyTitle}>{t('vanilla.empty_title')}</span>
            <span style={S.emptyDesc}>{t('vanilla.empty_desc', { provider: cfg.provider })}</span>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={S.roleTag(m.role)}>{m.role === 'user' ? t('vanilla.role_user') : t('vanilla.role_model')}</div>
            <div style={S.bubble(m.role)}>{m.content}</div>
          </div>
        ))}

        {isStreaming && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
            <div style={S.roleTag('assistant')}>{t('vanilla.role_model')}</div>
            {thinkingStream && (
              <details style={{
                maxWidth: '78%',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.75rem',
                fontSize: '0.78rem',
                color: 'var(--color-text-muted)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                <summary style={{ cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: '0.7rem', letterSpacing: '1px' }}>
                  Pensamiento interno
                </summary>
                <div style={{ marginTop: '0.4rem', lineHeight: 1.5 }}>{thinkingStream}</div>
              </details>
            )}
            <div style={S.streamBubble}>
              {streaming || (inThinking ? '' : '')}
              <span style={S.cursor} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <div style={S.errorBar}>{error}</div>}

      <div data-entry style={S.inputArea}>
        <textarea
          ref={textareaRef}
          style={S.textarea}
          value={input}
          placeholder={disabled && !chatId ? t('vanilla.placeholder_loading') : t('vanilla.placeholder_ready')}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
        />
        <button
          style={S.sendBtn(disabled || !input.trim())}
          onClick={send}
          disabled={disabled || !input.trim()}
        >
          ↑
        </button>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
