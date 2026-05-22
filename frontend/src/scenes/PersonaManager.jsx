import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { useConfigStore } from '../store/configStore'
import { usePageEntry } from '../hooks/usePageEntry'

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
  grid: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem 2rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1.25rem',
    alignContent: 'start',
  },
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
  cardDefault: { borderColor: 'var(--color-accent)' },
  cardHover: { borderColor: 'var(--color-border-accent)' },
  avatarWrap: {
    width: '100%',
    aspectRatio: '1/1',
    background: 'var(--color-surface-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '3rem',
    color: 'var(--color-text-faint)',
    userSelect: 'none',
    position: 'relative',
  },
  defaultBadge: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    padding: '0.15rem 0.5rem',
    background: 'var(--color-accent)',
    borderRadius: '999px',
    fontSize: '0.6rem',
    fontWeight: 700,
    color: '#000',
    letterSpacing: '0.05em',
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
  actionBtn: (variant) => ({
    flex: 1,
    padding: '0.3rem',
    background: 'transparent',
    border: `1px solid ${
      variant === 'danger'  ? '#fca5a5' :
      variant === 'accent'  ? 'var(--color-border-accent)' :
      'var(--color-border)'
    }`,
    borderRadius: 'var(--radius-sm)',
    color: variant === 'danger' ? '#fca5a5' :
           variant === 'accent' ? 'var(--color-accent)' :
           'var(--color-text-muted)',
    fontSize: '0.65rem',
    cursor: 'pointer',
    textAlign: 'center',
  }),
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
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    color: 'var(--color-text-muted)',
  },
  emptyTitle: { fontSize: '1rem', fontWeight: 600, margin: 0 },
  emptyHint: { fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6, maxWidth: '320px' },
  errorBar: {
    padding: '0.5rem 2rem',
    background: 'rgba(252,165,165,0.08)',
    borderBottom: '1px solid #fca5a5',
    fontSize: '0.75rem',
    color: '#fca5a5',
    flexShrink: 0,
  },
  // Modal
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modal: {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: '1.75rem',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
  },
  modalTitle: { fontSize: '0.95rem', fontWeight: 600, margin: 0, letterSpacing: '0.04em' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 },
  input: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: '0.85rem',
    padding: '0.5rem 0.7rem',
    fontFamily: 'var(--font-ui)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: '0.82rem',
    padding: '0.5rem 0.7rem',
    fontFamily: 'var(--font-ui)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '80px',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    userSelect: 'none',
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
  },
  modalActions: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' },
  cancelBtn: {
    padding: '0.45rem 1rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '0.45rem 1rem',
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#000',
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
}

