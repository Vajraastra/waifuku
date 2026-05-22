import { useState, useRef, useEffect, useCallback } from 'react'
import { useConfigStore } from '../store/configStore'
import { useLLMStats } from '../hooks/useLLMStats'

function StatBar({ pct, color }) {
  return (
    <div style={S.barTrack}>
      <div style={{
        ...S.barFill,
        width: `${Math.min(100, pct ?? 0)}%`,
        background: color ?? 'var(--color-accent)',
        transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

function StatRow({ label, value, sub, bar, barColor }) {
  return (
    <div style={S.statRow}>
      <div style={S.statTop}>
        <span style={S.statLabel}>{label}</span>
        <span style={S.statValue}>{value}</span>
      </div>
      {sub  && <span style={S.statHint}>{sub}</span>}
      {bar != null && <StatBar pct={bar} color={barColor} />}
    </div>
  )
}

function Toggle({ on, onChange, label }) {
  return (
    <button style={{ ...S.toggle, ...(on ? S.toggleOn : {}) }} onClick={() => onChange(!on)}>
      <span style={{ ...S.toggleDot, ...(on ? S.toggleDotOn : {}) }} />
      <span style={S.toggleLabel}>{label} {on ? 'ON' : 'OFF'}</span>
    </button>
  )
}

export function LLMStatsHUD({ hasBg }) {
  const chatOpacity = useConfigStore(s => s.chatOpacity)
  const numCtx      = useConfigStore(s => s.numCtx)
  const autoNumCtx  = useConfigStore(s => s.autoNumCtx)
  const setConfig   = useConfigStore(s => s.setConfig)
  const stats       = useLLMStats()

  const [pos, setPos] = useState(null)
  const dragging      = useRef(null)
  const hudRef        = useRef(null)

  useEffect(() => {
    const el = hudRef.current
    if (!el || pos) return
    const rect = el.getBoundingClientRect()
    setPos({ left: rect.left, top: rect.top })
  }, []) // eslint-disable-line

  useEffect(() => {
    if (autoNumCtx && stats.recCtx) setConfig({ numCtx: stats.recCtx })
  }, [autoNumCtx, stats.recCtx]) // eslint-disable-line

  const onDragStart = useCallback((e) => {
    e.preventDefault()
    const rect = hudRef.current?.getBoundingClientRect()
    if (!rect) return
    dragging.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top }
    function onMove(ev) {
      if (!dragging.current) return
      setPos({ left: ev.clientX - dragging.current.ox, top: ev.clientY - dragging.current.oy })
    }
    function onUp() {
      dragging.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  // Colores dinámicos según % de uso
  const vramBarColor = !stats.vramPct ? 'var(--color-accent)'
    : stats.vramPct > 90 ? '#ef4444'
    : stats.vramPct > 75 ? '#f59e0b'
    : 'var(--color-accent)'

  const ramBarColor = !stats.ramPct ? 'var(--color-cyan)'
    : stats.ramPct > 85 ? '#ef4444'
    : stats.ramPct > 70 ? '#f59e0b'
    : 'var(--color-cyan)'

  const ctxBarColor = !stats.ctxPct ? 'var(--color-accent)'
    : stats.ctxPct > 85 ? '#ef4444'
    : stats.ctxPct > 60 ? '#f59e0b'
    : 'var(--color-accent)'

  const bgAlpha  = hasBg ? (chatOpacity ?? 0.85) : 1
  const posStyle = pos ? { left: pos.left, top: pos.top } : { right: 16, top: 60 }

  return (
    <div ref={hudRef} style={{ ...S.hud, background: `rgba(8,8,18,${bgAlpha})`, ...posStyle }}>

      {/* Header draggable */}
      <div style={S.header} onMouseDown={onDragStart}>
        <span style={S.headerTitle}>⚡ LLM STATS</span>
        <button style={S.closeBtn} onClick={() => setConfig({ showLLMStats: false })}>×</button>
      </div>

      {/* GPU name */}
      {stats.gpuName && (
        <div style={S.gpuName}>{stats.gpuName}</div>
      )}

      {/* Modelo activo en el servidor LLM */}
      <div style={S.modelBlock}>
        {stats.loading && !stats.serverModel
          ? <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>Consultando…</span>
          : stats.serverModel
            ? <>
                <span style={S.modelName}>{stats.serverModel}</span>
                {stats.modelMismatch && (
                  <span style={S.mismatchBadge} title={`Config: ${stats.configModel}`}>≠ config</span>
                )}
              </>
            : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>Sin modelo en memoria</span>
        }
      </div>

      <div style={S.divider} />

      {/* VRAM del sistema */}
      {stats.vramTotal > 0 && (
        <StatRow
          label="VRAM"
          value={`${stats.vramUsedFmt} / ${stats.vramTotalFmt}`}
          sub={`libre: ${stats.vramFreeFmt}`}
          bar={stats.vramPct}
          barColor={vramBarColor}
        />
      )}

      {/* RAM offload — solo cuando Ollama desplaza capas a RAM */}
      {stats.ramOffload > 0 && (
        <StatRow
          label="VRAM offload → RAM"
          value={stats.ramOffloadFmt}
          sub="capas corriendo en RAM del sistema"
        />
      )}

      {/* RAM del sistema */}
      {stats.ramTotal > 0 && (
        <StatRow
          label="RAM sistema"
          value={`${stats.ramUsedFmt} / ${stats.ramTotalFmt}`}
          sub={`libre: ${fmtB(stats.ramFree)}`}
          bar={stats.ramPct}
          barColor={ramBarColor}
        />
      )}

      <div style={S.divider} />

      {/* Contexto */}
      <StatRow
        label="Ctx config"
        value={`${stats.ctxLimit ?? '—'} tok`}
        sub={stats.ctxUsed > 0 ? `~${stats.ctxUsed} usados en conversación` : null}
        bar={stats.ctxPct}
        barColor={ctxBarColor}
      />

      <div style={S.divider} />

      {/* Auto ctx toggle */}
      <div style={S.autoRow}>
        <Toggle on={autoNumCtx} onChange={v => setConfig({ autoNumCtx: v })} label="Auto ctx" />
        {autoNumCtx && stats.recCtx && (
          <span style={S.recLabel}>→ {stats.recCtx} tok</span>
        )}
      </div>

      {/* Manual ctx input */}
      {!autoNumCtx && (
        <div style={S.manualRow}>
          <span style={S.statLabel}>Ctx manual</span>
          <input
            type="number" min={512} max={131072} step={512}
            value={numCtx || ''} placeholder="default"
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              setConfig({ numCtx: isNaN(v) ? 0 : v })
            }}
            style={S.ctxInput}
          />
        </div>
      )}
    </div>
  )
}

// Inline helper para no importar fmtBytes como named export
function fmtB(bytes) {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

const S = {
  hud: {
    position: 'absolute',
    width: '252px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.42rem',
    padding: '0.6rem 0.75rem 0.75rem',
    userSelect: 'none',
    fontFamily: 'var(--font-ui)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'grab',
    paddingBottom: '0.25rem',
  },
  headerTitle: {
    fontSize: '0.62rem',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: 'var(--color-accent)',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none', border: 'none',
    color: 'var(--color-text-muted)',
    fontSize: '1rem', lineHeight: 1, cursor: 'pointer', padding: '0 0.1rem', opacity: 0.7,
  },
  gpuName: {
    fontSize: '0.65rem',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.3px',
    lineHeight: 1.3,
  },
  modelBlock: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap',
  },
  modelName: {
    fontSize: '0.72rem', color: 'var(--color-text)',
    wordBreak: 'break-all', lineHeight: 1.35,
  },
  mismatchBadge: {
    fontSize: '0.6rem', padding: '0.1rem 0.35rem',
    borderRadius: '4px',
    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
    color: '#f59e0b', cursor: 'help', flexShrink: 0,
  },
  divider: { height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.05rem 0' },
  statRow: { display: 'flex', flexDirection: 'column', gap: '0.18rem' },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  statLabel: { fontSize: '0.68rem', color: 'var(--color-text-muted)', letterSpacing: '0.4px' },
  statValue: { fontSize: '0.72rem', color: 'var(--color-text)', fontFamily: 'monospace' },
  statHint:  { fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' },
  barTrack:  { height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: '2px' },
  autoRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' },
  recLabel:  { fontSize: '0.65rem', color: 'var(--color-accent)', fontFamily: 'monospace' },
  manualRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' },
  ctxInput: {
    width: '80px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 'var(--radius-sm)', color: 'var(--color-text)',
    fontFamily: 'monospace', fontSize: '0.72rem',
    padding: '0.15rem 0.4rem', textAlign: 'right', outline: 'none',
  },
  toggle: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '999px', padding: '0.2rem 0.55rem', cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  toggleOn:    { borderColor: 'var(--color-accent)', background: 'var(--color-accent-dim)' },
  toggleDot:   { width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-text-muted)', transition: 'background 0.2s, box-shadow 0.2s', flexShrink: 0 },
  toggleDotOn: { background: 'var(--color-accent)', boxShadow: '0 0 6px var(--color-accent)' },
  toggleLabel: { fontSize: '0.68rem', color: 'var(--color-text-2)', letterSpacing: '0.3px' },
}
