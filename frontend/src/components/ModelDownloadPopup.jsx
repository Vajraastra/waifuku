import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

/* ── Estilos ─────────────────────────────────────────────────────────────── */
const S = {
  overlay: {
    position:       'fixed',
    inset:          0,
    background:     'rgba(0,0,0,0.65)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background:   'var(--color-surface)',
    border:       '1px solid var(--color-border-accent)',
    borderRadius: 'var(--radius-lg)',
    padding:      '1.75rem',
    width:        '420px',
    maxWidth:     '90vw',
    display:      'flex',
    flexDirection:'column',
    gap:          '1.25rem',
    boxShadow:    '0 20px 60px rgba(0,0,0,0.5)',
  },
  title: {
    fontSize:      '0.75rem',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color:         'var(--color-accent)',
    margin:        0,
  },
  desc: {
    fontSize:   '0.85rem',
    color:      'var(--color-text-muted)',
    lineHeight: 1.5,
    margin:     0,
  },
  modelList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.75rem',
  },
  modelRow: {
    display:      'flex',
    flexDirection:'column',
    gap:          '0.35rem',
  },
  modelHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  modelName: {
    fontSize:      '0.82rem',
    fontWeight:    600,
    color:         'var(--color-text)',
  },
  modelSize: {
    fontSize: '0.75rem',
    color:    'var(--color-text-muted)',
  },
  progressBar: (progress) => ({
    height:       '4px',
    borderRadius: '2px',
    background:   'var(--color-surface-2)',
    overflow:     'hidden',
    position:     'relative',
  }),
  progressFill: (progress) => ({
    position:   'absolute',
    top:        0,
    left:       0,
    height:     '100%',
    width:      `${Math.round((progress ?? 0) * 100)}%`,
    background: 'var(--color-accent)',
    borderRadius: '2px',
    transition: 'width 0.2s linear',
  }),
  progressText: {
    fontSize: '0.7rem',
    color:    'var(--color-text-faint)',
  },
  total: {
    fontSize:      '0.78rem',
    color:         'var(--color-text-muted)',
    borderTop:     '1px solid var(--color-border)',
    paddingTop:    '0.75rem',
    display:       'flex',
    justifyContent:'space-between',
  },
  totalLabel: {
    letterSpacing: '0.5px',
  },
  totalMb: {
    color:      'var(--color-accent)',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap:     '0.75rem',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding:      '0.5rem 1rem',
    background:   'transparent',
    border:       '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color:        'var(--color-text-muted)',
    fontSize:     '0.82rem',
    cursor:       'pointer',
  },
  downloadBtn: (disabled) => ({
    padding:      '0.5rem 1.25rem',
    background:   disabled ? 'var(--color-surface-2)' : 'var(--color-accent)',
    border:       'none',
    borderRadius: 'var(--radius-sm)',
    color:        disabled ? 'var(--color-text-muted)' : '#000',
    fontSize:     '0.82rem',
    fontWeight:   700,
    cursor:       disabled ? 'not-allowed' : 'pointer',
    transition:   'background 0.2s',
  }),
  errorMsg: {
    fontSize:   '0.78rem',
    color:      '#fca5a5',
    background: 'rgba(239,68,68,0.1)',
    border:     '1px solid rgba(239,68,68,0.3)',
    borderRadius: 'var(--radius-sm)',
    padding:    '0.5rem 0.75rem',
  },
}

/**
 * ModelDownloadPopup
 *
 * Props:
 *   toolLabel     — nombre de la herramienta que pidió los modelos
 *   models        — lista de { id, name, size_mb } que faltan
 *   downloading   — { [model_id]: { progress, downloaded_mb, total_mb } } del hook
 *   isDownloading — boolean: ¿hay algo descargando ahora?
 *   error         — string | null
 *   onConfirm()   — usuario aprueba la descarga
 *   onCancel()    — usuario rechaza, herramienta no se activa
 */
export function ModelDownloadPopup({
  toolLabel,
  models,
  downloading,
  isDownloading,
  error,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation()
  const totalMb = models.reduce((sum, m) => sum + m.size_mb, 0)

  return createPortal(
    <div style={S.overlay} onClick={isDownloading ? undefined : onCancel}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>

        <p style={S.title}>{t('model_dl.title')}</p>

        <p style={S.desc}>
          {t('model_dl.desc', { tool: toolLabel })}
        </p>

        <div style={S.modelList}>
          {models.map(model => {
            const dl       = downloading?.[model.id]
            const progress = dl?.progress ?? 0
            const isDone   = !dl && isDownloading  // no está en downloading pero hay descarga activa = terminó

            return (
              <div key={model.id} style={S.modelRow}>
                <div style={S.modelHeader}>
                  <span style={S.modelName}>{model.name}</span>
                  <span style={S.modelSize}>{model.size_mb} MB</span>
                </div>

                {isDownloading && (
                  <>
                    <div style={S.progressBar(progress)}>
                      <div style={S.progressFill(progress)} />
                    </div>
                    {dl?.extracting ? (
                      <span style={{ ...S.progressText, color: 'var(--color-accent)' }}>
                        ⚙ {t('model_dl.extracting')}
                      </span>
                    ) : dl ? (
                      <span style={S.progressText}>
                        {dl.downloaded_mb} / {dl.total_mb} MB ({Math.round(progress * 100)}%)
                      </span>
                    ) : isDone ? (
                      <span style={{ ...S.progressText, color: 'var(--color-accent)' }}>
                        ✓ {t('model_dl.done')}
                      </span>
                    ) : (
                      <span style={S.progressText}>{t('model_dl.queued')}</span>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>

        <div style={S.total}>
          <span style={S.totalLabel}>{t('model_dl.total')}</span>
          <span style={S.totalMb}>~{Math.round(totalMb)} MB</span>
        </div>

        {error && <div style={S.errorMsg}>⚠ {error}</div>}

        <div style={S.actions}>
          {!isDownloading && (
            <button style={S.cancelBtn} onClick={onCancel}>
              {t('model_dl.cancel')}
            </button>
          )}
          <button
            style={S.downloadBtn(isDownloading)}
            onClick={isDownloading ? undefined : onConfirm}
            disabled={isDownloading}
          >
            {isDownloading ? t('model_dl.downloading') : t('model_dl.download_btn')}
          </button>
        </div>

      </div>
    </div>,
    document.body
  )
}
