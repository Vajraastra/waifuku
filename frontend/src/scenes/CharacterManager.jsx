import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gsap } from 'gsap'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { usePageEntry } from '../hooks/usePageEntry'
import { useConfigStore } from '../store/configStore'
import { useThemeStore } from '../store/themeStore'

/* ── Estilos ──────────────────────────────────────────────────────────────── */
const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: 'var(--font-ui)',
    color: 'var(--color-text)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 2rem',
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
    gap: '1rem',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  title: { fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', margin: 0 },
  count: { fontSize: '0.75rem', color: 'var(--color-text-muted)' },
  actions: { display: 'flex', gap: '0.5rem' },
  createBtn: {
    padding: '0.45rem 1rem',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#000',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  importBtn: {
    padding: '0.45rem 0.8rem',
    background: 'transparent',
    border: '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-accent)',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  errorBar: {
    padding: '0.5rem 2rem',
    background: 'rgba(252,165,165,0.08)',
    borderBottom: '1px solid #fca5a5',
    fontSize: '0.75rem',
    color: '#fca5a5',
    flexShrink: 0,
  },
  scroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem 2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },

  // ── Sección genérica
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  sectionTitle: {
    fontSize: '0.67rem',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  sectionCount: {
    fontSize: '0.65rem',
    color: 'var(--color-text-faint)',
  },
  divider: {
    height: '1px',
    background: 'var(--color-border)',
    margin: '0.25rem 0 2rem',
  },

  // ── Featured (último seleccionado) — card centrada, 2× tamaño regular
  featuredWrap: {
    display: 'flex',
    justifyContent: 'center',
  },
  featuredCardSize: {
    width: '360px',
  },

  // ── Grid normal (todos)
  grid: (minW) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${minW}px, 1fr))`,
    gap: '1rem',
    alignContent: 'start',
  }),

  // ── Cards compartidas
  card: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'border-color 0.2s',
    position: 'relative',
  },
  cardHover: { borderColor: 'var(--color-border-accent)' },
  cardFav: { borderColor: 'var(--color-accent)' },
  avatar: {
    width: '100%',
    aspectRatio: '3/4',
    objectFit: 'cover',
    background: 'var(--color-surface-2)',
    display: 'block',
  },
  avatarPlaceholder: {
    width: '100%',
    aspectRatio: '3/4',
    background: 'var(--color-surface-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    color: 'var(--color-text-faint)',
    userSelect: 'none',
  },
  cardBody: {
    padding: '0.7rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    flex: 1,
  },
  cardName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardDesc: {
    fontSize: '0.68rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardActions: {
    display: 'flex',
    gap: '0.35rem',
    padding: '0.5rem 0.7rem',
    borderTop: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
  },
  actionBtn: (danger) => ({
    flex: 1,
    padding: '0.3rem',
    background: 'transparent',
    border: `1px solid ${danger ? '#fca5a5' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)',
    color: danger ? '#fca5a5' : 'var(--color-text-muted)',
    fontSize: '0.65rem',
    cursor: 'pointer',
    textAlign: 'center',
  }),

  // ── Botón corazón
  starBtn: (active) => ({
    position: 'absolute',
    top: '0.4rem',
    right: '0.4rem',
    background: active ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.35)',
    border: 'none',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    cursor: 'pointer',
    color: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.45)',
    transition: 'color 0.2s, background 0.2s',
    zIndex: 2,
    lineHeight: 1,
    padding: 0,
  }),

  // ── Confirm overlay
  confirmOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.78)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1rem',
    zIndex: 3,
  },
  confirmText: {
    fontSize: '0.75rem',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 1.5,
    whiteSpace: 'pre-line',
  },
  confirmYes: {
    padding: '0.35rem 1rem',
    background: '#fca5a5',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#000',
    fontSize: '0.72rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  confirmNo: {
    padding: '0.35rem 1rem',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 'var(--radius-sm)',
    color: '#fff',
    fontSize: '0.72rem',
    cursor: 'pointer',
  },

  // ── Expanded overlay
  expandOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.92)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '2.5rem',
    padding: '2rem',
    maxWidth: '900px',
    width: '100%',
  },
  expandCard: {
    width: '260px',
    flexShrink: 0,
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-accent)',
    display: 'flex',
    flexDirection: 'column',
  },
  expandAvatar: {
    width: '100%',
    aspectRatio: '3/4',
    objectFit: 'cover',
    display: 'block',
    background: 'var(--color-surface-2)',
  },
  expandAvatarPlaceholder: {
    width: '100%',
    aspectRatio: '3/4',
    background: 'var(--color-surface-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '5rem',
    color: 'var(--color-text-faint)',
    userSelect: 'none',
  },
  expandCardName: {
    padding: '0.75rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    textAlign: 'center',
  },
  expandPanel: {
    width: '400px',
    maxWidth: '45vw',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  expandName: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--color-text)',
    lineHeight: 1.2,
    margin: 0,
  },
  expandField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  expandFieldLabel: {
    fontSize: '0.6rem',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--color-text-faint)',
  },
  expandFieldText: {
    fontSize: '0.82rem',
    color: 'var(--color-text-muted)',
    lineHeight: 1.6,
  },
  expandTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.3rem',
  },
  expandTag: {
    fontSize: '0.62rem',
    padding: '0.15rem 0.5rem',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: '999px',
    color: 'var(--color-text-muted)',
  },
  expandDivider: {
    height: '1px',
    background: 'var(--color-border)',
    margin: '0.25rem 0',
  },
  expandBtns: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  expandCancel: {
    flex: 1,
    padding: '0.55rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
  },
  expandSelect: {
    flex: 1,
    padding: '0.55rem',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#000',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
  },

  // ── Estado vacío
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    color: 'var(--color-text-muted)',
    minHeight: '200px',
  },
  emptyTitle: { fontSize: '1rem', fontWeight: 600, margin: 0 },
  emptyHint: { fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6, maxWidth: '320px' },
}