/* ── Modal de creación / edición ─────────────────────────────────────────── */
function PersonaModal({ persona, onSave, onClose }) {
  const [name, setName]         = useState(persona?.name ?? '')
  const [desc, setDesc]         = useState(persona?.description ?? '')
  const [isDef, setIsDef]       = useState(persona?.is_default ?? false)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState(null)
  const { t } = useTranslation()

  async function handleSave() {
    if (!name.trim()) { setErr(t('personas.name_required')); return }
    setSaving(true)
    setErr(null)
    try {
      const data = { name: name.trim(), description: desc.trim(), is_default: isDef }
      const result = persona
        ? await api.personas.update(persona.id, data)
        : await api.personas.create(data)
      onSave(result, !persona)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div style={S.backdrop} onClick={e => e.target === e.currentTarget && onClose()} onKeyDown={handleKey}>
      <div style={S.modal}>
        <h2 style={S.modalTitle}>{persona ? t('personas.modal_edit') : t('personas.modal_create')}</h2>

        <div style={S.formGroup}>
          <label style={S.label}>{t('personas.field_name')}</label>
          <input
            style={S.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('personas.placeholder_name')}
            autoFocus
          />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>{t('personas.field_desc')}</label>
          <textarea
            style={S.textarea}
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder={t('personas.placeholder_desc')}
          />
        </div>

        <label style={S.checkRow}>
          <input
            type="checkbox"
            checked={isDef}
            onChange={e => setIsDef(e.target.checked)}
          />
          {t('personas.set_default')}
        </label>

        {err && <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>✗ {err}</span>}

        <div style={S.modalActions}>
          <button style={S.cancelBtn} onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button style={S.saveBtn}   onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export function PersonaManager() {
  const { t }            = useTranslation()
  const setActivePersona = useConfigStore(s => s.setActivePersona)
  const activePersonaId  = useConfigStore(s => s.activePersonaId)
  const pageRef          = useRef(null)

  const [personas,       setPersonas]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [hovered,        setHovered]        = useState(null)
  const [confirmDelete,  setConfirmDelete]  = useState(null)
  const [modalPersona,   setModalPersona]   = useState(undefined)

  usePageEntry(pageRef, { trigger: !loading })

  const fetchPersonas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await api.personas.list()
      if (!Array.isArray(list)) throw new Error(list.detail ?? t('personas.error_load'))
      setPersonas([...list].sort((a, b) => {
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
        return new Date(b.updated_at) - new Date(a.updated_at)
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPersonas() }, [fetchPersonas])

  function handleSaved(result, isNew) {
    setModalPersona(undefined)
    setPersonas(prev => {
      let next = isNew
        ? [result, ...prev]
        : prev.map(p => p.id === result.id ? result : p)
      if (result.is_default) {
        next = next.map(p => ({ ...p, is_default: p.id === result.id }))
        setActivePersona(result.id)
      }
      return next.sort((a, b) => {
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
        return new Date(b.updated_at) - new Date(a.updated_at)
      })
    })
  }

  async function handleSetDefault(persona) {
    setError(null)
    try {
      const updated = await api.personas.setDefault(persona.id)
      setPersonas(prev =>
        prev
          .map(p => ({ ...p, is_default: p.id === updated.id }))
          .sort((a, b) => {
            if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
            return new Date(b.updated_at) - new Date(a.updated_at)
          })
      )
      setActivePersona(updated.id)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    try {
      await api.personas.delete(id)
      setPersonas(prev => prev.filter(p => p.id !== id))
      if (activePersonaId === id) setActivePersona(null)
      setConfirmDelete(null)
    } catch (e) {
      setError(e.message)
      setConfirmDelete(null)
    }
  }

  return (
    <div ref={pageRef} style={S.page}>
      {/* Header */}
      <div data-entry style={S.header}>
        <div style={S.titleRow}>
          <h1 style={S.title}>{t('personas.title')}</h1>
          {!loading && (
            <span style={S.count}>
              {t('personas.count', { count: personas.length })}
            </span>
          )}
        </div>
        <button style={S.createBtn} onClick={() => setModalPersona(null)}>{t('personas.create')}</button>
      </div>

      {error && <div style={S.errorBar}>✗ {error}</div>}

      {loading ? (
        <div style={S.empty}>
          <span style={{ fontSize: '0.8rem' }}>{t('personas.loading')}</span>
        </div>
      ) : personas.length === 0 ? (
        <div style={S.empty}>
          <p style={S.emptyTitle}>{t('personas.empty_title')}</p>
          <p style={S.emptyHint}>{t('personas.empty_hint')}</p>
          <button style={S.createBtn} onClick={() => setModalPersona(null)}>{t('personas.create')}</button>
        </div>
      ) : (
        <div style={S.grid}>
          {personas.map(p => (
            <div
              key={p.id}
              data-entry
              style={{
                ...S.card,
                ...(p.is_default ? S.cardDefault : {}),
                ...(hovered === p.id && !p.is_default ? S.cardHover : {}),
              }}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={S.avatarWrap}>
                {initials(p.name)}
                {p.is_default && <span style={S.defaultBadge}>DEFAULT</span>}
              </div>

              <div style={S.cardBody}>
                <div style={S.cardName}>{p.name}</div>
                {p.description && <div style={S.cardDesc}>{p.description}</div>}
              </div>

              <div style={S.cardActions}>
                {!p.is_default && (
                  <button style={S.actionBtn('accent')} onClick={() => handleSetDefault(p)}>
                    {t('personas.activate')}
                  </button>
                )}
                <button style={S.actionBtn('normal')} onClick={() => setModalPersona(p)}>
                  {t('common.edit')}
                </button>
                <button style={S.actionBtn('danger')} onClick={() => setConfirmDelete(p.id)}>
                  {t('common.delete')}
                </button>
              </div>

              {confirmDelete === p.id && (
                <div style={S.confirmOverlay}>
                  <span style={S.confirmText}>{t('personas.confirm_delete', { name: p.name })}</span>
                  <button style={S.confirmYes} onClick={() => handleDelete(p.id)}>{t('common.confirm_yes')}</button>
                  <button style={S.confirmNo}  onClick={() => setConfirmDelete(null)}>{t('common.confirm_no')}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalPersona !== undefined && (
        <PersonaModal
          persona={modalPersona}
          onSave={handleSaved}
          onClose={() => setModalPersona(undefined)}
        />
      )}
    </div>
  )
}
