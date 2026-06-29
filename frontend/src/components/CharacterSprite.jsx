import { useRef, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'
import { AnimatePresence, motion } from 'framer-motion'
import { useConfigStore } from '../store/configStore'

// Convierte hex '#rrggbb' a [r, g, b]
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

// Aplica chroma key sobre una COPIA del ImageData cacheado (no muta el original)
function applyChromaKeyFromCache(ctx, w, h, hexColor, threshold, originalData) {
  const copy = new ImageData(new Uint8ClampedArray(originalData.data), w, h)
  const data = copy.data
  const [tr, tg, tb] = hexToRgb(hexColor)
  const soft = threshold * 0.6

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i]   - tr
    const dg = data[i+1] - tg
    const db = data[i+2] - tb
    const dist = Math.sqrt(dr*dr + dg*dg + db*db)

    if (dist < threshold) {
      data[i+3] = 0
    } else if (dist < threshold + soft) {
      data[i+3] = Math.round(255 * (dist - threshold) / soft)
    }
  }
  ctx.putImageData(copy, 0, 0)
}

// Canvas con chroma key — la imagen se carga UNA VEZ y se cachea
function ChromaCanvas({ src, chromaColor, threshold, style, floatRef }) {
  const canvasRef    = useRef(null)
  const originalData = useRef(null)   // cache de pixels originales
  const size         = useRef({ w: 0, h: 0 })

  // Carga inicial (solo cuando cambia src)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !src) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const img = new Image()
    img.onload = () => {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      size.current  = { w: canvas.width, h: canvas.height }
      ctx.drawImage(img, 0, 0)
      originalData.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
      applyChromaKeyFromCache(ctx, size.current.w, size.current.h, chromaColor, threshold, originalData.current)
    }
    img.src = src
  }, [src])

  // Re-proceso sin red al cambiar color o tolerancia
  useEffect(() => {
    if (!originalData.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true })
    applyChromaKeyFromCache(ctx, size.current.w, size.current.h, chromaColor, threshold, originalData.current)
  }, [chromaColor, threshold])

  // Conectar ref para GSAP idle float
  useEffect(() => {
    if (floatRef) floatRef.current = canvasRef.current
  })

  return <canvas ref={canvasRef} style={style} />
}

export function CharacterSprite({ src, name }) {
  const floatRef = useRef(null)
  const chromaKeyEnabled   = useConfigStore(s => s.chromaKeyEnabled)
  const chromaKeyColor     = useConfigStore(s => s.chromaKeyColor)
  const chromaKeyThreshold = useConfigStore(s => s.chromaKeyThreshold)

  // Animación de idle: leve flotación continua sobre el elemento sprite
  useEffect(() => {
    if (!floatRef.current || !src) return
    gsap.to(floatRef.current, {
      y: -10, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1,
    })
    return () => gsap.killTweensOf(floatRef.current)
  }, [src, chromaKeyEnabled])

  const spriteStyle = {
    height: 'calc(100vh - 220px)',
    maxHeight: '86vh',
    width: 'auto',
    userSelect: 'none',
    display: 'block',
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '112px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <AnimatePresence mode="wait">
        {src ? (
          <motion.div
            key={src + (chromaKeyEnabled ? '-chroma' : '-plain')}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            {chromaKeyEnabled ? (
              <ChromaCanvas
                src={src}
                chromaColor={chromaKeyColor}
                threshold={chromaKeyThreshold}
                style={spriteStyle}
                floatRef={floatRef}
              />
            ) : (
              <img
                ref={floatRef}
                src={src}
                alt={name}
                style={spriteStyle}
              />
            )}
          </motion.div>
        ) : (
          // Placeholder cuando no hay sprite: silueta SVG
          <motion.div
            key="placeholder"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'flex', alignItems: 'flex-end' }}
          >
            <svg viewBox="0 0 220 420" fill="none" style={{ height: 'calc(100vh - 240px)', maxHeight: '84vh', width: 'auto' }}>
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
