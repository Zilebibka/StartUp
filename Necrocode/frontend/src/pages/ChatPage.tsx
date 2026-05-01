import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { Image, Mic, Paperclip, Search, SendHorizontal } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

interface ChatPageProps {
  apiBase: string
  accessToken: string | null
  currentLogin: string
  onIncomingMessage: (fromLogin: string) => void
  onActiveChatChange?: (login: string) => void
}

type ChatUser = {
  chatId?: string
  login: string
  displayName?: string
  avatarDataUrl?: string
  lastMessage?: ChatMessage
}

type ChatAttachment = {
  id: number
  kind: 'image' | 'file' | 'voice'
  fileName: string
  mime: string
  sizeBytes: number
}

type ChatMessage = {
  id: number
  type: 'incoming' | 'outgoing'
  text: string
  time: string
  from: string
  to: string
  attachment?: ChatAttachment
  clientId?: string
  editedAt?: string
  deletedAt?: string
  pending?: boolean
}

type WsPayload = {
  type: 'handshake' | 'message' | 'edit' | 'delete' | 'error'
  id?: number
  from?: string
  to?: string
  text?: string
  sentAt?: string
  editedAt?: string
  deletedAt?: string
  message?: string
  attachment?: ChatAttachment
  clientId?: string
}

type VoiceWaveformProps = {
  src: string
  color: string
}

const VoiceWaveform = ({ src, color }: VoiceWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let isActive = true
    let audioContext: AudioContext | null = null

    const draw = async () => {
      try {
        const res = await fetch(src)
        if (!res.ok) return
        const buffer = await res.arrayBuffer()
        audioContext = new AudioContext()
        const audioBuffer = await audioContext.decodeAudioData(buffer)
        if (!isActive) return

        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const width = canvas.width
        const height = canvas.height
        const data = audioBuffer.getChannelData(0)
        const step = Math.max(1, Math.floor(data.length / width))

        ctx.clearRect(0, 0, width, height)

        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()

        for (let i = 0; i < width; i += 1) {
          const start = i * step
          let min = 1
          let max = -1
          for (let j = 0; j < step; j += 1) {
            const value = data[start + j]
            if (value < min) min = value
            if (value > max) max = value
          }
          const y1 = ((1 - max) / 2) * height
          const y2 = ((1 - min) / 2) * height
          ctx.moveTo(i + 0.5, y1)
          ctx.lineTo(i + 0.5, y2)
        }

        ctx.stroke()
      } catch {
        // ignore waveform errors
      }
    }

    void draw()

    return () => {
      isActive = false
      if (audioContext) {
        audioContext.close().catch(() => undefined)
      }
    }
  }, [src])

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={48}
      className="w-full"
    />
  )
}

type VoicePlayerProps = {
  src: string
  variant: 'incoming' | 'outgoing'
}

