import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

const EMPTY_FORM = {
  name: '',
  description: '',
  personality: '',
  first_mes: '',
  scenario: '',
  mes_example: '',
  system_prompt: '',
  post_history_instructions: '',
  alternate_greetings: [],
  tags: [],
  creator: '',
  creator_notes: '',
  character_version: '',
}

/* ── Estilos ──────────────────────────────────────────────────────────────── */
const S = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    fontFamily: 'var(--font-ui)',
    color: 'var(--color-text)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem 2rem 0',
    flexShrink: 0,
  },
  backBtn: {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    padding: '0.3rem 0.7rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    color: 'var(--color-text)',
    margin: 0,
  },
  importRow: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem 2rem 0',
    flexShrink: 0,
  },
  importBtn: {
    padding: '0.35rem 0.8rem',
    background: 'transparent',
    border: '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-accent)',
    fontSize: '0.72rem',
    cursor: 'pointer',
  },
  importHint: {
    fontSize: '0.68rem',
    color: 'var(--color-text-faint)',
    alignSelf: 'center',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.25rem 2rem',
    display: 'flex',
    gap: '1.5rem',
  },
  leftCol: {
    width: '180px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  avatarBox: {
    width: '180px',
    height: '240px',
    borderRadius: 'var(--radius)',
    border: '2px dashed var(--color-border)',
    overflow: 'hidden',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-surface)',
    flexShrink: 0,
    position: 'relative',
    transition: 'border-color 0.2s',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarHint: {
    fontSize: '0.68rem',
    color: 'var(--color-text-faint)',
    textAlign: 'center',
    padding: '0.5rem',
    lineHeight: 1.4,
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    color: '#fff',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  rightCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    minWidth: 0,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  required: {
    color: 'var(--color-accent)',
    fontSize: '0.8rem',
  },
  hint: {
    fontSize: '0.65rem',
    color: 'var(--color-text-faint)',
    fontStyle: 'italic',
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.7rem',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-ui)',
    boxSizing: 'border-box',
    outline: 'none',
  },
  inputError: {
    borderColor: '#fca5a5',
  },
  textarea: (rows) => ({
    width: '100%',
    padding: '0.5rem 0.7rem',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-ui)',
    resize: 'vertical',
    minHeight: `${rows * 1.5}rem`,
    lineHeight: 1.6,
    boxSizing: 'border-box',
    outline: 'none',
  }),
  advancedToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0',
    background: 'transparent',
    border: 'none',
    borderTop: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    marginTop: '0.5rem',
  },
  greetingRow: {
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'flex-start',
  },
  removeBtn: {
    flexShrink: 0,
    marginTop: '0.4rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-faint)',
    padding: '0.3rem 0.5rem',
    fontSize: '0.7rem',
    cursor: 'pointer',
  },
  addBtn: {
    alignSelf: 'flex-start',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    padding: '0.3rem 0.7rem',
    fontSize: '0.72rem',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 2rem',
    borderTop: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  saveBtn: (loading) => ({
    padding: '0.5rem 1.75rem',
    background: loading ? 'var(--color-surface-2)' : 'var(--color-accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: loading ? 'var(--color-text-muted)' : '#000',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: loading ? 'wait' : 'pointer',
  }),
  cancelBtn: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    fontSize: '0.82rem',
    cursor: 'pointer',
  },
  errorMsg: {
    fontSize: '0.75rem',
    color: '#fca5a5',
  },
  successMsg: {
    fontSize: '0.75rem',
    color: 'var(--color-green, #86efac)',
  },
}

