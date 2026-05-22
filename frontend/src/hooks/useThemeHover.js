import { useCallback } from 'react'
import { useThemeStore } from '../store/themeStore'
import { THEMES, DEFAULT_THEME } from '../lib/themes'
import { hoverIn, hoverOut } from '../lib/animations'

/**
 * Devuelve { onMouseEnter, onMouseLeave } con animaciones hover
 * basadas en el perfil anim del tema activo.
 */
export function useThemeHover(ref) {
  const { themeId } = useThemeStore()
  const anim = (THEMES[themeId] ?? THEMES[DEFAULT_THEME]).anim

  const onMouseEnter = useCallback(() => hoverIn(ref.current, anim),  [ref, themeId]) // eslint-disable-line
  const onMouseLeave = useCallback(() => hoverOut(ref.current, anim), [ref, themeId]) // eslint-disable-line

  return { onMouseEnter, onMouseLeave }
}
