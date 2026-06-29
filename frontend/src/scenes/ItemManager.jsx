import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { usePageEntry } from '../hooks/usePageEntry'

/* ── Estilos ──────────────────────────────────────────────────────────────── */
const S = {
  page: {
    display: 'flex', flexDirection: 'column', height: '100%',
    fontFamily: 'var(--font-ui)', color: 'var(--color-text)', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1.25rem 2rem', borderBottom: '1px solid var(--color-border)',
    flexShrink: 0, gap: '1rem',
  },
  titleRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  title: { fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', margin: 0 },
  count: { fontSize: '0.75rem', color: 'var(--color-text-muted)' },
  createBtn: {
    padding: '0.45rem 1rem', background: 'var(--color-accent)', border: 'none',
    borderRadius: 'var(--radius-sm)', color: '#000', fontSize: '0.8rem',
    fontWeight: 700, cursor: 'pointer',
  },
  grid: {
    flex: 1, overflowY: 'auto', padding: '1.5rem 2rem',
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1rem', alignContent: 'start',
  },
  card: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)', padding: '0.9rem', display: 'flex',
    flexDirection: 'column', gap: '0.5rem', position: 'relative',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  cardIcon: { fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 },
  cardName: { fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-text)' },
  cardType: {
    fontSize: '0.65rem', color: 'var(--color-accent)', fontFamily: 'monospace',
    letterSpacing: '0.5px', textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardMeta: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.1rem' },
  metaTag: {
    fontSize: '0.6rem', padding: '0.1rem 0.4rem',
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    borderRadius: '999px', color: 'var(--color-text-muted)',
  },
  cardActions: {
    display: 'flex', gap: '0.35rem', marginTop: '0.25rem',
    borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem',
  },
  actionBtn: (v) => ({
    flex: 1, padding: '0.28rem', background: 'transparent', cursor: 'pointer',
    border: `1px solid ${v === 'danger' ? '#fca5a5' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)', fontSize: '0.65rem', textAlign: 'center',
    color: v === 'danger' ? '#fca5a5' : 'var(--color-text-muted)',
  }),
  confirmOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.78)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '0.6rem', padding: '0.75rem',
    borderRadius: 'var(--radius)',
  },
  confirmText: { fontSize: '0.72rem', color: '#fff', textAlign: 'center', whiteSpace: 'pre-line' },
  confirmYes: {
    padding: '0.3rem 0.8rem', background: '#fca5a5', border: 'none',
    borderRadius: 'var(--radius-sm)', color: '#000', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
  },
  confirmNo: {
    padding: '0.3rem 0.8rem', background: 'transparent', cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 'var(--radius-sm)',
    color: '#fff', fontSize: '0.7rem',
  },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '1rem', color: 'var(--color-text-muted)',
  },
  emptyTitle: { fontSize: '1rem', fontWeight: 600, margin: 0 },
  emptyHint:  { fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.6, maxWidth: '340px' },
  errorBar: {
    padding: '0.5rem 2rem', background: 'rgba(252,165,165,0.08)',
    borderBottom: '1px solid #fca5a5', fontSize: '0.75rem', color: '#fca5a5', flexShrink: 0,
  },
  // Modal
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  modal: {
    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)', padding: '1.75rem', width: '100%', maxWidth: '480px',
    display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '88vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: '0.95rem', fontWeight: 600, margin: 0, letterSpacing: '0.04em' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 },
  hint:  { fontSize: '0.65rem', color: 'var(--color-text-faint)', marginTop: '0.15rem' },
  input: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.85rem',
    padding: '0.5rem 0.7rem', fontFamily: 'var(--font-ui)', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  },
  textarea: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.82rem',
    padding: '0.5rem 0.7rem', fontFamily: 'var(--font-ui)', outline: 'none',
    width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '72px',
  },
  iconRow: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  iconInput: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '1.4rem',
    padding: '0.3rem 0.5rem', width: '56px', textAlign: 'center', outline: 'none',
    fontFamily: 'var(--font-ui)',
  },
  iconHint: { fontSize: '0.68rem', color: 'var(--color-text-muted)' },
  sectionTitle: {
    fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase',
    color: 'var(--color-text-muted)', fontWeight: 'normal',
    paddingBottom: '0.4rem', borderBottom: '1px solid var(--color-border)', margin: 0,
  },
  effectRow: {
    display: 'flex', flexDirection: 'column', gap: '0.4rem',
    padding: '0.6rem', background: 'var(--color-surface-2)',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
  },
  effectRowTop: { display: 'flex', gap: '0.4rem', alignItems: 'center' },
  effectTarget: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '0.75rem',
    padding: '0.3rem 0.4rem', fontFamily: 'var(--font-ui)', outline: 'none', flex: 1,
  },
  removeEffectBtn: {
    padding: '0.25rem 0.5rem', background: 'transparent', cursor: 'pointer',
    border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)',
    color: '#fca5a5', fontSize: '0.65rem',
  },
  addEffectBtn: {
    padding: '0.3rem 0.7rem', background: 'transparent', cursor: 'pointer',
    border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)', fontSize: '0.72rem', alignSelf: 'flex-start',
  },
  modalActions: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' },
  cancelBtn: {
    padding: '0.45rem 1rem', background: 'transparent', cursor: 'pointer',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)', fontSize: '0.8rem',
  },
  saveBtn: {
    padding: '0.45rem 1rem', background: 'var(--color-accent)', border: 'none',
    borderRadius: 'var(--radius-sm)', color: '#000', fontSize: '0.8rem',
    fontWeight: 700, cursor: 'pointer',
  },
}

const EFFECT_TARGETS = [
  'system', 'personality', 'scenario', 'post_history',
  'field:description', 'field:personality', 'field:scenario',
  'field:mes_example', 'field:first_mes', 'field:system_prompt',
  'field:post_history_instructions',
]

/* ── Modal ────────────────────────────────────────────────────────────────── */
function ItemModal({ item, onSave, onClose }) {
  const { t } = useTranslation()
  const [name,     setName]     = useState(item?.name ?? '')
  const [icon,     setIcon]     = useState(item?.icon ?? '◈')
  const [type,     setType]     = useState(item?.type ?? '')
  const [value,    setValue]    = useState(item?.value ?? '')
  const [priority, setPriority] = useState(item?.priority ?? 10)
  const [keywords, setKeywords] = useState(item?.keywords?.join(', ') ?? '')
  const [effects,  setEffects]  = useState(item?.effects ?? [])
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState(null)

  function addEffect() {
    setEffects(prev => [...prev, { target: 'post_history', content: '' }])
  }
  function removeEffect(i) {
    setEffects(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateEffect(i, field, val) {
    setEffects(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }

  async function handleSave() {
    if (!name.trim()) { setErr(t('items.name_required')); return }
    if (!type.trim()) { setErr(t('items.type_required')); return }
    setSaving(true); setErr(null)
    try {
      const data = {
        name: name.trim(), icon: icon.trim() || '◈', type: type.trim(),
        value: value.trim(), priority: parseInt(priority) || 10,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
        effects: effects.filter(e => e.content.trim()),
      }
      const result = item
        ? await api.items.update(item.id, data)
        : await api.items.create(data)
      onSave(result, !item)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.backdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <h2 style={S.modalTitle}>{item ? t('items.modal_edit') : t('items.modal_create')}</h2>

        {/* Icono + Nombre */}
        <div style={S.formGroup}>
          <label style={S.label}>{t('items.field_icon')}</label>
          <div style={S.iconRow}>
            <input style={S.iconInput} value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} />
            <span style={S.iconHint}>{t('items.icon_hint')}</span>
          </div>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>{t('items.field_name')}</label>
          <input style={S.input} value={name} onChange={e => setName(e.target.value)}
            placeholder={t('items.placeholder_name')} autoFocus />
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>{t('items.field_type')}</label>
          <input style={S.input} value={type} onChange={e => setType(e.target.value)}
            placeholder="Hat, Mood, Outfit…" />
          <span style={S.hint}>{t('items.type_hint')}</span>
        </div>

        <div style={S.formGroup}>
          <label style={S.label}>{t('items.field_value')}</label>
          <textarea style={S.textarea} value={value} onChange={e => setValue(e.target.value)}
            placeholder={t('items.placeholder_value')} />
          <span style={S.hint}>{t('items.value_hint')}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ ...S.formGroup, flex: 1 }}>
            <label style={S.label}>{t('items.field_priority')}</label>
            <input style={S.input} type="number" value={priority}
              onChange={e => setPriority(e.target.value)} min={0} max={100} />
          </div>
          <div style={{ ...S.formGroup, flex: 2 }}>
            <label style={S.label}>{t('items.field_keywords')}</label>
            <input style={S.input} value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="sombrero, ponerse…" />
          </div>
        </div>

        {/* Effects */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={S.sectionTitle}>{t('items.section_effects')}</h3>
          {effects.map((ef, i) => (
            <div key={i} style={S.effectRow}>
              <div style={S.effectRowTop}>
                <select style={S.effectTarget} value={ef.target}
                  onChange={e => updateEffect(i, 'target', e.target.value)}>
                  {EFFECT_TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button style={S.removeEffectBtn} onClick={() => removeEffect(i)}>✕</button>
              </div>
              <textarea style={{ ...S.textarea, minHeight: '56px' }} value={ef.content}
                onChange={e => updateEffect(i, 'content', e.target.value)}
                placeholder={t('items.effect_placeholder')} />
            </div>
          ))}
          <button style={S.addEffectBtn} onClick={addEffect}>+ {t('items.add_effect')}</button>
        </div>

        {err && <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>✗ {err}</span>}

        <div style={S.modalActions}>
          <button style={S.cancelBtn} onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button style={S.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export function ItemManager() {
  const { t }     = useTranslation()
  const pageRef   = useRef(null)

  const [items,         setItems]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [modalItem,     setModalItem]     = useState(undefined)

  usePageEntry(pageRef, { trigger: !loading })

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const list = await api.items.list()
      if (!Array.isArray(list)) throw new Error(list.detail ?? t('items.error_load'))
      setItems([...list].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function handleSaved(result, isNew) {
    setModalItem(undefined)
    setItems(prev => isNew
      ? [result, ...prev]
      : prev.map(i => i.id === result.id ? result : i)
    )
  }

  async function handleDelete(id) {
    try {
      await api.items.delete(id)
      setItems(prev => prev.filter(i => i.id !== id))
      setConfirmDelete(null)
    } catch (e) {
      setError(e.message)
      setConfirmDelete(null)
    }
  }

  return (
    <div ref={pageRef} style={S.page}>
      <div data-entry style={S.header}>
        <div style={S.titleRow}>
          <h1 style={S.title}>{t('items.title')}</h1>
          {!loading && <span style={S.count}>{t('items.count', { count: items.length })}</span>}
        </div>
        <button style={S.createBtn} onClick={() => setModalItem(null)}>{t('items.create')}</button>
      </div>

      {error && <div style={S.errorBar}>✗ {error}</div>}

      {loading ? (
        <div style={S.empty}><span style={{ fontSize: '0.8rem' }}>{t('items.loading')}</span></div>
      ) : items.length === 0 ? (
        <div style={S.empty}>
          <p style={S.emptyTitle}>{t('items.empty_title')}</p>
          <p style={S.emptyHint}>{t('items.empty_hint')}</p>
          <button style={S.createBtn} onClick={() => setModalItem(null)}>{t('items.create')}</button>
        </div>
      ) : (
        <div style={S.grid}>
          {items.map(item => (
            <div key={item.id} data-entry style={S.card}>
              <div style={S.cardTop}>
                <span style={S.cardIcon}>{item.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
                  <span style={S.cardName}>{item.name}</span>
                  <span style={S.cardType}>{'{{'}{item.type}{'}}'}</span>
                </div>
              </div>
              {item.value && <p style={S.cardValue}>{item.value}</p>}
              {(item.effects.length > 0 || item.keywords.length > 0) && (
                <div style={S.cardMeta}>
                  {item.effects.length > 0 && (
                    <span style={S.metaTag}>{item.effects.length} effect{item.effects.length > 1 ? 's' : ''}</span>
                  )}
                  {item.keywords.slice(0, 3).map(k => (
                    <span key={k} style={S.metaTag}>{k}</span>
                  ))}
                </div>
              )}
              <div style={S.cardActions}>
                <button style={S.actionBtn('normal')} onClick={() => setModalItem(item)}>{t('common.edit')}</button>
                <button style={S.actionBtn('danger')} onClick={() => setConfirmDelete(item.id)}>{t('common.delete')}</button>
              </div>
              {confirmDelete === item.id && (
                <div style={S.confirmOverlay}>
                  <span style={S.confirmText}>{t('items.confirm_delete', { name: item.name })}</span>
                  <button style={S.confirmYes} onClick={() => handleDelete(item.id)}>{t('common.confirm_yes')}</button>
                  <button style={S.confirmNo}  onClick={() => setConfirmDelete(null)}>{t('common.confirm_no')}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalItem !== undefined && (
        <ItemModal item={modalItem} onSave={handleSaved} onClose={() => setModalItem(undefined)} />
      )}
    </div>
  )
}
