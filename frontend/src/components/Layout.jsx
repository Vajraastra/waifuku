import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '../store/themeStore'
import { useConfigStore } from '../store/configStore'
import { useProviderStatus } from '../hooks/useProviderStatus'
import { THEME_LIST, THEMES, DEFAULT_THEME } from '../lib/themes'
import { pageIn } from '../lib/animations'

const NAV_TABS = [
  { to: '/vanilla', key: 'vanilla' },
]

const MGMT_TABS = [
  { to: '/characters', key: 'characters' },
  { to: '/personas',   key: 'personas'   },
  { to: '/models',     key: 'server'     },
  { to: '/settings',   key: 'settings'   },
]

export function Layout() {
  const location  = useLocation()
  const { themeId } = useThemeStore()
  const anim      = (THEMES[themeId] ?? THEMES[DEFAULT_THEME]).anim
  const pageRef   = useRef(null)

  useEffect(() => {
    pageIn(pageRef.current, anim)
  }, [location.pathname, themeId]) // eslint-disable-line

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
      <TopBar />
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--color-bg)' }}>
        <div ref={pageRef}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function TopBar() {
  const { t }                 = useTranslation()
  const { themeId, setTheme } = useThemeStore()
  const activeTheme                     = THEME_LIST.find(th => th.id === themeId)
  const { status, label: providerLabel } = useProviderStatus()

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0 1.5rem',
      height: '48px',
      background: 'var(--color-surface)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <span
        onClick={() => window.location.href = '/'}
        style={{
          color: 'var(--color-accent)',
          fontFamily: 'var(--font-dialog)',
          fontSize: '1rem',
          letterSpacing: '4px',
          marginRight: '1rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {activeTheme?.icon} WAIFUKU
      </span>

      {/* Tabs principales */}
      {NAV_TABS.map(({ to, key }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-ui)',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-2)',
            background: isActive ? 'var(--color-accent-dim)' : 'transparent',
            transition: 'color 0.2s, background 0.2s',
          })}
        >
          {t(`nav.${key}`)}
        </NavLink>
      ))}

      {/* Separador */}
      <div style={{
        width: '1px',
        height: '18px',
        background: 'var(--color-border)',
        margin: '0 0.5rem',
      }} />

      {/* Tabs de gestión */}
      {MGMT_TABS.map(({ to, key }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-ui)',
            color: isActive ? 'var(--color-accent)' : 'var(--color-text-muted)',
            background: isActive ? 'var(--color-accent-dim)' : 'transparent',
            transition: 'color 0.2s, background 0.2s',
          })}
        >
          {t(`nav.${key}`)}
        </NavLink>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Indicador de proveedor */}
      <ProviderDot status={status} provider={providerLabel} />

      {/* Selector de tema */}
      <select
        value={themeId}
        onChange={e => setTheme(e.target.value)}
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--color-text-2)',
          fontFamily: 'var(--font-ui)',
          fontSize: '0.78rem',
          padding: '0.25rem 0.6rem',
          cursor: 'pointer',
          outline: 'none',
          marginLeft: '0.5rem',
        }}
      >
        {THEME_LIST.map(th => (
          <option key={th.id} value={th.id}>{th.icon} {th.label}</option>
        ))}
      </select>
    </nav>
  )
}

// ── Provider Badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  online:   'online',
  offline:  'offline',
  checking: '···',
}

function ProviderDot({ status, provider }) {
  // online → acento del tema, offline → rojo, checking → muted
  const borderColor = status === 'online'  ? 'var(--color-accent)'
                    : status === 'offline' ? '#ef4444'
                    : 'var(--color-border)'

  const dotColor    = status === 'online'  ? 'var(--color-accent)'
                    : status === 'offline' ? '#ef4444'
                    : 'var(--color-text-muted)'

  const glowColor   = status === 'online'  ? 'var(--color-accent)'
                    : status === 'offline' ? '#ef4444'
                    : 'transparent'

  return (
    <div
      title={`${provider} · ${STATUS_LABEL[status] ?? ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.22rem 0.65rem',
        borderRadius: '999px',
        border: `1px solid ${borderColor}`,
        background: 'var(--color-surface-2)',
        boxShadow: status !== 'checking'
          ? `0 0 8px color-mix(in srgb, ${glowColor} 35%, transparent),
             inset 0 0 6px color-mix(in srgb, ${glowColor} 10%, transparent)`
          : 'none',
        transition: 'border-color 0.4s, box-shadow 0.4s',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Dot */}
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: dotColor,
        boxShadow: status !== 'checking'
          ? `0 0 4px ${dotColor}, 0 0 8px color-mix(in srgb, ${dotColor} 60%, transparent)`
          : 'none',
        transition: 'background 0.4s, box-shadow 0.4s',
        flexShrink: 0,
      }} />

      {/* Proveedor */}
      <span style={{
        fontSize: '0.72rem',
        fontFamily: 'var(--font-ui)',
        color: 'var(--color-text-2)',
        letterSpacing: '0.5px',
      }}>
        {provider}
      </span>

      {/* Estado */}
      <span style={{
        fontSize: '0.68rem',
        fontFamily: 'var(--font-ui)',
        color: dotColor,
        letterSpacing: '0.3px',
        opacity: 0.85,
      }}>
        {STATUS_LABEL[status]}
      </span>
    </div>
  )
}
