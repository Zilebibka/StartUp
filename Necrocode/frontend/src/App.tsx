import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  ArrowDownToLine,
  Bell,
  LogOut,
  Plus,
  Settings,
  Search,
  ShoppingCart,
  MessageCircle,
  Wallet,
  X,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'

import { HomePage } from './pages/HomePage'
import { CatalogPage } from './pages/CatalogPage'
import { ListingPage } from './pages/ListingPage'
import { CartPage } from './pages/CartPage'
import { ChatPage } from './pages/ChatPage'
import { TopupPage } from './pages/TopupPage'
import { WithdrawPage } from './pages/WithdrawPage'
import { SellPage } from './pages/SellPage'
import { HelpPage, AboutPage, ContactModal } from './pages/InfoPages'
import { RegisterPage, LoginPage, ProfilePage } from './pages/AuthPages'
import { SettingsPage } from './pages/SettingsPage'
import type { Page, User, AuthResponse, Listing, CartItem, DeliveryMode, AppNotification } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const DEFAULT_LISTINGS: Listing[] = []
const THEME_STORAGE_KEY = 'siteThemeMode'
const DARK_THEME_VARIANT_STORAGE_KEY = 'siteDarkThemeVariant'

type DarkThemeVariant = 'mint' | 'sage' | 'teal'
  | 'amber'
  | 'slate'
  | 'coral'
  | 'lavender'
  | 'rose'

type OwnerInfo = {
  displayName?: string
  avatarDataUrl?: string
}

type ChatWsPayload = {
  type: 'handshake' | 'message' | 'edit' | 'delete' | 'error'
  from?: string
  to?: string
  text?: string
  attachment?: { kind?: string }
}

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('file read failed'))
    reader.readAsDataURL(file)
  })

const readApiErrorMessage = async (res: Response, fallback: string) => {
  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const payload = (await res.json()) as { error?: string; message?: string }
      return payload.error ?? payload.message ?? fallback
    } catch {
      return fallback
    }
  }

  try {
    const text = (await res.text()).trim()
    return text || fallback
  } catch {
    return fallback
  }
}

