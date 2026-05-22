/**
 * Efectos de texto por tema, implementados con GSAP sin plugins de pago.
 * Cada función recibe un elemento DOM y devuelve una timeline GSAP.
 */
import { gsap } from 'gsap'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&'
const CHARS_JP = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ'

// ── fade — suave, por defecto ─────────────────────────────────────────────────
export function effectFade(el, { duration = 0.7, ease = 'power3.out', delay = 0 } = {}) {
  return gsap.fromTo(el,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration, ease, delay }
  )
}

// ── scramble — letras aleatorias que se resuelven (cyberpunk) ─────────────────
export function effectScramble(el, { duration = 0.6, delay = 0, charset = CHARS } = {}) {
  const original = el.textContent
  const total    = Math.round(duration * 40)   // frames totales
  let   frame    = 0

  const tl = gsap.timeline({ delay })
  tl.to({}, {
    duration,
    ease: 'none',
    onUpdate() {
      frame++
      const progress = frame / total
      el.textContent = original
        .split('')
        .map((ch, i) => {
          if (ch === ' ') return ' '
          if (i / original.length < progress) return ch
          return charset[Math.floor(Math.random() * charset.length)]
        })
        .join('')
    },
    onComplete() {
      el.textContent = original
    },
  })
  return tl
}

// ── typewriter — aparece carácter por carácter (romántico) ────────────────────
export function effectTypewriter(el, { duration = 1.0, delay = 0 } = {}) {
  const original = el.textContent
  el.textContent = ''

  const perChar = duration / (original.length || 1)
  const tl = gsap.timeline({ delay })

  original.split('').forEach((ch, i) => {
    tl.call(() => { el.textContent += ch }, [], i * perChar)
  })
  return tl
}

// ── bounce — entrada elástica (kawaii) ────────────────────────────────────────
export function effectBounce(el, { duration = 0.9, ease = 'elastic.out(1, 0.5)', delay = 0 } = {}) {
  return gsap.fromTo(el,
    { opacity: 0, scale: 0.4, y: 20 },
    { opacity: 1, scale: 1,   y: 0, duration, ease, delay }
  )
}

// ── dispatcher — elige el efecto según el id del tema ────────────────────────
export function applyTextEffect(el, effect, opts = {}) {
  switch (effect) {
    case 'scramble':   return effectScramble(el, opts)
    case 'typewriter': return effectTypewriter(el, opts)
    case 'bounce':     return effectBounce(el, opts)
    default:           return effectFade(el, opts)
  }
}
