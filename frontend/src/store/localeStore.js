import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '../lib/i18n'

export const LOCALES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
]

export const useLocaleStore = create(
  persist(
    (set) => ({
      locale: 'es',
      setLocale: (code) => {
        i18n.changeLanguage(code)
        localStorage.setItem('waifuku-lang', JSON.stringify(code))
        set({ locale: code })
      },
    }),
    { name: 'waifuku-locale' }
  )
)
