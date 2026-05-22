import { useState, useRef, useEffect, useCallback } from 'react'

const MIN_H     = 72    // mínimo absoluto (px)
const DEFAULT_H = 112   // altura default — ~3 líneas (px)
const MAX_H     = 420   // máximo al arrastrar (px)

export function InputBar({ onSend, disabled, hasBg, chatOpacity }) {
  const [text,   setText]   = useState('')
  const [height, setHeight] = useState(DEFAULT_H)
  const textareaRef = useRef(null)
  const dragState   = useRef(null)  // { startY, startH }

  // ── Auto-resize del texto dentro del textarea ────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    // El textarea crece hasta llenar el panel (menos el handle y los botones)
    el.style.height = el.scrollHeight + 'px'
  }, [text, height])

  // ── Drag handle ───────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e) => {
    e.preventDefault()
    dragState.current = { startY: e.clientY, startH: height }

    function onMove(ev) {
      if (!dragState.current) return
      const delta = dragState.current.startY - ev.clientY   // mover hacia arriba = delta positivo
      const next  = Math.max(MIN_H, Math.min(MAX_H, dragState.current.startH + delta))
      setHeight(next)
    }

    function onUp() {
      dragState.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }, [height])

  // ── Submit ─────────────────────────────────────────────────────────────────────
  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    setHeight(DEFAULT_H)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const isCollapsed = height <= DEFAULT_H

  const wrapBg = hasBg
    ? `rgba(8, 8, 18, ${Math.min(1, (chatOpacity ?? 0.85) + 0.05)})`
    : 'var(--color-surface)'

  return (
    <div style={{ ...S.wrap, height, background: wrapBg }}>

      {/* ── Handle de arrastre ── */}
      <div style={S.handle} onMouseDown={onDragStart}>
        <div style={S.handlePill} />
        {/* Botón colapsar — solo visible cuando está expandido */}
        {!isCollapsed && (
          <button
            style={S.collapseBtn}
            onClick={() => setHeight(DEFAULT_H)}
            title="Colapsar"
          >
            ▾ Colapsar
          </button>
        )}
      </div>

      {/* ── Área de input ── */}
      <div style={S.inputRow}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe tu mensaje… (Shift+Enter para nueva línea)"
          disabled={disabled}
          style={{
            ...S.textarea,
            opacity:     disabled ? 0.5 : 1,
            borderColor: text ? 'var(--color-border-accent)' : 'var(--color-border)',
          }}
        />
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          style={S.sendBtn(disabled || !text.trim())}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const S = {
  wrap: {
    position:   'absolute',
    bottom:     0,
    left:       0,
    right:      0,
    display:    'flex',
    flexDirection: 'column',
    background: 'var(--color-surface)',
    borderTop:  '1px solid var(--color-border)',
    zIndex:     20,
    transition: 'none',     // sin transición mientras se arrastra
  },

  handle: {
    height:         '18px',
    flexShrink:     0,
    cursor:         'ns-resize',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
    userSelect:     'none',
  },

  handlePill: {
    width:        '40px',
    height:       '3px',
    borderRadius: '2px',
    background:   'var(--color-border)',
    pointerEvents: 'none',
  },

  collapseBtn: {
    position:   'absolute',
    right:      '1rem',
    top:        '50%',
    transform:  'translateY(-50%)',
    background: 'transparent',
    border:     '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color:      'var(--color-text-muted)',
    fontSize:   '0.68rem',
    padding:    '0.15rem 0.5rem',
    cursor:     'pointer',
    fontFamily: 'var(--font-ui)',
    letterSpacing: '0.3px',
    pointerEvents: 'all',   // por encima del handle
  },

  inputRow: {
    flex:       1,
    display:    'flex',
    gap:        '0.6rem',
    padding:    '0 1rem 0.7rem',
    alignItems: 'flex-end',
    overflow:   'hidden',
    minHeight:  0,
  },

  textarea: {
    flex:        1,
    background:  'var(--color-bg)',
    border:      '1px solid var(--color-border)',
    borderRadius:'var(--radius-sm)',
    padding:     '0.6rem 0.85rem',
    color:       'var(--color-text)',
    fontFamily:  "'Inter', system-ui, sans-serif",
    fontSize:    '0.9rem',
    resize:      'none',
    outline:     'none',
    lineHeight:  1.65,
    overflowY:   'auto',
    height:      '100%',
    boxSizing:   'border-box',
    transition:  'border-color 0.2s',
  },

  sendBtn: (disabled) => ({
    background:  disabled ? 'var(--color-surface-2)' : 'var(--color-accent)',
    border:      'none',
    borderRadius:'var(--radius-sm)',
    padding:     '0.55rem 1.25rem',
    color:       disabled ? 'var(--color-text-muted)' : '#000',
    fontWeight:  700,
    fontSize:    '0.85rem',
    cursor:      disabled ? 'not-allowed' : 'pointer',
    fontFamily:  'var(--font-ui)',
    whiteSpace:  'nowrap',
    alignSelf:   'flex-end',
    flexShrink:  0,
    transition:  'all 0.2s',
  }),
}
