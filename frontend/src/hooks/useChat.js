import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '../store/chatStore'
import { useConfigStore } from '../store/configStore'
import { api } from '../lib/api'

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

const STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING:   'connecting',
  CONNECTED:    'connected',
  ERROR:        'error',
}

export function useChat(chatId) {
  const ws        = useRef(null)
  const statusRef = useRef(STATUS.DISCONNECTED)

  const {
    messages, setMessages,
    appendMessage, appendToken, popLastMessage,
    isPending, isStreaming, streamingContent,
    setPending, setStreaming, resetStreaming,
  } = useChatStore()

  const config = useConfigStore()

  // ── Conexión ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!chatId) return

    statusRef.current = STATUS.CONNECTING
    const socket = new WebSocket(`${WS_BASE}/ws/chat/${chatId}`)
    ws.current = socket

    socket.onopen = () => {
      statusRef.current = STATUS.CONNECTED
      // Keepalive cada 25s
      socket._ping = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN)
          socket.send(JSON.stringify({ type: 'ping' }))
      }, 25_000)
    }

    socket.onmessage = (event) => {
      let msg
      try { msg = JSON.parse(event.data) } catch { return }
      _handleMessage(msg)
    }

    socket.onerror = () => {
      statusRef.current = STATUS.ERROR
    }

    socket.onclose = () => {
      clearInterval(socket._ping)
      statusRef.current = STATUS.DISCONNECTED
    }

    return () => {
      clearInterval(socket._ping)
      socket.close()
    }
  }, [chatId])

  // ── Manejador de mensajes del servidor ────────────────────────────────────

  function _handleMessage(msg) {
    switch (msg.type) {
      case 'user_message':
        appendMessage({
          id:        msg.message_id,
          role:      'user',
          content:   msg.content,
          swipes:    [],
          timestamp: new Date().toISOString(),
        })
        break

      case 'token':
        if (!isStreaming) { setPending(false); setStreaming(true) }
        appendToken(msg.content)
        break

      case 'done':
        // Consolida el mensaje completo del asistente
        appendMessage({
          id:        msg.message_id,
          role:      'assistant',
          content:   msg.full_content,
          swipes:    [],
          timestamp: new Date().toISOString(),
        })
        resetStreaming()
        break

      case 'error':
        console.error('[Waifuku WS]', msg.message)
        resetStreaming()   // incluye setPending(false)
        break

      case 'pong':
        break
    }
  }

  // ── API pública del hook ───────────────────────────────────────────────────

  const sendMessage = useCallback((content) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.warn('[Waifuku WS] No conectado')
      return
    }
    if (isStreaming) {
      console.warn('[Waifuku WS] Ya hay una generación en curso')
      return
    }

    const providerConfig = {
      provider:       config.provider,
      model:          config.model,
      base_url:       config.baseUrl,
      api_base:       config.apiBase ?? '/v1',
      api_key:        config.apiKey,
      temperature:    config.temperature,
      max_tokens:     config.maxTokens,
      top_p:          config.topP,
      top_k:          config.topK,
      repeat_penalty: config.repeatPenalty,
      thinking:       config.thinking,
      num_ctx:        config.numCtx ?? 0,
    }

    setPending(true)
    ws.current.send(JSON.stringify({
      type:    'generate',
      chat_id: chatId,
      content,
      config:  providerConfig,
    }))
  }, [chatId, isStreaming, config])

  const regenerate = useCallback(async () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return
    if (isStreaming || isPending) return

    // Busca el último mensaje del asistente para borrarlo
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (!lastAssistant) return

    try {
      await api.chats.deleteMessage(chatId, lastAssistant.id)
    } catch (e) {
      console.error('[Waifuku] Error al borrar último mensaje:', e)
      return
    }
    popLastMessage()

    setPending(true)
    ws.current.send(JSON.stringify({
      type:   'regenerate',
      chat_id: chatId,
      config: {
        provider:       config.provider,
        model:          config.model,
        base_url:       config.baseUrl,
        api_base:       config.apiBase ?? '/v1',
        api_key:        config.apiKey,
        temperature:    config.temperature,
        max_tokens:     config.maxTokens,
        top_p:          config.topP,
        top_k:          config.topK,
        repeat_penalty: config.repeatPenalty,
        thinking:       config.thinking,
        num_ctx:        config.numCtx ?? 0,
      },
    }))
  }, [chatId, isStreaming, isPending, messages, config])

  const loadHistory = useCallback(async (fetchedMessages) => {
    setMessages(fetchedMessages)
  }, [])

  return {
    messages,
    isPending,
    isStreaming,
    streamingContent,
    sendMessage,
    regenerate,
    loadHistory,
    wsStatus: statusRef.current,
  }
}