/* ── Componente ───────────────────────────────────────────────────────────── */
export function CharacterCreator() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const { id }     = useParams()
  const isEdit     = Boolean(id)

  const [form,        setForm]        = useState(EMPTY_FORM)
  const [avatarFile,  setAvatarFile]  = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [showAdvanced, setShowAdvanced]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [nameError,   setNameError]   = useState(false)
  const [hoverAvatar, setHoverAvatar] = useState(false)

  const fileInputRef      = useRef(null)
  const importPngRef      = useRef(null)
  const importJsonRef     = useRef(null)
  const avatarObjectUrl   = useRef(null)

  // Limpiar object URL al desmontar
  useEffect(() => {
    return () => { if (avatarObjectUrl.current) URL.revokeObjectURL(avatarObjectUrl.current) }
  }, [])

  // Cargar personaje existente en modo edición
  useEffect(() => {
    if (!isEdit) return
    api.characters.get(id).then(char => {
      if (!char || char.detail) return
      setForm({
        name:                      char.name                      ?? '',
        description:               char.description               ?? '',
        personality:               char.personality               ?? '',
        first_mes:                 char.first_mes                 ?? '',
        scenario:                  char.scenario                  ?? '',
        mes_example:               char.mes_example               ?? '',
        system_prompt:             char.system_prompt             ?? '',
        post_history_instructions: char.post_history_instructions ?? '',
        alternate_greetings:       char.alternate_greetings       ?? [],
        tags:                      char.tags                      ?? [],
        creator:                   char.creator                   ?? '',
        creator_notes:             char.creator_notes             ?? '',
        character_version:         char.character_version         ?? '',
      })
      if (char.avatar_path) {
        setAvatarPreview(api.characters.avatarUrl(id) + '?t=' + Date.now())
      }
    })
  }, [id, isEdit])

  const setField = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    setError(null)
  }, [])

  function handleAvatarClick() { fileInputRef.current?.click() }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (avatarObjectUrl.current) URL.revokeObjectURL(avatarObjectUrl.current)
    const url = URL.createObjectURL(file)
    avatarObjectUrl.current = url
    setAvatarFile(file)
    setAvatarPreview(url)
    e.target.value = ''
  }

  async function handleImportPng(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const char = await api.characters.importPng(file)
      if (char.detail) { setError(char.detail); return }
      navigate('/characters')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleImportJson(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const char = await api.characters.importJson(file)
      if (char.detail) { setError(char.detail); return }
      navigate('/characters')
    } catch (err) {
      setError(err.message)
    }
  }

  function setGreeting(i, value) {
    const next = [...form.alternate_greetings]
    next[i] = value
    setField('alternate_greetings', next)
  }

  function addGreeting()    { setField('alternate_greetings', [...form.alternate_greetings, '']) }
  function removeGreeting(i){ setField('alternate_greetings', form.alternate_greetings.filter((_, j) => j !== i)) }

  async function handleSave() {
    if (!form.name.trim()) { setNameError(true); return }
    setNameError(false)
    setSaving(true)
    setError(null)
    try {
      let char
      if (isEdit) {
        char = await api.characters.update(id, form)
      } else {
        char = await api.characters.create(form)
      }
      if (char.detail) { setError(char.detail); return }

      if (avatarFile) {
        await api.characters.uploadAvatar(char.id, avatarFile)
      }

      navigate('/characters')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => navigate('/characters')}>{t('common.back')}</button>
        <h1 style={S.title}>{isEdit ? t('creator.title_edit') : t('creator.title_create')}</h1>
      </div>

      {/* Import row */}
      {!isEdit && (
        <div style={S.importRow}>
          <span style={S.importHint}>{t('creator.import_hint')}</span>
          <button style={S.importBtn} onClick={() => importPngRef.current?.click()}>
            PNG (SillyTavern)
          </button>
          <button style={S.importBtn} onClick={() => importJsonRef.current?.click()}>
            JSON (ST V1/V2)
          </button>
          <input ref={importPngRef}  type="file" accept=".png"  hidden onChange={handleImportPng} />
          <input ref={importJsonRef} type="file" accept=".json" hidden onChange={handleImportJson} />
        </div>
      )}

      {/* Body */}
      <div style={S.body}>
        {/* Col izquierda — avatar */}
        <div style={S.leftCol}>
          <div
            style={{ ...S.avatarBox, borderColor: hoverAvatar ? 'var(--color-accent)' : undefined }}
            onClick={handleAvatarClick}
            onMouseEnter={() => setHoverAvatar(true)}
            onMouseLeave={() => setHoverAvatar(false)}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={S.avatarImg} />
              : <span style={S.avatarHint}>{t('creator.avatar_hint')}</span>
            }
            {avatarPreview && (
              <div style={{ ...S.avatarOverlay, opacity: hoverAvatar ? 1 : 0 }}>
                {t('creator.avatar_change')}
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-faint)', lineHeight: 1.4 }}>
            {t('creator.avatar_fmt')}
          </span>
        </div>

        {/* Col derecha — campos */}
        <div style={S.rightCol}>

          {/* Nombre */}
          <div style={S.field}>
            <label style={S.label}>
              {t('creator.field_name')} <span style={S.required}>*</span>
            </label>
            <input
              style={{ ...S.input, ...(nameError ? S.inputError : {}) }}
              placeholder={t('creator.placeholder_name')}
              value={form.name}
              onChange={e => { setField('name', e.target.value); setNameError(false) }}
            />
            {nameError && <span style={S.errorMsg}>{t('creator.name_required')}</span>}
          </div>

          {/* Descripción */}
          <div style={S.field}>
            <label style={S.label}>{t('creator.field_desc')}</label>
            <span style={S.hint}>{t('creator.hint_desc')}</span>
            <textarea
              style={S.textarea(6)}
              placeholder={t('creator.placeholder_desc')}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
            />
          </div>

          {/* Personalidad */}
          <div style={S.field}>
            <label style={S.label}>{t('creator.field_personality')}</label>
            <span style={S.hint}>{t('creator.hint_personality')}</span>
            <textarea
              style={S.textarea(4)}
              placeholder={t('creator.placeholder_personality')}
              value={form.personality}
              onChange={e => setField('personality', e.target.value)}
            />
          </div>

          {/* Primer mensaje */}
          <div style={S.field}>
            <label style={S.label}>{t('creator.field_first_mes')}</label>
            <span style={S.hint}>{t('creator.hint_first_mes')}</span>
            <textarea
              style={S.textarea(5)}
              placeholder={t('creator.placeholder_first_mes')}
              value={form.first_mes}
              onChange={e => setField('first_mes', e.target.value)}
            />
          </div>

          {/* Escenario */}
          <div style={S.field}>
            <label style={S.label}>{t('creator.field_scenario')}</label>
            <span style={S.hint}>{t('creator.hint_scenario')}</span>
            <textarea
              style={S.textarea(3)}
              placeholder={t('creator.placeholder_scenario')}
              value={form.scenario}
              onChange={e => setField('scenario', e.target.value)}
            />
          </div>

          {/* Toggle avanzado */}
          <button style={S.advancedToggle} onClick={() => setShowAdvanced(v => !v)}>
            {showAdvanced ? t('creator.advanced_hide') : t('creator.advanced_show')}
          </button>

          {showAdvanced && (
            <>
              {/* Ejemplo de diálogo */}
              <div style={S.field}>
                <label style={S.label}>{t('creator.field_mes_example')}</label>
                <span style={S.hint}>{t('creator.hint_mes_example')}</span>
                <textarea
                  style={S.textarea(6)}
                  placeholder={'<START>\n{{user}}: Hi.\n{{char}}: *glances at you briefly* Hello.'}
                  value={form.mes_example}
                  onChange={e => setField('mes_example', e.target.value)}
                />
              </div>

              {/* System prompt */}
              <div style={S.field}>
                <label style={S.label}>{t('creator.field_system')}</label>
                <span style={S.hint}>{t('creator.hint_system')}</span>
                <textarea
                  style={S.textarea(4)}
                  placeholder={t('creator.placeholder_system')}
                  value={form.system_prompt}
                  onChange={e => setField('system_prompt', e.target.value)}
                />
              </div>

              {/* Post-history instructions */}
              <div style={S.field}>
                <label style={S.label}>{t('creator.field_post_history')}</label>
                <span style={S.hint}>{t('creator.hint_post_history')}</span>
                <textarea
                  style={S.textarea(3)}
                  placeholder={t('creator.placeholder_post_history')}
                  value={form.post_history_instructions}
                  onChange={e => setField('post_history_instructions', e.target.value)}
                />
              </div>

              {/* Saludos alternativos */}
              <div style={S.field}>
                <label style={S.label}>{t('creator.field_alt_greetings')}</label>
                <span style={S.hint}>{t('creator.hint_alt_greetings')}</span>
                {form.alternate_greetings.map((g, i) => (
                  <div key={i} style={S.greetingRow}>
                    <textarea
                      style={{ ...S.textarea(3), flex: 1 }}
                      placeholder={t('creator.placeholder_alt_greeting', { num: i + 1 })}
                      value={g}
                      onChange={e => setGreeting(i, e.target.value)}
                    />
                    <button style={S.removeBtn} onClick={() => removeGreeting(i)}>×</button>
                  </div>
                ))}
                <button style={S.addBtn} onClick={addGreeting}>{t('creator.add_greeting')}</button>
              </div>

              {/* Metadata */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ ...S.field, flex: 1 }}>
                  <label style={S.label}>{t('creator.field_creator')}</label>
                  <input style={S.input} placeholder={t('creator.placeholder_creator')} value={form.creator}
                    onChange={e => setField('creator', e.target.value)} />
                </div>
                <div style={{ ...S.field, flex: 1 }}>
                  <label style={S.label}>{t('creator.field_version')}</label>
                  <input style={S.input} placeholder="1.0" value={form.character_version}
                    onChange={e => setField('character_version', e.target.value)} />
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>{t('creator.field_creator_notes')}</label>
                <textarea
                  style={S.textarea(3)}
                  placeholder={t('creator.placeholder_creator_notes')}
                  value={form.creator_notes}
                  onChange={e => setField('creator_notes', e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={S.footer}>
        <button style={S.saveBtn(saving)} onClick={handleSave} disabled={saving}>
          {saving ? t('creator.btn_saving') : isEdit ? t('creator.btn_save_changes') : t('creator.btn_create')}
        </button>
        <button style={S.cancelBtn} onClick={() => navigate('/characters')}>{t('common.cancel')}</button>
        {error && <span style={S.errorMsg}>✗ {error}</span>}
      </div>
    </div>
  )
}
