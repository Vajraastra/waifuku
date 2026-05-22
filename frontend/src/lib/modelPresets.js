/**
 * Presets de inferencia y sugerencias optimizadas por familia de modelo.
 *
 * Campos por hint:
 *   temperature, topP, topK, maxTokens, repeatPenalty — parámetros de sampling
 *   thinking — true si el modelo soporta y se beneficia de thinking mode
 *   template — identificador del chat template que usa el modelo
 *   note — explicación para el usuario
 */

/* ── Templates de chat ────────────────────────────────────────────────────── */
export const CHAT_TEMPLATES = {
  gemma: {
    id: 'gemma',
    label: 'Gemma',
    description: 'Google Gemma 1/2/4',
    example: '<start_of_turn>user\n{mensaje}<end_of_turn>\n<start_of_turn>model\n',
    note: 'Ollama lo aplica automáticamente. Necesario en endpoints raw.',
  },
  llama3: {
    id: 'llama3',
    label: 'LLaMA 3',
    description: 'Meta LLaMA 3.x',
    example: '<|begin_of_text|><|start_header_id|>{rol}<|end_header_id|>\n\n{contenido}<|eot_id|>',
    note: 'Ollama lo aplica automáticamente.',
  },
  llama2: {
    id: 'llama2',
    label: 'LLaMA 2 / Vicuna',
    description: 'Meta LLaMA 2, Vicuna, Alpaca',
    example: '[INST] <<SYS>>\n{sistema}\n<</SYS>>\n\n{mensaje} [/INST]',
    note: 'Generación anterior. Ollama lo aplica automáticamente.',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral v1',
    description: 'Mistral 7B, Mixtral',
    example: '[INST] {mensaje} [/INST]',
    note: 'Sin bloque de sistema nativo — usar [INST] para instrucciones.',
  },
  chatml: {
    id: 'chatml',
    label: 'ChatML',
    description: 'Qwen, Phi, Hermes, OpenHermes',
    example: '<|im_start|>{rol}\n{contenido}<|im_end|>',
    note: 'Formato estándar moderno. Ampliamente compatible.',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek v2/v3, Coder',
    example: '<|begin▁of▁sentence|><|{rol}|>\n{contenido}<|end▁of▁sentence|>',
    note: 'Tokens especiales UTF. Ollama lo gestiona automáticamente.',
  },
  deepseek_r1: {
    id: 'deepseek_r1',
    label: 'DeepSeek R1 (Thinking)',
    description: 'DeepSeek-R1, QwQ, QvQ',
    example: '<|begin▁of▁sentence|><|User|>\n{mensaje}<|end▁of▁sentence|><|Assistant|><think>\n{razonamiento}</think>\n{respuesta}',
    note: 'Produce tokens <think>...</think> de razonamiento antes de responder.',
  },
  command_r: {
    id: 'command_r',
    label: 'Command-R',
    description: 'Cohere Command-R, Command-R+',
    example: '<BOS><|START_OF_TURN_TOKEN|><|USER_TOKEN|>{mensaje}<|END_OF_TURN_TOKEN|><|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>',
    note: 'Diseñado para RAG. Ollama lo gestiona automáticamente.',
  },
}

