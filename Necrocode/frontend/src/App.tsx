import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  ArrowDownToLine,
  Bell,
  LogOut,
  Plus,
  Search,
  ShoppingCart,
  Wallet,
  X,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { HomePage } from './pages/HomePage'
import { ListingPage } from './pages/ListingPage'
import { CartPage } from './pages/CartPage'
import { TopupPage } from './pages/TopupPage'
import { WithdrawPage } from './pages/WithdrawPage'
import { SellPage } from './pages/SellPage'
import { HelpPage, AboutPage, ContactModal } from './pages/InfoPages'
import { RegisterPage, LoginPage, ProfilePage } from './pages/AuthPages'
import type { Page, User, AuthResponse, Listing, CartItem, DeliveryMode, AppNotification } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const DEFAULT_LISTINGS: Listing[] = [
  {
    id: 1,
    title: 'CRM для онлайн-курсов',
    description: 'Готовый MVP для школы с оплатами, кабинетами и рассылками.',
    price: 32000,
    ownerLogin: 'demo_seller',
    deliveryMode: 'manual',
    imageDataUrls: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'AI чат для поддержки',
    description: 'Полуготовый сервис с векторным поиском и историей обращений.',
    price: 48000,
    ownerLogin: 'ai_team',
    deliveryMode: 'auto',
    imageDataUrls: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'Парсер вакансий + дашборд',
    description: 'Собирает вакансии из API, агрегирует статистику по ролям и грейдам.',
    price: 19000,
    ownerLogin: 'parser_dev',
    deliveryMode: 'auto',
    imageDataUrls: [],
    createdAt: new Date().toISOString(),
  },
]

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
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null)

  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'))
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const addNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const newNotif: AppNotification = {
      id: Date.now(),
      message,
      type,
      createdAt: new Date().toISOString(),
      read: false
    }
    setNotifications(prev => [newNotif, ...prev])
    
    // Play sound on new notification
    try {
      const audio = new Audio('data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq')
      audio.volume = 0.2
      // A quick silent base64 for now, usually you'd want a real sound file url or a proper bell base64 here
      // Replace with actual short bell sound data if needed
      audio.play().catch(() => {})
    } catch (e) {}
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
    projectUrl: '',
    deliveryMode: 'auto' as DeliveryMode,
  })
  const [editingListingId, setEditingListingId] = useState<number | null>(null)
  const [sellImages, setSellImages] = useState<File[]>([])
  const [sellImagePreviews, setSellImagePreviews] = useState<string[]>([])
  const [codeFile, setCodeFile] = useState<File | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const codeFileInputRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ login: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ login: '', email: '', displayName: '', password: '' })

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

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart])
  const cartTotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const listing = listings.find((entry) => entry.id === item.listingId)
        return sum + (listing ? listing.price * item.qty : 0)
      }, 0),
    [cart, listings],
  )

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
    setCart(data)
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

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
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

      const data = (await res.json()) as AuthResponse
      saveSession(data)
      setCurrentPage('profile')
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
      setCurrentPage('profile')
    } catch {
      setError('Сервер недоступен. Проверьте, что стек запущен, и попробуйте снова.')
    }
  }

  const handleEditListing = (listing: Listing) => {
    setEditingListingId(listing.id)
    setSellForm({
      title: listing.title,
      description: listing.description,
      price: listing.price.toString(),
      projectUrl: listing.projectUrl || '',
      deliveryMode: listing.deliveryMode,
    })
    setSellImagePreviews(listing.imageDataUrls || [])
    setCurrentPage('sell')
  }

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    clearSession()
    setCurrentPage('home')
  }

  const navigateToHome = () => {
    setCurrentPage('home')
    setSelectedListingId(null)
    setError('')
    setSuccessMessage('')
  }

  const requireAuth = () => {
    if (currentUser) return true
    setError('Чтобы использовать эту функцию, зарегистрируйтесь или войдите в аккаунт.')
    setCurrentPage('register')
    return false
  }

  const handleSellOpen = () => {
    if (!requireAuth()) return
    setError('')
    setSuccessMessage('')
    setCurrentPage('sell')
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
      const existing = cart.find((item) => item.listingId === listingId)
      const qty = Math.min((existing?.qty ?? 0) + 1, 99)
      await saveCartItem(listingId, qty)
      await loadCartFromServer()
      setError('')
    } catch {
      setError('Не удалось обновить корзину')
    }
  }

  const handleQtyChange = async (listingId: number, delta: number) => {
    try {
      const existing = cart.find((item) => item.listingId === listingId)
      if (!existing) return

      const nextQty = Math.max(1, Math.min(99, existing.qty + delta))
      await saveCartItem(listingId, nextQty)
      await loadCartFromServer()
    } catch {
      setError('Не удалось изменить количество в корзине')
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
    setSelectedListingId(listingId)
    setCurrentPage('listing')
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
    setCurrentPage('home')
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

      const payload = {
        title: sellForm.title.trim(),
        description: sellForm.description.trim(),
        price,
        deliveryMode: sellForm.deliveryMode,
        projectUrl: sellForm.projectUrl.trim(),
        codeFileName: codeFile?.name,
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

      setSellForm({ title: '', description: '', price: '', projectUrl: '', deliveryMode: 'auto' })
      setEditingListingId(null)
      setSellImages([])
      setCodeFile(null)
      setError('')
      setSuccessMessage('Проект опубликован.')
      setCurrentPage('home')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось опубликовать проект.'
      setError(message)
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="fixed top-0 w-full bg-white border-b z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <button className="font-bold text-xl" onClick={navigateToHome}>NecroCode</button>
            <nav className="hidden md:flex flex-row items-center gap-7 font-medium text-base">
              <button onClick={handleSellOpen} className="hover:text-blue-600 transition-colors">Продать</button>
              <button onClick={navigateToHome} className="hover:text-blue-600 transition-colors">Каталог</button>
              <button onClick={() => setCurrentPage('help')} className="hover:text-blue-600 transition-colors">Помощь</button>
              <button onClick={() => setCurrentPage('about')} className="hover:text-blue-600 transition-colors">О нас</button>
            </nav>
          </div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 sm:gap-5">
            <div className="flex items-center relative h-8 justify-end">
              <AnimatePresence mode="wait">
                {isSearchOpen && (
                  <motion.input
                    autoFocus
                    key="searchInput"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '240px', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="absolute right-0 outline-none bg-gray-100 border border-gray-200 text-base text-gray-800 overflow-hidden whitespace-nowrap rounded-full pl-4 pr-10 py-1.5 focus:bg-white focus:border-black shadow-inner"
                  />
                )}
              </AnimatePresence>
              <button onClick={() => setIsSearchOpen((prev) => !prev)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors" title="Поиск">
                <Search className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center relative h-8 rounded-full bg-gray-50">
              <AnimatePresence mode="wait">
                {isWalletOpen && (
                  <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="flex items-center pl-4 overflow-hidden gap-3 whitespace-nowrap">
                    <span className="font-bold text-sm">{balance.toLocaleString('ru-RU')} ₽</span>
                    <button onClick={() => { setCurrentPage('topup'); setIsWalletOpen(false) }} className="flex items-center gap-1 bg-black text-white text-xs px-2.5 py-1.5 rounded-lg">
                      <Plus className="w-3 h-3" /> Пополнить
                    </button>
                    <button onClick={() => { setCurrentPage('withdraw'); setIsWalletOpen(false) }} className="flex items-center gap-1 bg-white text-black border border-gray-300 text-xs px-2.5 py-1.5 rounded-lg">
                      <ArrowDownToLine className="w-3 h-3" /> Вывести
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={() => setIsWalletOpen((prev) => !prev)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors" title="Кошелек">
                <Wallet className="w-5 h-5" />
              </button>
            </div>

            <button onClick={() => setCurrentPage('cart')} className="relative rounded-full p-1 hover:bg-gray-100 transition-colors" title="Корзина">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>}
            </button>
            <div className="relative hidden sm:block">
              <button 
                onClick={() => setIsNotificationsOpen(p => !p)} 
                className="relative rounded-full p-1 hover:bg-gray-100 transition-colors"
                title="Уведомления"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center select-none shadow-sm animate-pulse">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
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
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage('profile')} className="bg-black text-white px-3 py-2 rounded-full text-sm">{currentUser.login}</button>
                <button onClick={handleLogout} className="border px-3 py-2 rounded-full"><LogOut className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage('login')} className="bg-black text-white px-3 py-2 rounded-full text-sm">ВОЙТИ</button>
                <button onClick={() => setCurrentPage('register')} className="border px-3 py-2 rounded-full text-sm">РЕГИСТРАЦИЯ</button>
              </div>
            )}
          </motion.div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && (
            <HomePage 
              searchQuery={searchQuery}
              filteredListings={filteredListings}
              listings={listings}
              openListingPage={openListingPage}
              handleAddToCart={handleAddToCart}
            />
          )}

          {currentPage === 'listing' && selectedListing && (
            <ListingPage 
              selectedListing={selectedListing}
              handleAddToCart={handleAddToCart}
              navigateToHome={navigateToHome}
            />
          )}

          {currentPage === 'cart' && (
            <CartPage 
              currentUser={currentUser}
              cart={cart}
              listings={listings}
              cartTotal={cartTotal}
              handleQtyChange={handleQtyChange}
              handleRemoveCartItem={handleRemoveCartItem}
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
            <RegisterPage registerForm={registerForm} setRegisterForm={setRegisterForm} handleRegister={handleRegister} />
          )}

          {currentPage === 'login' && (
            <LoginPage loginForm={loginForm} setLoginForm={setLoginForm} handleLogin={handleLogin} />
          )}

          {currentPage === 'profile' && (
            <ProfilePage currentUser={currentUser} balance={balance} listings={listings} handleEditListing={handleEditListing} />
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

        {error && <p className="mx-auto mt-6 max-w-md rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {successMessage && <p className="mx-auto mt-6 max-w-md rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">{successMessage}</p>}
      </main>
    </div>
  )
}

export default App
