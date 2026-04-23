import { motion } from 'framer-motion'
import { Box, Link2 } from 'lucide-react'
import type { Listing } from '../types'

interface ListingPageProps {
  selectedListing: Listing;
  handleAddToCart: (id: number) => void;
  navigateToHome: () => void;
  openUserProfile: (login: string) => void;
}

export function ListingPage({ selectedListing, handleAddToCart, navigateToHome, openUserProfile }: ListingPageProps) {
  return (
    <motion.section key="listing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
      <div className="space-y-4">
        <div className="aspect-[4/3] rounded-2xl border bg-gray-100 overflow-hidden flex items-center justify-center">
          {selectedListing.imageDataUrls[0] ? <img src={selectedListing.imageDataUrls[0]} alt={selectedListing.title} className="h-full w-full object-cover" /> : <Box className="h-16 w-16 text-gray-400" />}
        </div>
        {selectedListing.imageDataUrls.length > 1 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
            {selectedListing.imageDataUrls.slice(1).map((url, index) => (
              <img key={`${selectedListing.id}-${index}`} src={url} alt="Project screenshot" className="h-16 sm:h-20 w-full rounded-lg border object-cover" />
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4 rounded-2xl border p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{selectedListing.title}</h1>
        <button
          onClick={() => openUserProfile(selectedListing.ownerLogin)}
          className="text-sm text-gray-500 hover:text-black"
        >
          Продавец: {selectedListing.ownerLogin}
        </button>
        <p className="text-gray-700 whitespace-pre-wrap">{selectedListing.description}</p>
        <p className="text-2xl font-bold">{selectedListing.price.toLocaleString('ru-RU')} ₽</p>
        <p className="text-sm text-gray-500">Выдача: {selectedListing.deliveryMode === 'auto' ? 'Автовыдача' : 'Ручная передача'}</p>
        {selectedListing.codeFileName && <p className="text-sm">Файл проекта: <b>{selectedListing.codeFileName}</b></p>}
        {selectedListing.projectUrl && (
          <a href={selectedListing.projectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 underline">
            <Link2 className="h-4 w-4" /> Открыть ссылку на проект
          </a>
        )}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
          <button onClick={() => handleAddToCart(selectedListing.id)} className="rounded-xl bg-black px-4 py-2 text-white w-full sm:w-auto">Добавить в корзину</button>
          <button onClick={navigateToHome} className="rounded-xl border px-4 py-2 w-full sm:w-auto">Назад в каталог</button>
        </div>
      </div>
    </motion.section>
  );
}
