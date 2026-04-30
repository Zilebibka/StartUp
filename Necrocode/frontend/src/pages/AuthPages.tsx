import { motion, AnimatePresence } from 'framer-motion'
import { Edit, ImagePlus, Wallet, Mail, Tag, Star } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { Listing, User } from '../types'

interface RegisterPageProps {
  registerForm: any;
  setRegisterForm: React.Dispatch<React.SetStateAction<any>>;
  handleRegister: (e: FormEvent) => Promise<void>;
  isRegisterSubmitting: boolean;
  registerCode: string;
  setRegisterCode: React.Dispatch<React.SetStateAction<string>>;
  pendingRegisterLogin: string;
  handleVerifyRegisterCode: (e: FormEvent) => Promise<void>;
  handleResendRegisterCode: () => Promise<void>;
}

export function RegisterPage({ registerForm, setRegisterForm, handleRegister, isRegisterSubmitting, registerCode, setRegisterCode, pendingRegisterLogin, handleVerifyRegisterCode, handleResendRegisterCode }: RegisterPageProps) {
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)

  useEffect(() => {
    setIsVerifyModalOpen(!!pendingRegisterLogin.trim())
  }, [pendingRegisterLogin])

  const closeVerifyModal = () => {
    setIsVerifyModalOpen(false)
  }

  return (
    <motion.section key="register" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-3xl border border-gray-100 p-5 sm:p-8 bg-white shadow-xl shadow-gray-900/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gray-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      <h1 className="mb-6 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Регистрация</h1>
      <form className="space-y-4 relative z-10" onSubmit={handleRegister}>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Логин</label>
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white" placeholder="Ваш логин" value={registerForm.login} onChange={(e) => setRegisterForm((prev: any) => ({ ...prev, login: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white" type="email" placeholder="example@mail.com" value={registerForm.email} onChange={(e) => setRegisterForm((prev: any) => ({ ...prev, email: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Отображаемое имя</label>
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white" placeholder="Имя профиля" value={registerForm.displayName} onChange={(e) => setRegisterForm((prev: any) => ({ ...prev, displayName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Пароль</label>
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white" type="password" placeholder="••••••••" value={registerForm.password} onChange={(e) => setRegisterForm((prev: any) => ({ ...prev, password: e.target.value }))} required />
        </div>
        <button
          className="w-full rounded-xl bg-gray-900 hover:bg-black disabled:bg-gray-500 disabled:cursor-not-allowed py-3.5 text-white font-bold shadow-lg shadow-gray-900/20 transition-all active:scale-[0.98] mt-2"
          type="submit"
          disabled={isRegisterSubmitting}
        >
          {isRegisterSubmitting ? 'Отправляем код...' : 'Создать аккаунт'}
        </button>
      </form>

      <AnimatePresence>
        {isVerifyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/45 p-4 flex items-center justify-center"
            onClick={closeVerifyModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl"
            >
              <h2 className="text-lg font-extrabold text-gray-900">Подтверждение почты</h2>
              <p className="mt-1 text-xs text-gray-500">Введите 6-значный код из письма, чтобы завершить создание профиля.</p>

              <form className="mt-4 space-y-3" onSubmit={handleVerifyRegisterCode}>
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white"
                  placeholder="Логин"
                  value={pendingRegisterLogin}
                  readOnly
                />
                <input
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white tracking-[0.3em]"
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  value={registerCode}
                  onChange={(e) => setRegisterCode(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                />
                <button className="w-full rounded-xl bg-black hover:bg-gray-800 py-3 text-white font-bold transition-colors" type="submit">
                  Подтвердить email
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { void handleResendRegisterCode() }}
                  className="text-xs font-bold text-gray-600 hover:text-black transition-colors"
                >
                  Отправить код повторно
                </button>
                <button
                  type="button"
                  onClick={closeVerifyModal}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

interface LoginPageProps {
  loginForm: any;
  setLoginForm: React.Dispatch<React.SetStateAction<any>>;
  handleLogin: (e: FormEvent) => Promise<void>;
  resetIdentifier: string;
  setResetIdentifier: React.Dispatch<React.SetStateAction<string>>;
  resetCode: string;
  setResetCode: React.Dispatch<React.SetStateAction<string>>;
  resetNewPassword: string;
  setResetNewPassword: React.Dispatch<React.SetStateAction<string>>;
  resetStep: 'request' | 'code' | 'password';
  setResetStep: React.Dispatch<React.SetStateAction<'request' | 'code' | 'password'>>;
  handleSendResetCode: (e: FormEvent) => Promise<void>;
  handleVerifyResetCode: (e: FormEvent) => Promise<void>;
  handleResetPassword: (e: FormEvent) => Promise<void>;
}

export function LoginPage({ loginForm, setLoginForm, handleLogin, resetIdentifier, setResetIdentifier, resetCode, setResetCode, resetNewPassword, setResetNewPassword, resetStep, setResetStep, handleSendResetCode, handleVerifyResetCode, handleResetPassword }: LoginPageProps) {
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)

  const closeForgotModal = () => {
    setIsForgotModalOpen(false)
    setResetStep('request')
  }

  const openForgotModal = () => {
    setIsForgotModalOpen(true)
    setResetStep('request')
  }

  return (
    <motion.section key="login" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-3xl border border-gray-100 p-5 sm:p-8 bg-white shadow-xl shadow-gray-900/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gray-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      <h1 className="mb-6 text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">С возвращением</h1>
      <form className="space-y-4 relative z-10" onSubmit={handleLogin}>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Логин</label>
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white" placeholder="Ваш логин" value={loginForm.login} onChange={(e) => setLoginForm((prev: any) => ({ ...prev, login: e.target.value }))} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Пароль</label>
          <input className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white" type="password" placeholder="••••••••" value={loginForm.password} onChange={(e) => setLoginForm((prev: any) => ({ ...prev, password: e.target.value }))} required />
        </div>
        <button className="w-full rounded-xl bg-gray-900 hover:bg-black py-3.5 text-white font-bold shadow-lg shadow-gray-900/20 transition-all active:scale-[0.98] mt-2" type="submit">Войти в аккаунт</button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={openForgotModal}
          className="text-xs font-bold text-gray-500 hover:text-black transition-colors"
        >
          Забыли пароль?
        </button>
      </div>

      <AnimatePresence>
        {isForgotModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/45 p-4 flex items-center justify-center"
            onClick={closeForgotModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl"
            >
              <h2 className="text-lg font-extrabold text-gray-900">Восстановление пароля</h2>
              <p className="mt-1 text-xs text-gray-500">Шаг 1: отправьте код. Шаг 2: введите код. Шаг 3: задайте новый пароль.</p>

              {resetStep === 'request' && (
                <form className="mt-4 space-y-3" onSubmit={handleSendResetCode}>
                  <input
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white"
                    placeholder="Логин или email"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                  />
                  <button className="w-full rounded-xl bg-black hover:bg-gray-800 py-3 text-white font-bold transition-colors" type="submit">
                    Отправить код
                  </button>
                </form>
              )}

              {resetStep === 'code' && (
                <form className="mt-4 space-y-3" onSubmit={handleVerifyResetCode}>
                  <input
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white"
                    placeholder="Логин или email"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white tracking-[0.3em]"
                    placeholder="Код из письма"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D+/g, '').slice(0, 6))}
                  />
                  <button className="w-full rounded-xl bg-black hover:bg-gray-800 py-3 text-white font-bold transition-colors" type="submit">
                    Проверить код
                  </button>
                </form>
              )}

              {resetStep === 'password' && (
                <form className="mt-4 space-y-3" onSubmit={handleResetPassword}>
                  <input
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all font-medium text-gray-900 bg-gray-50/50 focus:bg-white"
                    type="password"
                    placeholder="Новый пароль"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                  />
                  <button className="w-full rounded-xl bg-black hover:bg-gray-800 py-3 text-white font-bold transition-colors" type="submit">
                    Сохранить новый пароль
                  </button>
                </form>
              )}

              <div className="mt-4 flex justify-end gap-2">
                {resetStep !== 'request' && (
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 transition-colors"
                  >
                    Начать заново
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeForgotModal}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

interface ProfilePageProps {
  currentUser: User | null;
  viewedUser?: User | null;
  isOwnProfile?: boolean;
  balance: number;
  listings: Listing[];
  handleEditListing: (listing: Listing) => void;
  openListingPage: (id: number) => void;
  openUserProfile: (login: string) => void;
}

export function ProfilePage({ currentUser, viewedUser, isOwnProfile = false, balance, listings, handleEditListing, openListingPage, openUserProfile }: ProfilePageProps) {
  const profileUser = viewedUser ?? currentUser;
  const userListings = listings.filter((l) => l.ownerLogin === profileUser?.login);
  const EMOJI_AVATARS = ['😎', '💀', '👻', '👾', '🤖', '🤠', '🦊', '🚀', '🔥', '👑', '🥺', '🤡', '🌟'];
  const [avatar, setAvatar] = useState(EMOJI_AVATARS[0]);

  const [reviews, setReviews] = useState<{id: number, text: string, rating: number, author: string, date: string}[]>([]);
  const [newReviewText, setNewReviewText] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [reviewSort, setReviewSort] = useState("new");
  const isImageAvatar = avatar.startsWith('data:image/');

  const canReviewThisProfile = !!currentUser?.login && !!profileUser?.login && currentUser.login !== profileUser.login;

  useEffect(() => {
    if (!profileUser?.login) {
      setReviews([]);
      setAvatar(EMOJI_AVATARS[0]);
      return;
    }

    if (isOwnProfile) {
      const savedSettings = localStorage.getItem("profileSettings_" + profileUser.login);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.avatar) setAvatar(parsed.avatar);
        } catch(e) {}
      }
    } else {
      setAvatar(EMOJI_AVATARS[0]);
    }

    const savedReviews = localStorage.getItem("profileReviews_" + profileUser.login);
    if (savedReviews) {
      try {
        setReviews(JSON.parse(savedReviews));
      } catch(e) {
        setReviews([]);
      }
    } else {
      setReviews([]);
    }
  }, [profileUser, isOwnProfile]);

  const handleAddReview = () => {
    if (!canReviewThisProfile) return;
    if (!newReviewText.trim() || !currentUser?.login || !profileUser?.login) return;
    const newR = {
      id: Date.now(),
      text: newReviewText,
      rating: newReviewRating,
      author: currentUser.login,
      date: new Date().toISOString()
    };
    const updated = [newR, ...reviews];
    setReviews(updated);
    setNewReviewText("");
    setNewReviewRating(5);
    localStorage.setItem("profileReviews_" + profileUser.login, JSON.stringify(updated));
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, current) => acc + current.rating, 0) / reviews.length).toFixed(1) : "0.0";

  const renderStars = (rating: number, onClick?: (rating: number) => void) => {
    return Array.from({length: 5}).map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} ${onClick ? "cursor-pointer hover:scale-110 transition-transform" : ""}`} 
        onClick={() => onClick && onClick(i + 1)}
      />
    ));
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (reviewSort === 'new') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (reviewSort === 'old') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (reviewSort === 'positive') return b.rating - a.rating;
    if (reviewSort === 'negative') return a.rating - b.rating;
    return 0;
  });

  if (!profileUser) return <p className="text-red-500 p-8 text-center text-lg font-bold">Профиль не найден.</p>;

  return (
    <motion.section key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-5xl">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: User Card */}
        <div className="w-full md:w-[360px] flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white -z-10"></div>
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative mb-5 z-10 w-28 h-28 rounded-full border-4 border-white shadow-xl shadow-gray-200 flex items-center justify-center text-5xl bg-white overflow-hidden">
              {isImageAvatar ? (
                <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <motion.span
                  key={avatar}
                  initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  {avatar}
                </motion.span>
              )}
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-1 z-10">{profileUser.displayName || profileUser.login}</h2>
            {!isOwnProfile && (
              <button
                type="button"
                onClick={() => {
                  if (!profileUser.login) return
                  window.location.href = `/chat?user=${encodeURIComponent(profileUser.login)}`
                }}
                className="mt-3 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:border-gray-300"
              >
                Написать
              </button>
            )}
            <div className="mb-3 text-xs font-bold text-gray-500">ID профиля: {profileUser.publicId || '—'}</div>
            <div className="flex items-center justify-center gap-1 mb-2 z-10">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-gray-900">{avgRating}</span>
              <span className="text-gray-400 text-xs ml-1">({reviews.length} отзывов)</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700/80 rounded-full text-xs font-bold mb-6 z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span> Online
            </div>
            
            <div className="w-full text-left space-y-5 z-10">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 border border-gray-100"><Tag className="w-4 h-4" /></div>
                  <div className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Логин</div>
                </div>
                <div className="font-bold text-gray-900">{profileUser.login}</div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 border border-gray-100"><Mail className="w-4 h-4" /></div>
                  <div className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Email</div>
                </div>
                <div className="font-bold text-gray-900 truncate max-w-[120px]">{isOwnProfile ? (profileUser.email || '—') : 'Скрыт'}</div>
              </div>

              {isOwnProfile && <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500 border border-blue-100"><Wallet className="w-4 h-4" /></div>
                  <div className="text-xs font-extrabold text-blue-500 uppercase tracking-widest">Баланс</div>
                </div>
                <div className="font-black text-blue-600 text-lg">{balance.toLocaleString('ru-RU')} ₽</div>
              </div>}
            </div>
          </div>

        </div>

        {/* Right Column: Stats & Listings */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl shadow-gray-900/20 relative overflow-hidden group">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
               <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1 relative z-10 flex items-center gap-2">
                 Проектов<br/>опубликовано
               </div>
               <div className="text-6xl font-black relative z-10 text-white mt-2">{userListings.length}</div>
             </div>
             
             <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/20 relative overflow-hidden flex flex-col justify-between">
               <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1 relative z-10">Заработано (all time)</div>
               <div className="text-5xl md:text-6xl font-black text-gray-900 truncate">0<span className="text-3xl text-gray-300 ml-1">₽</span></div>
             </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/20 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-extrabold text-gray-900">{isOwnProfile ? 'Мои Анкеты' : 'Анкеты пользователя'}</h2>
              <span className="px-3.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-black rounded-full uppercase tracking-wider">{userListings.length} ШТУК</span>
            </div>

            {userListings.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16 text-center text-gray-400 flex flex-col items-center my-auto">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <ImagePlus className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="font-extrabold text-gray-900 text-xl mb-2">Пустота!</h3>
                <p className="font-medium text-gray-500 max-w-sm text-sm">Вы еще не выставили ни одного проекта. Самое время это исправить и начать зарабатывать!</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                {userListings.map((listing) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={listing.id} 
                    className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-gray-100 rounded-2xl hover:border-black hover:shadow-lg transition-all bg-white relative overflow-hidden cursor-pointer"
                    onClick={() => openListingPage(listing.id)}
                  >
                    <div className="absolute inset-y-0 left-0 w-2 bg-black scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
                    <div className="mb-4 sm:mb-0 ml-1 sm:ml-4">
                      <p className="font-extrabold text-gray-900 text-lg mb-1.5 leading-tight">{listing.title}</p>
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="text-black bg-gray-100 px-2.5 py-1 rounded-lg">{listing.price.toLocaleString('ru-RU')} ₽</span>
                        <span className="text-gray-400 uppercase tracking-wider">ID: {listing.id}</span>
                      </div>
                    </div>
                    {isOwnProfile && <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditListing(listing)
                      }}
                      className="w-full sm:w-auto px-5 py-3 bg-white border-2 border-gray-200 text-gray-900 font-extrabold text-sm rounded-xl hover:bg-black hover:border-black hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 group-hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                      Изменить
                    </button>}
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/20 flex-1 flex flex-col">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Отзывы покупателей</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-gray-800 text-lg">{avgRating}</span>
                  <div className="flex gap-0.5">
                    {renderStars(Math.round(Number(avgRating)))}
                  </div>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider ml-1">{reviews.length} ОЦЕНОК</span>
                </div>
              </div>
              <select 
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-black focus:border-black block w-auto p-2.5 font-bold outline-none cursor-pointer"
              >
                <option value="new">Сначала новые</option>
                <option value="old">Сначала старые</option>
                <option value="positive">Сначала положительные</option>
                <option value="negative">Сначала отрицательные</option>
              </select>
            </div>

            {canReviewThisProfile && <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
              <h3 className="font-extrabold text-gray-900 text-sm mb-3 uppercase tracking-wider">Оставить отзыв</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5 p-1">
                  {renderStars(newReviewRating, setNewReviewRating)}
                  <span className="text-gray-400 text-xs font-bold ml-2">({newReviewRating} из 5)</span>
                </div>
                <textarea 
                  value={newReviewText}
                  onChange={(e) => setNewReviewText(e.target.value)}
                  placeholder="Напишите, как прошла сделка..." 
                  className="w-full min-h-[100px] border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-black resize-y"
                ></textarea>
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={handleAddReview}
                    disabled={!newReviewText.trim() || !currentUser}
                    className="px-6 py-2.5 bg-black text-white font-extrabold text-sm rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Отправить отзыв
                  </button>
                </div>
                {!currentUser && <p className="text-xs text-gray-500">Чтобы оставить отзыв, войдите в аккаунт.</p>}
              </div>
            </div>}

            {sortedReviews.length === 0 ? (
              <div className="text-center py-8 text-gray-400 font-medium">Отзывов пока нет. Будьте первым!</div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence>
                  {sortedReviews.map(r => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={r.id} 
                      className="p-5 border border-gray-100 rounded-2xl bg-white"
                    >
                      <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400 text-lg uppercase">
                            {r.author[0]}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => openUserProfile(r.author)}
                              className="font-bold text-gray-900 text-sm hover:text-black"
                            >
                              {r.author}
                            </button>
                            <div className="text-xs text-gray-400 mt-0.5">{new Date(r.date).toLocaleDateString('ru-RU')}</div>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {renderStars(r.rating)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">{r.text}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>
    </motion.section>
  );
}
