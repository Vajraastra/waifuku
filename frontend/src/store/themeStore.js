import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { THEMES, DEFAULT_THEME } from '../lib/themes'

export function applyTheme(themeId) {
  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME]
  const root  = document.documentElement
  root.setAttribute('data-theme', theme.id)
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value)
  }
  return theme.id
}

export const useThemeStore = create(
  persist(
    (set) => ({
      themeId: DEFAULT_THEME,
      setTheme: (id) => {
        const resolved = applyTheme(id)
        set({ themeId: resolved })
      },
    }),
    {
      name: 'waifuku-theme',
      onRehydrateStorage: () => (state) => {
        // Si el themeId guardado ya no existe (ej. renombramos los temas), corregir
        const raw  = state?.themeId
        const safe = THEMES[raw] ? raw : DEFAULT_THEME
        applyTheme(safe)
        if (safe !== raw) state.themeId = safe
      },
    }
  )
)
