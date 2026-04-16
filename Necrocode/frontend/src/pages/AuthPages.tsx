import { motion, AnimatePresence } from 'framer-motion'
import { Edit, Calendar, ChevronLeft, ChevronRight, ImagePlus, Wallet, Mail, Tag, BadgeCheck } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import type { Listing, User } from '../types'

interface RegisterPageProps {
  registerForm: any;
  setRegisterForm: React.Dispatch<React.SetStateAction<any>>;
  handleRegister: (e: FormEvent) => Promise<void>;
}

export function RegisterPage({ registerForm, setRegisterForm, handleRegister }: RegisterPageProps) {
  return (
    <motion.section key="register" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-3xl border border-gray-100 p-8 bg-white shadow-xl shadow-gray-900/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gray-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      <h1 className="mb-6 text-3xl font-extrabold text-gray-900 tracking-tight">Регистрация</h1>
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
        <button className="w-full rounded-xl bg-gray-900 hover:bg-black py-3.5 text-white font-bold shadow-lg shadow-gray-900/20 transition-all active:scale-[0.98] mt-2" type="submit">Создать аккаунт</button>
      </form>
    </motion.section>
  );
}

interface LoginPageProps {
  loginForm: any;
  setLoginForm: React.Dispatch<React.SetStateAction<any>>;
  handleLogin: (e: FormEvent) => Promise<void>;
}

export function LoginPage({ loginForm, setLoginForm, handleLogin }: LoginPageProps) {
  return (
    <motion.section key="login" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-3xl border border-gray-100 p-8 bg-white shadow-xl shadow-gray-900/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gray-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
      <h1 className="mb-6 text-3xl font-extrabold text-gray-900 tracking-tight">С возвращением</h1>
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
    </motion.section>
  );
}