/* ── Presets generales ────────────────────────────────────────────────────── */
export const PRESETS = [
  {
    id: 'preciso',
    label: 'Preciso',
    icon: '◎',
    desc: 'Respuestas factuales y deterministas',
    temperature: 0.30, topP: 0.85, topK: 40,  maxTokens: 1024,  repeatPenalty: 1.0,
  },
  {
    id: 'balanceado',
    label: 'Balanceado',
    icon: '◈',
    desc: 'Punto de partida ideal para uso general',
    temperature: 0.70, topP: 0.90, topK: -1,  maxTokens: 2048,  repeatPenalty: 1.0,
  },
  {
    id: 'roleplay',
    label: 'Roleplay',
    icon: '◇',
    desc: 'Narrativa fluida, expresivo y coherente',
    temperature: 0.90, topP: 0.95, topK: -1,  maxTokens: 3072,  repeatPenalty: 1.05,
  },
  {
    id: 'creativo',
    label: 'Creativo',
    icon: '◆',
    desc: 'Escritura libre, ideas originales e inesperadas',
    temperature: 1.10, topP: 0.95, topK: -1,  maxTokens: 2048,  repeatPenalty: 1.0,
  },
  {
    id: 'codigo',
    label: 'Código',
    icon: '⟨⟩',
    desc: 'Generación de código precisa y reproducible',
    temperature: 0.20, topP: 0.90, topK: 40,  maxTokens: 4096,  repeatPenalty: 1.0,
  },
  {
    id: 'rapido',
    label: 'Rápido',
    icon: '›',
    desc: 'Respuestas cortas, menor latencia',
    temperature: 0.70, topP: 0.90, topK: -1,  maxTokens: 512,   repeatPenalty: 1.0,
  },
]

