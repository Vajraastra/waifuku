import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'

export function Background({ src }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.inOut' })
  }, [src])

  const style = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    background: src
      ? `url(${src}) center/cover no-repeat`
      : 'linear-gradient(160deg, #0d0d1a 0%, #1a0d2e 50%, #0d0d1a 100%)',
  }

  return <div ref={ref} style={style} />
}