// Custom DatePicker Component
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
function CustomDatePicker({ date, onDateChange }: { date: string, onDateChange: (d: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState(() => {
    if (date) return new Date(date);
    return new Date(2000, 0, 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeMonth = (delta: number) => {
    setCurrentViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };
  const changeYear = (delta: number) => {
    setCurrentViewDate(prev => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(currentViewDate.getFullYear(), currentViewDate.getMonth());
  const firstDayOfMonth = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth(), 1).getDay();
  const startingEmptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handleDayClick = (day: number) => {
    const newDate = new Date(Date.UTC(currentViewDate.getFullYear(), currentViewDate.getMonth(), day));
    onDateChange(newDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const formatDateLabel = (dStr: string) => {
    if (!dStr) return 'Выбрать дату';
    const [y, m, d] = dStr.split('-');
    return d + ' ' + MONTHS[parseInt(m) - 1].slice(0,3).toLowerCase() + ' ' + y;
  };

  return (
    <div className="relative" ref={ref}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left font-medium text-gray-900 bg-white border border-gray-200 px-4 py-3 rounded-xl hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all shadow-sm"
      >
        <span className={date ? 'text-gray-900' : 'text-gray-400'}>{formatDateLabel(date)}</span>
        <Calendar className="w-4 h-4 text-gray-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 z-50 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-[300px] overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={() => changeYear(-1)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black font-semibold text-xs transition-colors">Y-</button>
              <button type="button" onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded text-gray-800 hover:text-black transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <div className="font-extrabold tracking-wide text-gray-900 text-sm">
                {MONTHS[currentViewDate.getMonth()]} {currentViewDate.getFullYear()}
              </div>
              <button type="button" onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded text-gray-800 hover:text-black transition-colors"><ChevronRight className="w-5 h-5" /></button>
              <button type="button" onClick={() => changeYear(1)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-black font-semibold text-xs transition-colors">Y+</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-gray-300 mb-2 uppercase tracking-widest">
              {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 text-sm font-bold">
              {Array.from({ length: startingEmptyCells }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isSelected = date && parseInt(date.split('-')[2]) === day && parseInt(date.split('-')[1]) - 1 === currentViewDate.getMonth() && parseInt(date.split('-')[0]) === currentViewDate.getFullYear();
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={`h-8 w-full rounded-md flex items-center justify-center transition-all ${isSelected ? 'bg-black text-white hover:opacity-90' : 'text-gray-700 hover:bg-gray-100 hover:text-black'}`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ProfilePageProps {
  currentUser: User | null;
  balance: number;
  listings: Listing[];
  handleEditListing: (listing: Listing) => void;
}

export function ProfilePage({ currentUser, balance, listings, handleEditListing }: ProfilePageProps) {
  const userListings = listings.filter((l) => l.ownerLogin === currentUser?.login);
  const EMOJI_AVATARS = ['😎', '💀', '👻', '👾', '🤖', '🤠', '🦊', '🚀', '🔥', '👑', '🥺', '🤡', '🌟'];
  const [dob, setDob] = useState("");
  const [avatar, setAvatar] = useState(EMOJI_AVATARS[0]);

  useEffect(() => {
    if (currentUser?.login) {
      const savedSettings = localStorage.getItem("profileSettings_" + currentUser.login);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          if (parsed.dob) setDob(parsed.dob);
          if (parsed.avatar) setAvatar(parsed.avatar);
        } catch(e) {}
      }
    }
  }, [currentUser]);

  const saveSettings = (newDob: string, newAvatar: string) => {
    if (currentUser?.login) {
      localStorage.setItem("profileSettings_" + currentUser.login, JSON.stringify({ dob: newDob, avatar: newAvatar }));
    }
  };

  if (!currentUser) return <p className="text-red-500 p-8 text-center text-lg font-bold">Сессия не найдена. Войдите заново.</p>;

  return (
    <motion.section key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-5xl">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Column: User Card */}
        <div className="w-full md:w-[360px] flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white -z-10"></div>
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-50/50 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative mb-5 z-10 w-28 h-28 rounded-full border-4 border-white shadow-xl shadow-gray-200 flex items-center justify-center text-5xl bg-white cursor-pointer overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
              <motion.span 
                key={avatar} 
                initial={{ scale: 0.5, rotate: -20, opacity: 0 }} 
                animate={{ scale: 1, rotate: 0, opacity: 1 }} 
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                {avatar}
              </motion.span>
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <span className="text-[10px] text-white font-black uppercase tracking-widest leading-tight">СМЕНИТЬ<br/>ЭМОДЗИ</span>
              </div>
              <select 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                value={avatar} 
                onChange={(e) => { setAvatar(e.target.value); saveSettings(dob, e.target.value); }}
              >
                {EMOJI_AVATARS.map(emo => <option key={emo} value={emo}>{emo}</option>)}
              </select>
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-1 z-10">{currentUser.displayName || currentUser.login}</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700/80 rounded-full text-xs font-bold mb-6 z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span> Online
            </div>
            
            <div className="w-full text-left space-y-5 z-10">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 border border-gray-100"><Tag className="w-4 h-4" /></div>
                  <div className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Логин</div>
                </div>
                <div className="font-bold text-gray-900">{currentUser.login}</div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-400 border border-gray-100"><Mail className="w-4 h-4" /></div>
                  <div className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Email</div>
                </div>
                <div className="font-bold text-gray-900 truncate max-w-[120px]">{currentUser.email || '—'}</div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500 border border-blue-100"><Wallet className="w-4 h-4" /></div>
                  <div className="text-xs font-extrabold text-blue-500 uppercase tracking-widest">Баланс</div>
                </div>
                <div className="font-black text-blue-600 text-lg">{balance.toLocaleString('ru-RU')} ₽</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col gap-3">
            <h3 className="font-extrabold text-gray-900 flex items-center gap-2 mb-2"><BadgeCheck className="w-5 h-5 text-gray-800" /> Персональная инфо</h3>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Ваша Дата Рождения</label>
              <CustomDatePicker date={dob} onDateChange={(newDate) => { setDob(newDate); saveSettings(newDate, avatar); }} />
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
              <h2 className="text-2xl font-extrabold text-gray-900">Мои Анкеты</h2>
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
                    className="group flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border border-gray-100 rounded-2xl hover:border-black hover:shadow-lg transition-all bg-white relative overflow-hidden"
                  >
                    <div className="absolute inset-y-0 left-0 w-2 bg-black scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
                    <div className="mb-4 sm:mb-0 ml-1 sm:ml-4">
                      <p className="font-extrabold text-gray-900 text-lg mb-1.5 leading-tight">{listing.title}</p>
                      <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="text-black bg-gray-100 px-2.5 py-1 rounded-lg">{listing.price.toLocaleString('ru-RU')} ₽</span>
                        <span className="text-gray-400 uppercase tracking-wider">ID: {listing.id}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEditListing(listing)}
                      className="w-full sm:w-auto px-5 py-3 bg-white border-2 border-gray-200 text-gray-900 font-extrabold text-sm rounded-xl hover:bg-black hover:border-black hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 group-hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                      Изменить
                    </button>
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
