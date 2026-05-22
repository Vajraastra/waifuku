import { useEffect, useRef, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '../store/themeStore'
import { THEMES, DEFAULT_THEME } from '../lib/themes'
import { startParticles } from '../lib/particles'
import { applyTextEffect } from '../lib/textEffects'
import { TopBar } from '../components/Layout'

const CARD_DEFS = (t) => [
  { to: '/characters', key: 'rp', icon: '✦', accentVar: '--color-accent' },
  { to: '/vanilla', key: 'vanilla', icon: '◈', accentVar: '--color-cyan'   },
]

export function Welcome() {
  const navigate   = useNavigate()
  const { t }      = useTranslation()
  const { themeId } = useThemeStore()
  const theme      = THEMES[themeId] ?? THEMES[DEFAULT_THEME]

  const containerRef  = useRef(null)
  const titleRef      = useRef(null)
  const subtitleRef   = useRef(null)
  const cardsRef      = useRef([])
  const canvasRef     = useRef(null)
  const stopParticles = useRef(null)

  // Reiniciar partículas cuando cambia el tema
  useEffect(() => {
    stopParticles.current?.()
    stopParticles.current = startParticles(canvasRef.current, theme.particles)
    return () => stopParticles.current?.()
  }, [themeId])

  // Animaciones de entrada
  useEffect(() => {
    const ctx = gsap.context(() => {
      const { ease, duration, stagger, textEffect } = theme.anim

      // Título
      gsap.fromTo(titleRef.current,
        { clipPath: 'inset(0 100% 0 0)', opacity: 0 },
        { clipPath: 'inset(0 0% 0 0)',   opacity: 1, duration: 1.1, ease: 'power3.out', delay: 0.2 }
      )

      // Subtítulo con efecto del tema
      gsap.set(subtitleRef.current, { opacity: 1 })
      applyTextEffect(subtitleRef.current, textEffect, { duration: duration * 1.2, delay: 0.9, ease })

      // Cards staggereadas
      gsap.fromTo(cardsRef.current,
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration, ease, stagger, delay: 1.2 }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [themeId])

  function handleCardClick(card, idx) {
    cardsRef.current.forEach((el, i) => {
      if (i === idx) gsap.to(el, { scale: 1.05, opacity: 0, duration: 0.35, ease: 'power2.in' })
      else           gsap.to(el, { opacity: 0, y: -16, duration: 0.25 })
    })
    gsap.to([titleRef.current, subtitleRef.current], { opacity: 0, duration: 0.25, delay: 0.1 })
    setTimeout(() => navigate(card.to), 380)
  }

  return (
    <div ref={containerRef} style={styles.root}>
      <div style={styles.topbar}><TopBar /></div>
      <canvas ref={canvasRef} style={styles.canvas} />
      <div style={styles.glow} />

      <div style={styles.content}>
        <div ref={titleRef} style={styles.title}>WAIFUKU</div>
        <div ref={subtitleRef} style={styles.subtitle}>
          {t('welcome.subtitle')}
        </div>

        <div style={styles.grid}>
          {CARD_DEFS(t).map((card, i) => (
            <WelcomeCard
              key={card.to}
              card={card}
              label={t(`welcome.cards.${card.key}.title`)}
              sub={t(`welcome.cards.${card.key}.sub`)}
              ref={el => cardsRef.current[i] = el}
              onClick={() => handleCardClick(card, i)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────

const WelcomeCard = forwardRef(function WelcomeCard({ card, label, sub, onClick }, ref) {
  const innerRef = useRef(null)

  // Resuelve el color de acento desde CSS vars en runtime
  function getAccent() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(card.accentVar).trim()
  }

  function onEnter() {
    const accent = getAccent()
    gsap.to(innerRef.current, {
      borderColor: accent,
      boxShadow: `0 0 24px color-mix(in srgb, ${accent} 20%, transparent)`,
      y: -5,
      duration: 0.22,
    })
  }
  function onLeave() {
    gsap.to(innerRef.current, {
      borderColor: 'var(--color-border)',
      boxShadow: 'none',
      y: 0,
      duration: 0.22,
    })
  }

  return (
    <div
      ref={el => { innerRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el }}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={styles.card}
    >
      <span style={{ ...styles.cardIcon, color: `var(${card.accentVar})` }}>
        {card.icon}
      </span>
      <div style={styles.cardTitle}>{label}</div>
      <div style={styles.cardSub}>{sub}</div>
    </div>
  )
})

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: 'var(--color-bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  glow: {
    position: 'absolute',
    top: '35%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '700px',
    height: '350px',
    background: 'radial-gradient(ellipse, color-mix(in srgb, var(--color-accent) 8%, transparent) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  title: {
    color: 'var(--color-accent)',
    fontFamily: 'var(--font-dialog)',
    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
    letterSpacing: '10px',
    userSelect: 'none',
  },
  subtitle: {
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-ui)',
    fontSize: '0.8rem',
    letterSpacing: '3px',
    textTransform: 'uppercase',
  },
  grid: {
    display: 'flex',
    gap: '1.25rem',
    marginTop: '2rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    width: '200px',
    padding: '2rem 1.5rem',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    backdropFilter: 'blur(8px)',
    userSelect: 'none',
    transition: 'border-color 0.2s',
  },
  cardIcon: {
    fontSize: '1.8rem',
    lineHeight: 1,
  },
  cardTitle: {
    color: 'var(--color-text)',
    fontFamily: 'var(--font-dialog)',
    fontSize: '1rem',
    letterSpacing: '1px',
  },
  cardSub: {
    color: 'var(--color-text-2)',
    fontFamily: 'var(--font-ui)',
    fontSize: '0.72rem',
    textAlign: 'center',
    letterSpacing: '0.5px',
    lineHeight: 1.5,
  },
}
