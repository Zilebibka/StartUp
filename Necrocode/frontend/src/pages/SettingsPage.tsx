import { useMemo, useState } from 'react'
import { Bell, Camera, Lock, Settings, Shield, UserRound, UserX } from 'lucide-react'
import { motion } from 'framer-motion'
import type { User } from '../types'

type SettingsTab = 'profile' | 'security' | 'privacy' | 'notifications' | 'blacklist'

type PrivacyState = {
  showEmail: boolean
  showOnline: boolean
  allowDirectMessages: boolean
  allowProfileIndexing: boolean
}

type NotificationState = {
  emailNewReview: boolean
  emailDeals: boolean
  pushMessages: boolean
  pushImportant: boolean
}

interface SettingsPageProps {
  currentUser: User
  onUpdateAccountSettings: (payload: {
    currentPassword?: string
    email?: string
    newPassword?: string
    displayName?: string
  }) => Promise<void>
  onAccountUpdated: (user: User) => void
  onRequestEmailChangeCode: (newEmail: string) => Promise<void>
  onConfirmEmailChange: (newEmail: string, code: string) => Promise<void>
  themeMode: 'light' | 'dark'
  onThemeModeChange: (mode: 'light' | 'dark') => void
}

const PRIVACY_KEY_PREFIX = 'privacySettings_'
const NOTIFICATIONS_KEY_PREFIX = 'notificationSettings_'
const BLACKLIST_KEY_PREFIX = 'blacklistSettings_'
const PROFILE_SETTINGS_KEY_PREFIX = 'profileSettings_'

const defaultPrivacyState: PrivacyState = {
  showEmail: false,
  showOnline: true,
  allowDirectMessages: true,
  allowProfileIndexing: true,
}

const defaultNotificationState: NotificationState = {
  emailNewReview: true,
  emailDeals: true,
  pushMessages: true,
  pushImportant: true,
}

const isDataImage = (value: string) => value.startsWith('data:image/')

