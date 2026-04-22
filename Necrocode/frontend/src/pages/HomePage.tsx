import { motion } from "framer-motion"
import type { Listing } from "../types"

interface HomePageProps {
  searchQuery: string;
  filteredListings: Listing[];
  listings: Listing[];
  openListingPage: (id: number) => void;
  handleAddToCart: (id: number) => void;
}

export function HomePage({ filteredListings, openListingPage, handleAddToCart }: HomePageProps) {
  return (
    <motion.section 
      key="home" 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -8 }} 
      className="w-full flex flex-col gap-14"
    >
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="flex-1 space-y-4 max-w-sm">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-blue-950">Информация о приложении</h1>
          <p className="text-base text-gray-700 leading-relaxed font-semibold">
            Маркетплейс для покупки<br/>
            и продажи незавершенных<br/>
            IT-проектов
          </p>
        </div>
        <div className="w-full lg:w-[500px] h-64 rounded-xl bg-[#3B6BAF] relative overflow-hidden flex items-center justify-center p-6 shadow-md">
          <div className="bg-white/90 backdrop-blur w-full max-w-sm rounded overflow-hidden shadow-xl border border-white/20">
             <div className="bg-gray-200 h-6 flex gap-1.5 items-center px-3">
               <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
             </div>
             <div className="p-4 space-y-3 opacity-60">
               <div className="h-4 bg-gray-300 w-1/3 rounded"></div>
               <div className="h-2 bg-gray-200 w-full rounded"></div>
               <div className="h-2 bg-gray-200 w-5/6 rounded"></div>
               <div className="grid grid-cols-2 gap-2 pt-2">
                 <div className="h-10 bg-blue-100 rounded border border-blue-200 flex items-center justify-center text-blue-500 font-bold">+</div>
                 <div className="h-10 bg-blue-100 rounded border border-blue-200 flex items-center justify-center text-blue-500 font-bold">+</div>
               </div>
             </div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center rotate-[-12deg] pointer-events-none">
             <div className="border-4 border-red-500 text-red-500 text-5xl font-black uppercase px-6 py-2 tracking-widest bg-white/10 backdrop-blur-sm -rotate-6 filter drop-shadow-md" style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.1)" }}>
               ЗАБРОШЕНО
             </div>
          </div>
        </div>
      </motion.section>

      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold text-blue-950">Каталог</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((item, i) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, scale: 0.97 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: i * 0.04 }} 
              className="flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
              onClick={() => openListingPage(item.id)}
            >
              <div className="bg-gradient-to-br from-blue-50 to-gray-100 h-40 w-full flex items-center justify-center relative overflow-hidden">
                 {item.imageDataUrls && item.imageDataUrls.length > 0 ? (
                    <img src={item.imageDataUrls[0]} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                 ) : (
                    <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Placeholder" />
                 )}
                 <div className="absolute inset-0 bg-blue-400 opacity-20 mix-blend-multiply pointer-events-none"></div>
              </div>
              
              <div className="py-4 px-5 flex flex-col flex-1">
                 <h3 className="font-bold text-gray-900 leading-tight mb-3 line-clamp-2">
                    {item.title}
                 </h3>
                 <div className="flex items-center justify-between mt-auto mb-3">
                    <span className="font-semibold text-gray-600 text-sm">
                       {item.price.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="bg-[#D1E7DD] text-[#0F5132] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                       Статус
                    </span>
                 </div>
                 <hr className="border-gray-200 mt-2 mb-3" />
                 <p className="text-xs text-gray-500 font-medium leading-relaxed">
                     {item.techStack || 'Стек не указан'}
                 </p>
                 <div className="mt-4 flex gap-2">
                    <button 
                       onClick={(e) => { e.stopPropagation(); handleAddToCart(item.id); }} 
                       className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2 rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      В корзину
                    </button>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {filteredListings.length === 0 && (
          <p className="text-sm text-gray-500 py-10 text-center bg-gray-50 rounded-xl">По вашему запросу ничего не найдено.</p>
        )}
      </section>

      <section className="pt-8 pb-16">
        <h2 className="text-xl font-extrabold text-blue-950 mb-4">О Нас</h2>
        <p className="text-gray-700 font-medium max-w-3xl leading-relaxed">
          NecroCode — это маркетплейс для покупки заброшенных цифровых продуктов: от недоработанного кода и мёртвых веб-сайтов до заброшенных мобильных приложений.
        </p>
      </section>
    </motion.section>
  );
}
