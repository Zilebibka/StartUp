import { motion } from 'framer-motion'

interface TopupPageProps {
  balance: number;
  topupAmount: number | '';
  setTopupAmount: (amount: number | '') => void;
  paymentMethod: 'card' | 'sbp' | 'crypto';
  setPaymentMethod: (method: 'card' | 'sbp' | 'crypto') => void;
  handleTopup: () => void;
}

export function TopupPage({ balance, topupAmount, setTopupAmount, paymentMethod, setPaymentMethod, handleTopup }: TopupPageProps) {
  return (
    <motion.section key="topup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="max-w-3xl mx-auto bg-white border rounded-2xl shadow-sm p-4 sm:p-8 space-y-5 sm:space-y-6">
      <h1 className="text-2xl font-bold">Пополнение баланса</h1>
      <p className="text-sm text-gray-500">Текущий баланс: <b>{balance.toLocaleString('ru-RU')} ₽</b></p>
      <div className="space-y-4">
        <label className="text-sm font-medium">Сумма пополнения (₽)</label>
        <div className="flex flex-wrap gap-2">
          {[100, 500, 1000, 2000, 5000].map((amount) => (
            <button key={amount} onClick={() => setTopupAmount(amount)} className={`px-3 sm:px-4 py-2 border rounded-xl text-sm ${topupAmount === amount ? 'bg-black text-white' : ''}`}>{amount} ₽</button>
          ))}
        </div>
        <input type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value ? Number(e.target.value) : '')} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" min="100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button 
          onClick={() => setPaymentMethod('card')} 
          className={`border-2 rounded-xl p-4 transition-all duration-200 ${
            paymentMethod === 'card'
              ? 'border-black bg-gray-900 text-white shadow-md transform scale-[1.02]' 
              : 'border-gray-200 hover:border-gray-400'
          }`}
        >
          Банковская карта
        </button>
        <button 
          onClick={() => setPaymentMethod('sbp')} 
          className={`border-2 rounded-xl p-4 transition-all duration-200 ${
            paymentMethod === 'sbp'
              ? 'border-black bg-gray-900 text-white shadow-md transform scale-[1.02]' 
              : 'border-gray-200 hover:border-gray-400'
          }`}
        >
          СБП / QR
        </button>
        <button 
          onClick={() => setPaymentMethod('crypto')} 
          className={`border-2 rounded-xl p-4 transition-all duration-200 ${
            paymentMethod === 'crypto'
              ? 'border-black bg-gray-900 text-white shadow-md transform scale-[1.02]' 
              : 'border-gray-200 hover:border-gray-400'
          }`}
        >
          Crypto
        </button>
      </div>
      <button onClick={handleTopup} className="w-full rounded-xl bg-black py-3 text-white">Перейти к оплате</button>
    </motion.section>
  );
}
