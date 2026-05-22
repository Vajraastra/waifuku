import { gsap } from 'gsap'

// ── pageIn — anima el wrapper de página al cambiar de ruta ────────────────────
export function pageIn(el, anim) {
  if (!el) return
  gsap.fromTo(el,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: anim.duration * 0.55, ease: anim.ease }
  )
}

// ── entryStagger — entrada escalonada de hijos [data-entry] ───────────────────
export function entryStagger(container, anim, delay = 0.1) {
  if (!container) return () => {}
  const ctx = gsap.context(() => {
    const els = container.querySelectorAll('[data-entry]')
    if (!els.length) return
    gsap.fromTo(els,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: anim.duration, ease: anim.ease, stagger: anim.stagger, delay }
    )
  }, container)
  return () => ctx.revert()
}

// ── hoverIn — comportamiento según textEffect del tema ────────────────────────
export function hoverIn(el, anim) {
  if (!el) return
  const { ease, duration, textEffect } = anim

  if (textEffect === 'bounce') {
    gsap.to(el, { scale: 1.04, y: -4, duration: duration * 0.28, ease })
  } else if (textEffect === 'scramble') {
    gsap.killTweensOf(el)
    gsap.to(el, {
      keyframes: [
        { x: 3,  duration: 0.06 },
        { x: -3, duration: 0.06 },
        { x: 2,  duration: 0.05 },
        { x: 0,  duration: 0.05 },
      ],
      ease: 'none',
    })
  } else if (textEffect === 'typewriter') {
    gsap.to(el, { y: -3, scale: 1.02, duration: duration * 0.4, ease })
  } else {
    // fade
    gsap.to(el, { y: -4, duration: duration * 0.3, ease })
  }
}

export function hoverOut(el, anim) {
  if (!el) return
  gsap.killTweensOf(el)
  gsap.to(el, { scale: 1, x: 0, y: 0, duration: 0.22, ease: 'power2.out' })
}
