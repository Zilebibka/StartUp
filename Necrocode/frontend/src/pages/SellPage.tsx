import { motion } from 'framer-motion'
import { FileCode, ImagePlus, Upload, X, Info, Settings2, Wallet, Camera } from 'lucide-react'
import type { ChangeEvent, FormEvent, RefObject } from 'react'
import type { DeliveryMode } from '../types'

interface SellPageProps {
  sellForm: { title: string; description: string; price: string; category: string; techStack: string; revenue: string; expenses: string; monetizationType: string; projectUrl: string; deliveryMode: DeliveryMode };
  setSellForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; price: string; category: string; techStack: string; revenue: string; expenses: string; monetizationType: string; projectUrl: string; deliveryMode: DeliveryMode }>>;
  handleCreateListing: (e: FormEvent) => Promise<void>;
  codeFile: File | null;
  codeFileInputRef: RefObject<HTMLInputElement | null>;
  handleCodeFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  sellImagePreviews: string[];
  removeSellImage: (index: number) => void;
  imageInputRef: RefObject<HTMLInputElement | null>;
  handleSellImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  editingListingId: number | null;
  handleDeleteListing: () => void;
}

export function SellPage({
  sellForm, setSellForm, handleCreateListing,
  codeFile, codeFileInputRef, handleCodeFileChange,
  sellImagePreviews, removeSellImage, imageInputRef, handleSellImageChange,
  editingListingId, handleDeleteListing
}: SellPageProps) {
  return (
    <motion.section key="sell" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="break-words text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{editingListingId ? 'Изменение объявления' : 'Разместить проект на продажу'}</h1>
        <p className="text-gray-500 mt-2 text-sm sm:text-base">Тщательно заполните все поля, чтобы привлечь больше потенциальных покупателей и повысить доверие к вашему проекту.</p>
      </div>

      <form onSubmit={handleCreateListing} className="space-y-6">
        
        {/* Основная информация */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 shadow-sm">
          <div className="flex min-w-0 items-center gap-2 mb-5 pb-3 border-b border-gray-100">
            <Info className="h-5 w-5 text-gray-500" />
            <h2 className="break-words text-lg font-semibold text-gray-800">Основная информация</h2>
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Название проекта <span className="text-red-500">*</span></label>
              <input value={sellForm.title} onChange={(e) => setSellForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all px-4 py-2.5" placeholder="Например: SaaS платформа для автоматизации продаж (MRR $1k)" required />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Категория <span className="text-red-500">*</span></label>
                <select value={sellForm.category} onChange={(e) => setSellForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all px-4 py-2.5" required>
                  <option value="apps">Приложения</option>
                  <option value="sites">Сайты и Сервисы</option>
                  <option value="games">Игры</option>
                  <option value="scripts">Скрипты и Боты</option>
                  <option value="blogs">Блоги и Сообщества</option>
                  <option value="domains">Домены</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Детальное описание <span className="text-red-500">*</span></label>
              <textarea value={sellForm.description} onChange={(e) => setSellForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full min-h-[160px] rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all px-4 py-3 resize-y" placeholder="Опишите продукт, его преимущества, причину продажи, как все устроено под капотом, какие необходимы доработки..." required />
            </div>
          </div>
        </div>

        {/* Технические детали */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 shadow-sm">
          <div className="flex min-w-0 items-center gap-2 mb-5 pb-3 border-b border-gray-100">
            <Settings2 className="h-5 w-5 text-gray-500" />
            <h2 className="break-words text-lg font-semibold text-gray-800">Технические детали</h2>
          </div>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Технический стек <span className="text-red-500">*</span></label>
              <input value={sellForm.techStack} onChange={(e) => setSellForm((prev) => ({ ...prev, techStack: e.target.value }))} className="w-full rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all px-4 py-2.5" placeholder="Например: React, Node.js, PostgreSQL, Docker, AWS" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Ссылка на код (GitHub, GitLab и др.)</label>
                <input value={sellForm.projectUrl} onChange={(e) => setSellForm((prev) => ({ ...prev, projectUrl: e.target.value }))} className="w-full rounded-xl border border-gray-300 focus:border-blue-500 outline-none transition-all px-4 py-2.5" placeholder="https://github.com/username/repository" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Архив с проектом (zip/rar/7z)</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button type="button" onClick={() => codeFileInputRef.current?.click()} className="w-full sm:w-auto rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 font-medium px-4 py-2.5 text-sm transition-colors whitespace-nowrap">
                    Выбрать файл...
                  </button>
                  {codeFile && <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 text-sm truncate max-w-full"><FileCode className="h-4 w-4 shrink-0" /> <span className="truncate">{codeFile.name}</span></span>}
                </div>
                <input ref={codeFileInputRef} type="file" accept=".zip,.rar,.7z,.tar,.gz,.txt,.md,.pdf" className="hidden" onChange={handleCodeFileChange} />
              </div>
            </div>
            
            <p className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" /> 
              Необходимо загрузить архив с исходным кодом ИЛИ указать ссылку на приглашение в коллаборацию приватного репозитория. Без предоставления исходников объявление не допускается.
            </p>
          </div>
        </div>

        {/* Финансы и Выдача */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 shadow-sm">
          <div className="flex min-w-0 items-center gap-2 mb-5 pb-3 border-b border-gray-100">
            <Wallet className="h-5 w-5 text-gray-500" />
            <h2 className="break-words text-lg font-semibold text-gray-800">Бизнес-показатели и Финансы</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Выручка (₽ / мес)</label>
              <input type="number" min="0" value={sellForm.revenue} onChange={(e) => setSellForm((prev) => ({ ...prev, revenue: e.target.value }))} className="w-full rounded-xl border border-gray-300 focus:border-green-500 outline-none transition-all px-4 py-2.5" placeholder="Например: 50000" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Расходы (₽ / мес)</label>
              <input type="number" min="0" value={sellForm.expenses} onChange={(e) => setSellForm((prev) => ({ ...prev, expenses: e.target.value }))} className="w-full rounded-xl border border-gray-300 focus:border-red-500 outline-none transition-all px-4 py-2.5" placeholder="Например: 5000" />
            </div>
          </div>

          <div className="space-y-2 mb-5">
            <label className="text-sm font-semibold text-gray-700">Тип монетизации</label>
            <input value={sellForm.monetizationType} onChange={(e) => setSellForm((prev) => ({ ...prev, monetizationType: e.target.value }))} className="w-full rounded-xl border border-gray-300 focus:border-blue-500 outline-none transition-all px-4 py-2.5" placeholder="Подписка, реклама, встроенные покупки, премиум функционал..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-dashed border-gray-200">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Стоимость продажи (₽) <span className="text-red-500">*</span></label>
              <input type="number" value={sellForm.price} onChange={(e) => setSellForm((prev) => ({ ...prev, price: e.target.value }))} className="w-full rounded-xl border-2 border-gray-300 focus:border-black outline-none transition-all px-4 py-3 text-lg font-medium" min="1" placeholder="Безопасная сделка" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Способ передачи прав <span className="text-red-500">*</span></label>
              <select value={sellForm.deliveryMode} onChange={(e) => setSellForm((prev) => ({ ...prev, deliveryMode: e.target.value as DeliveryMode }))} className="w-full rounded-xl border-2 border-gray-300 focus:border-black outline-none transition-all px-4 py-3 font-medium bg-gray-50">
                <option value="auto">Автоматическая выдача (Покупатель сразу качает архив)</option>
                <option value="manual">Ручная передача (Через гаранта или личный контакт)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Медиа файлы */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 shadow-sm">
          <div className="flex min-w-0 items-center gap-2 mb-5 pb-3 border-b border-gray-100">
            <Camera className="h-5 w-5 text-gray-500" />
            <h2 className="break-words text-lg font-semibold text-gray-800">Медиа (Скриншоты проекта)</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Загрузите до 5 качественных скриншотов вашего проекта. Первое загруженное изображение будет обложкой (превью).</p>
            <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap gap-3 mt-4">
              {sellImagePreviews.map((src, index) => (
                <div key={`${src}-${index}`} className="relative aspect-square w-full sm:h-28 sm:w-28 overflow-hidden rounded-xl border border-gray-200 shadow-sm group">
                  <img src={src} alt="Project preview" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  <button type="button" onClick={() => removeSellImage(index)} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1.5 text-gray-700 hover:text-red-500 hover:bg-white shadow">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {index === 0 && <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">Обложка</span>}
                </div>
              ))}
              {sellImagePreviews.length < 5 && (
                <button type="button" onClick={() => imageInputRef.current?.click()} className="flex aspect-square w-full sm:h-28 sm:w-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-colors gap-2">
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-xs font-medium">Добавить</span>
                </button>
              )}
            </div>
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSellImageChange} />
          </div>
        </div>

        {/* Управление */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <button className="flex-1 rounded-xl bg-gray-900 border border-transparent shadow-md hover:shadow-lg py-4 text-white font-semibold text-lg inline-flex items-center justify-center gap-2 transition hover:bg-black active:scale-[0.99]" type="submit">
            <Upload className="h-5 w-5" /> {editingListingId ? 'Сохранить изменения' : 'Опубликовать объявление'}
          </button>
          
          {editingListingId && (
            <button 
              type="button" 
              onClick={handleDeleteListing}
              className="rounded-xl border-2 border-red-500 text-red-600 px-8 py-4 font-semibold hover:bg-red-50 transition-colors w-full sm:w-auto active:scale-[0.99]"
            >
              Снять с публикации
            </button>
          )}
        </div>
      </form>
    </motion.section>
  );
}
