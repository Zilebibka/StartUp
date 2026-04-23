import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Box, Link2, ShieldCheck, CheckCircle2, MessageSquare, Star, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Listing } from '../types'

interface ListingPageProps {
  selectedListing: Listing;
  handleAddToCart: (id: number) => void;
  navigateToHome: () => void;
  openUserProfile: (login: string) => void;
}

export function ListingPage({ selectedListing, handleAddToCart, navigateToHome, openUserProfile }: ListingPageProps) {
  type SellerReview = {
    id: number
    text: string
    rating: number
    author: string
    date: string
  }

  const images = useMemo(() => {
    const list = selectedListing.imageDataUrls.filter(Boolean)
    return list.length > 0 ? list : ['']
  }, [selectedListing.imageDataUrls])

  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [sellerReviews, setSellerReviews] = useState<SellerReview[]>([])
  const [isReviewsExpanded, setIsReviewsExpanded] = useState(false)

  useEffect(() => {
    setActiveImageIndex(0)
    setIsViewerOpen(false)
    setIsReviewsExpanded(false)
  }, [selectedListing.id])

  useEffect(() => {
    if (!selectedListing.ownerLogin) {
      setSellerReviews([])
      return
    }

    const rawReviews = localStorage.getItem(`profileReviews_${selectedListing.ownerLogin}`)
    if (!rawReviews) {
      setSellerReviews([])
      return
    }

    try {
      const parsed = JSON.parse(rawReviews)
      if (!Array.isArray(parsed)) {
        setSellerReviews([])
        return
      }

      const normalized: SellerReview[] = parsed
        .filter((review) => typeof review?.id === 'number' && typeof review?.text === 'string')
        .map((review) => ({
          id: review.id,
          text: String(review.text),
          rating: Math.max(1, Math.min(5, Number(review.rating) || 0)),
          author: String(review.author || 'unknown'),
          date: String(review.date || new Date().toISOString()),
        }))

      normalized.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setSellerReviews(normalized)
    } catch {
      setSellerReviews([])
    }
  }, [selectedListing.ownerLogin])

  const averageRating = useMemo(() => {
    if (sellerReviews.length === 0) return 0
    const sum = sellerReviews.reduce((acc, review) => acc + review.rating, 0)
    return Number((sum / sellerReviews.length).toFixed(1))
  }, [sellerReviews])

  const nextImage = () => {
    setActiveImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const formatReviewDate = (iso: string) => {
    const timestamp = new Date(iso)
    if (Number.isNaN(timestamp.getTime())) return 'Дата неизвестна'
    return timestamp.toLocaleDateString('ru-RU')
  }

  const formatCodeFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Не указан'
    const units = ['Б', 'КБ', 'МБ', 'ГБ']
    let value = bytes
    let unitIndex = 0

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex += 1
    }

    const rounded = value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2)
    return `${rounded} ${units[unitIndex]}`
  }

  const renderRatingStars = (value: number) => {
    const filled = Math.round(value)
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${index < filled ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`}
      />
    ))
  }

  const visibleReviews = isReviewsExpanded ? sellerReviews : sellerReviews.slice(0, 3)

  return (
    <motion.section key="listing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-6xl mx-auto flex flex-col gap-12 pb-16">
      
      {/* Main Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-start">
        {/* Left Column: Images */}
        <div className="lg:col-span-7 space-y-4">
          <div className="h-[360px] sm:h-[420px] rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center relative group">
            {images[activeImageIndex] ? (
              <button
                type="button"
                onClick={() => setIsViewerOpen(true)}
                className="absolute inset-0 h-full w-full"
                aria-label="Открыть изображение"
              >
                <img
                  src={images[activeImageIndex]}
                  alt={selectedListing.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </button>
            ) : (
              <Box className="h-20 w-20 text-gray-300" />
            )}

            {images[0] && images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  aria-label="Предыдущее фото"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-gray-200 text-gray-700 flex items-center justify-center shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  aria-label="Следующее фото"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white border border-gray-200 text-gray-700 flex items-center justify-center shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="absolute top-4 left-4 flex gap-2">
               <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-sm">
                 {selectedListing.category || 'Проект'}
               </span>
            </div>
            {images[0] && images.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-lg text-xs font-bold">
                {activeImageIndex + 1} / {images.length}
              </div>
            )}
          </div>
          
          <div className="h-20">
            {images[0] && images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {images.map((url, index) => (
                  <button
                    key={`${selectedListing.id}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`h-20 w-full rounded-xl border overflow-hidden transition-all ${index === activeImageIndex ? 'border-gray-900 ring-2 ring-gray-900/20' : 'border-gray-200 hover:border-gray-400'}`}
                    aria-label={`Фото ${index + 1}`}
                  >
                    <img src={url} alt={`Фото ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Guarantees Box (Below images for volume) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex gap-4 items-start h-[106px]">
               <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shrink-0">
                  <ShieldCheck className="h-6 w-6" />
               </div>
               <div>
                  <h4 className="font-bold text-emerald-900 mb-1">Безопасная сделка</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed font-medium">Ваши средства замораживаются до момента успешной проверки и передачи всех прав на проект.</p>
               </div>
            </div>
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex gap-4 items-start h-[106px]">
               <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
               </div>
               <div>
                  <h4 className="font-bold text-blue-900 mb-1">Файлы проверены</h4>
                  <p className="text-xs text-blue-700 leading-relaxed font-medium">Архив исходного кода прошел автоматическую антивирусную проверку платформы.</p>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center h-[106px] flex flex-col justify-center overflow-hidden">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Комплектация</p>
              <p className="text-sm font-black text-gray-900">Полный исходный код</p>
              <p className="text-xs font-semibold text-gray-500 mt-1">+ инструкция по запуску</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center h-[106px] flex flex-col justify-center overflow-hidden">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Вес файла кода</p>
              <p className="text-sm font-black text-gray-900">{formatCodeFileSize(selectedListing.codeFileSizeBytes)}</p>
              <button
                type="button"
                onClick={() => openUserProfile(selectedListing.ownerLogin)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 mt-1"
              >
                Продавец: {selectedListing.ownerLogin}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing, Tech, Purchase */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="sticky top-6 space-y-6">
            
            {/* Header & Seller */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest ${selectedListing.deliveryMode === 'auto' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                   {selectedListing.deliveryMode === 'auto' ? 'Автовыдача' : 'Ручная передача'}
                 </span>
                 <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg"><Clock className="w-3.5 h-3.5" /> ID: {selectedListing.id}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-none mb-5">{selectedListing.title}</h1>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl min-h-[88px]">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-gray-900 font-bold shadow-sm">
                     {selectedListing.ownerLogin.charAt(0).toUpperCase()}
                   </div>
                   <div>
                     <p className="text-xs text-gray-500 font-semibold mb-0.5">Владелец / Продавец</p>
                     <button
                       onClick={() => openUserProfile(selectedListing.ownerLogin)}
                       className="text-sm font-extrabold text-gray-900 hover:text-blue-600 hover:underline transition-colors"
                     >
                       {selectedListing.ownerLogin}
                     </button>
                   </div>
                 </div>
                 <div className="text-right">
                    <div className="flex items-center justify-end gap-0.5 mb-0.5">
                      {renderRatingStars(averageRating)}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     {averageRating.toFixed(1)} ({sellerReviews.length} отзывов)
                    </p>
                 </div>
              </div>
            </div>
            
            {/* Action Card (Price + Cart) */}
            <div className="bg-white border-2 border-gray-900 rounded-3xl p-6 shadow-xl shadow-gray-200/50">
               <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-2">Разовый платеж</p>
               <div className="flex items-baseline gap-2 mb-6">
                  <p className="text-5xl font-black text-gray-900 tracking-tight">{selectedListing.price.toLocaleString('ru-RU')}</p>
                  <span className="text-2xl font-bold text-gray-400">₽</span>
               </div>
               
               <button onClick={() => handleAddToCart(selectedListing.id)} className="w-full flex items-center justify-center rounded-xl bg-gray-900 hover:bg-black px-6 py-4 text-base text-white font-extrabold shadow-md shadow-gray-900/20 transition-all active:scale-[0.98] mb-3">
                  Добавить в корзину
               </button>
               <button onClick={navigateToHome} className="w-full flex items-center justify-center rounded-xl border-2 border-gray-200 px-6 py-3.5 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]">
                  Продолжить покупки
               </button>

               {selectedListing.codeFileName && (
                  <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 rounded-lg py-2">
                     <Link2 className="h-4 w-4 text-gray-400" /> Включен файл: <span className="text-gray-700">{selectedListing.codeFileName}</span>
                  </div>
               )}
            </div>

            {/* Business Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Стек технологий</p>
                <p className="text-sm font-bold text-gray-900">{selectedListing.techStack || 'Не указан'}</p>
              </div>
              {selectedListing.monetizationType && (
                <div className="col-span-2 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mb-1">Монетизация</p>
                  <p className="text-sm font-bold text-gray-900">{selectedListing.monetizationType}</p>
                </div>
              )}
              {selectedListing.revenue && (
                 <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                   <p className="text-[10px] text-emerald-600/70 uppercase tracking-widest font-black mb-1">Выручка / мес</p>
                   <p className="text-lg font-black text-emerald-700">{selectedListing.revenue} ₽</p>
                 </div>
              )}
              {selectedListing.expenses && (
                 <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                   <p className="text-[10px] text-rose-600/70 uppercase tracking-widest font-black mb-1">Расходы / мес</p>
                   <p className="text-lg font-black text-rose-700">{selectedListing.expenses} ₽</p>
                 </div>
              )}
            </div>
            
          </div>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Detail Sections (Description & Reviews) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Full Description */}
        <div className="lg:col-span-2 flex flex-col gap-6">
           <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="bg-gray-100 p-2 rounded-xl text-gray-600">
                 <Box className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900">Описание проекта</h3>
           </div>
           
            <div className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed bg-white border border-gray-100 rounded-3xl p-8 shadow-sm min-h-[320px]">
            {selectedListing.description}
           </div>
        </div>

        {/* Reviews Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
           <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="bg-gray-100 p-2 rounded-xl text-gray-600">
                 <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900">Отзывы ({sellerReviews.length})</h3>
           </div>
           
           <div className="flex flex-col gap-4">
             {sellerReviews.length === 0 && (
               <div className="bg-white border border-gray-100 rounded-2xl p-6 text-sm text-gray-500 font-medium text-center">
                 У продавца пока нет отзывов.
               </div>
             )}

             {sellerReviews.length > 0 && (
               <div className={`flex flex-col gap-4 pr-1 ${isReviewsExpanded ? 'max-h-[540px] overflow-y-auto' : ''}`}>
                 {visibleReviews.map((review) => (
                   <div key={review.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-0.5">
                          {renderRatingStars(review.rating)}
                        </div>
                        <span className="text-[10px] items-center text-gray-400 font-bold tracking-wider uppercase">{formatReviewDate(review.date)}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">{review.text}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-[10px] font-bold flex items-center justify-center text-gray-500 uppercase">{review.author.charAt(0)}</div>
                        <span className="text-xs font-bold text-gray-400 font-mono">{review.author}</span>
                      </div>
                   </div>
                 ))}
               </div>
             )}

             {sellerReviews.length > 3 && (
               <button
                 type="button"
                 onClick={() => setIsReviewsExpanded((prev) => !prev)}
                 className="w-full py-4 text-sm font-bold text-gray-500 hover:text-gray-900 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
               >
                 {isReviewsExpanded ? 'Скрыть отзывы' : `Показать еще ${sellerReviews.length - 3}`}
               </button>
             )}
           </div>
        </div>

      </div>

      <AnimatePresence>
        {isViewerOpen && images[activeImageIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 sm:p-8"
            onClick={() => setIsViewerOpen(false)}
          >
            <div className="relative h-full w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsViewerOpen(false)}
                className="absolute top-0 right-0 sm:top-4 sm:right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-0 sm:left-6 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
                  aria-label="Предыдущее фото"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <img
                src={images[activeImageIndex]}
                alt={`Полноразмерное фото ${activeImageIndex + 1}`}
                className="max-h-[88vh] max-w-[92vw] rounded-2xl border border-white/20 object-contain"
              />

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-0 sm:right-6 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
                  aria-label="Следующее фото"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.section>
  );
}
