import { motion } from 'framer-motion'
import { FileCode, ImagePlus, Upload, X } from 'lucide-react'
import type { ChangeEvent, FormEvent, RefObject } from 'react'
import type { DeliveryMode } from '../types'

interface SellPageProps {
  sellForm: { title: string; description: string; price: string; category: string; techStack: string; projectUrl: string; deliveryMode: DeliveryMode };
  setSellForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; price: string; category: string; techStack: string; projectUrl: string; deliveryMode: DeliveryMode }>>;
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
    <motion.section key="sell" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-2xl mx-auto bg-white border rounded-2xl shadow-sm p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-4">{editingListingId ? 'Редактировать объявление' : 'Разместить объявление'}</h1>
      <form onSubmit={handleCreateListing} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Название проекта</label>
          <input value={sellForm.title} onChange={(e) => setSellForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-xl border px-4 py-2" placeholder="Например: SaaS для автоматизации продаж" required />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Описание проекта</label>
          <textarea value={sellForm.description} onChange={(e) => setSellForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full min-h-[120px] rounded-xl border px-4 py-2" placeholder="Опишите стек, готовность, что нужно доработать" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Тип проекта</label>
            <select value={sellForm.category} onChange={(e) => setSellForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full rounded-xl border px-4 py-2" required>
              <option value="apps">Приложения</option>
              <option value="sites">Сайты</option>
              <option value="games">Игры</option>
              <option value="scripts">Скрипты/Боты</option>
              <option value="blogs">Блоги</option>
              <option value="domains">Домены</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Технический стек</label>
            <input value={sellForm.techStack} onChange={(e) => setSellForm((prev) => ({ ...prev, techStack: e.target.value }))} className="w-full rounded-xl border px-4 py-2" placeholder="React, Node.js, Next, etc." required />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Цена (₽)</label>
            <input type="number" value={sellForm.price} onChange={(e) => setSellForm((prev) => ({ ...prev, price: e.target.value }))} className="w-full rounded-xl border px-4 py-2" min="1" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Способ выдачи</label>
            <select value={sellForm.deliveryMode} onChange={(e) => setSellForm((prev) => ({ ...prev, deliveryMode: e.target.value as DeliveryMode }))} className="w-full rounded-xl border px-4 py-2">
              <option value="auto">Автовыдача</option>
              <option value="manual">Ручная передача</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Ссылка на проект (GitHub/GitLab)</label>
          <input value={sellForm.projectUrl} onChange={(e) => setSellForm((prev) => ({ ...prev, projectUrl: e.target.value }))} className="w-full rounded-xl border px-4 py-2" placeholder="https://github.com/user/repo" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Файл с кодом (zip/rar/7z)</label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => codeFileInputRef.current?.click()} className="rounded-xl border px-4 py-2">Выбрать файл</button>
            {codeFile && <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-sm"><FileCode className="h-4 w-4" /> {codeFile.name}</span>}
          </div>
          <input ref={codeFileInputRef} type="file" accept=".zip,.rar,.7z,.tar,.gz,.txt,.md,.pdf" className="hidden" onChange={handleCodeFileChange} />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Фото проекта (до 5 шт)</label>
          <div className="flex flex-wrap gap-3">
            {sellImagePreviews.map((src, index) => (
              <div key={`${src}-${index}`} className="relative h-24 w-24 overflow-hidden rounded-xl border">
                <img src={src} alt="Project preview" className="h-full w-full object-cover" />
                <button type="button" onClick={() => removeSellImage(index)} className="absolute right-1 top-1 rounded-full bg-white/90 p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {sellImagePreviews.length < 5 && (
              <button type="button" onClick={() => imageInputRef.current?.click()} className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed text-gray-500 hover:bg-gray-50">
                <ImagePlus className="h-6 w-6" />
              </button>
            )}
          </div>
          <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSellImageChange} />
        </div>

        <div className="flex gap-4">
          <button className="flex-1 rounded-xl bg-black py-2.5 text-white inline-flex items-center justify-center gap-2 transition hover:bg-gray-800" type="submit">
            <Upload className="h-4 w-4" /> {editingListingId ? 'Сохранить изменения' : 'Опубликовать объявление'}
          </button>
          
          {editingListingId && (
            <button 
              type="button" 
              onClick={handleDeleteListing}
              className="rounded-xl border border-red-500 text-red-600 px-6 py-2.5 font-medium hover:bg-red-50 transition-colors"
            >
              Удалить
            </button>
          )}
        </div>
      </form>
    </motion.section>
  );
}
