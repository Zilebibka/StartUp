import { motion } from 'framer-motion'
import { Edit, UserCircle } from 'lucide-react'
import type { FormEvent } from 'react'
import type { Listing, User } from '../types'

interface RegisterPageProps {
  registerForm: any;
  setRegisterForm: React.Dispatch<React.SetStateAction<any>>;
  handleRegister: (e: FormEvent) => Promise<void>;
}

export function RegisterPage({ registerForm, setRegisterForm, handleRegister }: RegisterPageProps) {
  return (
    <motion.section key="register" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-2xl border p-6 bg-white shadow-sm">
      <h1 className="mb-4 text-2xl font-bold">Регистрация</h1>
      <form className="space-y-3" onSubmit={handleRegister}>
        <input className="w-full rounded-xl border px-4 py-2" placeholder="Логин" value={registerForm.login} onChange={(e) => setRegisterForm((prev: any) => ({ ...prev, login: e.target.value }))} required />
        <input className="w-full rounded-xl border px-4 py-2" type="email" placeholder="Email" value={registerForm.email} onChange={(e) => setRegisterForm((prev: any) => ({ ...prev, email: e.target.value }))} required />
        <input className="w-full rounded-xl border px-4 py-2" placeholder="Отображаемое имя" value={registerForm.displayName} onChange={(e) => setRegisterForm((prev: any) => ({ ...prev, displayName: e.target.value }))} />
        <input className="w-full rounded-xl border px-4 py-2" type="password" placeholder="Пароль" value={registerForm.password} onChange={(e) => setRegisterForm((prev: any) => ({ ...prev, password: e.target.value }))} required />
        <button className="w-full rounded-xl bg-black py-2 text-white" type="submit">Создать аккаунт</button>
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
    <motion.section key="login" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-md rounded-2xl border p-6 bg-white shadow-sm">
      <h1 className="mb-4 text-2xl font-bold">Авторизация</h1>
      <form className="space-y-3" onSubmit={handleLogin}>
        <input className="w-full rounded-xl border px-4 py-2" placeholder="Логин" value={loginForm.login} onChange={(e) => setLoginForm((prev: any) => ({ ...prev, login: e.target.value }))} required />
        <input className="w-full rounded-xl border px-4 py-2" type="password" placeholder="Пароль" value={loginForm.password} onChange={(e) => setLoginForm((prev: any) => ({ ...prev, password: e.target.value }))} required />
        <button className="w-full rounded-xl bg-black py-2 text-white" type="submit">Войти</button>
      </form>
    </motion.section>
  );
}

interface ProfilePageProps {
  currentUser: User | null;
  balance: number;
  listings: Listing[];
  handleEditListing: (listing: Listing) => void;
}

export function ProfilePage({ currentUser, balance, listings, handleEditListing }: ProfilePageProps) {
  const userListings = listings.filter((l) => l.ownerLogin === currentUser?.login);
  return (
    <motion.section key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-2xl rounded-2xl border p-6 bg-white shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <UserCircle className="h-10 w-10" />
        <div>
          <h1 className="text-xl font-bold">Профиль</h1>
          <p className="text-sm text-gray-500">Защищенная страница</p>
        </div>
      </div>
      {currentUser ? (
        <div className="space-y-6 text-sm">
          <div className="space-y-2">
            <p><b>ID:</b> {currentUser.id}</p>
            <p><b>Логин:</b> {currentUser.login}</p>
            <p><b>Email:</b> {currentUser.email || '-'}</p>
            <p><b>Имя:</b> {currentUser.displayName || '-'}</p>
            <p><b>Баланс:</b> {balance.toLocaleString('ru-RU')} ₽</p>
          </div>
          
          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold mb-3">Опубликованные анкеты ({userListings.length})</h2>
            {userListings.length === 0 ? (
              <p className="text-gray-500">У вас пока нет опубликованных анкет.</p>
            ) : (
              <div className="grid gap-3">
                {userListings.map((listing) => (
                  <div key={listing.id} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50/50">
                    <div>
                      <p className="font-medium">{listing.title}</p>
                      <p className="text-gray-500">{listing.price.toLocaleString('ru-RU')} ₽</p>
                    </div>
                    <button 
                      onClick={() => handleEditListing(listing)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="max-sm:hidden">Редактировать</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-red-600">Сессия не найдена. Войдите заново.</p>
      )}
    </motion.section>
  );
}
