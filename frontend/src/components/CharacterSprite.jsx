import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { AnimatePresence, motion } from 'framer-motion'

export function CharacterSprite({ src, name }) {
  const imgRef = useRef(null)

  // Animación de idle: leve flotación continua
  useEffect(() => {
    if (!imgRef.current || !src) return
    gsap.to(imgRef.current, {
      y: -10,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
    return () => gsap.killTweensOf(imgRef.current)
  }, [src])

  return (
    <div style={{
      position: 'absolute',
      bottom: '22%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <AnimatePresence mode="wait">
        {src ? (
          <motion.img
            key={src}
            ref={imgRef}
            src={src}
            alt={name}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ maxHeight: '65vh', objectFit: 'contain', userSelect: 'none' }}
          />
        ) : (
          // Placeholder cuando no hay sprite: silueta SVG
          <motion.div
            key="placeholder"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5 }}
            style={{ height: '55vh', display: 'flex', alignItems: 'flex-end' }}
          >
            <svg width="220" height="420" viewBox="0 0 220 420" fill="none">
              <ellipse cx="110" cy="60" rx="45" ry="55" fill="#c084fc22" stroke="#c084fc44" strokeWidth="2"/>
              <rect x="50" y="110" width="120" height="220" rx="20" fill="#c084fc11" stroke="#c084fc33" strokeWidth="2"/>
              <line x1="50" y1="200" x2="10" y2="300" stroke="#c084fc33" strokeWidth="8" strokeLinecap="round"/>
              <line x1="170" y1="200" x2="210" y2="300" stroke="#c084fc33" strokeWidth="8" strokeLinecap="round"/>
              <line x1="80" y1="330" x2="70" y2="420" stroke="#c084fc33" strokeWidth="8" strokeLinecap="round"/>
              <line x1="140" y1="330" x2="150" y2="420" stroke="#c084fc33" strokeWidth="8" strokeLinecap="round"/>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
