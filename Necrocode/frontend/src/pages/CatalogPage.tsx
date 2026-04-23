import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import type { Listing } from '../types'

interface CatalogPageProps {
  listings: Listing[];
  openListingPage: (id: number) => void;
  openUserProfile: (login: string) => void;
}

export function CatalogPage({ listings, openListingPage, openUserProfile }: CatalogPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStack, setSearchStack] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')
  const [pricePreset, setPricePreset] = useState<string>('any')

  const PROJECT_TYPES = [
    { id: 'apps', label: 'Приложения' },
    { id: 'sites', label: 'Сайты' },
    { id: 'games', label: 'Игры' },
    { id: 'scripts', label: 'Скрипты/Боты' },
    { id: 'blogs', label: 'Блоги' },
    { id: 'domains', label: 'Домены' },
  ]

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    )
  }

  const handlePresetToggle = (preset: string) => {
    // Treat like a radio button group where you can't unselect completely without clicking 'any'
    setPricePreset(preset)
    if (preset === 'any') {
      setPriceMin('')
      setPriceMax('')
    } else if (preset === 'under100') {
      setPriceMin('')
      setPriceMax('100')
    } else if (preset === '100-1000') {
      setPriceMin('100')
      setPriceMax('1000')
    } else if (preset === '1000-2500') {
      setPriceMin('1000')
      setPriceMax('2500')
    }
  }

  // Effect to sync preset if user manually types inputs (optional, keep it simple for now)

  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!item.title.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) {
          return false
        }
      }

      // 2. Project Type
      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(item.category)) {
          return false
        }
      }

      // 3. Price Filters
      if (priceMin !== '') {
        const min = parseInt(priceMin, 10)
        if (!isNaN(min) && item.price < min) return false
      }
      if (priceMax !== '') {
        const max = parseInt(priceMax, 10)
        if (!isNaN(max) && item.price > max) return false
      }

      // 4. Tech Stack Filter
      if (searchStack) {
        const s = searchStack.toLowerCase()
        if (!item.techStack || !item.techStack.toLowerCase().includes(s)) {
          return false
        }
      }

      return true
    })
  }, [listings, searchQuery, selectedTypes, priceMin, priceMax, searchStack])

  return (
    <motion.section 
      key="catalog" 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -8 }} 
      className="flex flex-col lg:flex-row gap-8"
    >
      {/* LEFT COLUMN: FILTERS */}
      <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-extrabold text-black mb-4">Фильтры</h2>
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:border-black transition-colors"
            />
            <Search className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Стек технологий</h3>
          <div className="relative">
            <input 
              type="text" 
              value={searchStack}
              onChange={e => setSearchStack(e.target.value)}
              placeholder="React, Vue, Node.js..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Тип проекта</h3>
          <div className="flex flex-col gap-2.5">
            {PROJECT_TYPES.map(type => (
              <label key={type.id} className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={selectedTypes.includes(type.id)}
                  onChange={() => handleTypeToggle(type.id)}
                  className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer bg-white"
                />
                <span className="text-sm text-gray-700 group-hover:text-black transition-colors">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mb-3 text-sm">Цена</h3>
          <div className="flex items-center gap-3 mb-4">
            <input 
              type="number" 
              value={priceMin}
              onChange={e => { setPriceMin(e.target.value); setPricePreset(''); }}
              placeholder="10" 
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-center"
            />
            <input 
              type="number" 
              value={priceMax}
              onChange={e => { setPriceMax(e.target.value); setPricePreset(''); }}
              placeholder="50000" 
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-center"
            />
          </div>
          
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={pricePreset === 'under100'} onChange={() => handlePresetToggle('under100')} className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer bg-white" />
              <span className="text-sm text-gray-700 group-hover:text-black transition-colors">до 100</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={pricePreset === '100-1000'} onChange={() => handlePresetToggle('100-1000')} className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer bg-white" />
              <span className="text-sm text-gray-700 group-hover:text-black transition-colors">100-1000</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={pricePreset === '1000-2500'} onChange={() => handlePresetToggle('1000-2500')} className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer bg-white" />
              <span className="text-sm text-gray-700 group-hover:text-black transition-colors">1000-2500</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={pricePreset === 'any'} onChange={() => handlePresetToggle('any')} className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black cursor-pointer bg-white" />
              <span className="text-sm text-gray-700 group-hover:text-black transition-colors">Неважно</span>
            </label>
          </div>
        </div>
      </aside>

      {/* CENTER COLUMN: CATALOG GRID */}
      <main className="flex-1">
        <h2 className="text-2xl font-extrabold text-black mb-6">Каталог</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredListings.map((item) => (
              <motion.div 
                key={item.id} 
                layout
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg transition-shadow cursor-pointer pb-2"
                onClick={() => openListingPage(item.id)}
              >
                <div className="bg-gray-100 h-40 w-full flex items-center justify-center relative overflow-hidden border-b border-gray-100">
                   {item.imageDataUrls && item.imageDataUrls.length > 0 ? (
                      <img src={item.imageDataUrls[0]} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                   ) : (
                      <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Placeholder" />
                   )}
                </div>
                
                <div className="p-4 flex flex-col flex-1">
                   <h3 className="font-bold text-gray-900 text-sm leading-snug mb-3 line-clamp-2">
                      {item.title}
                   </h3>
                   <div className="flex items-center justify-between mt-auto mb-3">
                      <span className="font-medium text-gray-600 text-xs">
                         {item.price > 0 ? item.price.toLocaleString('ru-RU') + ' ₽' : 'Цена по запросу'}
                      </span>
                      <span className="bg-[#D1E7DD] text-[#0F5132] px-2 py-0.5 rounded-full text-[10px] font-bold">
                         Статус
                      </span>
                   </div>
                   <hr className="border-gray-200 mb-3" />
                   <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                       {item.techStack || 'Стек не указан'}
                   </p>
                   <button
                     onClick={(e) => {
                       e.stopPropagation()
                       openUserProfile(item.ownerLogin)
                     }}
                     className="mt-2 self-start text-[11px] text-gray-500 hover:text-black"
                   >
                     Продавец: {item.ownerLogin}
                   </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {filteredListings.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-gray-500 py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 mt-6 font-medium">
            По вашему запросу ничего не найдено.
          </motion.div>
        )}
      </main>
    </motion.section>
  )
}