/* ── Card reutilizable ────────────────────────────────────────────────────── */
function CharCard({ char, onEdit, onDelete, onToggleFav, onExpand, tier = 'regular', dataEntry = false }) {
  const [hovered,  setHovered]  = useState(false)
  const [confirm,  setConfirm]  = useState(false)
  const cardRef   = useRef(null)
  const glowTl    = useRef(null)
  const pulseTl   = useRef(null)
  const { themeId } = useThemeStore()
  const { t } = useTranslation()

  // Featured: glow pulsante en color del tema
  useEffect(() => {
    if (tier !== 'featured' || !cardRef.current) return
    const accent = getComputedStyle(cardRef.current).getPropertyValue('--color-accent').trim()
    glowTl.current?.kill()
    glowTl.current = gsap.timeline({ repeat: -1, yoyo: true })
    glowTl.current.to(cardRef.current, {
      boxShadow: `0 0 28px 6px ${accent}77`,
      duration: 1.8,
      ease: 'sine.inOut',
    })
    return () => glowTl.current?.kill()
  }, [tier, themeId])

  function handleMouseEnter() {
    setHovered(true)
    if (!cardRef.current) return
    if (tier === 'favorite') {
      gsap.killTweensOf(cardRef.current)
      gsap.timeline()
        .to(cardRef.current, { y: -9,  duration: 0.09, ease: 'power2.out' })
        .to(cardRef.current, { y: 0,   duration: 0.09, ease: 'power2.in'  })
        .to(cardRef.current, { y: -9,  duration: 0.09, ease: 'power2.out' })
        .to(cardRef.current, { y: 0,   duration: 0.09, ease: 'power2.in'  })
        .to(cardRef.current, { y: -9,  duration: 0.09, ease: 'power2.out' })
        .to(cardRef.current, { y: 0,   duration: 0.12, ease: 'power2.in'  })
    } else if (tier === 'regular') {
      pulseTl.current?.kill()
      pulseTl.current = gsap.timeline({ repeat: -1, yoyo: true })
      pulseTl.current.to(cardRef.current, { scale: 1.025, duration: 0.5, ease: 'sine.inOut' })
    }
  }

  function handleMouseLeave() {
    setHovered(false)
    if (!cardRef.current) return
    if (tier === 'favorite') {
      gsap.killTweensOf(cardRef.current)
      gsap.to(cardRef.current, { y: 0, duration: 0.2, ease: 'power2.out' })
    } else if (tier === 'regular') {
      pulseTl.current?.kill()
      pulseTl.current = null
      gsap.to(cardRef.current, { scale: 1, duration: 0.2, ease: 'power2.out' })
    }
  }

  const border = tier === 'featured' || char.is_favorite
    ? S.cardFav
    : hovered ? S.cardHover : {}

  const tierStyle = tier === 'favorite'
    ? { border: '2px solid var(--color-accent)', borderRadius: '16px' }
    : {}

  function handleDoubleClick(e) {
    e.stopPropagation()
    onExpand?.(char)
  }

  return (
    <div
      ref={cardRef}
      data-entry={dataEntry || undefined}
      style={{ ...S.card, ...border, ...tierStyle }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      {char.avatar_path
        ? <img
            src={api.characters.avatarUrl(char.id) + '?t=' + char.updated_at}
            alt={char.name}
            style={S.avatar}
          />
        : <div style={S.avatarPlaceholder}>{initials(char.name)}</div>
      }

      <button
        style={S.starBtn(char.is_favorite)}
        onClick={e => { e.stopPropagation(); onToggleFav(char) }}
        title={char.is_favorite ? t('characters.fav_remove') : t('characters.fav_add')}
      >
        {char.is_favorite ? '♥' : '♡'}
      </button>

      <div style={S.cardBody}>
        <div style={S.cardName}>{char.name}</div>
        {char.description && <div style={S.cardDesc}>{char.description}</div>}
      </div>

      <div style={S.cardActions}>
        <button style={S.actionBtn(false)} onClick={() => onEdit(char.id)}>{t('common.edit')}</button>
        <button style={S.actionBtn(true)}  onClick={() => setConfirm(true)}>{t('common.delete')}</button>
      </div>

      {confirm && (
        <div style={S.confirmOverlay}>
          <span style={S.confirmText}>{t('characters.confirm_delete', { name: char.name })}</span>
          <button style={S.confirmYes} onClick={() => onDelete(char.id)}>{t('common.confirm_yes')}</button>
          <button style={S.confirmNo}  onClick={() => setConfirm(false)}>{t('common.confirm_no')}</button>
        </div>
      )}
    </div>
  )
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

/* ── Vista expandida (doble click) ───────────────────────────────────────── */
function ExpandedCard({ char, onSelect, onCancel }) {
  const overlayRef = useRef(null)
  const contentRef = useRef(null)
  const closingRef = useRef(false)
  const { t } = useTranslation()

  useEffect(() => {
    // Fijar estado inicial antes del primer paint
    gsap.set(contentRef.current, { opacity: 0, y: 12 })

    // 1. Overlay a negro
    gsap.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: 'power2.out',
        onComplete: () => {
          // 2. Contenido aparece con fade
          gsap.to(contentRef.current, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })
        }
      }
    )
  }, [])

  function close(callback) {
    if (closingRef.current) return
    closingRef.current = true
    gsap.to(contentRef.current, {
      opacity: 0, y: 12, duration: 0.22, ease: 'power2.in',
      onComplete: () =>
        gsap.to(overlayRef.current, {
          opacity: 0, duration: 0.3, ease: 'power2.in',
          onComplete: callback,
        })
    })
  }

  return createPortal(
    <div ref={overlayRef} style={S.expandOverlay} onClick={() => close(onCancel)}>
      <div ref={contentRef} style={S.expandContent} onClick={e => e.stopPropagation()}>

        {/* Card portrait — lado izquierdo */}
        <div style={S.expandCard}>
          {char.avatar_path
            ? <img
                src={api.characters.avatarUrl(char.id) + '?t=' + char.updated_at}
                alt={char.name}
                style={S.expandAvatar}
              />
            : <div style={S.expandAvatarPlaceholder}>{initials(char.name)}</div>
          }
          <div style={S.expandCardName}>{char.name}</div>
        </div>

        {/* Panel descriptivo — lado derecho */}
        <div style={S.expandPanel}>
          <h2 style={S.expandName}>{char.name}</h2>

          {char.description && (
            <div style={S.expandField}>
              <span style={S.expandFieldLabel}>{t('characters.field_description')}</span>
              <span style={S.expandFieldText}>{char.description}</span>
            </div>
          )}

          {char.personality && (
            <div style={S.expandField}>
              <span style={S.expandFieldLabel}>{t('characters.field_personality')}</span>
              <span style={S.expandFieldText}>{char.personality}</span>
            </div>
          )}

          {char.scenario && (
            <div style={S.expandField}>
              <span style={S.expandFieldLabel}>{t('characters.field_scenario')}</span>
              <span style={S.expandFieldText}>{char.scenario}</span>
            </div>
          )}

          {char.first_mes && (
            <div style={S.expandField}>
              <span style={S.expandFieldLabel}>{t('characters.field_first_mes')}</span>
              <span style={{ ...S.expandFieldText, fontStyle: 'italic' }}>{char.first_mes}</span>
            </div>
          )}

          {char.tags?.length > 0 && (
            <>
              <div style={S.expandDivider} />
              <div style={S.expandTags}>
                {char.tags.map(t => <span key={t} style={S.expandTag}>{t}</span>)}
              </div>
            </>
          )}

          <div style={S.expandDivider} />

          <div style={S.expandBtns}>
            <button style={S.expandCancel} onClick={() => close(onCancel)}>{t('characters.expanded_cancel')}</button>
            <button style={S.expandSelect} onClick={() => close(onSelect)}>{t('characters.expanded_select')}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export function CharacterManager() {
  const navigate           = useNavigate()
  const [searchParams]     = useSearchParams()
  const mode               = searchParams.get('mode')   // 'helper' | null
  const { t }              = useTranslation()
  const activeCharId       = useConfigStore(s => s.activeCharacterId)
  const setActiveCharacter = useConfigStore(s => s.setActiveCharacter)
  const importPngRef     = useRef(null)
  const importJsonRef    = useRef(null)
  const pageRef          = useRef(null)

  const [characters,  setCharacters]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [expanded,    setExpanded]    = useState(null)

  usePageEntry(pageRef, { trigger: !loading })

  const fetchCharacters = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api.characters.list()
      if (!Array.isArray(list)) throw new Error(list.detail ?? t('characters.error_load'))
      setCharacters([...list].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCharacters() }, [fetchCharacters])

  async function handleDelete(id) {
    try {
      await api.characters.delete(id)
      setCharacters(cs => cs.filter(c => c.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleToggleFav(char) {
    try {
      const updated = await api.characters.toggleFavorite(char.id)
      setCharacters(cs => cs.map(c => c.id === updated.id ? updated : c))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleImport(e, type) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError(null)
    try {
      const char = type === 'png'
        ? await api.characters.importPng(file)
        : await api.characters.importJson(file)
      if (char.detail) { setError(char.detail); return }
      setCharacters(cs => [char, ...cs])
    } catch (err) {
      setError(err.message)
    }
  }

  function handleExpand(char) {
    setExpanded({ char })
  }

  function handleExpandCancel() {
    setExpanded(null)
  }

  async function handleExpandSelect() {
    const char = expanded.char
    setExpanded(null)
    setActiveCharacter(char.id)
    try {
      if (mode === 'helper') {
        const chat = await api.chats.create({ character_id: char.id, title: `Helper · ${char.name}` })
        navigate(`/helper/${chat.id}`)
      } else {
        const existing = await api.chats.list(char.id)
        if (Array.isArray(existing) && existing.length > 0) {
          navigate(`/chat/${existing[0].id}`)
        } else {
          const chat = await api.chats.create({ character_id: char.id, title: `Chat con ${char.name}` })
          navigate(`/chat/${chat.id}`)
        }
      }
    } catch {
      navigate(mode === 'helper' ? '/characters?mode=helper' : '/characters')
    }
  }

  // Derivados
  const featured   = characters.find(c => c.id === activeCharId) ?? null
  const favorites  = characters.filter(c => c.is_favorite && c.id !== activeCharId)
  const regular    = characters.filter(c => !c.is_favorite && c.id !== activeCharId)
  const hasSections = featured || favorites.length > 0

  return (
    <div ref={pageRef} style={S.page}>

      {expanded && (
        <ExpandedCard
          key={expanded.char.id}
          char={expanded.char}
          onSelect={handleExpandSelect}
          onCancel={handleExpandCancel}
        />
      )}
      {/* Header */}
      <div data-entry style={S.header}>
        <div style={S.titleRow}>
          <h1 style={S.title}>{t('characters.title')}</h1>
          {!loading && (
            <span style={S.count}>
              {t('characters.count', { count: characters.length })}
            </span>
          )}
        </div>
        <div style={S.actions}>
          <button style={S.importBtn} onClick={() => importPngRef.current?.click()}>{t('characters.import_png')}</button>
          <button style={S.importBtn} onClick={() => importJsonRef.current?.click()}>{t('characters.import_json')}</button>
          <button style={S.createBtn} onClick={() => navigate('/characters/new')}>{t('characters.create')}</button>
        </div>
        <input ref={importPngRef}  type="file" accept=".png"  hidden onChange={e => handleImport(e, 'png')} />
        <input ref={importJsonRef} type="file" accept=".json" hidden onChange={e => handleImport(e, 'json')} />
      </div>

      {error && <div style={S.errorBar}>✗ {error}</div>}

      {loading ? (
        <div style={S.empty}>
          <span style={{ fontSize: '0.8rem' }}>{t('characters.loading')}</span>
        </div>
      ) : characters.length === 0 ? (
        <div style={S.empty}>
          <p style={S.emptyTitle}>{t('characters.empty_title')}</p>
          <p style={S.emptyHint}>{t('characters.empty_hint')}</p>
          <button style={S.createBtn} onClick={() => navigate('/characters/new')}>{t('characters.create_first')}</button>
        </div>
      ) : (
        <div style={S.scroll}>

          {/* ── Último seleccionado ─────────────────────────────────────── */}
          {featured && (
            <div data-entry style={S.section}>
              <div style={S.sectionHeader}>
                <span style={S.sectionTitle}>{t('characters.section_recent')}</span>
              </div>
              <div style={S.featuredWrap}>
                <div style={S.featuredCardSize}>
                  <CharCard
                    char={featured}
                    tier="featured"
                    onEdit={id => navigate(`/characters/${id}/edit`)}
                    onDelete={handleDelete}
                    onToggleFav={handleToggleFav}
                    onExpand={handleExpand}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Favoritos ───────────────────────────────────────────────── */}
          {favorites.length > 0 && (
            <div data-entry style={S.section}>
              <div style={S.sectionHeader}>
                <span style={S.sectionTitle}>{t('characters.section_favorites')}</span>
                <span style={S.sectionCount}>({favorites.length})</span>
              </div>
              <div style={S.grid(270)}>
                {favorites.map(char => (
                  <CharCard
                    key={char.id}
                    char={char}
                    tier="favorite"
                    onEdit={id => navigate(`/characters/${id}/edit`)}
                    onDelete={handleDelete}
                    onToggleFav={handleToggleFav}
                    onExpand={handleExpand}
                    dataEntry
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Separador si hay secciones arriba ───────────────────────── */}
          {hasSections && regular.length > 0 && (
            <div style={S.divider} />
          )}

          {/* ── Todos los demás ─────────────────────────────────────────── */}
          {regular.length > 0 && (
            <div data-entry style={S.section}>
              <div style={S.sectionHeader}>
                <span style={S.sectionTitle}>
                  {hasSections ? t('characters.section_others') : t('characters.section_all')}
                </span>
                <span style={S.sectionCount}>({regular.length})</span>
              </div>
              <div style={S.grid(180)}>
                {regular.map(char => (
                  <CharCard
                    key={char.id}
                    char={char}
                    tier="regular"
                    onEdit={id => navigate(`/characters/${id}/edit`)}
                    onDelete={handleDelete}
                    onToggleFav={handleToggleFav}
                    onExpand={handleExpand}
                    dataEntry
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