const VoicePlayer = ({ src, variant }: VoicePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    }
    const onTime = () => {
      if (!audio.duration) return
      setProgress(audio.currentTime / audio.duration)
    }
    const onEnded = () => {
      setIsPlaying(false)
      setProgress(0)
    }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [src])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      void audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const nextTime = Math.max(0, Math.min(audio.duration, audio.duration * value))
    audio.currentTime = nextTime
    setProgress(value)
  }

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) return '0:00'
    const minutes = Math.floor(value / 60)
    const seconds = Math.floor(value % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const buttonColor = variant === 'outgoing' ? 'voice-play voice-play-outgoing' : 'voice-play voice-play-incoming'
  const shellClass = variant === 'outgoing' ? 'voice-shell voice-shell-outgoing' : 'voice-shell voice-shell-incoming'
  const baseWave = variant === 'outgoing' ? 'rgba(255,255,255,0.35)' : 'rgba(17,24,39,0.25)'
  const activeWave = variant === 'outgoing' ? '#ffffff' : '#111827'

  return (
    <div className={shellClass}>
      <button
        type="button"
        onClick={toggle}
        className={buttonColor}
        aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
      >
        {isPlaying ? 'II' : '>'}
      </button>
      <div className="voice-track">
        <div className="voice-wave">
          <VoiceWaveform src={src} color={baseWave} />
        </div>
        <div className="voice-progress" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}>
          <VoiceWaveform src={src} color={activeWave} />
        </div>
        <div className="voice-dot" style={{ left: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={(e) => handleSeek(Number(e.target.value))}
          className="voice-scrub"
          aria-label="Прокрутка голосового"
        />
      </div>
      <span className="voice-time">{formatTime(duration)}</span>
      <audio ref={audioRef} preload="metadata">
        <source src={src} />
      </audio>
    </div>
  )
}

export function ChatPage({ apiBase, accessToken, currentLogin, onIncomingMessage, onActiveChatChange }: ChatPageProps) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeLogin, setActiveLogin] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([])
  const [messagesByLogin, setMessagesByLogin] = useState<Record<string, ChatMessage[]>>({})
  const [draft, setDraft] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editRows, setEditRows] = useState(2)
  const [hiddenMessageIdsByLogin, setHiddenMessageIdsByLogin] = useState<Record<string, Set<number>>>({})
  const wsRef = useRef<WebSocket | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recorderStreamRef = useRef<MediaStream | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const chatIdFromPath = useMemo(() => {
    if (!location.pathname.startsWith('/chat/')) return ''
    const raw = location.pathname.split('/')[2] ?? ''
    return decodeURIComponent(raw)
  }, [location.pathname])

  const activeMessages = useMemo(() => {
    if (!activeLogin) return []
    const hidden = hiddenMessageIdsByLogin[activeLogin]
    const list = messagesByLogin[activeLogin] ?? []
    if (!hidden || hidden.size === 0) return list
    return list.filter((message) => !hidden.has(message.id))
  }, [activeLogin, hiddenMessageIdsByLogin, messagesByLogin])

  const clampEditRows = (value: number) => Math.min(6, Math.max(2, value))

  const maxFileBytes = 5 * 1024 * 1024
  const maxImageBytes = 2 * 1024 * 1024

  const createClientId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const buildAttachmentUrl = (id: number) => {
    if (!accessToken) return ''
    return `${apiBase}/chats/attachments/${id}?token=${encodeURIComponent(accessToken)}`
  }

  const getAttachmentLabel = (attachment: ChatAttachment) => {
    if (attachment.kind === 'image') return 'Фото'
    if (attachment.kind === 'voice') return 'Голосовое'
    return 'Файл'
  }

  const getMessagePreview = (message?: ChatMessage) => {
    if (!message) return 'Нет сообщений'
    if (message.deletedAt) return 'Сообщение удалено'
    if (message.text.trim()) return message.text
    if (message.attachment) return getAttachmentLabel(message.attachment)
    return 'Нет сообщений'
  }

  const resolveChatLogin = (from?: string, to?: string) => {
    if (!from || !to) return null
    return from === currentLogin ? to : from
  }

  const resolveChatIdByLogin = async (login: string) => {
    if (!accessToken) return null
    try {
      const res = await fetch(`${apiBase}/chats/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ login })
      })
      if (!res.ok) return null
      const data = (await res.json()) as ChatUser
      if (!data.chatId) return null
      return data
    } catch {
      return null
    }
  }

  const openChatByLogin = async (user: ChatUser) => {
    if (!user.login || !accessToken || user.login === currentLogin) return
    const resolved = await resolveChatIdByLogin(user.login)
    const chatId = resolved?.chatId
    if (!chatId) return

    const mergedUser: ChatUser = {
      login: resolved?.login ?? user.login,
      displayName: resolved?.displayName ?? user.displayName,
      avatarDataUrl: resolved?.avatarDataUrl ?? user.avatarDataUrl,
      chatId
    }

    setChatUsers((prev) => {
      const existing = prev.find((entry) => entry.chatId === chatId || entry.login === mergedUser.login)
      if (existing) {
        return prev.map((entry) => (entry.login === mergedUser.login ? { ...entry, ...mergedUser } : entry))
      }
      return [mergedUser, ...prev]
    })

    setActiveChatId(chatId)
    setActiveLogin(mergedUser.login)
    navigate(`/chat/${encodeURIComponent(chatId)}`, { replace: true })
  }

  const isMessageSelected = (message: ChatMessage) => message.id > 0 && selectedMessageIds.has(message.id)

  const clearSelection = () => setSelectedMessageIds(new Set())

  const toggleMessageSelection = (message: ChatMessage) => {
    if (message.id <= 0) return
    setSelectedMessageIds((prev) => {
      const next = new Set(prev)
      if (next.has(message.id)) {
        next.delete(message.id)
      } else {
        next.add(message.id)
      }
      return next
    })
  }

  const updateChatPreview = (login: string, messages: ChatMessage[]) => {
    const last = messages[messages.length - 1]
    setChatUsers((prev) => prev.map((user) => (
      user.login === login ? { ...user, lastMessage: last } : user
    )))
  }

  const updateMessageById = (login: string, messageId: number, updater: (message: ChatMessage) => ChatMessage) => {
    setMessagesByLogin((prev) => {
      const list = prev[login]
      if (!list) return prev
      let changed = false
      const nextList = list.map((message) => {
        if (message.id !== messageId) return message
        changed = true
        return updater(message)
      })
      if (!changed) return prev
      const next = { ...prev, [login]: nextList }
      updateChatPreview(login, nextList)
      return next
    })
  }

  useEffect(() => {
    if (!accessToken) return

    const apiUrl = new URL(apiBase, window.location.origin)
    const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${apiUrl.host}${apiUrl.pathname.replace(/\/$/, '')}/ws/chat?token=${encodeURIComponent(accessToken)}`

    let reconnectTimer: number | undefined
    let reconnectAttempts = 0
    let shouldReconnect = true

    const scheduleReconnect = () => {
      if (!shouldReconnect) return
      const baseDelay = 1000
      const maxDelay = 10000
      const delay = Math.min(maxDelay, baseDelay * Math.pow(2, reconnectAttempts))
      reconnectAttempts += 1
      reconnectTimer = window.setTimeout(connect, delay)
    }

    const connect = () => {
      if (!shouldReconnect) return
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempts = 0
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as WsPayload
          if (payload.type === 'message' && payload.from && payload.to && payload.text !== undefined) {
            const from = payload.from
            const to = payload.to
            const chatLogin = resolveChatLogin(from, to)
            if (!chatLogin) return

            const time = payload.sentAt ? new Date(payload.sentAt) : new Date()
            const formatted = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const messageId = payload.id && payload.id > 0 ? payload.id : Date.now()
            const messageType: ChatMessage['type'] = from === currentLogin ? 'outgoing' : 'incoming'
            const nextMessage: ChatMessage = {
              id: messageId,
              type: messageType,
              text: payload.text ?? '',
              time: formatted,
              from,
              to,
              attachment: payload.attachment,
              clientId: payload.clientId,
              editedAt: payload.editedAt,
              deletedAt: payload.deletedAt,
              pending: false
            }

            setMessagesByLogin((prev) => {
              const next = { ...prev }
              const list = next[chatLogin] ? [...next[chatLogin]] : []
              let updated = false

              if (payload.clientId) {
                const index = list.findIndex((item) => item.clientId === payload.clientId)
                if (index >= 0) {
                  list[index] = { ...list[index], ...nextMessage }
                  updated = true
                }
              }

              if (!updated && payload.id) {
                const index = list.findIndex((item) => item.id === payload.id)
                if (index >= 0) {
                  list[index] = { ...list[index], ...nextMessage }
                  updated = true
                }
              }

              if (!updated) {
                list.push(nextMessage)
              }
              next[chatLogin] = list
              updateChatPreview(chatLogin, list)
              return next
            })

            setChatUsers((prev) => {
              const existing = prev.find((u) => u.login === chatLogin)
              if (!existing) {
                return [{ login: chatLogin, lastMessage: nextMessage }, ...prev]
              }
              return prev.map((u) => (u.login === chatLogin ? { ...u, lastMessage: nextMessage } : u))
            })

            if (from !== currentLogin) {
              onIncomingMessage(from)
            }
            return
          }

          if (payload.type === 'edit' && payload.id && payload.from && payload.to) {
            const chatLogin = resolveChatLogin(payload.from, payload.to)
            if (!chatLogin) return
            updateMessageById(chatLogin, payload.id, (message) => ({
              ...message,
              text: payload.text ?? message.text,
              editedAt: payload.editedAt ?? message.editedAt,
              pending: false
            }))
            return
          }

          if (payload.type === 'delete' && payload.id && payload.from && payload.to) {
            const chatLogin = resolveChatLogin(payload.from, payload.to)
            if (!chatLogin) return
            updateMessageById(chatLogin, payload.id, (message) => ({
              ...message,
              text: '',
              attachment: undefined,
              deletedAt: payload.deletedAt ?? message.deletedAt,
              pending: false
            }))
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (wsRef.current === ws) {
          wsRef.current = null
        }
        scheduleReconnect()
      }

      ws.onerror = () => {
        try {
          ws.close()
        } catch {
          // ignore
        }
      }
    }

    connect()

    return () => {
      shouldReconnect = false
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      if (wsRef.current) wsRef.current.close()
      wsRef.current = null
    }
  }, [accessToken, apiBase, onIncomingMessage])

  useEffect(() => {
    if (!accessToken || !chatIdFromPath) return

    let isActive = true

    const loadChatById = async () => {
      try {
        const res = await fetch(`${apiBase}/chats/id/${encodeURIComponent(chatIdFromPath)}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include'
        })
        if (!res.ok) return
        const data = (await res.json()) as ChatUser
        if (!isActive || !data.login) return
        setChatUsers((prev) => {
          const existing = prev.find((entry) => entry.chatId === chatIdFromPath || entry.login === data.login)
          const merged = { ...existing, ...data, chatId: chatIdFromPath }
          if (!existing) return [merged, ...prev]
          return prev.map((entry) => (entry.login === merged.login ? merged : entry))
        })
        setActiveChatId(chatIdFromPath)
        setActiveLogin(data.login)
      } catch {
        // ignore
      }
    }

    void loadChatById()

    return () => {
      isActive = false
    }
  }, [accessToken, apiBase, chatIdFromPath])

  useEffect(() => {
    if (!accessToken) return

    let isActive = true

    const loadChats = async () => {
      try {
        const res = await fetch(`${apiBase}/chats`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include'
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          chats?: Array<{
            chatId?: string
            login: string
            displayName?: string
            avatarDataUrl?: string
            lastText?: string
            lastSentAt?: string
            lastFrom?: string
          }>
        }
        if (!isActive) return

        const nextUsers: ChatUser[] = (data.chats ?? []).map((item) => {
          const formatted = item.lastSentAt
            ? new Date(item.lastSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''
          const lastMessage: ChatMessage | undefined = item.lastText
            ? {
                id: Date.now(),
                type: item.lastFrom === currentLogin ? 'outgoing' : 'incoming',
                text: item.lastText,
                time: formatted,
                from: item.lastFrom ?? item.login,
                to: item.lastFrom === currentLogin ? item.login : currentLogin
              }
            : undefined

          return {
            chatId: item.chatId,
            login: item.login,
            displayName: item.displayName,
            avatarDataUrl: item.avatarDataUrl,
            lastMessage
          }
        })

        setChatUsers(nextUsers)
        setMessagesByLogin((prev) => {
          const next: Record<string, ChatMessage[]> = { ...prev }
          nextUsers.forEach((user) => {
            if (!next[user.login] && user.lastMessage) {
              next[user.login] = [user.lastMessage]
            }
          })
          return next
        })
      } catch {
        // ignore
      }
    }

    void loadChats()

    return () => {
      isActive = false
    }
  }, [accessToken, apiBase, currentLogin])

  useEffect(() => {
    if (!accessToken || !activeLogin || !activeChatId) return

    let isActive = true

    const loadHistory = async () => {
      try {
        const res = await fetch(`${apiBase}/chats/id/${encodeURIComponent(activeChatId)}/history`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          credentials: 'include'
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          messages?: Array<{
            id: number
            from: string
            to: string
            text: string
            sentAt: string
            editedAt?: string
            deletedAt?: string
            attachment?: ChatAttachment
          }>
        }
        if (!isActive) return

        const history: ChatMessage[] = (data.messages ?? []).map((msg, index) => {
          const time = msg.sentAt ? new Date(msg.sentAt) : new Date()
          const formatted = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          const messageType: ChatMessage['type'] = msg.from === currentLogin ? 'outgoing' : 'incoming'
          const isDeleted = !!msg.deletedAt
          return {
            id: msg.id || time.getTime() + index,
            type: messageType,
            text: isDeleted ? '' : msg.text,
            time: formatted,
            from: msg.from,
            to: msg.to,
            attachment: isDeleted ? undefined : msg.attachment,
            editedAt: msg.editedAt,
            deletedAt: msg.deletedAt
          }
        })

        setMessagesByLogin((prev) => ({
          ...prev,
          [activeLogin]: history
        }))
      } catch {
        // ignore
      }
    }

    void loadHistory()

    return () => {
      isActive = false
    }
  }, [accessToken, activeLogin, activeChatId, apiBase, currentLogin])

  useEffect(() => {
    clearSelection()
    setContextMenu(null)
    setEditingMessageId(null)
    setEditDraft('')
  }, [activeLogin])

  useEffect(() => {
    if (!onActiveChatChange) return
    onActiveChatChange(activeLogin ?? '')
  }, [activeLogin, onActiveChatChange])

  useEffect(() => {
    if (!contextMenu) return
    const handleClose = () => setContextMenu(null)
    window.addEventListener('click', handleClose)
    window.addEventListener('scroll', handleClose, true)
    window.addEventListener('resize', handleClose)
    return () => {
      window.removeEventListener('click', handleClose)
      window.removeEventListener('scroll', handleClose, true)
      window.removeEventListener('resize', handleClose)
    }
  }, [contextMenu])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const login = params.get('user')
    if (!login || login === currentLogin || !accessToken) return

    const openFromQuery = async () => {
      try {
        const res = await fetch(`${apiBase}/users/search?q=${encodeURIComponent(login)}`, { credentials: 'include' })
        if (!res.ok) {
          void openChatByLogin({ login })
          return
        }
        const data = (await res.json()) as { users?: ChatUser[] }
        const found = data.users?.find((u) => u.login === login)
        if (found) {
          void openChatByLogin(found)
          return
        }
        void openChatByLogin({ login })
      } catch {
        void openChatByLogin({ login })
      }
    }

    void openFromQuery()
  }, [accessToken, apiBase, currentLogin, location.search])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [activeMessages.length, activeLogin])

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

  const uploadAttachment = async (file: File) => {
    if (!activeLogin || !accessToken) return

    const isImage = file.type.startsWith('image/')
    const limit = isImage ? maxImageBytes : maxFileBytes
    if (file.size > limit) {
      const limitMb = Math.floor(limit / (1024 * 1024))
      setUploadError(`Файл слишком большой. Максимум ${limitMb} МБ.`)
      return
    }

    setUploadError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${apiBase}/chats/${encodeURIComponent(activeLogin)}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
        credentials: 'include'
      })
      if (!res.ok) {
        setUploadError('Не удалось отправить файл. Попробуйте еще раз.')
        return
      }
      const data = (await res.json()) as {
        message?: {
          id: number
          from: string
          to: string
          text: string
          sentAt: string
          editedAt?: string
          deletedAt?: string
          attachment?: ChatAttachment
        }
      }
      if (!data.message || !data.message.attachment) return

      // Attachment message will be delivered through websocket; avoid duplicating it here.
    } catch {
      setUploadError('Не удалось отправить файл. Попробуйте еще раз.')
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    void uploadAttachment(file)
    event.target.value = ''
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    void uploadAttachment(file)
    event.target.value = ''
  }

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recorderStreamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      const chunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data)
      }

      recorder.onstop = () => {
        setIsRecording(false)
        recorderStreamRef.current?.getTracks().forEach((track) => track.stop())
        recorderStreamRef.current = null

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type })
        void uploadAttachment(file)
      }

      setIsRecording(true)
      recorder.start()
    } catch {
      setUploadError('Не удалось запустить запись. Проверьте доступ к микрофону.')
    }
  }

  const openChat = (user: ChatUser) => {
    void openChatByLogin(user)
  }

  const handleSend = () => {
    if (!activeLogin || !draft.trim()) return
    const socket = wsRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    const text = draft.trim()
    const clientId = createClientId()
    const outgoing: WsPayload = { type: 'message', to: activeLogin, text, clientId }
    socket.send(JSON.stringify(outgoing))

    const now = new Date()
    const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const tempId = -Date.now()

    setMessagesByLogin((prev) => {
      const next = { ...prev }
      const list = next[activeLogin] ? [...next[activeLogin]] : []
      const nextMessage = {
        id: tempId,
        type: 'outgoing' as const,
        text,
        time: formatted,
        from: currentLogin,
        to: activeLogin,
        clientId,
        pending: true
      }
      list.push(nextMessage)
      next[activeLogin] = list
      return next
    })

    setChatUsers((prev) => {
      const nextMessage = {
        id: tempId,
        type: 'outgoing' as const,
        text,
        time: formatted,
        from: currentLogin,
        to: activeLogin,
        clientId,
        pending: true
      }
      const existing = prev.find((user) => user.login === activeLogin)
      if (!existing) {
        return [{ login: activeLogin, lastMessage: nextMessage }, ...prev]
      }
      return prev.map((user) => (
        user.login === activeLogin
          ? { ...user, lastMessage: nextMessage }
          : user
      ))
    })

    setDraft('')
  }

  const canEditMessage = (message: ChatMessage) => (
    message.type === 'outgoing' && !message.deletedAt && message.id > 0 && !message.pending
  )

  const canDeleteMessage = (message: ChatMessage) => (
    message.type === 'outgoing' && !message.deletedAt && message.id > 0 && !message.pending
  )

  const beginEdit = (message: ChatMessage) => {
    if (!canEditMessage(message)) return
    setEditingMessageId(message.id)
    setEditDraft(message.text)
    setEditRows(clampEditRows(message.text.split('\n').length))
    setContextMenu(null)
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditDraft('')
    setEditRows(2)
  }

  const saveEdit = async () => {
    if (!editingMessageId || !activeLogin || !accessToken) return
    const text = editDraft.trim()
    if (!text) return

    try {
      const res = await fetch(`${apiBase}/chats/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ text })
      })
      if (!res.ok) return
      const data = (await res.json()) as { message?: { id: number; text: string; editedAt?: string } }
      const editedAt = data.message?.editedAt ?? new Date().toISOString()

      updateMessageById(activeLogin, editingMessageId, (message) => ({
        ...message,
        text,
        editedAt,
        pending: false
      }))
      cancelEdit()
    } catch {
      // ignore edit errors
    }
  }

  const deleteSelectedMessages = async () => {
    if (!activeLogin || !accessToken) return
    const ids = activeMessages
      .filter((message) => canDeleteMessage(message) && selectedMessageIds.has(message.id))
      .map((message) => message.id)
    if (ids.length === 0) return

    try {
      const res = await fetch(`${apiBase}/chats/messages/delete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ ids })
      })
      if (!res.ok) return
      const deletedAt = new Date().toISOString()
      ids.forEach((id) => {
        updateMessageById(activeLogin, id, (message) => ({
          ...message,
          text: '',
          attachment: undefined,
          deletedAt,
          pending: false
        }))
      })
      clearSelection()
      setContextMenu(null)
      if (editingMessageId && ids.includes(editingMessageId)) {
        cancelEdit()
      }
    } catch {
      // ignore delete errors
    }
  }

  const deleteForMe = (ids: number[]) => {
    if (!activeLogin || ids.length === 0) return
    setHiddenMessageIdsByLogin((prev) => {
      const next = { ...prev }
      const hidden = new Set(next[activeLogin] ?? [])
      ids.forEach((id) => hidden.add(id))
      next[activeLogin] = hidden
      return next
    })
    clearSelection()
    setContextMenu(null)
    if (editingMessageId && ids.includes(editingMessageId)) {
      cancelEdit()
    }
  }

  const handleDownloadImage = (message: ChatMessage) => {
    if (!message.attachment || message.attachment.kind !== 'image') return
    const url = buildAttachmentUrl(message.attachment.id)
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = message.attachment.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <motion.section
      key="chat"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-auto max-w-6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4 sm:gap-6 h-[72vh] max-h-[72vh]">
        <aside className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm h-[72vh] max-h-[72vh] overflow-hidden">
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
                      <div key={user.login} className="flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
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
                          className="w-full min-[420px]:w-auto rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-600 hover:border-gray-300 disabled:opacity-60"
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
                const last = user.lastMessage ?? list[list.length - 1]
                const isActive = user.chatId ? user.chatId === activeChatId : user.login === activeLogin
                return (
                  <button
                    key={user.chatId ?? user.login}
                    type="button"
                    onClick={() => {
                      if (user.chatId) {
                        setActiveChatId(user.chatId)
                        setActiveLogin(user.login)
                        navigate(`/chat/${encodeURIComponent(user.chatId)}`)
                        return
                      }
                      void openChatByLogin(user)
                    }}
                    className={`w-full rounded-2xl border p-3 text-left transition-all ${
                      isActive
                        ? 'border-black bg-gray-900 text-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className={`text-sm font-extrabold truncate ${isActive ? 'text-white' : 'text-gray-900'}`}>
                          {user.displayName || user.login}
                        </p>
                        <p className={`mt-1 text-xs truncate ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                          {getMessagePreview(last)}
                        </p>
                      </div>
                      <div className="ml-3 flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
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

        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col overflow-hidden h-[72vh] max-h-[72vh]">
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

          <div ref={messagesContainerRef} className="flex-1 min-h-0 space-y-4 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 bg-gray-100">
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
                    onClick={(event) => {
                      if (event.ctrlKey || event.metaKey || selectedMessageIds.size > 0) {
                        event.preventDefault()
                        toggleMessageSelection(message)
                      }
                    }}
                    onContextMenu={(event) => {
                      if (!canEditMessage(message) && !canDeleteMessage(message) && selectedMessageIds.size === 0) {
                        return
                      }
                      event.preventDefault()
                      if (canDeleteMessage(message) && !selectedMessageIds.has(message.id)) {
                        setSelectedMessageIds(new Set([message.id]))
                      }
                      setContextMenu({ x: event.clientX, y: event.clientY, message })
                    }}
                    className={`max-w-[92%] sm:max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm transition ${
                      message.type === 'outgoing'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-100 text-gray-800'
                    } ${isMessageSelected(message) ? 'ring-2 ring-black/40' : ''} ${message.pending ? 'opacity-70' : ''}`}
                  >
                    {message.deletedAt ? (
                      <p className="text-xs italic text-gray-300">Сообщение удалено</p>
                    ) : editingMessageId === message.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') cancelEdit()
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit()
                          }}
                          rows={editRows}
                          className="w-full resize-none rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-black"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={saveEdit}
                            className="rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white"
                          >
                            Сохранить
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message.attachment && (
                          <div className="mb-2">
                            {message.attachment.kind === 'image' && (
                              <div className="space-y-2">
                                <img
                                  src={buildAttachmentUrl(message.attachment.id)}
                                  alt={message.attachment.fileName}
                                  className="max-h-64 w-full rounded-xl object-cover"
                                />
                              </div>
                            )}
                            {message.attachment.kind === 'voice' && (
                              <VoicePlayer
                                src={buildAttachmentUrl(message.attachment.id)}
                                variant={message.type}
                              />
                            )}
                            {message.attachment.kind === 'file' && (
                              <a
                                href={buildAttachmentUrl(message.attachment.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:border-gray-300"
                                download={message.attachment.fileName}
                              >
                                {message.attachment.fileName}
                              </a>
                            )}
                          </div>
                        )}
                        {message.text.trim() && (
                          <p className="leading-relaxed break-words whitespace-pre-wrap">{message.text}</p>
                        )}
                      </>
                    )}
                    <div className={`mt-2 text-[10px] font-semibold ${
                      message.type === 'outgoing' ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {message.time}
                      {message.editedAt && !message.deletedAt && (
                        <span className="ml-2 text-[10px] font-semibold">Изменено</span>
                      )}
                      {message.pending && (
                        <span className="ml-2 text-[10px] font-semibold">Отправка...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {contextMenu && (
            <div
              className="fixed z-50 min-w-[180px] rounded-xl border border-gray-200 bg-white shadow-lg p-2 text-sm"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.message.attachment?.kind === 'image' && (
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadImage(contextMenu.message)
                    setContextMenu(null)
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Скачать фото
                </button>
              )}
              {selectedMessageIds.size > 0 && (
                <button
                  type="button"
                  onClick={deleteSelectedMessages}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Удалить у всех ({selectedMessageIds.size})
                </button>
              )}
              {selectedMessageIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    deleteForMe(Array.from(selectedMessageIds))
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Удалить у меня ({selectedMessageIds.size})
                </button>
              )}
              {selectedMessageIds.size <= 1 && canEditMessage(contextMenu.message) && (
                <button
                  type="button"
                  onClick={() => beginEdit(contextMenu.message)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Редактировать
                </button>
              )}
              {selectedMessageIds.size === 0 && canDeleteMessage(contextMenu.message) && (
                <button
                  type="button"
                  onClick={deleteSelectedMessages}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Удалить у всех
                </button>
              )}
              {selectedMessageIds.size === 0 && (
                <button
                  type="button"
                  onClick={() => deleteForMe([contextMenu.message.id])}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Удалить у меня
                </button>
              )}
              {selectedMessageIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearSelection()
                    setContextMenu(null)
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Снять выделение
                </button>
              )}
            </div>
          )}

          {activeLogin && (
            <div className="border-t border-gray-100 bg-white px-4 py-4">
              <div className="grid grid-cols-[auto_auto_auto_1fr] items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-gray-500 hover:text-black"
                  title="Прикрепить файл (до 5 МБ)"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-gray-500 hover:text-black"
                  title="Прикрепить фото (до 2 МБ)"
                >
                  <Image className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { void toggleRecording() }}
                  className={`rounded-xl border px-3 py-2 ${isRecording ? 'border-red-300 text-red-500 bg-red-50' : 'border-gray-200 text-gray-500 hover:text-black'}`}
                  title={isRecording ? 'Остановить запись' : 'Записать голосовое'}
                >
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
                  className="col-span-4 min-w-0 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:outline-none focus:border-black sm:col-span-1 sm:flex-1 sm:min-w-[180px]"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="col-span-4 inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-900 sm:col-span-1"
                >
                  <SendHorizontal className="h-4 w-4" />
                  Отправить
                </button>
              </div>
              {uploadError && (
                <p className="mt-2 text-[11px] text-red-500">{uploadError}</p>
              )}
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
