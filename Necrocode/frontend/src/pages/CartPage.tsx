import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { CartItem, Listing, User } from '../types'

interface CartPageProps {
  currentUser: User | null;
  cart: CartItem[];
  listings: Listing[];
  cartTotal: number;
  handleRemoveCartItem: (id: number) => void;
}

export function CartPage({ currentUser, cart, listings, cartTotal, handleRemoveCartItem }: CartPageProps) {
  return (
    <motion.section key="cart" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
      <h1 className="text-2xl font-bold">Корзина</h1>
      {!currentUser && <p className="rounded-xl bg-yellow-50 px-4 py-3 text-sm panel-soft">Корзина сохраняется только для авторизованных пользователей.</p>}
      {cart.length === 0 ? (
        <p className="rounded-xl border px-4 py-6 text-center text-gray-500 panel-outline panel-soft">Корзина пока пуста.</p>
      ) : (
        <div className="space-y-3">
          {cart.map((item) => {
            const listing = listings.find((entry) => entry.id === item.listingId)
            if (!listing) return null
            return (
              <div key={item.listingId} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border p-3 sm:p-4 panel-outline">
                <div className="min-w-0">
                  <p className="font-semibold">{listing.title}</p>
                  <p className="text-sm text-gray-500">{listing.price.toLocaleString('ru-RU')} ₽ • 1 шт.</p>
                </div>
                <p className="font-semibold text-left sm:text-right">{listing.price.toLocaleString('ru-RU')} ₽</p>
                <button onClick={() => handleRemoveCartItem(item.listingId)} className="rounded-lg border p-2 text-gray-500 hover:text-red-600 justify-self-start sm:justify-self-end panel-outline">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 font-semibold text-sm sm:text-base panel-soft">
            <span>Итого</span>
            <span>{cartTotal.toLocaleString('ru-RU')} ₽</span>
          </div>
          <button className="w-full rounded-xl bg-black py-3 text-white">Оформить и сохранить покупку</button>
        </div>
      )}
    </motion.section>
  );
}