export function SettingsPage({ currentUser, onUpdateAccountSettings, onAccountUpdated, onRequestEmailChangeCode, onConfirmEmailChange, themeMode, onThemeModeChange }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [birthDate, setBirthDate] = useState(() => {
    const raw = localStorage.getItem(PROFILE_SETTINGS_KEY_PREFIX + currentUser.login)
    if (!raw) return ''

    try {
      const parsed = JSON.parse(raw) as { dob?: string }
      return parsed.dob ?? ''
    } catch {
      return ''
    }
  })

  const [displayName, setDisplayName] = useState(currentUser.displayName ?? '')
  const [displayNameMessage, setDisplayNameMessage] = useState('')
  const [displayNameError, setDisplayNameError] = useState('')
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false)

  const [securityMode, setSecurityMode] = useState<'password' | 'email'>('password')
  const [securityCurrentPassword, setSecurityCurrentPassword] = useState('')
  const [securityNewPassword, setSecurityNewPassword] = useState('')
  const [securityNewEmail, setSecurityNewEmail] = useState('')
  const [securityEmailCode, setSecurityEmailCode] = useState('')
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false)
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [securityMessage, setSecurityMessage] = useState('')
  const [securityError, setSecurityError] = useState('')
  const [isSavingSecurity, setIsSavingSecurity] = useState(false)

  const [avatarDataUrl, setAvatarDataUrl] = useState<string>(() => {
    const raw = localStorage.getItem(PROFILE_SETTINGS_KEY_PREFIX + currentUser.login)
    if (!raw) return ''

    try {
      const parsed = JSON.parse(raw) as { avatar?: string }
      return parsed.avatar && isDataImage(parsed.avatar) ? parsed.avatar : ''
    } catch {
      return ''
    }
  })
  const [avatarMessage, setAvatarMessage] = useState('')
  const [avatarError, setAvatarError] = useState('')

  const [privacy, setPrivacy] = useState<PrivacyState>(() => {
    const raw = localStorage.getItem(PRIVACY_KEY_PREFIX + currentUser.login)
    if (!raw) return defaultPrivacyState

    try {
      return { ...defaultPrivacyState, ...(JSON.parse(raw) as Partial<PrivacyState>) }
    } catch {
      return defaultPrivacyState
    }
  })
  const [privacyMessage, setPrivacyMessage] = useState('')

  const [notifications, setNotifications] = useState<NotificationState>(() => {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY_PREFIX + currentUser.login)
    if (!raw) return defaultNotificationState

    try {
      return { ...defaultNotificationState, ...(JSON.parse(raw) as Partial<NotificationState>) }
    } catch {
      return defaultNotificationState
    }
  })
  const [notificationMessage, setNotificationMessage] = useState('')

  const [blacklist, setBlacklist] = useState<string[]>(() => {
    const raw = localStorage.getItem(BLACKLIST_KEY_PREFIX + currentUser.login)
    if (!raw) return []

    try {
      const parsed = JSON.parse(raw) as string[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })
  const [blockedLoginInput, setBlockedLoginInput] = useState('')
  const [blacklistError, setBlacklistError] = useState('')

  const tabs = useMemo(
    () => [
      { id: 'profile' as const, label: 'Профиль', icon: UserRound },
      { id: 'security' as const, label: 'Безопасность', icon: Shield },
      { id: 'privacy' as const, label: 'Приватность', icon: Lock },
      { id: 'notifications' as const, label: 'Уведомления', icon: Bell },
      { id: 'blacklist' as const, label: 'Черный список', icon: UserX },
    ],
    [],
  )

  const persistProfileSettings = (next: Partial<{ dob: string; avatar: string }>) => {
    const key = PROFILE_SETTINGS_KEY_PREFIX + currentUser.login
    const raw = localStorage.getItem(key)
    let prev: { dob?: string; avatar?: string } = {}

    if (raw) {
      try {
        prev = JSON.parse(raw) as { dob?: string; avatar?: string }
      } catch {
        prev = {}
      }
    }

    localStorage.setItem(key, JSON.stringify({ ...prev, ...next }))
  }

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAvatarError('Можно загрузить только изображение.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      if (!isDataImage(dataUrl)) {
        setAvatarError('Не удалось прочитать изображение.')
        return
      }

      setAvatarDataUrl(dataUrl)
      setAvatarError('')
      setAvatarMessage('Аватар обновлен.')
      persistProfileSettings({ avatar: dataUrl })
    }
    reader.onerror = () => setAvatarError('Не удалось загрузить изображение.')
    reader.readAsDataURL(file)
  }

  const handleSaveDisplayName = async () => {
    setDisplayNameMessage('')
    setDisplayNameError('')

    const next = displayName.trim()
    if (!next) {
      setDisplayNameError('Введите отображаемое имя.')
      return
    }

    if (next.length > 100) {
      setDisplayNameError('Отображаемое имя должно быть не длиннее 100 символов.')
      return
    }

    setIsSavingDisplayName(true)
    try {
      await onUpdateAccountSettings({ displayName: next })
      onAccountUpdated({ ...currentUser, displayName: next })
      setDisplayNameMessage('Отображаемое имя обновлено.')
    } catch (err) {
      setDisplayNameError(err instanceof Error ? err.message : 'Не удалось обновить имя.')
    } finally {
      setIsSavingDisplayName(false)
    }
  }

  const handleSavePassword = async () => {
    setSecurityMessage('')
    setSecurityError('')

    if (!securityNewPassword.trim()) {
      setSecurityError('Введите новый пароль.')
      return
    }

    if (!securityCurrentPassword.trim()) {
      setSecurityError('Для изменения пароля нужен текущий пароль.')
      return
    }

    setIsSavingSecurity(true)
    try {
      await onUpdateAccountSettings({
        currentPassword: securityCurrentPassword.trim(),
        newPassword: securityNewPassword.trim(),
      })
      setSecurityMessage('Пароль успешно обновлен.')
      setSecurityCurrentPassword('')
      setSecurityNewPassword('')
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : 'Не удалось изменить пароль.')
    } finally {
      setIsSavingSecurity(false)
    }
  }

  const handleSendEmailCode = async () => {
    setSecurityMessage('')
    setSecurityError('')

    if (!securityNewEmail.trim()) {
      setSecurityError('Введите новый email.')
      return
    }

    setIsSendingEmailCode(true)
    try {
      await onRequestEmailChangeCode(securityNewEmail.trim())
      setEmailCodeSent(true)
      setSecurityMessage('Код подтверждения отправлен на новый email.')
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : 'Не удалось отправить код.')
    } finally {
      setIsSendingEmailCode(false)
    }
  }

  const handleConfirmEmail = async () => {
    setSecurityMessage('')
    setSecurityError('')

    if (!securityNewEmail.trim()) {
      setSecurityError('Введите новый email.')
      return
    }
    if (securityEmailCode.trim().length !== 6) {
      setSecurityError('Введите 6-значный код из письма.')
      return
    }

    setIsSavingSecurity(true)
    try {
      await onConfirmEmailChange(securityNewEmail.trim(), securityEmailCode.trim())
      onAccountUpdated({ ...currentUser, email: securityNewEmail.trim() })
      setSecurityMessage('Email успешно обновлен.')
      setSecurityEmailCode('')
      setEmailCodeSent(false)
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : 'Не удалось подтвердить смену email.')
    } finally {
      setIsSavingSecurity(false)
    }
  }

  const savePrivacy = () => {
    localStorage.setItem(PRIVACY_KEY_PREFIX + currentUser.login, JSON.stringify(privacy))
    setPrivacyMessage('Настройки приватности сохранены.')
  }

  const saveNotifications = () => {
    localStorage.setItem(NOTIFICATIONS_KEY_PREFIX + currentUser.login, JSON.stringify(notifications))
    setNotificationMessage('Настройки уведомлений сохранены.')
  }

  const addToBlacklist = () => {
    setBlacklistError('')
    const login = blockedLoginInput.trim().toLowerCase()

    if (!login) {
      setBlacklistError('Введите логин пользователя.')
      return
    }

    if (login === currentUser.login.toLowerCase()) {
      setBlacklistError('Нельзя добавить себя в черный список.')
      return
    }

    if (blacklist.includes(login)) {
      setBlacklistError('Пользователь уже в черном списке.')
      return
    }

    const next = [...blacklist, login]
    setBlacklist(next)
    setBlockedLoginInput('')
    localStorage.setItem(BLACKLIST_KEY_PREFIX + currentUser.login, JSON.stringify(next))
  }

  const removeFromBlacklist = (login: string) => {
    const next = blacklist.filter((entry) => entry !== login)
    setBlacklist(next)
    localStorage.setItem(BLACKLIST_KEY_PREFIX + currentUser.login, JSON.stringify(next))
  }

  const handleBirthDateChange = (nextDate: string) => {
    setBirthDate(nextDate)
    persistProfileSettings({ dob: nextDate })
  }

  return (
    <motion.section
      key="settings"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-auto max-w-6xl rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-900/5"
    >
      <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5 sm:px-8">
        <div className="h-10 w-10 rounded-xl bg-black text-white grid place-items-center">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Настройки профиля</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-r border-gray-100 p-4 sm:p-5">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition-colors flex items-center gap-3 ${
                    isActive ? 'bg-black text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="p-5 sm:p-8">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-900">Профиль</h2>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide mb-3">Отображаемое имя</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Ваше отображаемое имя"
                  />
                  <button
                    onClick={handleSaveDisplayName}
                    disabled={isSavingDisplayName}
                    className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                  >
                    {isSavingDisplayName ? 'Сохраняем...' : 'Сохранить'}
                  </button>
                </div>
                {displayNameError && <p className="mt-2 text-xs text-red-600">{displayNameError}</p>}
                {displayNameMessage && <p className="mt-2 text-xs text-emerald-600">{displayNameMessage}</p>}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide mb-3">Дата рождения</h3>
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest">Выберите дату рождения</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                    className="w-full max-w-sm rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide mb-3">Аватар</h3>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-white border border-gray-200 overflow-hidden">
                    {avatarDataUrl ? (
                      <img src={avatarDataUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-gray-400 font-black text-lg">{(currentUser.login[0] ?? 'U').toUpperCase()}</div>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:border-black">
                    <Camera className="h-4 w-4" />
                    Загрузить файл
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          void handleAvatarUpload(file)
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
                {avatarError && <p className="mt-2 text-xs text-red-600">{avatarError}</p>}
                {avatarMessage && <p className="mt-2 text-xs text-emerald-600">{avatarMessage}</p>}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <h3 className="text-sm font-extrabold text-gray-800 uppercase tracking-wide mb-3">Тема сайта</h3>
                <ToggleItem
                  label="Темная тема на всем сайте"
                  checked={themeMode === 'dark'}
                  onChange={(checked) => onThemeModeChange(checked ? 'dark' : 'light')}
                />
                <p className="mt-2 text-xs text-gray-500">Переключение применяется сразу ко всем страницам.</p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-900">Безопасность</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSecurityMode('password')
                    setSecurityError('')
                    setSecurityMessage('')
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${securityMode === 'password' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                >
                  Поменять пароль
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecurityMode('email')
                    setSecurityError('')
                    setSecurityMessage('')
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${securityMode === 'email' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                >
                  Поменять email
                </button>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-4">
                {securityMode === 'password' && (
                  <>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Текущий пароль</label>
                      <input
                        type="password"
                        value={securityCurrentPassword}
                        onChange={(e) => setSecurityCurrentPassword(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Введите текущий пароль"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Новый пароль</label>
                      <input
                        type="password"
                        value={securityNewPassword}
                        onChange={(e) => setSecurityNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="Минимум 8 символов"
                      />
                    </div>

                    <button
                      onClick={handleSavePassword}
                      disabled={isSavingSecurity}
                      className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {isSavingSecurity ? 'Сохраняем...' : 'Поменять пароль'}
                    </button>
                  </>
                )}

                {securityMode === 'email' && (
                  <>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Новый Email</label>
                      <input
                        type="email"
                        value={securityNewEmail}
                        onChange={(e) => setSecurityNewEmail(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="example@mail.com"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => { void handleSendEmailCode() }}
                      disabled={isSendingEmailCode}
                      className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-200 disabled:opacity-60"
                    >
                      {isSendingEmailCode ? 'Отправляем код...' : 'Отправить код'}
                    </button>

                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Код из письма</label>
                      <input
                        value={securityEmailCode}
                        onChange={(e) => setSecurityEmailCode(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="000000"
                        inputMode="numeric"
                        maxLength={6}
                        disabled={!emailCodeSent}
                      />
                    </div>

                    <button
                      onClick={() => { void handleConfirmEmail() }}
                      disabled={isSavingSecurity || !emailCodeSent}
                      className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-60"
                    >
                      {isSavingSecurity ? 'Сохраняем...' : 'Подтвердить и сменить email'}
                    </button>
                  </>
                )}

                {securityError && <p className="text-xs text-red-600">{securityError}</p>}
                {securityMessage && <p className="text-xs text-emerald-600">{securityMessage}</p>}
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-900">Приватность</h2>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-3">
                <ToggleItem label="Показывать email в профиле" checked={privacy.showEmail} onChange={(checked) => setPrivacy((prev) => ({ ...prev, showEmail: checked }))} />
                <ToggleItem label="Показывать статус онлайн" checked={privacy.showOnline} onChange={(checked) => setPrivacy((prev) => ({ ...prev, showOnline: checked }))} />
                <ToggleItem label="Разрешить личные сообщения" checked={privacy.allowDirectMessages} onChange={(checked) => setPrivacy((prev) => ({ ...prev, allowDirectMessages: checked }))} />
                <ToggleItem label="Разрешить индексацию профиля" checked={privacy.allowProfileIndexing} onChange={(checked) => setPrivacy((prev) => ({ ...prev, allowProfileIndexing: checked }))} />

                <button onClick={savePrivacy} className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800">
                  Сохранить приватность
                </button>
                {privacyMessage && <p className="text-xs text-emerald-600">{privacyMessage}</p>}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-900">Уведомления</h2>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 space-y-3">
                <ToggleItem label="Письма о новых отзывах" checked={notifications.emailNewReview} onChange={(checked) => setNotifications((prev) => ({ ...prev, emailNewReview: checked }))} />
                <ToggleItem label="Письма о сделках" checked={notifications.emailDeals} onChange={(checked) => setNotifications((prev) => ({ ...prev, emailDeals: checked }))} />
                <ToggleItem label="Push для сообщений" checked={notifications.pushMessages} onChange={(checked) => setNotifications((prev) => ({ ...prev, pushMessages: checked }))} />
                <ToggleItem label="Push для важных событий" checked={notifications.pushImportant} onChange={(checked) => setNotifications((prev) => ({ ...prev, pushImportant: checked }))} />

                <button onClick={saveNotifications} className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800">
                  Сохранить уведомления
                </button>
                {notificationMessage && <p className="text-xs text-emerald-600">{notificationMessage}</p>}
              </div>
            </div>
          )}

          {activeTab === 'blacklist' && (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-gray-900">Черный список</h2>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={blockedLoginInput}
                    onChange={(e) => setBlockedLoginInput(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Логин пользователя"
                  />
                  <button onClick={addToBlacklist} className="rounded-xl bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800">
                    Добавить
                  </button>
                </div>
                {blacklistError && <p className="mt-2 text-xs text-red-600">{blacklistError}</p>}

                <div className="mt-4 space-y-2">
                  {blacklist.length === 0 && <p className="text-sm text-gray-500">Черный список пуст.</p>}
                  {blacklist.map((login) => (
                    <div key={login} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm">
                      <span className="font-semibold text-gray-800">{login}</span>
                      <button onClick={() => removeFromBlacklist(login)} className="text-red-600 hover:text-red-700 font-bold">
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}

function ToggleItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors duration-300 ${
          checked ? 'border-black bg-black' : 'border-gray-300 bg-gray-300'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}
