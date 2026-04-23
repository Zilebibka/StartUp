import { motion } from "framer-motion"
import type { Listing } from "../types"

interface HomePageProps {
  searchQuery: string;
  filteredListings: Listing[];
  listings: Listing[];
  openListingPage: (id: number) => void;
  openUserProfile: (login: string) => void;
  handleAddToCart: (id: number) => void;
}

export function HomePage({ filteredListings, openListingPage, openUserProfile, handleAddToCart: _handleAddToCart }: HomePageProps) {
  return (
    <motion.section 
      key="home" 
      initial={{ opacity: 0, y: 12 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -8 }} 
      className="w-full flex flex-col gap-10 sm:gap-14"
    >
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center justify-between">
        <div className="flex-1 space-y-4 max-w-sm w-full">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-950">Информация о приложении</h1>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-semibold">
            Маркетплейс для покупки<br/>
            и продажи незавершенных<br/>
            IT-проектов
          </p>
        </div>
        <div className="w-full lg:w-[500px] h-56 sm:h-64 rounded-xl bg-[#3B6BAF] relative overflow-hidden flex items-center justify-center p-4 sm:p-6 shadow-md">
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
             <div className="border-4 border-red-500 text-red-500 text-3xl sm:text-5xl font-black uppercase px-4 sm:px-6 py-1.5 sm:py-2 tracking-widest bg-white/10 backdrop-blur-sm -rotate-6 filter drop-shadow-md" style={{ textShadow: "2px 2px 0px rgba(0,0,0,0.1)" }}>
               ЗАБРОШЕНО
             </div>
          </div>
        </div>
      </motion.section>

      <section className="space-y-6">
        <h2 className="text-2xl font-extrabold text-blue-950">Каталог</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredListings.map((item, i) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, scale: 0.97 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: i * 0.04 }} 
              className="flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-xl hover:border-gray-300 transition-all cursor-pointer group"
              onClick={() => openListingPage(item.id)}
            >
              <div className="bg-gray-100 h-44 w-full flex items-center justify-center relative overflow-hidden border-b border-gray-100">
                 {item.imageDataUrls && item.imageDataUrls.length > 0 ? (
                    <img src={item.imageDataUrls[0]} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 ) : (
                    <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" alt="Placeholder" />
                 )}
                 <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-gray-800 shadow-sm border border-white/20">
                   {item.category || 'Проект'}
                 </div>
              </div>
              
              <div className="p-5 flex flex-col flex-1">
                 <h3 className="font-extrabold text-gray-900 text-lg leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                 </h3>
                 
                 <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-1">
                     {item.techStack || 'Стек технологий не указан'}
                 </p>
                 
                 <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                   <span className="font-extrabold text-gray-900 text-lg">
                      {item.price > 0 ? item.price.toLocaleString('ru-RU') + ' ₽' : 'По запросу'}
                   </span>
                   <button
                     onClick={(e) => {
                       e.stopPropagation()
                       openUserProfile(item.ownerLogin)
                     }}
                     className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-black transition-colors"
                   >
                     <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 border border-gray-200">
                       {item.ownerLogin.charAt(0).toUpperCase()}
                     </div>
                     {item.ownerLogin}
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
    </motion.section>
  );
}
