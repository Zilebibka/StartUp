import { motion, AnimatePresence } from "framer-motion"
import { Send, X, Code2, Globe, AppWindow, Globe2 } from "lucide-react"

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
        { q: "Как купить товар?", a: "Откройте страницу лота, добавьте его в корзину и оформите покупку." },
        { q: "Как продать проект?", a: "Нажмите Продать, заполните форму и прикрепите файл или ссылку." },
        { q: "Как работает сессия?", a: "Refresh cookie + access token." },
      ].map((faq, idx) => (
        <div key={idx} onClick={() => setActiveFaq(activeFaq === idx ? null : idx)} className="border rounded-xl p-4 mb-3 cursor-pointer">
          <div className="font-bold flex justify-between">{faq.q}<span>{activeFaq === idx ? "-" : "+"}</span></div>
          <AnimatePresence>
            {activeFaq === idx && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-gray-600 mt-2 overflow-hidden">{faq.a}</motion.p>
            )}
          </AnimatePresence>
        </div>
      ))}
      <div className="mt-8 text-center">
        <button onClick={() => setIsContactOpen(true)} className="rounded-xl bg-black px-4 py-2 text-white hover:bg-gray-800 transition-colors">Связаться с поддержкой</button>
      </div>
    </motion.section>
  );
}

export function AboutPage() {
  return (
    <motion.section key="about" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full max-w-6xl mx-auto space-y-16 py-8">
      {/* Header and Intro */}
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-black text-blue-950 uppercase tracking-tight">О ПРОЕКТЕ NECROCODE</h1>
        <p className="text-base md:text-lg text-gray-800 font-semibold leading-relaxed">
          NecroCode — это уникальный маркетплейс, созданный для сохранения,
          восстановления и переосмысления заброшенных цифровых артефактов.
          Мы стремимся вдохнуть новую жизнь в старый код, забытые веб-сайты и
          незаконченные приложения, которые заслуживают второго шанса или
          могут стать основой для чего-то нового.
        </p>
      </div>

      {/* Why NecroCode? */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-gray-900">Почему NecroCode?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col gap-4">
            <div className="w-full h-32 bg-slate-900 rounded-xl flex items-center justify-center border-2 border-gray-300 relative overflow-hidden">
               <div className="absolute inset-0 pt-3 pl-3">
                 <pre className="text-[6px] text-slate-300 font-mono leading-none opacity-80">
                   {"function init() {\n  connectDb();\n  startServer();\n  loadPlugins();\n}\n\n// TODO: add missing tables"}
                 </pre>
               </div>
               <div className="absolute top-2 w-32 h-1.5 bg-lime-300/70 rounded-full blur-[1px] opacity-70"></div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">Восстановление</h3>
              <p className="text-sm text-gray-600 font-medium">Найдите уникальные<br/>проекты и дайте им<br/>вторую жизнь.</p>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col gap-4">
            <div className="w-full h-32 bg-slate-900 rounded-xl flex items-center justify-center border-2 border-gray-300 relative overflow-hidden">
               <div className="absolute inset-0 pt-3 pl-3">
                 <pre className="text-[6px] text-slate-300 font-mono leading-none opacity-80">
                   {"import { Provider } from \"react-redux\"\nimport { store } from \"./store\"\n\nReactDOM.render(\n  <Provider store={store}>\n    <App />\n  </Provider>\n)"}
                 </pre>
               </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">Экосистема</h3>
              <p className="text-sm text-gray-600 font-medium">Платформа для обмена<br/>кодом, опытом и идеями.</p>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col gap-4">
            <div className="w-full h-32 bg-slate-900 rounded-xl flex items-center justify-center border-2 border-gray-300 relative overflow-hidden">
               <div className="absolute inset-0 pt-3 pl-3">
                 <pre className="text-[6px] text-slate-300 font-mono leading-none opacity-80">
                   {"const crypto = require(\"crypto\");\n\nfunction hash(pwd) {\n  return crypto.pbkdf2Sync(pwd, salt, 1000, 64, \"sha512\");\n}"}
                 </pre>
               </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-1">Безопасность</h3>
              <p className="text-sm text-gray-600 font-medium">Прозрачность сделок<br/>и надежная передача<br/>данных.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Types */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-gray-900">Типы проектов, которые мы сохраняем:</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Веб-сайты", icon: <Globe2 className="w-6 h-6 text-gray-400" /> },
            { title: "Приложения", icon: <AppWindow className="w-6 h-6 text-gray-400" /> },
            { title: "Библиотеки кода", icon: <Code2 className="w-6 h-6 text-gray-400" /> },
            { title: "Домены", icon: <Globe className="w-6 h-6 text-gray-400" /> }
          ].map((type, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow">
              <div className="w-full h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex flex-col pt-2 pl-2 overflow-hidden shadow-inner">
                <div className="flex gap-1 mb-2 pl-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                </div>
                <div className="opacity-40">
                  <pre className="text-[4px] text-green-400 font-mono leading-none">
                    {"// TODO: create logic\nfor (let i=0; i<10; i++) {\n  do_something();\n}"}
                  </pre>
                </div>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{type.title}</h4>
            </div>
          ))}
        </div>
      </div>
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
        <form onSubmit={(e) => { e.preventDefault(); setIsContactOpen(false); setError(""); setSuccessMessage("Сообщение отправлено в поддержку.") }} className="space-y-3">
          <input className="w-full rounded-xl border px-4 py-2" placeholder="Ваше имя" required />
          <input className="w-full rounded-xl border px-4 py-2" type="email" placeholder="Email" required />
          <textarea className="w-full rounded-xl border px-4 py-2" placeholder="Ваш вопрос..." rows={4} required></textarea>
          <button className="w-full rounded-xl bg-black py-2 font-medium text-white flex items-center justify-center gap-2" type="submit">
            Отправить <Send className="w-4 h-4"/>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
