/**
 * Perfiles de servidores LLM conocidos.
 * Cada perfil define cómo construir las URLs de la API.
 *
 * URL completa de inferencia: {host}{apiBase}/chat/completions
 * URL de lista de modelos:    {host}{apiBase}/models
 */
export const SERVER_PROFILES = [
  {
    id:          'ollama',
    name:        'Ollama',
    type:        'ollama',
    defaultHost: 'http://localhost:11434',
    apiBase:     '',
    icon:        '🦙',
    desc:        'Servidor local Ollama',
    probePort:   11434,
  },
  {
    id:          'lm-studio',
    name:        'LM Studio',
    type:        'openai_compat',
    defaultHost: 'http://localhost:1234',
    apiBase:     '/v1',
    icon:        '🎛',
    desc:        'LM Studio local',
    probePort:   1234,
  },
  {
    id:          'jan',
    name:        'Jan',
    type:        'openai_compat',
    defaultHost: 'http://localhost:1337',
    apiBase:     '/v1',
    icon:        '🪐',
    desc:        'Jan AI local',
    probePort:   1337,
  },
  {
    id:          'llama-cpp',
    name:        'llama.cpp',
    type:        'openai_compat',
    defaultHost: 'http://localhost:8080',
    apiBase:     '/v1',
    icon:        '⚡',
    desc:        'llama.cpp / LocalAI',
    probePort:   8080,
  },
  {
    id:          'textgen-webui',
    name:        'Text Gen WebUI',
    type:        'openai_compat',
    defaultHost: 'http://localhost:5000',
    apiBase:     '/v1',
    icon:        '🌐',
    desc:        'oobabooga WebUI',
    probePort:   5000,
  },
  {
    id:          'koboldcpp',
    name:        'Kobold.cpp',
    type:        'openai_compat',
    defaultHost: 'http://localhost:5001',
    apiBase:     '/v1',
    icon:        '🐉',
    desc:        'KoboldCpp local',
    probePort:   5001,
  },
  {
    id:          'vllm',
    name:        'vLLM',
    type:        'openai_compat',
    defaultHost: 'http://localhost:8000',
    apiBase:     '/v1',
    icon:        '🚀',
    desc:        'vLLM inference server',
    probePort:   8000,
  },
  {
    id:          'gpt4all',
    name:        'GPT4All',
    type:        'openai_compat',
    defaultHost: 'http://localhost:4891',
    apiBase:     '/v1',
    icon:        '🤖',
    desc:        'GPT4All servidor',
    probePort:   4891,
  },
  {
    id:          'custom',
    name:        'Personalizado',
    type:        'openai_compat',
    defaultHost: '',
    apiBase:     '/v1',
    icon:        '⚙',
    desc:        'OpenAI-compat personalizado',
    probePort:   null,
  },
]

/** Busca el perfil que mejor coincide con un servidor descubierto por autodetect. */
export function profileFromDiscovery(srv) {
  if (srv.type === 'ollama') return SERVER_PROFILES.find(p => p.id === 'ollama')
  const portMatch = SERVER_PROFILES.find(
    p => p.probePort && srv.url.includes(`:${p.probePort}`)
  )
  return portMatch ?? SERVER_PROFILES.find(p => p.id === 'custom')
}

export function getProfileById(id) {
  return SERVER_PROFILES.find(p => p.id === id) ?? SERVER_PROFILES.find(p => p.id === 'custom')
}
