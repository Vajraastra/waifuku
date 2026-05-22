import { useEffect, useState } from 'react'
import { useConfigStore } from '../store/configStore'
import { useLocaleStore, LOCALES } from '../store/localeStore'
import { api } from '../lib/api'

export function SettingsPage() {
  const sceneBackground = useConfigStore(s => s.sceneBackground)
  const chatOpacity     = useConfigStore(s => s.chatOpacity)
  const chatFontSize    = useConfigStore(s => s.chatFontSize)
  const setConfig       = useConfigStore(s => s.setConfig)
  const { locale, setLocale } = useLocaleStore()

  const [backgrounds, setBackgrounds] = useState([])

  useEffect(() => {
    api.backgrounds.list()
      .then(res => setBackgrounds(res.backgrounds ?? []))
      .catch(() => {})
  }, [])

  return (
    <div style={S.page}>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>General</h2>

        <div style={S.field}>
          <label style={S.label}>Idioma / Language</label>
          <div style={S.localeRow}>
            {LOCALES.map(l => (
              <button
                key={l.code}
                style={{
                  ...S.localeBtn,
                  borderColor:  locale === l.code ? 'var(--color-accent)' : 'var(--color-border)',
                  color:        locale === l.code ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  background:   locale === l.code ? 'var(--color-accent-dim)' : 'transparent',
                }}
                onClick={() => setLocale(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={S.section}>
        <h2 style={S.sectionTitle}>Escena VN</h2>

        {/* Selector de fondo */}
        <div style={S.field}>
          <label style={S.label}>Fondo de escena</label>
          <div style={S.bgGrid}>
            <BgTile
              label="Sin fondo"
              active={!sceneBackground}
              onClick={() => setConfig({ sceneBackground: null })}
            />
            {backgrounds.map(name => (
              <BgTile
                key={name}
                label={name.replace(/_/g, ' ').replace(/\.[^.]+$/, '')}
                src={api.backgrounds.url(name)}
                active={sceneBackground === name}
                onClick={() => setConfig({ sceneBackground: name })}
              />
            ))}
          </div>
        </div>

        {/* Opacidad del chat */}
        <div style={S.field}>
          <div style={S.labelRow}>
            <label style={S.label}>Opacidad del panel de chat</label>
            <span style={S.value}>{Math.round((chatOpacity ?? 0.85) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="1"
            step="0.05"
            value={chatOpacity ?? 0.85}
            onChange={e => setConfig({ chatOpacity: parseFloat(e.target.value) })}
            style={S.slider}
            disabled={!sceneBackground}
          />
          {!sceneBackground && (
            <span style={S.hint}>Selecciona un fondo para activar este ajuste.</span>
          )}
        </div>

        {/* Tamaño de fuente del chat */}
        <div style={S.field}>
          <div style={S.labelRow}>
            <label style={S.label}>Tamaño de fuente del chat</label>
            <span style={S.value}>{(chatFontSize ?? 0.88).toFixed(2)} rem</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.15"
            step="0.01"
            value={chatFontSize ?? 0.88}
            onChange={e => setConfig({ chatFontSize: parseFloat(e.target.value) })}
            style={S.slider}
          />
          <div style={S.previewRow}>
            <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: `${chatFontSize ?? 0.88}rem`, color: 'var(--color-text)', lineHeight: 1.7 }}>
              *Así se verá el texto del chat.* Ejemplo de mensaje.
            </span>
          </div>
        </div>
      </section>

    </div>
  )
}

function BgTile({ label, src, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...S.bgTile,
        borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow:   active ? '0 0 0 2px var(--color-accent)' : 'none',
      }}
    >
      {src ? (
        <img src={src} alt={label} style={S.bgThumb} />
      ) : (
        <div style={S.bgEmpty}>—</div>
      )}
      <span style={{ ...S.bgLabel, color: active ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
        {label}
      </span>
    </button>
  )
}

const S = {
  page: {
    padding: '2rem 2.5rem',
    maxWidth: '760px',
    fontFamily: 'var(--font-ui)',
    color: 'var(--color-text)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  sectionTitle: {
    fontSize: '0.67rem',
    letterSpacing: '2.5px',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted)',
    fontWeight: 'normal',
    margin: 0,
    paddingBottom: '0.75rem',
    borderBottom: '1px solid var(--color-border)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.82rem',
    color: 'var(--color-text-2)',
  },
  value: {
    fontSize: '0.82rem',
    color: 'var(--color-accent)',
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: '0.72rem',
    color: 'var(--color-text-muted)',
  },
  slider: {
    width: '100%',
    accentColor: 'var(--color-accent)',
    cursor: 'pointer',
  },
  bgGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '0.75rem',
  },
  bgTile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    padding: '0.4rem',
    background: 'var(--color-surface)',
    border: '2px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    alignItems: 'center',
  },
  bgThumb: {
    width: '100%',
    aspectRatio: '16/9',
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
  },
  bgEmpty: {
    width: '100%',
    aspectRatio: '16/9',
    background: 'var(--color-surface-2)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '1.2rem',
  },
  previewRow: {
    padding: '0.5rem 0.75rem',
    background: 'var(--color-surface-2)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
  },
  bgLabel: {
    fontSize: '0.72rem',
    letterSpacing: '0.3px',
    textAlign: 'center',
    wordBreak: 'break-word',
    fontFamily: 'var(--font-ui)',
  },
  localeRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  localeBtn: {
    padding: '0.4rem 1.1rem',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    transition: 'border-color 0.15s, color 0.15s, background 0.15s',
  },
}
