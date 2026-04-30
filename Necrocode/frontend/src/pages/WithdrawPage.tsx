import { motion } from 'framer-motion'

interface WithdrawPageProps {
  balance: number;
  withdrawAmount: number | '';
  setWithdrawAmount: (amount: number | '') => void;
  withdrawMethod: 'card' | 'sbp' | 'crypto';
  setWithdrawMethod: (method: 'card' | 'sbp' | 'crypto') => void;
  withdrawDestination: string;
  setWithdrawDestination: (dest: string) => void;
  handleWithdraw: () => void;
}

export function WithdrawPage({
  balance,
  withdrawAmount,
  setWithdrawAmount,
  withdrawMethod,
  setWithdrawMethod,
  withdrawDestination,
  setWithdrawDestination,
  handleWithdraw,
}: WithdrawPageProps) {
  return (
    <motion.section
      key="withdraw"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="max-w-3xl mx-auto bg-white border rounded-2xl shadow-sm p-4 sm:p-8 space-y-5 sm:space-y-6 panel-shell"
    >
      <h1 className="text-2xl font-bold">Вывод средств</h1>
      <p className="text-sm text-gray-500">Доступно для вывода: <b>{balance.toLocaleString('ru-RU')} ₽</b></p>
      
      <div className="space-y-4">
        <label className="text-sm font-medium">Сумма вывода (₽)</label>
        <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap gap-2">
          {[1000, 5000, 10000, balance].map((amount, idx) => (
            <button
              key={`${amount}-${idx}`}
              onClick={() => setWithdrawAmount(amount)}
              className={`min-h-10 px-3 sm:px-4 py-2 border-2 rounded-xl text-sm panel-button ${withdrawAmount === amount ? 'bg-black text-white panel-button-active' : ''}`}
            >
              {idx === 3 ? 'Все средства' : `${amount} ₽`}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value ? Number(e.target.value) : '')}
          className="w-full px-4 py-3 bg-gray-50 border rounded-xl panel-soft panel-outline"
          min="1000"
          max={balance}
        />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium">Куда вывести</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => { setWithdrawMethod('card'); setWithdrawDestination(''); }}
            className={`border-2 rounded-xl p-3 sm:p-4 text-sm sm:text-base transition-all duration-200 ${
              withdrawMethod === 'card' 
                ? 'border-black bg-gray-900 text-white shadow-md panel-button-active' 
                : 'border-gray-200 hover:border-gray-400 panel-button'
            }`}
          >
            Банковская карта
          </button>
          <button
            onClick={() => { setWithdrawMethod('sbp'); setWithdrawDestination(''); }}
            className={`border-2 rounded-xl p-3 sm:p-4 text-sm sm:text-base transition-all duration-200 ${
              withdrawMethod === 'sbp' 
                ? 'border-black bg-gray-900 text-white shadow-md panel-button-active' 
                : 'border-gray-200 hover:border-gray-400 panel-button'
            }`}
          >
            СБП
          </button>
          <button
            onClick={() => { setWithdrawMethod('crypto'); setWithdrawDestination(''); }}
            className={`border-2 rounded-xl p-3 sm:p-4 text-sm sm:text-base transition-all duration-200 ${
              withdrawMethod === 'crypto' 
                ? 'border-black bg-gray-900 text-white shadow-md panel-button-active' 
                : 'border-gray-200 hover:border-gray-400 panel-button'
            }`}
          >
            Crypto (USDT)
          </button>
        </div>
      </div>

      {withdrawMethod === 'card' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Номер карты</label>
          <input 
            type="text" 
            placeholder="0000 0000 0000 0000" 
            value={withdrawDestination}
            onChange={(e) => setWithdrawDestination(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none rounded-xl transition-all panel-soft panel-outline" 
          />
        </div>
      )}

      {withdrawMethod === 'sbp' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Номер телефона (СБП)</label>
          <input 
            type="text" 
            placeholder="+7 999 000 00 00" 
            value={withdrawDestination}
            onChange={(e) => setWithdrawDestination(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none rounded-xl transition-all panel-soft panel-outline" 
          />
        </div>
      )}

      {withdrawMethod === 'crypto' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Адрес кошелька (USDT TRC20)</label>
          <input 
            type="text" 
            placeholder="T..." 
            value={withdrawDestination}
            onChange={(e) => setWithdrawDestination(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none rounded-xl transition-all panel-soft panel-outline" 
          />
        </div>
      )}

      <button onClick={handleWithdraw} className="w-full rounded-xl bg-black py-3 text-white">
        Оформить заявку на вывод
      </button>
    </motion.section>
  )
}
