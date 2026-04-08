import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  ArrowDownToLine,
  Bell,
  Box,
  FileCode,
  ImagePlus,
  Link2,
  LogOut,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  Upload,
  UserCircle,
  Wallet,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

type Page = 'home' | 'topup' | 'sell' | 'help' | 'about' | 'login' | 'register' | 'profile' | 'cart' | 'listing'
type DeliveryMode = 'auto' | 'manual'

type User = {
  id: number
  login: string
  email?: string
  displayName?: string
  createdAt?: string
}

type AuthResponse = {
  accessToken: string
  user: User
}

type Listing = {
  id: number
  title: string
  description: string
  price: number
  ownerLogin: string
  deliveryMode: DeliveryMode
  projectUrl?: string
  codeFileName?: string
  imageDataUrls: string[]
  createdAt: string
}

type CartItem = {
  listingId: number
  qty: number
}

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
  const [searchQuery, setSearchQuery] = useState('')

  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [topupAmount, setTopupAmount] = useState<number | ''>(1000)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'sbp'>('card')
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
      setError('Введите сумму пополнения не менее 100 ₽.')
      return
    }

    setBalance((prev) => prev + amount)
    setError('Баланс успешно пополнен.')
  }

  const handleCreateListing = async (e: FormEvent) => {
    e.preventDefault()
    if (!requireAuth()) return

    const price = Number(sellForm.price)
    if (!sellForm.title.trim() || !sellForm.description.trim() || !Number.isFinite(price) || price <= 0) {
      setError('Заполните название, описание и корректную цену проекта.')
      return
    }

    if (!codeFile && !sellForm.projectUrl.trim()) {
      setError('Нужно приложить файл проекта или ссылку на репозиторий.')
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

      const res = await fetchWithAuth('/listings', {
        method: 'POST',
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
      setListings((prev) => [created, ...prev])
      setSellForm({ title: '', description: '', price: '', projectUrl: '', deliveryMode: 'auto' })
      setSellImages([])
      setCodeFile(null)
      setError('Проект опубликован.')
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
                    <button className="flex items-center gap-1 bg-white text-black border border-gray-300 text-xs px-2.5 py-1.5 rounded-lg">
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
            <Bell className="w-5 h-5 hidden sm:block" />

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
            <motion.section key="home" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-12">
                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1 space-y-4 max-w-sm">
                    <h1 className="text-2xl font-bold">Информация о приложении</h1>
                    <p className="text-base text-gray-600 leading-relaxed font-medium">Маркетплейс для покупки и продажи незавершенных IT-проектов.</p>
                  </div>
                  <div className="flex-[2] w-full h-80 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <Box className="w-24 h-24 text-gray-400" />
                  </div>
                </motion.section>

                <section className="space-y-6">
                  <h2 className="text-2xl font-bold">Каталог</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredListings.map((item, i) => (
                      <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className="space-y-3 rounded-xl border bg-white p-3">
                        <button onClick={() => openListingPage(item.id)} className="w-full text-left">
                          <div className="bg-gray-200 aspect-[4/3] rounded-xl flex items-center justify-center overflow-hidden">
                            {item.imageDataUrls[0] ? <img src={item.imageDataUrls[0]} alt={item.title} className="h-full w-full object-cover" /> : <Box className="w-12 h-12 text-gray-400" />}
                          </div>
                        </button>
                        <div className="space-y-1">
                          <button onClick={() => openListingPage(item.id)} className="text-left font-semibold text-gray-900 hover:underline">{item.title}</button>
                          <p className="line-clamp-2 text-sm text-gray-500">{item.description}</p>
                          <p className="text-sm text-gray-500">Продавец: {item.ownerLogin}</p>
                          <p className="font-bold text-lg">{item.price.toLocaleString('ru-RU')} ₽</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openListingPage(item.id)} className="flex-1 rounded-lg border px-3 py-2 text-sm">Подробнее</button>
                          <button onClick={() => handleAddToCart(item.id)} className="flex-1 rounded-lg bg-black px-3 py-2 text-sm text-white">В корзину</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {filteredListings.length === 0 && <p className="text-sm text-gray-500">По вашему запросу ничего не найдено.</p>}
                </section>
              </div>
              <aside className="space-y-6">
                <h2 className="text-xl font-bold">Рекомендации</h2>
                <div className="space-y-4">
                  {listings.slice(0, 3).map((item) => (
                    <button key={item.id} onClick={() => openListingPage(item.id)} className="w-full rounded-xl border p-3 text-left hover:bg-gray-50 transition-colors">
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.price.toLocaleString('ru-RU')} ₽</p>
                    </button>
                  ))}
                </div>
              </aside>
            </motion.section>
          )}

          {currentPage === 'listing' && selectedListing && (
            <motion.section key="listing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="aspect-[4/3] rounded-2xl border bg-gray-100 overflow-hidden flex items-center justify-center">
                  {selectedListing.imageDataUrls[0] ? <img src={selectedListing.imageDataUrls[0]} alt={selectedListing.title} className="h-full w-full object-cover" /> : <Box className="h-16 w-16 text-gray-400" />}
                </div>
                {selectedListing.imageDataUrls.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {selectedListing.imageDataUrls.slice(1).map((url, index) => (
                      <img key={`${selectedListing.id}-${index}`} src={url} alt="Project screenshot" className="h-20 w-full rounded-lg border object-cover" />
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4 rounded-2xl border p-6">
                <h1 className="text-3xl font-bold">{selectedListing.title}</h1>
                <p className="text-sm text-gray-500">Продавец: {selectedListing.ownerLogin}</p>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedListing.description}</p>
                <p className="text-2xl font-bold">{selectedListing.price.toLocaleString('ru-RU')} ₽</p>
                <p className="text-sm text-gray-500">Выдача: {selectedListing.deliveryMode === 'auto' ? 'Автовыдача' : 'Ручная передача'}</p>
                {selectedListing.codeFileName && <p className="text-sm">Файл проекта: <b>{selectedListing.codeFileName}</b></p>}
                {selectedListing.projectUrl && (
                  <a href={selectedListing.projectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 underline">
                    <Link2 className="h-4 w-4" /> Открыть ссылку на проект
                  </a>
                )}
                <div className="flex items-center gap-3 pt-3">
                  <button onClick={() => handleAddToCart(selectedListing.id)} className="rounded-xl bg-black px-4 py-2 text-white">Добавить в корзину</button>
                  <button onClick={navigateToHome} className="rounded-xl border px-4 py-2">Назад в каталог</button>
                </div>
              </div>
            </motion.section>
          )}

          {currentPage === 'cart' && (
            <motion.section key="cart" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-4xl mx-auto space-y-6">
              <h1 className="text-2xl font-bold">Корзина</h1>
              {!currentUser && <p className="rounded-xl bg-yellow-50 px-4 py-3 text-sm">Корзина сохраняется только для авторизованных пользователей.</p>}
              {cart.length === 0 ? (
                <p className="rounded-xl border px-4 py-6 text-center text-gray-500">Корзина пока пуста.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const listing = listings.find((entry) => entry.id === item.listingId)
                    if (!listing) return null
                    return (
                      <div key={item.listingId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                        <div>
                          <p className="font-semibold">{listing.title}</p>
                          <p className="text-sm text-gray-500">{listing.price.toLocaleString('ru-RU')} ₽ за единицу</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleQtyChange(item.listingId, -1)} className="h-8 w-8 rounded-lg border">-</button>
                          <span className="w-8 text-center">{item.qty}</span>
                          <button onClick={() => handleQtyChange(item.listingId, 1)} className="h-8 w-8 rounded-lg border">+</button>
                        </div>
                        <p className="font-semibold">{(listing.price * item.qty).toLocaleString('ru-RU')} ₽</p>
                        <button onClick={() => handleRemoveCartItem(item.listingId)} className="rounded-lg border p-2 text-gray-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 font-semibold">
                    <span>Итого</span>
                    <span>{cartTotal.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <button className="w-full rounded-xl bg-black py-3 text-white">Оформить и сохранить покупку</button>
                </div>
              )}
            </motion.section>
          )}

          {currentPage === 'topup' && (
            <motion.section key="topup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-3xl mx-auto bg-white border rounded-2xl shadow-sm p-8 space-y-6">
              <h1 className="text-2xl font-bold">Пополнение баланса</h1>
              <p className="text-sm text-gray-500">Текущий баланс: <b>{balance.toLocaleString('ru-RU')} ₽</b></p>
              <div className="space-y-4">
                <label className="text-sm font-medium">Сумма пополнения (₽)</label>
                <div className="flex flex-wrap gap-2">
                  {[100, 500, 1000, 2000, 5000].map((amount) => (
                    <button key={amount} onClick={() => setTopupAmount(amount)} className={`px-4 py-2 border rounded-xl ${topupAmount === amount ? 'bg-black text-white' : ''}`}>{amount} ₽</button>
                  ))}
                </div>
                <input type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" min="100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => setPaymentMethod('card')} className={`border rounded-xl p-4 ${paymentMethod === 'card' ? 'border-black' : ''}`}>Банковская карта</button>
                <button onClick={() => setPaymentMethod('sbp')} className={`border rounded-xl p-4 ${paymentMethod === 'sbp' ? 'border-black' : ''}`}>СБП / QR</button>
              </div>
              <button onClick={handleTopup} className="w-full rounded-xl bg-black py-3 text-white">Перейти к оплате</button>
            </motion.section>
          )}

          {currentPage === 'sell' && (
            <motion.section key="sell" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-2xl mx-auto bg-white border rounded-2xl shadow-sm p-6 sm:p-8">
              <h1 className="text-2xl font-bold mb-4">Разместить объявление</h1>
              <form onSubmit={handleCreateListing} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Название проекта</label>
                  <input value={sellForm.title} onChange={(e) => setSellForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-xl border px-4 py-2" placeholder="Например: SaaS для автоматизации продаж" required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Описание проекта</label>
                  <textarea value={sellForm.description} onChange={(e) => setSellForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full min-h-[120px] rounded-xl border px-4 py-2" placeholder="Опишите стек, готовность, что нужно доработать" required />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Цена (₽)</label>
                    <input type="number" value={sellForm.price} onChange={(e) => setSellForm((prev) => ({ ...prev, price: e.target.value }))} className="w-full rounded-xl border px-4 py-2" min="1" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Способ выдачи</label>
                    <select value={sellForm.deliveryMode} onChange={(e) => setSellForm((prev) => ({ ...prev, deliveryMode: e.target.value as DeliveryMode }))} className="w-full rounded-xl border px-4 py-2">
                      <option value="auto">Автовыдача</option>
                      <option value="manual">Ручная передача</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ссылка на проект (GitHub/GitLab)</label>
                  <input value={sellForm.projectUrl} onChange={(e) => setSellForm((prev) => ({ ...prev, projectUrl: e.target.value }))} className="w-full rounded-xl border px-4 py-2" placeholder="https://github.com/user/repo" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Файл с кодом (zip/rar/7z)</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => codeFileInputRef.current?.click()} className="rounded-xl border px-4 py-2">Выбрать файл</button>
                    {codeFile && <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-sm"><FileCode className="h-4 w-4" /> {codeFile.name}</span>}
                  </div>
                  <input ref={codeFileInputRef} type="file" accept=".zip,.rar,.7z,.tar,.gz,.txt,.md,.pdf" className="hidden" onChange={handleCodeFileChange} />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Фото проекта (до 5 шт)</label>
                  <div className="flex flex-wrap gap-3">
                    {sellImagePreviews.map((src, index) => (
                      <div key={`${src}-${index}`} className="relative h-24 w-24 overflow-hidden rounded-xl border">
                        <img src={src} alt="Project preview" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removeSellImage(index)} className="absolute right-1 top-1 rounded-full bg-white/90 p-1">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {sellImagePreviews.length < 5 && (
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed text-gray-500 hover:bg-gray-50">
                        <ImagePlus className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                  <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSellImageChange} />
                </div>

                <button className="w-full rounded-xl bg-black py-2.5 text-white inline-flex items-center justify-center gap-2" type="submit">
                  <Upload className="h-4 w-4" /> Опубликовать объявление
                </button>
              </form>
            </motion.section>
          )}

          {currentPage === 'help' && (
            <motion.section key="help" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-3xl mx-auto bg-white border rounded-2xl shadow-sm p-6 sm:p-8">
              <h1 className="text-2xl font-bold mb-6 text-center">Помощь и FAQ</h1>
              {[
                { q: 'Как купить товар?', a: 'Откройте страницу лота, добавьте его в корзину и оформите покупку.' },
                { q: 'Как продать проект?', a: 'Нажмите Продать, заполните форму и прикрепите файл или ссылку.' },
                { q: 'Как работает сессия?', a: 'Refresh cookie + access token.' },
              ].map((faq, idx) => (
                <div key={idx} onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} className="border rounded-xl p-4 mb-3 cursor-pointer">
                  <div className="font-bold flex justify-between">{faq.q}<span>{activeFaq === idx ? '-' : '+'}</span></div>
                  <AnimatePresence>
                    {activeFaq === idx && (
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-gray-600 mt-2 overflow-hidden">{faq.a}</motion.p>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              <div className="mt-8 text-center">
                <button onClick={() => setIsContactOpen(true)} className="rounded-xl bg-black px-4 py-2 text-white">Связаться с поддержкой</button>
              </div>
            </motion.section>
          )}

          {currentPage === 'about' && (
            <motion.section key="about" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-3xl mx-auto bg-white border rounded-2xl shadow-sm p-6 sm:p-8">
              <h1 className="text-3xl font-bold mb-3">О нас</h1>
              <p className="text-gray-600">NecroCode - платформа для продажи и покупки незавершенных IT-проектов.</p>
            </motion.section>
          )}

          {currentPage === 'register' && (
            <motion.section key="register" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-2xl border p-6 bg-white shadow-sm">
              <h1 className="mb-4 text-2xl font-bold">Регистрация</h1>
              <form className="space-y-3" onSubmit={handleRegister}>
                <input className="w-full rounded-xl border px-4 py-2" placeholder="Логин" value={registerForm.login} onChange={(e) => setRegisterForm((prev) => ({ ...prev, login: e.target.value }))} required />
                <input className="w-full rounded-xl border px-4 py-2" type="email" placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))} required />
                <input className="w-full rounded-xl border px-4 py-2" placeholder="Отображаемое имя" value={registerForm.displayName} onChange={(e) => setRegisterForm((prev) => ({ ...prev, displayName: e.target.value }))} />
                <input className="w-full rounded-xl border px-4 py-2" type="password" placeholder="Пароль" value={registerForm.password} onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))} required />
                <button className="w-full rounded-xl bg-black py-2 text-white" type="submit">Создать аккаунт</button>
              </form>
            </motion.section>
          )}

          {currentPage === 'login' && (
            <motion.section key="login" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-2xl border p-6 bg-white shadow-sm">
              <h1 className="mb-4 text-2xl font-bold">Авторизация</h1>
              <form className="space-y-3" onSubmit={handleLogin}>
                <input className="w-full rounded-xl border px-4 py-2" placeholder="Логин" value={loginForm.login} onChange={(e) => setLoginForm((prev) => ({ ...prev, login: e.target.value }))} required />
                <input className="w-full rounded-xl border px-4 py-2" type="password" placeholder="Пароль" value={loginForm.password} onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))} required />
                <button className="w-full rounded-xl bg-black py-2 text-white" type="submit">Войти</button>
              </form>
            </motion.section>
          )}

          {currentPage === 'profile' && (
            <motion.section key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-2xl border p-6 bg-white shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <UserCircle className="h-10 w-10" />
                <div>
                  <h1 className="text-xl font-bold">Профиль</h1>
                  <p className="text-sm text-gray-500">Защищенная страница</p>
                </div>
              </div>
              {currentUser ? (
                <div className="space-y-2 text-sm">
                  <p><b>ID:</b> {currentUser.id}</p>
                  <p><b>Логин:</b> {currentUser.login}</p>
                  <p><b>Email:</b> {currentUser.email || '-'}</p>
                  <p><b>Имя:</b> {currentUser.displayName || '-'}</p>
                  <p><b>Баланс:</b> {balance.toLocaleString('ru-RU')} ₽</p>
                </div>
              ) : (
                <p className="text-red-600">Сессия не найдена. Войдите заново.</p>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isContactOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={() => setIsContactOpen(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-xl">
                <button onClick={() => setIsContactOpen(false)} className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </button>
                <h2 className="text-2xl font-bold mb-2">Написать нам</h2>
                <p className="text-sm text-gray-500 mb-5">Мы ответим вам в течение 24 часов.</p>
                <form onSubmit={(e) => { e.preventDefault(); setIsContactOpen(false); setError('Сообщение отправлено в поддержку.') }} className="space-y-3">
                  <input type="email" required placeholder="example@mail.com" className="w-full rounded-xl border px-4 py-2" />
                  <textarea required placeholder="Опишите проблему" className="w-full min-h-[120px] rounded-xl border px-4 py-2" />
                  <button type="submit" className="w-full rounded-xl bg-black py-2 text-white inline-flex items-center justify-center gap-2"><Send className="h-4 w-4" /> Отправить сообщение</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {error && <p className="mx-auto mt-6 max-w-md rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      </main>
    </div>
  )
}

export default App
