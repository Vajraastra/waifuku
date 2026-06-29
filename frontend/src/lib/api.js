const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}/api/v1${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Characters
  characters: {
    avatarUrl: (id)      => `${BASE}/api/v1/characters/${id}/avatar`,
    list: ()             => request('GET',    '/characters/'),
    get:  (id)           => request('GET',    `/characters/${id}`),
    create: (data)       => request('POST',   '/characters/', data),
    update: (id, data)   => request('PATCH',  `/characters/${id}`, data),
    delete: (id)         => request('DELETE', `/characters/${id}`),
    importPng: (file) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${BASE}/api/v1/characters/import/png`, { method: 'POST', body: form })
        .then(r => r.json())
    },
    importJson: (file) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${BASE}/api/v1/characters/import/json`, { method: 'POST', body: form })
        .then(r => r.json())
    },
    uploadAvatar: (id, file) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${BASE}/api/v1/characters/${id}/avatar`, { method: 'POST', body: form })
        .then(r => r.json())
    },
    toggleFavorite: (id) => request('POST', `/characters/${id}/toggle-favorite`),
  },

  // Personas
  personas: {
    avatarUrl: (id)     => `${BASE}/api/v1/personas/${id}/avatar`,
    list: ()            => request('GET',    '/personas/'),
    get:  (id)          => request('GET',    `/personas/${id}`),
    create: (data)      => request('POST',   '/personas/', data),
    update: (id, data)  => request('PATCH',  `/personas/${id}`, data),
    delete: (id)        => request('DELETE', `/personas/${id}`),
    setDefault: (id)    => request('POST',   `/personas/${id}/set-default`),
    uploadAvatar: (id, file) => {
      const form = new FormData()
      form.append('file', file)
      return fetch(`${BASE}/api/v1/personas/${id}/avatar`, { method: 'POST', body: form })
        .then(r => r.json())
    },
  },

  // Models
  models: {
    list: ({ provider, baseUrl, apiBase, apiKey } = {}) => {
      const params = new URLSearchParams()
      if (provider) params.set('provider', provider)
      if (baseUrl)  params.set('base_url', baseUrl)
      if (apiBase)  params.set('api_base', apiBase)
      if (apiKey)   params.set('api_key', apiKey)
      return request('GET', `/models/?${params}`)
    },
    test: ({ provider, model, baseUrl, apiBase, apiKey } = {}) =>
      request('POST', '/models/test', {
        provider,
        model,
        base_url: baseUrl ?? '',
        api_base: apiBase ?? '/v1',
        api_key:  apiKey  ?? '',
      }),

    // Instala un modelo en Ollama desde HF URL o ruta local.
    // onProgress(data) se llama por cada evento SSE recibido.
    install: ({ name, source, template, baseUrl } = {}, onProgress) => {
      return fetch(`${BASE}/api/v1/models/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, source, template: template ?? 'auto', base_url: baseUrl ?? '' }),
      }).then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }))
          throw new Error(err.detail ?? res.statusText)
        }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try { onProgress?.(JSON.parse(line.slice(6))) } catch {}
            }
          }
        }
      })
    },

    ps: ({ provider, baseUrl, apiBase, apiKey } = {}) => {
      const params = new URLSearchParams()
      if (provider) params.set('provider', provider)
      if (baseUrl)  params.set('base_url', baseUrl)
      if (apiBase)  params.set('api_base', apiBase)
      if (apiKey)   params.set('api_key', apiKey)
      return request('GET', `/models/ps?${params}`)
    },

    uninstall: ({ name, baseUrl } = {}) =>
      request('DELETE', '/models/uninstall', { name, base_url: baseUrl ?? '' }),

    purgeBlobs: () => request('POST', '/models/blobs/purge'),
    discover:   () => request('GET',  '/models/discover'),
  },

  // System hardware stats (RAM + GPU VRAM directamente del OS)
  system: {
    stats: () => request('GET', '/system/stats'),
  },

  // Backgrounds
  backgrounds: {
    url:  (filename) => `${BASE}/api/v1/backgrounds/${encodeURIComponent(filename)}`,
    list: ()         => request('GET', '/backgrounds/'),
  },

  // Chats
  chats: {
    list: (characterId) => request('GET', `/chats/${characterId ? `?character_id=${characterId}` : ''}`),
    get:  (id)          => request('GET',    `/chats/${id}`),
    create: (data)      => request('POST',   '/chats/', data),
    delete: (id)        => request('DELETE', `/chats/${id}`),
    messages: (id)      => request('GET',    `/chats/${id}/messages`),
    updateMessage: (chatId, msgId, content) =>
      request('PATCH', `/chats/${chatId}/messages/${msgId}`, { content }),
    deleteMessage: (chatId, msgId) =>
      request('DELETE', `/chats/${chatId}/messages/${msgId}`),
    addBookmark: (id, data)              => request('POST',   `/chats/${id}/bookmarks`, data),
    deleteBookmark: (chatId, bookmarkId) => request('DELETE', `/chats/${chatId}/bookmarks/${bookmarkId}`),
    setActiveItems: (chatId, itemIds)    => request('PATCH',  `/chats/${chatId}/active-items`, { item_ids: itemIds }),
  },

  // Items
  items: {
    list:   ()           => request('GET',    '/items/'),
    get:    (id)         => request('GET',    `/items/${id}`),
    create: (data)       => request('POST',   '/items/', data),
    update: (id, data)   => request('PATCH',  `/items/${id}`, data),
    delete: (id)         => request('DELETE', `/items/${id}`),
  },
}
