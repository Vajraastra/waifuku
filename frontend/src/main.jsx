import { THEMES, DEFAULT_THEME } from './lib/themes'

// Aplica tema antes del primer render — valida que el ID guardado aún exista
const saved   = JSON.parse(localStorage.getItem('waifuku-theme') || '{}')
const rawId   = saved?.state?.themeId
const themeId = THEMES[rawId] ? rawId : DEFAULT_THEME
const theme   = THEMES[themeId]

document.documentElement.setAttribute('data-theme', theme.id)
for (const [prop, value] of Object.entries(theme.vars)) {
  document.documentElement.style.setProperty(prop, value)
}

// Corrige el valor en localStorage si el ID era inválido
if (rawId && !THEMES[rawId]) {
  saved.state = { ...saved.state, themeId }
  localStorage.setItem('waifuku-theme', JSON.stringify(saved))
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './lib/i18n'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
