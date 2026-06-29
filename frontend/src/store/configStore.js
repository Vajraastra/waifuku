import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Migrar config del key viejo (ruby-config) si waifuku-config aún no existe
;(function migrateConfig() {
  if (!localStorage.getItem('waifuku-config') && localStorage.getItem('ruby-config')) {
    localStorage.setItem('waifuku-config', localStorage.getItem('ruby-config'))
    localStorage.removeItem('ruby-config')
  }
})()

export const useConfigStore = create(
  persist(
    (set) => ({
      // Perfil de servidor activo
      serverProfileId: 'ollama',   // id de SERVER_PROFILES
      provider: 'ollama',          // 'ollama' | 'openai_compat'
      baseUrl: '',                  // host del servidor, ej. 'http://localhost:1234'
      apiBase: '',                  // prefijo de ruta API, ej. '/v1' para openai_compat
      model: 'llama3.2',
      apiKey: '',
      temperature: 0.8,
      maxTokens: 1024,
      topP: 0.9,
      topK: -1,             // -1 = default del modelo
      repeatPenalty: 1.0,
      thinking: false,

      setConfig: (partial) => set(partial),

      // Escena VN
      sceneBackground: 'bedroom_night.jpg',
      chatOpacity: 0.85,
      chatFontSize: 0.88,

      // Sprite — transparencia chroma key
      chromaKeyEnabled:   false,
      chromaKeyColor:     '#ffffff',  // color a eliminar (blanco por defecto)
      chromaKeyThreshold: 30,         // tolerancia 0-255

      // Contexto y HUD de stats
      numCtx: 0,           // 0 = default del modelo; >0 = valor explícito
      autoNumCtx: false,   // calcular num_ctx automáticamente según VRAM
      showLLMStats: false, // mostrar overlay HUD en VNScene

      // Personaje y persona activos (selección global)
      activeCharacterId: null,
      activePersonaId: null,
      setActiveCharacter: (id) => set({ activeCharacterId: id }),
      setActivePersona:  (id) => set({ activePersonaId: id }),

      // Herramientas agénticas activas
      activeTools: {
        web_search:    false,
        url_reader:    false,
        image_search:  false,
        vision_filter: false,
      },
      setActiveTool: (tool, enabled) => set(state => ({
        activeTools: { ...state.activeTools, [tool]: enabled },
      })),

      getProviderConfig: (state) => ({
        provider:       state.provider,
        model:          state.model,
        base_url:       state.baseUrl,
        api_base:       state.apiBase,
        api_key:        state.apiKey,
        temperature:    state.temperature,
        max_tokens:     state.maxTokens,
        top_p:          state.topP,
        top_k:          state.topK,
        repeat_penalty: state.repeatPenalty,
        thinking:       state.thinking,
      }),
    }),
    { name: 'waifuku-config' }
  )
)
