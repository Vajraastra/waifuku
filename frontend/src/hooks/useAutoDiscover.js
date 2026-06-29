import { useEffect, useRef } from 'react'
import { useConfigStore } from '../store/configStore'
import { api } from '../lib/api'
import { profileFromDiscovery } from '../lib/serverProfiles'

const strip = (u) => (u || '').replace(/\/+$/, '')

/**
 * Autodescubrir al arrancar Waifuku: si el usuario tiene un servidor LLM en línea,
 * se asume que lo usará → se autoconecta para que el estado aparezca "en línea" de
 * entrada y el usuario solo deba elegir/afinar el modelo.
 *
 * Política (respetuosa con la elección previa):
 *   1. Si el último servidor usado sigue vivo → se mantiene tal cual (no se pisa nada).
 *   2. Si no (el último cayó, o es la primera vez) → se conecta a cualquiera de los vivos
 *      (el primero que devuelva el discover). El usuario ve a cuál se conectó y, si no es el
 *      que quiere, lo cambia a mano.
 *   3. Si no hay ningún servidor vivo → no hacer nada (el usuario configura a mano).
 *
 * El "último usado" es el `baseUrl` guardado en el configStore (se persiste al conectar;
 * vacío si el usuario nunca conectó).
 *
 * Corre una sola vez por carga de la app.
 */
export function useAutoDiscover() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    ;(async () => {
      try {
        const { servers = [] } = await api.models.discover()
        if (!servers.length) return

        const state = useConfigStore.getState()

        // 1. ¿El último servidor usado sigue vivo? Entonces lo mantenemos (no pisamos nada).
        const lastUrl = strip(state.baseUrl)
        if (lastUrl && servers.some(s => strip(s.url) === lastUrl)) return

        // 2. Último usado caído o inexistente → conectar a cualquiera (el primero vivo).
        const preferred = servers[0]

        const profile   = profileFromDiscovery(preferred)
        const models     = preferred.models ?? []
        // Conservar el modelo actual si existe en este servidor; si no, tomar el primero.
        const nextModel  = models.includes(state.model) ? state.model : (models[0] ?? state.model)

        state.setConfig({
          serverProfileId: profile.id,
          provider:        profile.type,
          baseUrl:         preferred.url,
          apiBase:         profile.apiBase,
          model:           nextModel,
        })
      } catch {
        // Silencioso: si el backend o el discover no responden, el usuario configura a mano.
      }
    })()
  }, [])
}