/* ── Sugerencias por familia de modelo ────────────────────────────────────── */
// Primera coincidencia gana — orden importa (más específico primero).
const MODEL_HINTS = [

  // ── Gemma 4 ─────────────────────────────────────────────────────────────
  // Versión "thinking" / instrucción oficial con thinking habilitado
  {
    match: ['gemma4', 'gemma-4', 'gemma4:'],
    label: 'Gemma 4',
    template: 'gemma',
    supportsThinking: true,
    thinking: false,             // desactivado por default; usuario puede habilitar
    temperature: 1.00,           // Google recomienda 1.0 para Gemma 4
    topP: 0.95,
    topK: 64,                    // CRÍTICO para Gemma 4 — sin esto genera loops
    maxTokens: 4096,
    repeatPenalty: 1.05,         // Gemma 4 tiende a repetición; 1.05 mínimo
    note: 'top_k: 64 es obligatorio en Gemma 4 — sin él el modelo entra en bucles. ' +
          'Temperature 1.0 es el default oficial de Google. ' +
          'Variantes uncensored/finetuned: reducir temperature a 0.85–0.90 para mayor estabilidad. ' +
          'Soporta thinking mode — actívalo para razonamiento extendido.',
  },

  // ── Gemma 2 ─────────────────────────────────────────────────────────────
  {
    match: ['gemma2', 'gemma-2', 'gemma2:'],
    label: 'Gemma 2',
    template: 'gemma',
    supportsThinking: false,
    thinking: false,
    temperature: 0.90,
    topP: 0.95,
    topK: 64,                    // recomendado también para Gemma 2
    maxTokens: 2048,
    repeatPenalty: 1.05,
    note: 'top_k: 64 recomendado. Temperature 0.9 — más estable que Gemma 4. ' +
          'Gemma 2 no soporta thinking mode.',
  },

  // ── Gemma 1 (legacy) ────────────────────────────────────────────────────
  {
    match: ['gemma:'],
    label: 'Gemma 1',
    template: 'gemma',
    supportsThinking: false,
    thinking: false,
    temperature: 0.80,
    topP: 0.90,
    topK: 40,
    maxTokens: 2048,
    repeatPenalty: 1.0,
    note: 'Generación original. Menor capacidad que Gemma 2/4.',
  },

  // ── Reasoning / CoT (DeepSeek R1, QwQ, QvQ) ─────────────────────────────
  {
    match: ['deepseek-r1', 'qwq', 'qvq', 'r1-'],
    label: 'Reasoning (CoT)',
    template: 'deepseek_r1',
    supportsThinking: true,
    thinking: true,              // activado por default — es la razón de ser de estos modelos
    temperature: 0.60,
    topP: 0.90,
    topK: 40,
    maxTokens: 8192,
    repeatPenalty: 1.0,
    note: 'Modelos de cadena de pensamiento. Thinking activado por default. ' +
          'Temperature baja para coherencia en cadenas largas. ' +
          'max_tokens alto — el razonamiento interno consume muchos tokens.',
  },

  // ── DeepSeek Coder ──────────────────────────────────────────────────────
  {
    match: ['deepseek-coder', 'deepseek-v2-coder'],
    label: 'DeepSeek Coder',
    template: 'deepseek',
    supportsThinking: false,
    thinking: false,
    temperature: 0.20,
    topP: 0.90,
    topK: 40,
    maxTokens: 4096,
    repeatPenalty: 1.0,
    note: 'Especializado en código. Temperature mínima para reproducibilidad.',
  },

  // ── DeepSeek v2/v3 (chat) ───────────────────────────────────────────────
  {
    match: ['deepseek-v3', 'deepseek-v2', 'deepseek-chat', 'deepseek'],
    label: 'DeepSeek',
    template: 'deepseek',
    supportsThinking: false,
    thinking: false,
    temperature: 0.60,
    topP: 0.90,
    topK: -1,
    maxTokens: 4096,
    repeatPenalty: 1.0,
    note: 'Balance sólido entre precisión y creatividad. Contexto largo nativo.',
  },

  // ── Código — general ────────────────────────────────────────────────────
  {
    match: ['codellama', 'codegemma', 'starcoder', 'granite-code', 'qwen2.5-coder', 'yi-coder'],
    label: 'Code model',
    template: 'chatml',
    supportsThinking: false,
    thinking: false,
    temperature: 0.20,
    topP: 0.90,
    topK: 40,
    maxTokens: 4096,
    repeatPenalty: 1.0,
    note: 'Modelo especializado en código. Temperature mínima.',
  },

  // ── Dolphin / Hermes / RP-finetuned ─────────────────────────────────────
  {
    match: ['dolphin', 'hermes', 'openhermes', 'nous-hermes', 'wizardlm', 'wizard-vicuna', 'nous'],
    label: 'Roleplay / Finetuned',
    template: 'chatml',
    supportsThinking: false,
    thinking: false,
    temperature: 1.00,
    topP: 0.95,
    topK: -1,
    maxTokens: 3072,
    repeatPenalty: 1.05,
    note: 'Finetuning conversacional — temperatura alta para expresividad. ' +
          'Ideal para RP. repeat_penalty 1.05 para evitar loops.',
  },

  // ── Qwen 2.5 ────────────────────────────────────────────────────────────
  {
    match: ['qwen2.5', 'qwen-2.5'],
    label: 'Qwen 2.5',
    template: 'chatml',
    supportsThinking: false,
    thinking: false,
    temperature: 0.70,
    topP: 0.80,
    topK: -1,
    maxTokens: 8192,
    repeatPenalty: 1.0,
    note: 'Contexto largo nativo (128K). top_p conservador para coherencia en salidas largas.',
  },

  // ── Qwen 2 / Qwen legacy ─────────────────────────────────────────────────
  {
    match: ['qwen2', 'qwen'],
    label: 'Qwen',
    template: 'chatml',
    supportsThinking: false,
    thinking: false,
    temperature: 0.70,
    topP: 0.80,
    topK: -1,
    maxTokens: 4096,
    repeatPenalty: 1.0,
    note: 'Top_p conservador — mejora coherencia en textos largos.',
  },

  // ── Phi 4 ───────────────────────────────────────────────────────────────
  {
    match: ['phi4', 'phi-4'],
    label: 'Phi 4',
    template: 'chatml',
    supportsThinking: false,
    thinking: false,
    temperature: 0.65,
    topP: 0.90,
    topK: -1,
    maxTokens: 4096,
    repeatPenalty: 1.0,
    note: 'Modelo compacto de alto rendimiento. Temperature moderada-baja.',
  },

  // ── Phi 3 ───────────────────────────────────────────────────────────────
  {
    match: ['phi3', 'phi-3', 'phi3.5', 'phi-3.5'],
    label: 'Phi 3',
    template: 'chatml',
    supportsThinking: false,
    thinking: false,
    temperature: 0.60,
    topP: 0.90,
    topK: -1,
    maxTokens: 2048,
    repeatPenalty: 1.0,
    note: 'Modelo pequeño y preciso. Temperature baja maximiza coherencia.',
  },

  // ── Mistral / Mixtral ────────────────────────────────────────────────────
  {
    match: ['mixtral', 'mistral-nemo', 'mistral-large', 'mistral-small', 'mistral'],
    label: 'Mistral / Mixtral',
    template: 'mistral',
    supportsThinking: false,
    thinking: false,
    temperature: 0.70,
    topP: 0.95,
    topK: -1,
    maxTokens: 2048,
    repeatPenalty: 1.0,
    note: 'Excelente instruction-following. top_p alto para diversidad. ' +
          'Template sin bloque de sistema nativo.',
  },

  // ── LLaMA 3.x ────────────────────────────────────────────────────────────
  {
    match: ['llama3.3', 'llama3.2', 'llama3.1', 'llama3', 'llama-3', 'meta-llama-3'],
    label: 'LLaMA 3',
    template: 'llama3',
    supportsThinking: false,
    thinking: false,
    temperature: 0.80,
    topP: 0.90,
    topK: -1,
    maxTokens: 2048,
    repeatPenalty: 1.0,
    note: 'Versátil y estable. Preset balanceado con sesgo a creatividad.',
  },

  // ── LLaMA 2 (legacy) ─────────────────────────────────────────────────────
  {
    match: ['llama2', 'llama-2'],
    label: 'LLaMA 2',
    template: 'llama2',
    supportsThinking: false,
    thinking: false,
    temperature: 0.70,
    topP: 0.90,
    topK: -1,
    maxTokens: 2048,
    repeatPenalty: 1.0,
    note: 'Generación anterior. Temperature ligeramente más baja recomendada.',
  },

  // ── Command-R (Cohere) ───────────────────────────────────────────────────
  {
    match: ['command-r', 'command'],
    label: 'Command-R',
    template: 'command_r',
    supportsThinking: false,
    thinking: false,
    temperature: 0.70,
    topP: 0.90,
    topK: -1,
    maxTokens: 4096,
    repeatPenalty: 1.0,
    note: 'Optimizado para RAG y seguimiento de instrucciones largas.',
  },

  // ── Yi ────────────────────────────────────────────────────────────────────
  {
    match: ['yi-'],
    label: 'Yi',
    template: 'chatml',
    supportsThinking: false,
    thinking: false,
    temperature: 0.80,
    topP: 0.90,
    topK: -1,
    maxTokens: 4096,
    repeatPenalty: 1.0,
    note: 'Contexto largo nativo. Balance sólido.',
  },

  // ── Solar / Upstage ──────────────────────────────────────────────────────
  {
    match: ['solar'],
    label: 'Solar',
    template: 'llama2',
    supportsThinking: false,
    thinking: false,
    temperature: 0.80,
    topP: 0.90,
    topK: -1,
    maxTokens: 2048,
    repeatPenalty: 1.0,
    note: 'Basado en arquitectura LLaMA 2. Template compatible.',
  },

  // ── Vicuna / Alpaca / StableLM / legacy ──────────────────────────────────
  {
    match: ['vicuna', 'alpaca', 'stablelm', 'neural-chat'],
    label: 'Instruction-tuned (legacy)',
    template: 'llama2',
    supportsThinking: false,
    thinking: false,
    temperature: 0.90,
    topP: 0.95,
    topK: -1,
    maxTokens: 2048,
    repeatPenalty: 1.0,
    note: 'Finetuning de instrucción sobre LLaMA 2. Temperature media-alta.',
  },
]

/**
 * Dado un nombre de modelo, retorna la sugerencia de configuración o null.
 */
export function getModelHint(modelName) {
  if (!modelName) return null
  const lower = modelName.toLowerCase()
  for (const hint of MODEL_HINTS) {
    if (hint.match.some(k => lower.includes(k))) {
      return hint
    }
  }
  return null
}
