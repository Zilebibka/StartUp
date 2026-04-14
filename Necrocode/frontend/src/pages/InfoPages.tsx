import { motion, AnimatePresence } from 'framer-motion'
import { Send, X } from 'lucide-react'

interface HelpPageProps {
  activeFaq: number | null;
  setActiveFaq: (id: number | null) => void;
  setIsContactOpen: (open: boolean) => void;
}

export function HelpPage({ activeFaq, setActiveFaq, setIsContactOpen }: HelpPageProps) {
  return (
    <motion.section key="help" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-3xl mx-auto bg-white border rounded-2xl shadow-sm p-6 sm:p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Помощь и FAQ</h1>
      {[
        { q: 'Как купить товар?', a: 'Откройте страницу лота, добавьте его в корзину и оформите покупку.' },
        { q: 'Как продать проект?', a: 'Нажмите Продать, заполните форму и прикрепите файл или ссылку.' },
        { q: 'Как работает сессия?', a: 'Refresh cookie + access token.' },
      ].map((faq, idx) => (
        <div key={idx} onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} className="border rounded-xl p-4 mb-3 cursor-pointer">
          <div className="font-bold flex justify-between">{faq.q}<span>{activeFaq === idx ? '-' : '+'}</span></div>
          <AnimatePresence>
            {activeFaq === idx && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-sm text-gray-600 mt-2 overflow-hidden">{faq.a}</motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
      <div className="mt-8 text-center">
        <button onClick={() => setIsContactOpen(true)} className="rounded-xl bg-black px-4 py-2 text-white">Связаться с поддержкой</button>
      </div>
    </motion.section>
  );
}

export function AboutPage() {
  return (
    <motion.section key="about" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-3xl mx-auto bg-white border rounded-2xl shadow-sm p-6 sm:p-8">
      <h1 className="text-3xl font-bold mb-3">О нас</h1>
      <p className="text-gray-600">NecroCode - платформа для продажи и покупки незавершенных IT-проектов.</p>
    </motion.section>
  );
}

interface ContactModalProps {
  setIsContactOpen: (open: boolean) => void;
  setError: (err: string) => void;
  setSuccessMessage: (msg: string) => void;
}

export function ContactModal({ setIsContactOpen, setError, setSuccessMessage }: ContactModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40" onClick={() => setIsContactOpen(false)} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-xl">
        <button onClick={() => setIsContactOpen(false)} className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-gray-100">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-2xl font-bold mb-2">Написать нам</h2>
        <p className="text-sm text-gray-500 mb-5">Мы ответим вам в течение 24 часов.</p>
        <form onSubmit={(e) => { e.preventDefault(); setIsContactOpen(false); setError(''); setSuccessMessage('Сообщение отправлено в поддержку.') }} className="space-y-3">
          <input type="email" required placeholder="example@mail.com" className="w-full rounded-xl border px-4 py-2" />
          <textarea required placeholder="Опишите проблему" className="w-full min-h-[120px] rounded-xl border px-4 py-2" />
          <button type="submit" className="w-full rounded-xl bg-black py-2 text-white inline-flex items-center justify-center gap-2"><Send className="h-4 w-4" /> Отправить сообщение</button>
        </form>
      </motion.div>
    </div>
  );
}
