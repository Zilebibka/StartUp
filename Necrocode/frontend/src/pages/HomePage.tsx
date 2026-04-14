import { motion } from 'framer-motion'
import { Box } from 'lucide-react'
import type { Listing } from '../types'

interface HomePageProps {
  searchQuery: string;
  filteredListings: Listing[];
  listings: Listing[];
  openListingPage: (id: number) => void;
  handleAddToCart: (id: number) => void;
}

export function HomePage({ filteredListings, listings, openListingPage, handleAddToCart }: HomePageProps) {
  return (
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
  );
}
