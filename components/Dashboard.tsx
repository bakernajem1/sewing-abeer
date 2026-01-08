
import React from 'react';
import { ProductionRecord, SupplierOrder, Expense, Machine, Worker, Advance, Withdrawal } from '../types';
import { Truck, ShoppingBag, Users, Banknote, TrendingUp, TrendingDown, CreditCard, Wallet, Landmark } from 'lucide-react';

interface Props {
  orders: SupplierOrder[];
  records: ProductionRecord[];
  expenses: Expense[];
  machines: Machine[];
  workers: Worker[];
  advances: Advance[];
  withdrawals: Withdrawal[];
}

const Dashboard: React.FC<Props> = ({ orders, records, expenses, machines, workers, advances, withdrawals }) => {
  // إجمالي ما تم تحصيله كاش فعلاً
  const supplierCash = orders.reduce((acc, o) => acc + (o.total_paid || 0), 0);
  const customerCash = records.filter(r => r.is_customer_work).reduce((acc, r) => acc + (r.supplier_rate || 0), 0);
  const totalIn = supplierCash + customerCash;

  // إجمالي ما خرج من الصندوق كاش فعلاً
  const totalPaidExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalPaidSalaries = records.filter(r => !r.is_customer_work && r.is_paid).reduce((acc, r) => acc + (r.quantity * r.worker_rate), 0);
  const ownerOut = withdrawals.reduce((acc, w) => acc + w.amount, 0);
  
  // صافي الربح والسيولة
  const totalNetProfit = totalIn - totalPaidExpenses - totalPaidSalaries;
  const cashRemaining = totalNetProfit - ownerOut;

  // الديون المترتبة (ذمم)
  const workerDebts = records.filter(r => !r.is_paid && !r.is_customer_work).reduce((a,b)=>a+(b.quantity*b.worker_rate),0);

  return (
    <div className="space-y-10">
      {/* Primary Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <TrendingUp size={120} className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform" />
          <p className="text-xs uppercase font-black opacity-60 mb-2 tracking-[0.2em]">إجمالي صافي الربح</p>
          <p className="text-5xl font-black">₪{totalNetProfit.toFixed(0)}</p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest">
             محقق فعلياً
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-orange-50">
          <p className="text-xs uppercase font-black text-gray-400 mb-2 tracking-[0.2em]">مسحوبات عبير</p>
          <p className="text-5xl font-black text-orange-600">₪{ownerOut.toFixed(0)}</p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-orange-400 uppercase"><Landmark size={16}/> من الربح</div>
        </div>

        <div className="bg-emerald-50 p-10 rounded-[3rem] border-2 border-emerald-100 relative overflow-hidden">
          <Wallet size={100} className="absolute -left-5 -bottom-5 opacity-5" />
          <p className="text-xs uppercase font-black text-emerald-600 mb-2 tracking-[0.2em]">السيولة المتوفرة</p>
          <p className="text-5xl font-black text-blue-900">₪{cashRemaining.toFixed(0)}</p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-widest">بالصندوق الآن</div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-red-50">
          <p className="text-xs uppercase font-black text-gray-400 mb-2 tracking-[0.2em]">ذمم الرواتب</p>
          <p className="text-5xl font-black text-red-700">₪{workerDebts.toFixed(0)}</p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-widest"><Users size={16}/> غير مدفوعة</div>
        </div>
      </div>

      {/* Detailed Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
           <h2 className="text-xl font-black mb-10 text-gray-800 flex items-center gap-4 border-b pb-6 uppercase tracking-[0.2em]">
             <TrendingUp size={28} className="text-emerald-500"/> تحليل الإيرادات
           </h2>
           <div className="space-y-8">
              <div className="flex justify-between items-center p-8 bg-slate-50 rounded-[2.5rem] transform hover:bg-slate-100 transition-colors">
                 <div className="flex items-center gap-5 text-gray-600 font-bold text-lg"><Truck size={30} className="text-blue-500"/> الموردين:</div>
                 <span className="font-black text-3xl text-blue-900">₪{supplierCash.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-8 bg-slate-50 rounded-[2.5rem] transform hover:bg-slate-100 transition-colors">
                 <div className="flex items-center gap-5 text-gray-600 font-bold text-lg"><ShoppingBag size={30} className="text-emerald-500"/> الزبائن:</div>
                 <span className="font-black text-3xl text-blue-900">₪{customerCash.toFixed(1)}</span>
              </div>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm">
           <h2 className="text-xl font-black mb-10 text-gray-800 flex items-center gap-4 border-b pb-6 uppercase tracking-[0.2em]">
             <TrendingDown size={28} className="text-red-500"/> تحليل النفقات
           </h2>
           <div className="space-y-8">
              <div className="flex justify-between items-center p-8 bg-red-50/50 rounded-[2.5rem] transform hover:bg-red-50 transition-colors">
                 <div className="flex items-center gap-5 text-gray-600 font-bold text-lg"><CreditCard size={30} className="text-red-500"/> المصاريف:</div>
                 <span className="font-black text-3xl text-red-600">₪{totalPaidExpenses.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-8 bg-red-50/50 rounded-[2.5rem] transform hover:bg-red-50 transition-colors">
                 <div className="flex items-center gap-5 text-gray-600 font-bold text-lg"><Users size={30} className="text-red-500"/> الرواتب:</div>
                 <span className="font-black text-3xl text-red-600">₪{totalPaidSalaries.toFixed(1)}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
