import { useEffect } from 'react'
import { useThemeStore } from '../store/themeStore'
import { THEMES, DEFAULT_THEME } from '../lib/themes'
import { entryStagger } from '../lib/animations'

/**
 * Aplica entrada escalonada a los hijos con [data-entry] dentro de containerRef.
 * Re-corre si cambia el tema. Para deps adicionales (ej. loading), pasa trigger.
 */
export function usePageEntry(containerRef, { delay = 0.1, trigger = true } = {}) {
  const { themeId } = useThemeStore()
  const anim = (THEMES[themeId] ?? THEMES[DEFAULT_THEME]).anim

  useEffect(() => {
    if (!trigger) return
    return entryStagger(containerRef.current, anim, delay)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeId, trigger])
}