function App() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isWalletOpen, setIsWalletOpen] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const currentPage = useMemo<Page>(() => {
    const pathname = location.pathname.toLowerCase()

    if (pathname === '/' || pathname === '/home') return 'home'
    if (pathname === '/catalog') return 'catalog'
    if (pathname === '/cart') return 'cart'
    if (pathname === '/topup') return 'topup'
    if (pathname === '/withdraw') return 'withdraw'
    if (pathname === '/sell') return 'sell'
    if (pathname === '/help') return 'help'
    if (pathname === '/about') return 'about'
    if (pathname === '/chat' || pathname.startsWith('/chat/')) return 'chat'
    if (pathname === '/login') return 'login'
    if (pathname === '/register') return 'register'
    if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile'
    if (pathname === '/settings') return 'settings'
    if (pathname.startsWith('/listing/')) return 'listing'

    return 'home'
  }, [location.pathname])

  const selectedListingId = useMemo(() => {
    if (currentPage !== 'listing') return null
    const rawId = location.pathname.split('/')[2]
    const id = Number(rawId)
    return Number.isFinite(id) ? id : null
  }, [currentPage, location.pathname])

  const viewedProfilePublicId = useMemo(() => {
    if (currentPage !== 'profile') return ''
    const raw = location.pathname.split('/')[2] ?? ''
    return decodeURIComponent(raw).trim()
  }, [currentPage, location.pathname])

  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'))
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'dark' ? 'dark' : 'light'
  })
  const [darkThemeVariant, setDarkThemeVariant] = useState<DarkThemeVariant>(() => {
    const saved = localStorage.getItem(DARK_THEME_VARIANT_STORAGE_KEY)
    if (
      saved === 'mint' ||
      saved === 'sage' ||
      saved === 'teal' ||
      saved === 'amber' ||
      saved === 'slate' ||
      saved === 'coral' ||
      saved === 'lavender' ||
      saved === 'rose'
    ) {
      return saved
    }
    return 'sage'
  })
  
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null)
  const notificationsWsRef = useRef<WebSocket | null>(null)
  const fetchedOwnerLoginsRef = useRef<Set<string>>(new Set())
  const [ownerInfoByLogin, setOwnerInfoByLogin] = useState<Record<string, OwnerInfo>>({})
  const [activeChatLogin, setActiveChatLogin] = useState('')
  const currentPageRef = useRef<Page>('home')
  const activeChatLoginRef = useRef('')
  const currentUserLoginRef = useRef<string | null>(null)

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  useEffect(() => {
    activeChatLoginRef.current = activeChatLogin
  }, [activeChatLogin])

  useEffect(() => {
    currentUserLoginRef.current = currentUser?.login ?? null
  }, [currentUser?.login])

  const playNotificationSound = () => {
    try {
      const audio = notificationAudioRef.current
      if (!audio) return
      audio.currentTime = 0
      const playback = audio.play()
      if (playback) {
        void playback.catch(() => {})
      }
    } catch {}
  }

  const addNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const newNotif: AppNotification = {
      id: Date.now(),
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false
    }
    setNotifications(prev => [newNotif, ...prev])

    playNotificationSound()
  }

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [topupAmount, setTopupAmount] = useState<number | ''>(1000)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp' | 'crypto'>('card')
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>(1000)
  const [withdrawMethod, setWithdrawMethod] = useState<'card' | 'sbp' | 'crypto'>('card')
  const [withdrawDestination, setWithdrawDestination] = useState('')
  const [balance, setBalance] = useState(0)

  const [listings, setListings] = useState<Listing[]>([])
  const [cart, setCart] = useState<CartItem[]>([])

  const [sellForm, setSellForm] = useState({
    title: '',
    description: '',
    price: '',
    category: 'apps',
    techStack: '',
    revenue: '',
    expenses: '',
    monetizationType: '',
    projectUrl: '',
    deliveryMode: 'auto' as DeliveryMode,
  })
  const [editingListingId, setEditingListingId] = useState<number | null>(null)
  const [sellImages, setSellImages] = useState<File[]>([])
  const [sellImagePreviews, setSellImagePreviews] = useState<string[]>([])
  const [codeFile, setCodeFile] = useState<File | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const codeFileInputRef = useRef<HTMLInputElement>(null)
  const userPublicIdByLoginRef = useRef<Record<string, string>>({})

  const [loginForm, setLoginForm] = useState({ login: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ login: '', email: '', displayName: '', password: '' })
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false)
  const [registerCode, setRegisterCode] = useState('')
  const [pendingRegisterLogin, setPendingRegisterLogin] = useState('')

  const [resetIdentifier, setResetIdentifier] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetStep, setResetStep] = useState<'request' | 'code' | 'password'>('request')

  const selectedListing = useMemo(
    () => listings.find((item) => item.id === selectedListingId) ?? null,
    [listings, selectedListingId],
  )

  const filteredListings = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return listings

    return listings.filter(
      (item) =>
        item.title.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle) ||
        item.ownerLogin.toLowerCase().includes(needle),
    )
  }, [listings, searchQuery])

  const cartCount = useMemo(() => cart.length, [cart])
  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const listing = listings.find((entry) => entry.id === item.listingId)
        return sum + (listing ? listing.price : 0)
      }, 0),
    [cart, listings],
  )

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', themeMode === 'dark')
    document.documentElement.setAttribute('data-dark-theme', darkThemeVariant)
    localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    localStorage.setItem(DARK_THEME_VARIANT_STORAGE_KEY, darkThemeVariant)
  }, [themeMode, darkThemeVariant])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(''), 4500)
    return () => window.clearTimeout(timer)
  }, [error])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    const audio = new Audio('/sounds/notification.mp3')
    audio.preload = 'auto'
    audio.volume = 0.28
    notificationAudioRef.current = audio

    const unlockAudio = () => {
      const activeAudio = notificationAudioRef.current
      if (!activeAudio) return
      activeAudio.muted = true
      const playback = activeAudio.play()
      if (playback) {
        void playback
          .then(() => {
            activeAudio.pause()
            activeAudio.currentTime = 0
            activeAudio.muted = false
          })
          .catch(() => {
            activeAudio.muted = false
          })
      } else {
        activeAudio.muted = false
      }
    }

    window.addEventListener('pointerdown', unlockAudio, { once: true })
    window.addEventListener('keydown', unlockAudio, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlockAudio)
      window.removeEventListener('keydown', unlockAudio)
      audio.pause()
      notificationAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!accessToken) return

    const apiUrl = new URL(API_BASE, window.location.origin)
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
      notificationsWsRef.current = ws

      ws.onopen = () => {
        reconnectAttempts = 0
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as ChatWsPayload
          if (payload.type !== 'message' || !payload.from || !payload.to) return
          if (payload.from === currentUserLoginRef.current) return
          const label = payload.attachment?.kind ? 'сообщение с вложением' : 'сообщение'
          const isChatPage = currentPageRef.current === 'chat'
          const isActiveChat = isChatPage && activeChatLoginRef.current === payload.from
          if (isActiveChat) {
            playNotificationSound()
          } else {
            addNotification(`Новое ${label} от ${payload.from}`, 'info')
          }
        } catch {
          // ignore
        }
      }

      ws.onclose = () => {
        if (notificationsWsRef.current === ws) {
          notificationsWsRef.current = null
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
      if (notificationsWsRef.current) notificationsWsRef.current.close()
      notificationsWsRef.current = null
    }
  }, [accessToken])

  useEffect(() => {
    const uniqueLogins = Array.from(new Set(listings.map((item) => item.ownerLogin).filter(Boolean)))
    const missing = uniqueLogins.filter((login) => !fetchedOwnerLoginsRef.current.has(login))
    if (missing.length === 0) return

    let isActive = true
    const controller = new AbortController()

    const loadOwners = async () => {
      const results = await Promise.all(
        missing.map(async (login) => {
          try {
            const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(login)}`, {
              credentials: 'include',
              signal: controller.signal
            })
            if (!res.ok) return [login, null] as const
            const data = (await res.json()) as { users?: Array<{ login: string; displayName?: string; avatarDataUrl?: string }> }
            const user = data.users?.find((entry) => entry.login === login)
            if (!user) return [login, null] as const
            return [login, { displayName: user.displayName, avatarDataUrl: user.avatarDataUrl }] as const
          } catch {
            return [login, null] as const
          }
        })
      )

      if (!isActive) return

      setOwnerInfoByLogin((prev) => {
        const next = { ...prev }
        results.forEach(([login, info]) => {
          fetchedOwnerLoginsRef.current.add(login)
          if (info) {
            next[login] = info
          }
        })
        return next
      })
    }

    void loadOwners()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [listings])

  useEffect(() => {
    const loadListings = async () => {
      try {
        const res = await fetch(`${API_BASE}/listings`, { credentials: 'include' })
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Backend запущен без новых marketplace-роутов. Перезапустите backend с последним кодом.')
          }
          throw new Error(`Не удалось загрузить каталог (${res.status})`)
        }
        const data = (await res.json()) as Listing[]
        setListings(data)
      } catch {
        // Fallback keeps demo catalog if backend is temporarily unavailable.
        setListings(DEFAULT_LISTINGS)
      }
    }

    loadListings()
  }, [])

  useEffect(() => {
    const objectUrls = sellImages.map((file) => URL.createObjectURL(file))
    setSellImagePreviews(objectUrls)

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [sellImages])

  useEffect(() => {
    const bootstrap = async () => {
      if (!accessToken) {
        try {
          const refreshed = await refreshSession()
          await loadProfile(refreshed.accessToken)
        } catch {
          setCurrentUser(null)
        }
        return
      }

      try {
        await loadProfile(accessToken)
      } catch {
        try {
          const refreshed = await refreshSession()
          await loadProfile(refreshed.accessToken)
        } catch {
          clearSession()
        }
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearSession = () => {
    localStorage.removeItem('accessToken')
    setAccessToken(null)
    setCurrentUser(null)
    setCart([])
    setBalance(0)
  }

  const saveSession = (payload: AuthResponse) => {
    localStorage.setItem('accessToken', payload.accessToken)
    setAccessToken(payload.accessToken)
    setCurrentUser(payload.user)
  }

  const refreshSession = async (): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!res.ok) throw new Error('refresh failed')

    const data = (await res.json()) as AuthResponse
    saveSession(data)
    return data
  }

  const loadProfile = async (token: string) => {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    })

    if (!res.ok) throw new Error('profile failed')

    const profile = (await res.json()) as User
    setCurrentUser((prev) => ({ ...prev, ...profile }))
  }

  const fetchWithAuth = async (path: string, init?: RequestInit, allowRefresh = true): Promise<Response> => {
    let token = accessToken

    if (!token) {
      const refreshed = await refreshSession()
      token = refreshed.accessToken
    }

    const makeRequest = (bearer: string) =>
      fetch(`${API_BASE}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${bearer}`,
        },
      })

    let res = await makeRequest(token)
    if (res.status === 401 && allowRefresh) {
      const refreshed = await refreshSession()
      res = await makeRequest(refreshed.accessToken)
    }

    return res
  }

  const loadCartFromServer = async () => {
    if (!currentUser) {
      setCart([])
      return
    }

    const res = await fetchWithAuth('/cart')
    if (!res.ok) throw new Error('failed to load cart')

    const data = (await res.json()) as CartItem[]
    setCart(data.map((item) => ({ ...item, qty: 1 })))
  }

  useEffect(() => {
    if (!currentUser) {
      setCart([])
      return
    }

    loadCartFromServer().catch(() => {
      setCart([])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, accessToken])

  const ownProfilePath = (user?: User | null) => {
    if (user?.publicId) return `/profile/${user.publicId}`
    return '/profile'
  }

  useEffect(() => {
    if (currentPage !== 'profile') {
      setProfileUser(null)
      return
    }

    if (!viewedProfilePublicId) {
      if (currentUser?.publicId) {
        navigate(ownProfilePath(currentUser), { replace: true })
      } else {
        setProfileUser(currentUser)
      }
      return
    }

    if (currentUser?.publicId === viewedProfilePublicId) {
      setProfileUser(currentUser)
      return
    }

    const loadProfileByPublicID = async () => {
      try {
        const res = await fetch(`${API_BASE}/users/${encodeURIComponent(viewedProfilePublicId)}`, {
          credentials: 'include',
        })

        if (!res.ok) {
          if (res.status === 404) {
            setError('Пользователь с таким ID не найден.')
            setProfileUser(null)
            return
          }
          throw new Error('failed to load user profile')
        }

        const user = (await res.json()) as User
        setProfileUser(user)
      } catch {
        setError('Не удалось загрузить профиль пользователя.')
        setProfileUser(null)
      }
    }

    loadProfileByPublicID()
  }, [currentPage, viewedProfilePublicId, currentUser, navigate])

  useEffect(() => {
    if (currentPage === 'settings' && !currentUser) {
      setError('Чтобы открыть настройки, войдите в аккаунт.')
      navigate('/login')
    }
  }, [currentPage, currentUser, navigate])

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    if (isRegisterSubmitting) return

    setIsRegisterSubmitting(true)
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      })

      if (!res.ok) {
        setError(await readApiErrorMessage(res, 'Не удалось зарегистрироваться'))
        return
      }

      const data = (await res.json()) as { login?: string; message?: string }
      setPendingRegisterLogin(data.login ?? registerForm.login)
      setRegisterCode('')
      setSuccessMessage('Код подтверждения отправлен на email. Введите его в открывшемся окне, чтобы завершить регистрацию.')
    } catch {
      setError('Сервер недоступен. Проверьте, что стек запущен, и попробуйте снова.')
    } finally {
      setIsRegisterSubmitting(false)
    }
  }

  const handleVerifyRegisterCode = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!pendingRegisterLogin.trim()) {
      setError('Сначала зарегистрируйтесь, чтобы получить код подтверждения.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: pendingRegisterLogin.trim(), code: registerCode.trim() }),
      })

      if (!res.ok) {
        setError(await readApiErrorMessage(res, 'Не удалось подтвердить email'))
        return
      }

      const data = (await res.json()) as AuthResponse
      saveSession(data)
      setPendingRegisterLogin('')
      setRegisterCode('')
      navigate(ownProfilePath(data.user))
    } catch {
      setError('Сервер недоступен. Проверьте, что стек запущен, и попробуйте снова.')
    }
  }

  const handleResendRegisterCode = async () => {
    setError('')
    setSuccessMessage('')

    if (!pendingRegisterLogin.trim()) {
      setError('Нечего повторно отправлять: сначала зарегистрируйтесь.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register/resend`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: pendingRegisterLogin.trim() }),
      })
      if (!res.ok) {
        setError(await readApiErrorMessage(res, 'Не удалось отправить код повторно'))
        return
      }

      setSuccessMessage('Новый код подтверждения отправлен на email.')
    } catch {
      setError('Сервер недоступен. Проверьте, что стек запущен, и попробуйте снова.')
    }
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })

      if (!res.ok) {
        setError(await readApiErrorMessage(res, 'Не удалось войти'))
        return
      }

      const data = (await res.json()) as AuthResponse
      saveSession(data)
      navigate(ownProfilePath(data.user))
    } catch {
      setError('Сервер недоступен. Проверьте, что стек запущен, и попробуйте снова.')
    }
  }

  const handleSendResetCode = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!resetIdentifier.trim()) {
      setError('Введите логин или email.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/auth/password/forgot`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: resetIdentifier.trim() }),
      })
      if (!res.ok) {
        setError(await readApiErrorMessage(res, 'Не удалось отправить код сброса'))
        return
      }

      setResetStep('code')
      setSuccessMessage('Если аккаунт существует, код для сброса отправлен на привязанный email.')
    } catch {
      setError('Сервер недоступен. Проверьте, что стек запущен, и попробуйте снова.')
    }
  }

  const handleVerifyResetCode = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!resetIdentifier.trim() || !resetCode.trim()) {
      setError('Введите логин/email и код из письма.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/auth/password/verify-code`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: resetIdentifier.trim(), code: resetCode.trim() }),
      })
      if (!res.ok) {
        setError(await readApiErrorMessage(res, 'Неверный код подтверждения'))
        return
      }

      setResetStep('password')
      setSuccessMessage('Код подтверждён. Теперь введите новый пароль.')
    } catch {
      setError('Сервер недоступен. Проверьте, что стек запущен, и попробуйте снова.')
    }
  }

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!resetIdentifier.trim() || !resetCode.trim() || !resetNewPassword.trim()) {
      setError('Заполните логин/email, код и новый пароль.')
      return
    }

    if (resetStep !== 'password') {
      setError('Сначала запросите код для восстановления пароля.')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/auth/password/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: resetIdentifier.trim(),
          code: resetCode.trim(),
          newPassword: resetNewPassword,
        }),
      })
      if (!res.ok) {
        setError(await readApiErrorMessage(res, 'Не удалось сбросить пароль'))
        return
      }

      setLoginForm((prev) => ({ ...prev, login: resetIdentifier.trim() }))
      setResetCode('')
      setResetNewPassword('')
      setResetStep('request')
      setSuccessMessage('Пароль обновлён. Теперь войдите с новым паролем.')
    } catch {
      setError('Сервер недоступен. Проверьте, что стек запущен, и попробуйте снова.')
    }
  }

  const handleRequestEmailChangeCode = async (newEmail: string) => {
    const res = await fetchWithAuth('/me/email/change/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail }),
    })

    if (!res.ok) {
      const message = await readApiErrorMessage(res, 'Не удалось отправить код для смены email')
      throw new Error(message)
    }
  }

  const handleConfirmEmailChange = async (newEmail: string, code: string) => {
    const res = await fetchWithAuth('/me/email/change/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newEmail, code }),
    })

    if (!res.ok) {
      const message = await readApiErrorMessage(res, 'Не удалось сменить email')
      throw new Error(message)
    }

    setCurrentUser((prev) => (prev ? { ...prev, email: newEmail } : prev))
  }

  const handleEditListing = (listing: Listing) => {
    setEditingListingId(listing.id)
    setSellForm({
      title: listing.title,
      description: listing.description,
      price: listing.price.toString(),
      category: listing.category || 'apps',
      techStack: listing.techStack || '',
      revenue: listing.revenue || '',
      expenses: listing.expenses || '',
      monetizationType: listing.monetizationType || '',
      projectUrl: listing.projectUrl || '',
      deliveryMode: listing.deliveryMode,
    })
    setSellImagePreviews(listing.imageDataUrls || [])
    navigate('/sell')
  }

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    clearSession()
    navigate('/')
  }

  const navigateToHome = () => {
    navigate('/')
    setError('')
    setSuccessMessage('')
  }

  const requireAuth = () => {
    if (currentUser) return true
    navigate('/register')
    return false
  }

  const handleSellOpen = () => {
    if (!requireAuth()) return
    setError('')
    setSuccessMessage('')
    navigate('/sell')
  }

  const saveCartItem = async (listingId: number, qty: number) => {
    const res = await fetchWithAuth('/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, qty }),
    })

    if (!res.ok) {
      throw new Error('failed to save cart item')
    }
  }

  const handleAddToCart = async (listingId: number) => {
    if (!requireAuth()) return

    try {
      const listing = listings.find((item) => item.id === listingId)
      if (!listing) {
        setError('Лот не найден')
        return
      }

      if (currentUser && listing.ownerLogin.toLowerCase() === currentUser.login.toLowerCase()) {
        setError('Нельзя добавлять в корзину собственный проект')
        return
      }

      const existing = cart.find((item) => item.listingId === listingId)
      if (existing) {
        setError('Этот проект уже добавлен в корзину')
        return
      }

      await saveCartItem(listingId, 1)
      await loadCartFromServer()
      setError('')
    } catch {
      setError('Не удалось обновить корзину')
    }
  }

  const handleRemoveCartItem = async (listingId: number) => {
    try {
      const res = await fetchWithAuth(`/cart/items/${listingId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('failed to remove cart item')
      await loadCartFromServer()
    } catch {
      setError('Не удалось удалить позицию из корзины')
    }
  }

  const handleSellImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).filter((file) => file.type.startsWith('image/'))
    setSellImages((prev) => [...prev, ...files].slice(0, 5))
    e.target.value = ''
  }

  const removeSellImage = (indexToRemove: number) => {
    setSellImages((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleCodeFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    setCodeFile(e.target.files[0])
    e.target.value = ''
  }

  const openListingPage = (listingId: number) => {
    navigate(`/listing/${listingId}`)
  }

  const openUserProfile = async (login: string, knownPublicId?: string) => {
    const normalizedLogin = login.trim().toLowerCase()
    if (!normalizedLogin) return

    if (knownPublicId) {
      navigate(`/profile/${encodeURIComponent(knownPublicId)}`)
      return
    }

    if (currentUser?.login.toLowerCase() === normalizedLogin) {
      navigate(ownProfilePath(currentUser))
      return
    }

    const cached = userPublicIdByLoginRef.current[normalizedLogin]
    if (cached) {
      navigate(`/profile/${encodeURIComponent(cached)}`)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(login)}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        throw new Error('failed to search user')
      }

      const payload = (await res.json()) as { users?: Array<{ publicId?: string; login?: string }> }
      const exactMatch = payload.users?.find((user) => user.login?.toLowerCase() === normalizedLogin)
      const targetPublicId = exactMatch?.publicId ?? payload.users?.[0]?.publicId

      if (!targetPublicId) {
        setError('Профиль пользователя не найден.')
        return
      }

      userPublicIdByLoginRef.current[normalizedLogin] = targetPublicId
      navigate(`/profile/${encodeURIComponent(targetPublicId)}`)
    } catch {
      setError('Не удалось открыть профиль пользователя.')
    }
  }

  const handleTopup = () => {
    if (!requireAuth()) return

    const amount = Number(topupAmount)
    if (!Number.isFinite(amount) || amount < 100) {
      addNotification('Введите сумму пополнения не менее 100 ₽.', 'error')
      return
    }

    setBalance((prev) => prev + amount)
    addNotification('Баланс успешно пополнен на ' + amount + ' ₽', 'success')
  }

  const handleWithdraw = () => {
    if (!requireAuth()) return

    const amount = Number(withdrawAmount)
    if (!Number.isFinite(amount) || amount < 1000) {
      addNotification('Минимальная сумма вывода — 1000 ₽.', 'error')
      return
    }

    if (amount > balance) {
      addNotification('Недостаточно средств на балансе.', 'error')
      return
    }

    const dest = withdrawDestination.replace(/\s+/g, '')
    if (withdrawMethod === 'card' && !/^\d{16,19}$/.test(dest)) {
      addNotification('Для вывода на карту введите корректный номер карты (16-19 цифр).', 'error')
      return
    }
    if (withdrawMethod === 'sbp' && !/^(\+7|8|7)\d{10}$/.test(dest.replace(/[\(\)-]/g, ''))) {
      addNotification('Введите корректный номер телефона (начиная с +7 или 8).', 'error')
      return
    }
    if (withdrawMethod === 'crypto' && !/^T[A-Za-z1-9]{33}$/.test(dest)) {
      addNotification('Введите корректный адрес USDT (сеть TRC20, начинается с T).', 'error')
      return
    }

    setBalance((prev) => prev - amount)
    setWithdrawDestination('')
    addNotification('Заявка на вывод ' + amount + ' ₽ успешно создана.', 'success')
    navigate('/')
  }

  const handleDeleteListing = async () => {
    if (!editingListingId || !window.confirm('Вы уверены, что хотите удалить эту анкету?')) return;
    
    try {
      const res = await fetchWithAuth(`/listings/${editingListingId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Не удалось удалить анкету');
      }

      setListings((prev) => prev.filter(l => l.id !== editingListingId));
      addNotification('Анкета удалена', 'success');
      setEditingListingId(null);
      navigate(ownProfilePath(currentUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  }

  const handleCreateListing = async (e: FormEvent) => {
    e.preventDefault()
    if (!requireAuth()) return

    const price = Number(sellForm.price)
    if (!sellForm.title.trim() || !sellForm.description.trim() || !Number.isFinite(price) || price <= 0) {
      addNotification('Заполните название, описание и корректную цену проекта.', 'error')
      return
    }

    if (!editingListingId && !codeFile && !sellForm.projectUrl.trim()) {
      addNotification('Нужно приложить файл проекта, ссылку на репозиторий или редактировать существующий товар.', 'error')
      return
    }

    try {
      const images = await Promise.all(sellImages.map((file) => toDataUrl(file)))
      const editingListing = editingListingId ? listings.find((entry) => entry.id === editingListingId) : null
      const effectiveCodeFileName = codeFile?.name ?? editingListing?.codeFileName ?? ''
      const effectiveCodeFileSizeBytes = codeFile?.size ?? editingListing?.codeFileSizeBytes ?? 0

      const payload = {
        title: sellForm.title.trim(),
        description: sellForm.description.trim(),
        price,
        category: sellForm.category,
        techStack: sellForm.techStack.trim(),
        revenue: sellForm.revenue.trim(),
        expenses: sellForm.expenses.trim(),
        monetizationType: sellForm.monetizationType.trim(),
        deliveryMode: sellForm.deliveryMode,
        projectUrl: sellForm.projectUrl.trim(),
        codeFileName: effectiveCodeFileName,
        codeFileSizeBytes: effectiveCodeFileSizeBytes,
        imageDataUrls: images,
      }

      const method = editingListingId ? 'PUT' : 'POST'
      const endpoint = editingListingId ? `/listings/${editingListingId}` : '/listings'

      const res = await fetchWithAuth(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const apiErrorMessage = await readApiErrorMessage(res, `Ошибка публикации (${res.status})`)
        if (res.status === 404) {
          throw new Error('Эндпоинт /api/listings не найден. Запущен старый backend, перезапустите сервер.')
        }
        throw new Error(apiErrorMessage)
      }

      const created = (await res.json()) as Listing

      if (editingListingId) {
        setListings((prev) => prev.map(listing => listing.id === editingListingId ? { ...listing, ...created, id: editingListingId } : listing))
        addNotification('Анкета успешно обновлена.', 'success')
      } else {
        setListings((prev) => [created, ...prev])
        addNotification('Анкета успешно создана.', 'success')
      }

      setSellForm({ title: '', description: '', price: '', category: 'apps', techStack: '', revenue: '', expenses: '', monetizationType: '', projectUrl: '', deliveryMode: 'auto' })
      setEditingListingId(null)
      setSellImages([])
      setCodeFile(null)
      setError('')
      navigate('/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось опубликовать проект.'
      setError(message)
    }
  }

  const handleAccountSettingsUpdate = async (payload: {
    currentPassword?: string
    email?: string
    newPassword?: string
    displayName?: string
    avatarDataUrl?: string
  }) => {
    const res = await fetchWithAuth('/me/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const message = await readApiErrorMessage(res, 'Не удалось обновить настройки аккаунта')
      throw new Error(message)
    }

    const data = (await res.json()) as { user?: User }
    if (data.user) {
      setCurrentUser(data.user)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900 font-sans">
      <header className="sticky top-0 w-full bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="w-full px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-4 sm:gap-8">
            <button
              onClick={navigateToHome}
              className="flex min-w-0 items-center hover:opacity-80 transition-opacity"
            >
              <span className="truncate font-extrabold text-xl sm:text-2xl tracking-tight text-gray-900">
                NecroCode
              </span>
            </button>
            <nav className="hidden md:flex flex-row items-center gap-6 text-sm font-semibold text-gray-700">
              <button onClick={handleSellOpen} className={currentPage === 'sell' ? 'text-black' : 'hover:text-black transition-colors'}>Продать</button>
              <button onClick={() => navigate('/catalog')} className={currentPage === 'catalog' ? 'text-black' : 'hover:text-black transition-colors'}>Каталог</button>
              <button onClick={() => navigate('/help')} className={currentPage === 'help' ? 'text-black' : 'hover:text-black transition-colors'}>Помощь</button>
              <button onClick={() => navigate('/about')} className={currentPage === 'about' ? 'text-black' : 'hover:text-black transition-colors'}>О нас</button>
            </nav>
          </div>

          <motion.div
            layout
            transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}
            className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:gap-4 text-gray-600"
          >
            <motion.div layout transition={{ layout: { duration: 0.25, ease: 'easeOut' } }} className="flex items-center relative h-9 justify-end">
              <AnimatePresence mode="wait">
                {isSearchOpen && (
                  <motion.input
                    autoFocus
                    key="searchInput"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'min(56vw, 240px)', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="absolute right-0 max-w-[calc(100vw-2rem)] outline-none bg-gray-100 border border-gray-200 text-sm sm:text-base text-gray-800 overflow-hidden whitespace-nowrap rounded-full pl-3 sm:pl-4 pr-10 py-1.5 focus:bg-white focus:border-black shadow-inner"
                  />
                )}
              </AnimatePresence>
                <button onClick={() => setIsSearchOpen((prev) => !prev)} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 hover:text-black transition-colors relative z-10" title="Поиск">
                  <Search className="w-5 h-5" />
                </button>
            </motion.div>

            <motion.div layout transition={{ layout: { duration: 0.25, ease: 'easeOut' } }} className="flex min-w-0 items-center relative min-h-9">
              <AnimatePresence mode="wait">
                {isWalletOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex min-w-0 items-center justify-end pr-1 sm:pr-3 overflow-hidden gap-1.5 sm:gap-3 max-w-[calc(100vw-5rem)] sm:max-w-none flex-nowrap"
                  >
                    <span className="max-w-24 truncate font-bold text-sm text-gray-900">{balance.toLocaleString('ru-RU')} ₽</span>
                    <button aria-label="Пополнить баланс" onClick={() => { navigate('/topup'); setIsWalletOpen(false) }} className="inline-flex min-h-8 items-center gap-1 bg-black text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                      <Plus className="w-3 h-3" /> <span className="hidden sm:inline">Пополнить</span>
                    </button>
                    <button aria-label="Вывести средства" onClick={() => { navigate('/withdraw'); setIsWalletOpen(false) }} className="inline-flex min-h-8 items-center gap-1 bg-white text-black border border-gray-300 text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap">
                      <ArrowDownToLine className="w-3 h-3" /> <span className="hidden sm:inline">Вывести</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={() => setIsWalletOpen((prev) => !prev)} className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full hover:bg-gray-100 hover:text-black transition-colors" title="Кошелек">
                <Wallet className="w-5 h-5" />
              </button>
            </motion.div>

            <button onClick={() => navigate('/cart')} className="relative h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 hover:text-black transition-colors" title="Корзина">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-4 text-center">{cartCount}</span>}
            </button>

            <button
              onClick={() => navigate('/chat')}
              className={`relative h-9 w-9 inline-flex items-center justify-center rounded-full transition-colors ${currentPage === 'chat' ? 'text-black bg-gray-100' : 'hover:bg-gray-100 hover:text-black'}`}
              title="Чаты"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            
            <div className="relative hidden sm:block">
              <button 
                onClick={() => setIsNotificationsOpen(p => !p)} 
                className="relative h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 hover:text-black transition-colors"
                title="Уведомления"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 text-center select-none shadow-sm animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    key="notif-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                )}
                {isNotificationsOpen && (
                  <motion.div
                    key="notif-dropdown"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-10 right-0 w-80 bg-white border border-gray-100 rounded-xl shadow-xl shadow-black/5 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <h3 className="font-semibold text-gray-800">Уведомления</h3>
                      <button 
                        onClick={() => {
                          setNotifications(prev => prev.map(n => ({...n, read: true})))
                        }} 
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        Прочитать все
                      </button>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto w-full flex flex-col">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Нет новых уведомлений</div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            onMouseEnter={() => { if (!notif.read) markNotificationAsRead(notif.id) }}
                            className={`p-3 border-b border-gray-50 last:border-b-0 flex gap-3 relative transition-colors duration-300 group ${notif.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/40 hover:bg-blue-50/60'}`}
                          >
                            <div className="shrink-0 pt-0.5">
                              {notif.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                              {notif.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                              {notif.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                            </div>
                            <div className="flex-1 pr-6">
                              <p className={`text-sm leading-snug break-words whitespace-pre-wrap ${notif.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>{notif.message}</p>
                              <span className="text-[10px] text-gray-400 mt-1 block">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {currentUser ? (
              <>
              <div className="hidden sm:flex items-center gap-2 md:gap-3 ml-1 md:ml-2 border-l pl-3 md:pl-4 border-gray-200">
                <button
                  onClick={() => navigate(ownProfilePath(currentUser))}
                  className="h-9 w-9 rounded-full border border-gray-200 overflow-hidden bg-white text-xs font-bold text-gray-700 hover:border-gray-300"
                  title={currentUser.login || 'Профиль'}
                >
                  {currentUser.avatarDataUrl ? (
                    <img src={currentUser.avatarDataUrl} alt={currentUser.login} className="h-full w-full object-cover" />
                  ) : (
                    (currentUser.login?.[0] || 'U').toUpperCase()
                  )}
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 hover:text-black transition-colors"
                  title="Настройки"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button onClick={handleLogout} className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 hover:text-red-500 transition-colors" title="Выйти">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => navigate(ownProfilePath(currentUser))}
                className="sm:hidden h-9 w-9 rounded-full border border-gray-200 overflow-hidden bg-white text-xs font-bold text-gray-700"
                title={currentUser.login || 'Профиль'}
              >
                {currentUser.avatarDataUrl ? (
                  <img src={currentUser.avatarDataUrl} alt={currentUser.login} className="h-full w-full object-cover" />
                ) : (
                  (currentUser.login?.[0] || 'U').toUpperCase()
                )}
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="sm:hidden h-9 min-w-9 px-2 rounded-full border border-gray-300 text-gray-700"
                title="Настройки"
              >
                <Settings className="w-4 h-4" />
              </button>
              </>
            ) : (
              <>
              <div className="hidden sm:flex items-center gap-3 ml-2 border-l pl-4 border-gray-200">
                <button onClick={() => navigate('/login')} className="text-sm font-semibold hover:text-black">Войти</button>
                <button onClick={() => navigate('/register')} className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-800">Регистрация</button>
              </div>
              <div className="sm:hidden flex items-center gap-2">
                <button onClick={() => navigate('/login')} className="min-h-9 text-xs font-semibold rounded-full border border-gray-300 px-3 py-1.5">Войти</button>
                <button onClick={() => navigate('/register')} className="min-h-9 text-xs font-semibold rounded-full bg-black text-white px-3 py-1.5 hover:bg-gray-800">Регистрация</button>
              </div>
              </>
            )}
          </motion.div>

          <nav className="md:hidden grid w-full grid-cols-4 gap-1 border-t border-gray-100 pt-2 text-center text-xs font-semibold text-gray-700">
            <button onClick={handleSellOpen} className="min-h-9 rounded-lg px-1 hover:bg-gray-100 hover:text-black transition-colors">Продать</button>
            <button onClick={() => navigate('/catalog')} className="min-h-9 rounded-lg px-1 hover:bg-gray-100 hover:text-black transition-colors">Каталог</button>
            <button onClick={() => navigate('/help')} className="min-h-9 rounded-lg px-1 hover:bg-gray-100 hover:text-black transition-colors">Помощь</button>
            <button onClick={() => navigate('/about')} className="min-h-9 rounded-lg px-1 hover:bg-gray-100 hover:text-black transition-colors">О нас</button>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 pt-6 sm:pt-10">
        <div className="flex flex-col lg:flex-row gap-8">
          <main className="flex-1">
            <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <HomePage 
              filteredListings={filteredListings}
              ownerInfoByLogin={ownerInfoByLogin}
              openListingPage={openListingPage}
              openUserProfile={(login) => {
                void openUserProfile(login)
              }}
            />
          )}

          {currentPage === 'catalog' && (
            <CatalogPage 
              listings={listings}
              ownerInfoByLogin={ownerInfoByLogin}
              openListingPage={openListingPage}
              openUserProfile={(login) => {
                void openUserProfile(login)
              }}
            />
          )}

          {currentPage === 'listing' && selectedListing && (
            <ListingPage 
              selectedListing={selectedListing}
              ownerInfoByLogin={ownerInfoByLogin}
              handleAddToCart={handleAddToCart}
              navigateToHome={navigateToHome}
              apiBase={API_BASE}
              openUserProfile={(login) => {
                void openUserProfile(login)
              }}
            />
          )}

          {currentPage === 'cart' && (
            <CartPage 
              currentUser={currentUser}
              cart={cart}
              listings={listings}
              cartTotal={cartTotal}
              handleRemoveCartItem={handleRemoveCartItem}
            />
          )}

          {currentPage === 'chat' && (
            <ChatPage
              apiBase={API_BASE}
              accessToken={accessToken}
              currentLogin={currentUser?.login ?? ''}
              onIncomingMessage={() => {}}
              onActiveChatChange={setActiveChatLogin}
            />
          )}

          {currentPage === 'topup' && (
            <TopupPage
              balance={balance}
              topupAmount={topupAmount}
              setTopupAmount={setTopupAmount}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              handleTopup={handleTopup}
            />
          )}

          {currentPage === 'withdraw' && (
            <WithdrawPage
              balance={balance}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              withdrawMethod={withdrawMethod}
              setWithdrawMethod={setWithdrawMethod}
              withdrawDestination={withdrawDestination}
              setWithdrawDestination={setWithdrawDestination}
              handleWithdraw={handleWithdraw}
            />
          )}

          {currentPage === 'sell' && (
            <SellPage
              sellForm={sellForm}
              setSellForm={setSellForm}
              handleCreateListing={handleCreateListing}
              codeFile={codeFile}
              codeFileInputRef={codeFileInputRef}
              handleCodeFileChange={handleCodeFileChange}
              sellImagePreviews={sellImagePreviews}
              removeSellImage={removeSellImage}
              imageInputRef={imageInputRef}
              handleSellImageChange={handleSellImageChange}
              editingListingId={editingListingId}
              handleDeleteListing={handleDeleteListing}
            />
          )}

          {currentPage === 'help' && (
            <HelpPage 
              activeFaq={activeFaq} 
              setActiveFaq={setActiveFaq} 
              setIsContactOpen={setIsContactOpen} 
            />
          )}

          {currentPage === 'about' && (
            <AboutPage />
          )}

          {currentPage === 'register' && (
            <RegisterPage
              registerForm={registerForm}
              setRegisterForm={setRegisterForm}
              handleRegister={handleRegister}
              isRegisterSubmitting={isRegisterSubmitting}
              registerCode={registerCode}
              setRegisterCode={setRegisterCode}
              pendingRegisterLogin={pendingRegisterLogin}
              handleVerifyRegisterCode={handleVerifyRegisterCode}
              handleResendRegisterCode={handleResendRegisterCode}
            />
          )}

          {currentPage === 'login' && (
            <LoginPage
              loginForm={loginForm}
              setLoginForm={setLoginForm}
              handleLogin={handleLogin}
              resetIdentifier={resetIdentifier}
              setResetIdentifier={setResetIdentifier}
              resetCode={resetCode}
              setResetCode={setResetCode}
              resetNewPassword={resetNewPassword}
              setResetNewPassword={setResetNewPassword}
              resetStep={resetStep}
              setResetStep={setResetStep}
              handleSendResetCode={handleSendResetCode}
              handleVerifyResetCode={handleVerifyResetCode}
              handleResetPassword={handleResetPassword}
            />
          )}

          {currentPage === 'profile' && (
            <ProfilePage
              currentUser={currentUser}
              viewedUser={profileUser}
              isOwnProfile={!!currentUser?.publicId && currentUser.publicId === viewedProfilePublicId}
              balance={balance}
              listings={listings}
              apiBase={API_BASE}
              accessToken={accessToken}
              handleEditListing={handleEditListing}
              openListingPage={openListingPage}
              openUserProfile={(login) => {
                void openUserProfile(login)
              }}
            />
          )}

          {currentPage === 'settings' && currentUser && (
            <SettingsPage
              currentUser={currentUser}
              onUpdateAccountSettings={handleAccountSettingsUpdate}
              onAccountUpdated={(user) => setCurrentUser(user)}
              onRequestEmailChangeCode={handleRequestEmailChangeCode}
              onConfirmEmailChange={handleConfirmEmailChange}
              themeMode={themeMode}
              onThemeModeChange={setThemeMode}
              darkThemeVariant={darkThemeVariant}
              onDarkThemeVariantChange={setDarkThemeVariant}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isContactOpen && (
            <ContactModal 
              setIsContactOpen={setIsContactOpen} 
              setError={setError} 
              setSuccessMessage={setSuccessMessage} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              key="toast-error"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-6 z-50 sm:max-w-sm"
              role="alert"
            >
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-lg shadow-red-500/10 backdrop-blur">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1 leading-snug">{error}</p>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="rounded-md p-1 text-red-400 hover:text-red-600 hover:bg-red-100"
                  aria-label="Закрыть уведомление"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {successMessage && (
            <motion.div
              key="toast-success"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed top-16 inset-x-4 sm:inset-x-auto sm:right-6 z-50 sm:max-w-sm"
              role="status"
            >
              <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50/95 px-4 py-3 text-sm text-green-700 shadow-lg shadow-green-500/10 backdrop-blur">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="flex-1 leading-snug">{successMessage}</p>
                <button
                  type="button"
                  onClick={() => setSuccessMessage('')}
                  className="rounded-md p-1 text-green-400 hover:text-green-600 hover:bg-green-100"
                  aria-label="Закрыть уведомление"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </main>

          {/* Right Sidebar - Recommendations */}
          {(currentPage === 'home' || currentPage === 'catalog') && (
            <aside className="w-full lg:w-72 hidden md:block shrink-0 mt-4 md:mt-0">
              <h3 className="text-xl font-extrabold text-blue-950 mb-4">Рекомендации</h3>
              <div className="space-y-4">
                {listings.slice(0, 3).map((item) => (
                  <div key={item.id} onClick={() => openListingPage(item.id)} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg cursor-pointer transition-shadow bg-white pb-3">
                    <div className="bg-blue-50 h-24 mb-2 p-2 relative">
                      {item.imageDataUrls && item.imageDataUrls.length > 0 ? (
                        <div className="w-full h-full bg-cover bg-center rounded opacity-80" style={{ backgroundImage: `url(${item.imageDataUrls[0]})` }}></div>
                      ) : (
                        <div className="w-full h-full bg-cover bg-center rounded opacity-80" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop)' }}></div>
                      )}
                    </div>
                    <h4 className="font-semibold px-3 text-sm leading-tight text-gray-900 line-clamp-2">{item.title}</h4>
                    <p className="px-3 mt-1 text-xs text-gray-500 font-medium">{item.price.toLocaleString('ru-RU')} ₽</p>
                  </div>
                ))}
                {listings.length === 0 && (
                  <p className="text-xs text-gray-400">Нет доступных проектов...</p>
                )}
              </div>
            </aside>
          )}

        </div>
      </div>

      {/* FOOTER */}
      {currentPage === 'home' && (
      <footer className="mt-auto border-t border-gray-900 bg-black text-gray-400 py-6 px-4 sm:px-6 lg:px-8 footer-shell">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-black text-white tracking-tighter cursor-pointer" onClick={navigateToHome}>
              NECRO<span className="text-gray-500">CODE</span>
            </h2>
            <p className="text-xs font-semibold text-gray-500 hidden sm:block footer-muted">
              © {new Date().getFullYear()} Все права защищены.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-medium">
            <button onClick={() => navigate('/sell')} className="hover:text-white transition-colors footer-link">Продать</button>
            <button onClick={() => navigate('/about')} className="hover:text-white transition-colors footer-link">О нас</button>
            <button onClick={() => navigate('/help')} className="hover:text-white transition-colors footer-link">Помощь</button>
          </div>

          <a
            href="mailto:support_team@necrocode.ru"
            className="text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition-colors footer-link"
          >
            support_team@necrocode.ru
          </a>
        </div>
      </footer>
      )}
    </div>
  )
}

export default App
