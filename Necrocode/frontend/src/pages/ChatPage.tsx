import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Image, Mic, Paperclip, Search, SendHorizontal } from 'lucide-react'
import { useLocation } from 'react-router-dom'

interface ChatPageProps {
  apiBase: string
  accessToken: string | null
  currentLogin: string
  onIncomingMessage: (fromLogin: string) => void
}

type ChatUser = {
  login: string
  displayName?: string
  avatarDataUrl?: string
}

type ChatMessage = {
  id: number
  type: 'incoming' | 'outgoing'
  text: string
  time: string
  from: string
  to: string
}

type WsPayload = {
  type: 'handshake' | 'message' | 'error'
  from?: string
  to?: string
  text?: string
  sentAt?: string
  message?: string
}

export function ChatPage({ apiBase, accessToken, currentLogin, onIncomingMessage }: ChatPageProps) {
  const [activeLogin, setActiveLogin] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([])
  const [messagesByLogin, setMessagesByLogin] = useState<Record<string, ChatMessage[]>>({})
  const [draft, setDraft] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const location = useLocation()

  const activeMessages = useMemo(() => {
    if (!activeLogin) return []
    return messagesByLogin[activeLogin] ?? []
  }, [activeLogin, messagesByLogin])

  useEffect(() => {
    if (!accessToken) return

    const apiUrl = new URL(apiBase, window.location.origin)
    const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${apiUrl.host}${apiUrl.pathname.replace(/\/$/, '')}/ws/chat?token=${encodeURIComponent(accessToken)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WsPayload
        if (payload.type === 'message' && payload.from && payload.to && payload.text) {
          const from = payload.from
          const time = payload.sentAt ? new Date(payload.sentAt) : new Date()
          const formatted = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

          setMessagesByLogin((prev) => {
            const next = { ...prev }
            const list = next[from] ? [...next[from]] : []
            list.push({
              id: Date.now(),
              type: 'incoming',
              text: payload.text ?? '',
              time: formatted,
              from: from,
              to: payload.to ?? ''
            })
            next[from] = list
            return next
          })

          setChatUsers((prev) => {
            if (prev.some((u) => u.login === from)) return prev
            return [{ login: from }, ...prev]
          })

          onIncomingMessage(from)
        }
      } catch {
        // ignore malformed messages
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [accessToken, apiBase, onIncomingMessage])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const login = params.get('user')
    if (!login || login === currentLogin) return

    const openFromQuery = async () => {
      try {
        const res = await fetch(`${apiBase}/users/search?q=${encodeURIComponent(login)}`, { credentials: 'include' })
        if (!res.ok) {
          openChat({ login })
          return
        }
        const data = (await res.json()) as { users?: ChatUser[] }
        const found = data.users?.find((u) => u.login === login)
        if (found) {
          openChat(found)
          return
        }
        openChat({ login })
      } catch {
        openChat({ login })
      }
    }

    void openFromQuery()
  }, [apiBase, currentLogin, location.search])

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query) {
      setSearchResults([])
      return
    }

    let isActive = true
    const controller = new AbortController()

    const run = async () => {
      try {
        const res = await fetch(`${apiBase}/users/search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
          signal: controller.signal
        })
        if (!res.ok) return
        const data = (await res.json()) as { users?: Array<{ login: string; displayName?: string; avatarDataUrl?: string }> }
        if (!isActive) return
        setSearchResults(
          (data.users ?? []).map((user) => ({
            login: user.login,
            displayName: user.displayName,
            avatarDataUrl: user.avatarDataUrl
          }))
        )
      } catch {
        if (isActive) setSearchResults([])
      }
    }

    void run()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [apiBase, searchQuery])

  const openChat = (user: ChatUser) => {
    if (!user.login) return
    setActiveLogin(user.login)
    setChatUsers((prev) => {
      if (prev.some((entry) => entry.login === user.login)) return prev
      return [user, ...prev]
    })
  }

  const handleSend = () => {
    if (!activeLogin || !draft.trim()) return
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    const text = draft.trim()
    const outgoing: WsPayload = { type: 'message', to: activeLogin, text }
    socket.send(JSON.stringify(outgoing))

    const now = new Date()
    const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setMessagesByLogin((prev) => {
      const next = { ...prev }
      const list = next[activeLogin] ? [...next[activeLogin]] : []
      list.push({
        id: Date.now(),
        type: 'outgoing',
        text,
        time: formatted,
        from: currentLogin,
        to: activeLogin
      })
      next[activeLogin] = list
      return next
    })

    setDraft('')
  }

  return (
    <motion.section
      key="chat"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-auto max-w-6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 min-h-[72vh]">
        <aside className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm min-h-[72vh]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-gray-900">Чаты</h2>
            <span className="text-xs font-bold text-gray-500">{chatUsers.length} диалогов</span>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по логину"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-black"
            />
          </div>
          {searchQuery && (
            <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Результаты</p>
              {searchResults.length === 0 ? (
                <p className="text-xs text-gray-400">Ничего не найдено.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => {
                    const isSelf = !!currentLogin && user.login === currentLogin
                    return (
                      <div key={user.login} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center text-xs font-bold text-gray-500">
                            {user.avatarDataUrl ? (
                              <img src={user.avatarDataUrl} alt={user.login} className="h-full w-full object-cover" />
                            ) : (
                              (user.login[0] ?? 'U').toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{user.displayName || user.login}</p>
                            <p className="text-[10px] text-gray-400 truncate">@{user.login}{isSelf ? ' • Вы' : ''}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openChat(user)}
                          disabled={isSelf}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-600 hover:border-gray-300 disabled:opacity-60"
                        >
                          Написать
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {chatUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-gray-500">Пока нет диалогов</p>
              <p className="mt-2 text-xs text-gray-400">Найдите пользователя по логину, чтобы начать переписку.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chatUsers.map((user) => {
                const list = messagesByLogin[user.login] ?? []
                const last = list[list.length - 1]
                return (
                  <button
                    key={user.login}
                    type="button"
                    onClick={() => setActiveLogin(user.login)}
                    className={`w-full rounded-2xl border p-3 text-left transition-all ${
                      activeLogin === user.login
                        ? 'border-black bg-gray-900 text-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className={`text-sm font-extrabold truncate ${activeLogin === user.login ? 'text-white' : 'text-gray-900'}`}>
                          {user.displayName || user.login}
                        </p>
                        <p className={`mt-1 text-xs truncate ${activeLogin === user.login ? 'text-white/70' : 'text-gray-500'}`}>
                          {last?.text ?? 'Нет сообщений'}
                        </p>
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold ${activeLogin === user.login ? 'text-white/70' : 'text-gray-400'}`}>
                          {last?.time ?? ''}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden min-h-[72vh]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-gray-900 truncate">
                {activeLogin ? `Чат с @${activeLogin}` : 'Выберите чат'}
              </h3>
              <p className="text-xs font-semibold text-gray-500">
                {activeLogin ? 'Сообщения между покупателем и продавцом.' : 'Диалог откроется после выбора слева.'}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 bg-gray-100">
            {activeMessages.length === 0 ? (
              <div className="h-full rounded-2xl border border-dashed border-gray-200 bg-gray-100 p-6 text-center text-sm text-gray-500 flex items-center justify-center">
                Сообщений пока нет.
              </div>
            ) : (
              activeMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      message.type === 'outgoing'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="leading-relaxed break-words whitespace-pre-wrap">{message.text}</p>
                    <div className={`mt-2 text-[10px] font-semibold ${
                      message.type === 'outgoing' ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {message.time}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {activeLogin && (
            <div className="border-t border-gray-100 bg-white px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-gray-500 hover:text-black">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-gray-500 hover:text-black">
                  <Image className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-gray-500 hover:text-black">
                  <Mic className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  placeholder="Напишите сообщение..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend()
                  }}
                  className="flex-1 min-w-[180px] rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-900"
                >
                  <SendHorizontal className="h-4 w-4" />
                  Отправить
                </button>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                История чата хранится для участников сделки.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}
