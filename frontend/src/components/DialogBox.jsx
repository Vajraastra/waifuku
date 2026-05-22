import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { motion } from 'framer-motion'

const BOX = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 10,
  padding: '0 2rem 1.5rem',
}

const PANEL = {
  background: 'rgba(10, 8, 20, 0.88)',
  border: '1px solid rgba(192, 132, 252, 0.25)',
  borderRadius: '12px 12px 0 0',
  padding: '1.25rem 1.75rem 1.5rem',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 -4px 40px rgba(192,132,252,0.08)',
}

const NAME_TAG = {
  display: 'inline-block',
  background: 'rgba(192,132,252,0.15)',
  border: '1px solid rgba(192,132,252,0.4)',
  borderRadius: '6px',
  padding: '2px 14px',
  color: '#c084fc',
  fontFamily: 'Georgia, serif',
  fontSize: '0.95rem',
  letterSpacing: '1px',
  marginBottom: '0.75rem',
}

const TEXT = {
  fontFamily: 'Georgia, serif',
  fontSize: '1.1rem',
  lineHeight: 1.75,
  color: '#e2e8f0',
  minHeight: '3.5rem',
}

const CURSOR = {
  display: 'inline-block',
  width: '2px',
  height: '1.1em',
  background: '#c084fc',
  marginLeft: '2px',
  verticalAlign: 'text-bottom',
  animation: 'blink 1s step-end infinite',
}

export function DialogBox({ characterName, content, isStreaming }) {
  const panelRef = useRef(null)
  const prevNameRef = useRef(null)

  // Slide-up al primer render
  useEffect(() => {
    if (!panelRef.current) return
    gsap.from(panelRef.current, { y: 80, opacity: 0, duration: 0.6, ease: 'power3.out' })
  }, [])

  // Flash sutil cuando cambia de personaje hablando
  useEffect(() => {
    if (prevNameRef.current === characterName) return
    prevNameRef.current = characterName
    if (!panelRef.current) return
    gsap.fromTo(panelRef.current, { opacity: 0.4 }, { opacity: 1, duration: 0.3 })
  }, [characterName])

  return (
    <>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      <div style={BOX}>
        <div ref={panelRef} style={PANEL}>
          {characterName && <div style={NAME_TAG}>{characterName}</div>}
          <div style={TEXT}>
            {content || <span style={{ color: '#64748b' }}>...</span>}
            {isStreaming && <span style={CURSOR} />}
          </div>
        </div>
      </div>
    </>
  )
}
