import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  // Chat activo
  activeChatId: null,
  setActiveChatId: (id) => set({ activeChatId: id }),

  // Mensajes en memoria (sincronizados desde el WS / REST)
  messages: [],
  setMessages: (messages) => set({ messages }),
  appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, content) =>
    set((s) => ({
      messages: s.messages.map(m => m.id === id ? { ...m, content } : m),
    })),
  removeMessage: (id) =>
    set((s) => ({ messages: s.messages.filter(m => m.id !== id) })),
  popLastMessage: () =>
    set((s) => ({ messages: s.messages.slice(0, -1) })),
  updateLastAssistantMessage: (content) =>
    set((s) => {
      const msgs = [...s.messages]
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], content }
          break
        }
      }
      return { messages: msgs }
    }),

  // Estado de streaming / pending
  isPending:       false,
  isStreaming:     false,
  streamingContent: '',
  setPending:  (v) => set({ isPending: v }),
  setStreaming: (v) => set({ isStreaming: v }),
  appendToken: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),
  resetStreaming: () => set({ isPending: false, isStreaming: false, streamingContent: '' }),
}))
