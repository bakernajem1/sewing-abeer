
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Users, CreditCard, Settings, Plus, Menu, X, Wrench, 
  Trash2, CheckCircle2, AlertCircle, Banknote, ShoppingBag, Truck, 
  DollarSign, Package, Edit3, Save, Printer, FileText, ChevronLeft, Wallet, TrendingUp, TrendingDown, Landmark, Lock, Key, MessageCircle, LogIn, User, Loader2, History
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Dashboard from './components/Dashboard';
import AIInput from './components/AIInput';
import { Worker, ProductionRecord, Advance, Expense, Machine, SupplierOrder, SalaryPayment, Withdrawal, AIDataResponse, SupplierPayment } from './types';

// التحقق من إعدادات Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: any;
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch (e) {
  console.error("Supabase Initialization Error:", e);
}

const App: React.FC = () => {
  // --- المصادقة ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [loginInput, setLoginInput] = useState({ user: '', pass: '' });

  // --- واجهة المستخدم ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'supplier_orders' | 'worker_tasks' | 'customer_work' | 'workers' | 'machines' | 'owner_withdrawals' | 'settings' | 'expenses'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // --- البيانات ---
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // الحالات المنبثقة
  const [payingMachineId, setPayingMachineId] = useState<string | null>(null);
  const [partialPaymentOrderId, setPartialPaymentOrderId] = useState<string | null>(null);

  // --- دالة جلب البيانات المركزية ---
  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsInitialLoading(true);
    if (!supabase) {
      setDbError("إعدادات السحابة مفقودة.");
      setIsInitialLoading(false);
      return;
    }

    try {
      const fetchT = async (t: string) => {
        const { data, error } = await supabase.from(t).select('*');
        if (error) throw error;
        return data || [];
      };

      const [w, o, r, a, e, m, p, wd, config] = await Promise.all([
        fetchT('workers'),
        fetchT('supplier_orders'),
        fetchT('production_records'),
        fetchT('advances'),
        fetchT('expenses'),
        fetchT('machines'),
        fetchT('salary_payments'),
        fetchT('withdrawals'),
        supabase.from('app_config').select('*').maybeSingle()
      ]);

      setWorkers(w);
      setOrders(o);
      setRecords(r);
      setAdvances(a);
      setExpenses(e);
      setMachines(m);
      setPayments(p);
      setWithdrawals(wd);
      
      if (config?.data) {
        setUsername(config.data.username || 'admin');
        setPassword(config.data.password || '1234');
      }
      
      if (localStorage.getItem('app_is_logged_in') === 'true') setIsLoggedIn(true);
      setDbError(null);
    } catch (error: any) {
      console.error("Fetch Error:", error);
      setDbError("تعذر تحديث البيانات من السحابة.");
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- مساعدات النظام ---
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const calculateTotalCash = () => {
    const totalIn = orders.reduce((acc, o) => acc + (o.total_paid || 0), 0) + 
                   records.filter(r => r.is_customer_work).reduce((acc, r) => acc + (r.supplier_rate || 0), 0);
    const machinePay = machines.reduce((acc, m) => acc + (m.paid_amount || 0), 0);
    const totalOut = expenses.reduce((acc, e) => acc + e.amount, 0) + 
                    payments.reduce((acc, p) => acc + p.amount, 0) + 
                    withdrawals.reduce((acc, w) => acc + w.amount, 0) + machinePay;
    return totalIn - totalOut;
  };

  const getWorkerBalance = (id: string) => {
    const earned = records.filter(r => r.worker_id === id && !r.is_paid && !r.is_customer_work).reduce((a, b) => a + (b.quantity * b.worker_rate), 0);
    const ads = advances.filter(a => a.worker_id === id && !a.is_settled).reduce((a, b) => a + b.amount, 0);
    return earned - ads;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInput.user === username && loginInput.pass === password) {
      setIsLoggedIn(true);
      localStorage.setItem('app_is_logged_in', 'true');
    } else showStatus("بيانات الدخول غير صحيحة", "error");
  };

  // --- العمليات المحاسبية الذكية ---
  const handleAISuccess = async (result: AIDataResponse) => {
    if (result.type === 'unknown') return showStatus("لم أفهم الطلب", "error");
    try {
      if (result.type === 'production') {
        const w = workers.find(x => x.full_name.includes(result.data.worker_name));
        if (!w) return showStatus(`لم أجد عاملة باسم ${result.data.worker_name}`, "error");
        await supabase.from('production_records').insert([{ worker_id: w.id, task_name: result.data.task_name, quantity: result.data.quantity, worker_rate: result.data.worker_rate, is_paid: false, recorded_at: new Date().toLocaleDateString('en-CA'), is_customer_work: false }]);
      } else if (result.type === 'advance') {
        const w = workers.find(x => x.full_name.includes(result.data.worker_name));
        if (!w) return showStatus(`لم أجد عاملة باسم ${result.data.worker_name}`, "error");
        await supabase.from('advances').insert([{ worker_id: w.id, amount: result.data.amount, note: result.data.note, date: new Date().toLocaleDateString('en-CA'), is_settled: false }]);
      } else if (result.type === 'expense') {
        await supabase.from('expenses').insert([{ category: result.data.category || 'عام', amount: result.data.amount, description: result.data.note, date: new Date().toLocaleDateString('en-CA') }]);
      }
      await fetchAllData(true);
      showStatus("تم تسجيل البيانات بنجاح");
    } catch (e) { showStatus("فشل في الحفظ", "error"); }
  };

  if (isInitialLoading) return <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-['Cairo']"><Loader2 className="animate-spin text-blue-500 mb-4" size={48}/><p className="text-white font-bold animate-pulse">جاري الاتصال بالسحابة...</p></div>;

  if (!isLoggedIn) return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center font-['Cairo'] p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-indigo-900 font-black text-3xl mb-4">ع</div>
          <h1 className="text-white text-2xl font-black">نظام مشغل عبير</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="اسم المستخدم" className="w-full p-4 rounded-xl bg-white/5 text-white text-right border-none focus:ring-2 focus:ring-white/20" onChange={e => setLoginInput({...loginInput, user: e.target.value})} />
          <input type="password" placeholder="كلمة المرور" className="w-full p-4 rounded-xl bg-white/5 text-white text-right border-none focus:ring-2 focus:ring-white/20" onChange={e => setLoginInput({...loginInput, pass: e.target.value})} />
          <button className="w-full bg-white text-indigo-900 py-4 rounded-xl font-black text-lg hover:bg-blue-50 transition-all">دخول النظام</button>
        </form>
        {dbError && <p className="text-red-400 text-xs text-center mt-4 font-bold">{dbError}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 pb-20 lg:pb-0 font-['Cairo']">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-2xl transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 text-blue-900 font-black text-2xl mb-8 border-b pb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">ع</div>
            <span>مشغل عبير</span>
          </div>
          <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
            {[
              { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
              { id: 'supplier_orders', label: 'طلبيات الموردين', icon: Truck },
              { id: 'worker_tasks', label: 'الإنتاج اليومي', icon: Package },
              { id: 'customer_work', label: 'إيراد الزبائن', icon: ShoppingBag },
              { id: 'workers', label: 'الرواتب والسلف', icon: Users },
              { id: 'expenses', label: 'المصاريف العامة', icon: CreditCard },
              { id: 'machines', label: 'الماكينات والأقساط', icon: Wrench },
              { id: 'owner_withdrawals', label: 'مسحوبات المدير', icon: Landmark },
              { id: 'settings', label: 'إدارة النظام', icon: Settings },
            ].map(item => (
              <button key={item.id} onClick={() => {setActiveTab(item.id as any); setIsSidebarOpen(false);}} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white font-black shadow-lg' : 'text-gray-500 hover:bg-gray-50'} flex-row-reverse`}>
                <item.icon size={18} /><span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="lg:mr-64 p-4 md:p-10 text-right min-h-screen">
        <header className="lg:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border">
          <button onClick={() => setIsSidebarOpen(true)}><Menu/></button>
          <span className="font-black text-blue-900">مشغل عبير</span>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in">
            <AIInput onDataExtracted={handleAISuccess} />
            <Dashboard orders={orders} records={records} expenses={expenses} machines={machines} workers={workers} advances={advances} withdrawals={withdrawals} />
          </div>
        )}

        {activeTab === 'supplier_orders' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 flex-row-reverse text-blue-900"><Truck/> إضافة طلبية مورد جديد</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await supabase.from('supplier_orders').insert([{
                    supplier_name: f.get('name'), item_name: f.get('item'), total_pieces: Number(f.get('pcs')), rate_per_piece: Number(f.get('rate')), status: 'active', total_paid: 0, created_at: new Date().toLocaleDateString('en-CA')
                  }]);
                  (e.target as HTMLFormElement).reset();
                  await fetchAllData(true);
                  showStatus("تمت إضافة الطلبية");
                } catch (err) { showStatus("فشل في الحفظ", "error"); }
              }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="name" placeholder="اسم المورد" required className="p-4 bg-gray-50 rounded-xl text-right border focus:ring-2 focus:ring-blue-200" />
                <input name="item" placeholder="اسم القطعة" required className="p-4 bg-gray-50 rounded-xl text-right border focus:ring-2 focus:ring-blue-200" />
                <input name="pcs" type="number" placeholder="العدد" required className="p-4 bg-gray-50 rounded-xl text-right border focus:ring-2 focus:ring-blue-200" />
                <input name="rate" type="number" step="0.01" placeholder="سعر القطعة (المورد)" required className="p-4 bg-gray-50 rounded-xl text-right border focus:ring-2 focus:ring-blue-200" />
                <button className="md:col-span-2 bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-blue-700">حفظ الطلبية</button>
              </form>
            </div>
            <div className="space-y-4">
              {orders.map(o => (
                <div key={o.id} className="bg-white p-6 rounded-2xl border flex justify-between items-center hover:border-blue-300 transition-all">
                  <div className="text-left font-black text-blue-900">
                    <p>المتبقي: ₪{((o.total_pieces * o.rate_per_piece) - (o.total_paid || 0)).toFixed(1)}</p>
                    <button onClick={() => setPartialPaymentOrderId(o.id)} className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg mt-2 font-black border border-emerald-100">تحصيل دفعة</button>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg">{o.supplier_name} - {o.item_name}</p>
                    <p className="text-xs text-gray-400 font-bold">{o.total_pieces} قطعة × ₪{o.rate_per_piece}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'worker_tasks' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-black mb-6 text-indigo-900">تسجيل إنتاج عاملة</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await supabase.from('production_records').insert([{
                    worker_id: f.get('worker_id'), task_name: f.get('task'), quantity: Number(f.get('qty')), worker_rate: Number(f.get('rate')), is_paid: false, recorded_at: new Date().toLocaleDateString('en-CA'), is_customer_work: false
                  }]);
                  (e.target as HTMLFormElement).reset();
                  await fetchAllData(true);
                  showStatus("تم تسجيل الإنتاج");
                } catch (err) { showStatus("فشل في الحفظ", "error"); }
              }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select name="worker_id" required className="p-4 bg-gray-50 rounded-xl text-right border">
                  <option value="">اختيار العاملة</option>
                  {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                </select>
                <input name="task" placeholder="اسم المهمة" required className="p-4 bg-gray-50 rounded-xl text-right border" />
                <input name="qty" type="number" placeholder="الكمية" required className="p-4 bg-gray-50 rounded-xl text-right border" />
                <input name="rate" type="number" step="0.01" placeholder="سعر القطعة للعاملة" required className="p-4 bg-gray-50 rounded-xl text-right border" />
                <button className="md:col-span-2 bg-indigo-600 text-white py-4 rounded-xl font-black shadow-lg">تسجيل الإنتاج</button>
              </form>
            </div>
            <div className="space-y-2">
              {records.filter(r => !r.is_customer_work).slice(0, 20).map(r => (
                <div key={r.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
                  <span className={`font-black text-xs px-3 py-1 rounded-full ${r.is_paid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{r.is_paid ? 'مدفوع' : 'ذمة'}</span>
                  <div className="text-right">
                    <p className="font-black text-gray-700">{workers.find(w=>w.id===r.worker_id)?.full_name} - {r.task_name}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{r.quantity} قطعة × ₪{r.worker_rate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'customer_work' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-black mb-6 text-emerald-700">إيراد زبائن خارجي</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await supabase.from('production_records').insert([{
                    task_name: f.get('task'), quantity: 1, worker_rate: 0, supplier_rate: Number(f.get('price')), is_paid: true, recorded_at: new Date().toLocaleDateString('en-CA'), is_customer_work: true
                  }]);
                  (e.target as HTMLFormElement).reset();
                  await fetchAllData(true);
                  showStatus("تم تسجيل الإيراد النقدي");
                } catch (err) { showStatus("فشل في الحفظ", "error"); }
              }} className="space-y-4">
                <input name="task" placeholder="نوع العمل (تقصير، خياطة..)" required className="w-full p-4 bg-gray-50 rounded-xl text-right border" />
                <input name="price" type="number" placeholder="المبلغ المقبوض" required className="w-full p-4 bg-gray-50 rounded-xl text-right border" />
                <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg">تسجيل كاش في الصندوق</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {records.filter(r => r.is_customer_work).map(r => (
                <div key={r.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center hover:bg-emerald-50/20 transition-all">
                  <span className="font-black text-emerald-600 text-xl">₪{r.supplier_rate}</span>
                  <div className="text-right"><p className="font-black">{r.task_name}</p><p className="text-xs text-gray-400 font-bold">{r.recorded_at}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workers' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
            {/* نموذج السلف والرواتب */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* السلف */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-red-50">
                <h2 className="text-xl font-black mb-6 text-red-600 flex items-center gap-2 flex-row-reverse"><DollarSign/> تسجيل سلفة مالية</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const amt = Number(f.get('amt'));
                  if (amt > calculateTotalCash()) return showStatus("لا يوجد سيولة كافية في الصندوق", "error");
                  try {
                    await supabase.from('advances').insert([{
                      worker_id: f.get('wid'), amount: amt, note: f.get('note'), date: new Date().toLocaleDateString('en-CA'), is_settled: false
                    }]);
                    (e.target as HTMLFormElement).reset();
                    await fetchAllData(true);
                    showStatus("تم صرف السلفة");
                  } catch (err) { showStatus("فشل في الحفظ", "error"); }
                }} className="space-y-4">
                  <select name="wid" required className="w-full p-4 bg-gray-50 rounded-2xl text-right border font-black appearance-none">
                    <option value="">اختيار العاملة</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} (رصيد: ₪{getWorkerBalance(w.id).toFixed(1)})</option>)}
                  </select>
                  <input name="amt" type="number" placeholder="مبلغ السلفة" required className="w-full p-4 bg-red-50 rounded-2xl text-right border-red-100 font-black text-xl" />
                  <input name="note" placeholder="ملاحظة السلفة" className="w-full p-4 bg-gray-50 rounded-2xl text-right border" />
                  <button className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-red-200 transition-all">صرف سلفة كاش</button>
                </form>
              </div>

              {/* دفع راتب */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-emerald-50">
                <h2 className="text-xl font-black mb-6 text-emerald-600 flex items-center gap-2 flex-row-reverse"><Banknote/> دفع راتب مستحق</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const workerId = f.get('wid') as string;
                  const amt = Number(f.get('amt'));
                  if (amt > calculateTotalCash()) return showStatus("لا يوجد سيولة كافية في الصندوق", "error");
                  if (amt <= 0) return showStatus("المبلغ يجب أن يكون أكبر من صفر", "error");
                  
                  try {
                    await supabase.from('salary_payments').insert([{ 
                      worker_id: workerId, 
                      amount: amt, 
                      date: new Date().toLocaleDateString('en-CA'), 
                      period_from: 'سابقة', 
                      period_to: 'اليوم', 
                      details: f.get('note') || 'دفع راتب يدوي'
                    }]);
                    
                    // إذا كان المبلغ المدفوع يساوي الرصيد بالكامل، نقوم بتصفية السجلات
                    const currentBal = getWorkerBalance(workerId);
                    if (amt >= currentBal) {
                      await supabase.from('production_records').update({ is_paid: true }).eq('worker_id', workerId).eq('is_paid', false);
                      await supabase.from('advances').update({ is_settled: true }).eq('worker_id', workerId).eq('is_settled', false);
                    }
                    
                    (e.target as HTMLFormElement).reset();
                    await fetchAllData(true);
                    showStatus("تم تسجيل دفع الراتب بنجاح");
                  } catch (err) { showStatus("فشل في الحفظ", "error"); }
                }} className="space-y-4">
                  <select name="wid" required className="w-full p-4 bg-gray-50 rounded-2xl text-right border font-black appearance-none">
                    <option value="">اختيار العاملة</option>
                    {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} (المستحق: ₪{getWorkerBalance(w.id).toFixed(1)})</option>)}
                  </select>
                  <input name="amt" type="number" placeholder="المبلغ المدفوع" required className="w-full p-4 bg-emerald-50 rounded-2xl text-right border-emerald-100 font-black text-xl" />
                  <input name="note" placeholder="ملاحظة (مثلاً: راتب شهر 3)" className="w-full p-4 bg-gray-50 rounded-2xl text-right border" />
                  <button className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-emerald-200 transition-all">تأكيد دفع الراتب</button>
                </form>
              </div>
            </div>

            {/* بطاقات العاملات */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workers.map(w => (
                <div key={w.id} className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-50 flex flex-col justify-between shadow-sm hover:border-blue-100 transition-all group">
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <User size={24} />
                      </div>
                      <div className="text-right">
                        <p className="font-black text-xl text-gray-800">{w.full_name}</p>
                        <p className="text-xs text-gray-400 font-bold">{w.phone || 'بدون هاتف'}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">صافي الرصيد المستحق</p>
                       <p className={`font-black text-3xl ${getWorkerBalance(w.id) > 0 ? 'text-blue-900' : 'text-gray-300'}`}>₪{getWorkerBalance(w.id).toFixed(1)}</p>
                    </div>
                  </div>
                  
                  <button onClick={async () => {
                      const bal = getWorkerBalance(w.id);
                      if (bal <= 0) return showStatus("لا يوجد رصيد مستحق للصرف", "error");
                      if (bal > calculateTotalCash()) return showStatus("السيولة غير كافية للتصفية", "error");
                      if (!confirm(`هل تريد صرف كامل الرصيد المستحق (₪${bal.toFixed(1)}) لـ ${w.full_name}؟`)) return;
                      
                      try {
                        await supabase.from('salary_payments').insert([{ 
                          worker_id: w.id, 
                          amount: bal, 
                          date: new Date().toLocaleDateString('en-CA'), 
                          period_from: 'سابقة', 
                          period_to: 'اليوم', 
                          details: 'تصفية سريعة' 
                        }]);
                        await supabase.from('production_records').update({ is_paid: true }).eq('worker_id', w.id).eq('is_paid', false);
                        await supabase.from('advances').update({ is_settled: true }).eq('worker_id', w.id).eq('is_settled', false);
                        await fetchAllData(true);
                        showStatus("تمت تصفية الراتب بالكامل");
                      } catch (err) { showStatus("خطأ في التصفية", "error"); }
                    }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black shadow-md hover:bg-blue-700 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                    <CheckCircle2 size={16}/> دفع الراتب بالكامل
                  </button>
                </div>
              ))}
            </div>

            {/* سجل آخر الرواتب المصروفة */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
               <h3 className="text-lg font-black mb-6 flex items-center gap-2 flex-row-reverse text-gray-700">
                 <History size={20}/> سجل الرواتب والدفعات
               </h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-right border-collapse">
                   <thead>
                     <tr className="border-b-2 text-gray-400 text-xs uppercase font-black">
                       <th className="py-4 px-2">التاريخ</th>
                       <th className="py-4 px-2">العاملة</th>
                       <th className="py-4 px-2">المبلغ</th>
                       <th className="py-4 px-2">التفاصيل</th>
                     </tr>
                   </thead>
                   <tbody>
                     {payments.slice(0, 10).map(p => (
                       <tr key={p.id} className="border-b hover:bg-gray-50 transition-colors">
                         <td className="py-4 px-2 text-xs text-gray-500 font-bold">{p.date}</td>
                         <td className="py-4 px-2 font-black text-gray-700">{workers.find(w => w.id === p.worker_id)?.full_name || 'محذوفة'}</td>
                         <td className="py-4 px-2 font-black text-emerald-600">₪{p.amount.toFixed(1)}</td>
                         <td className="py-4 px-2 text-xs text-gray-400">{p.details}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-black mb-6 text-gray-800">تسجيل مصروف عام</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await supabase.from('expenses').insert([{ category: f.get('cat'), amount: Number(f.get('amt')), description: f.get('desc'), date: new Date().toLocaleDateString('en-CA') }]);
                  (e.target as HTMLFormElement).reset();
                  await fetchAllData(true);
                  showStatus("تم حفظ المصروف");
                } catch (err) { showStatus("فشل في الحفظ", "error"); }
              }} className="space-y-4">
                <input name="cat" placeholder="الفئة (خيوط، كهرباء، إيجار..)" required className="w-full p-4 bg-gray-50 rounded-xl text-right border" />
                <input name="amt" type="number" placeholder="المبلغ" required className="w-full p-4 bg-gray-50 rounded-xl text-right border" />
                <input name="desc" placeholder="توضيح المصروف" className="w-full p-4 bg-gray-50 rounded-xl text-right border" />
                <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg">حفظ المصروف</button>
              </form>
            </div>
            <div className="space-y-2">
              {expenses.map(e => (
                <div key={e.id} className="bg-white p-4 border rounded-xl flex justify-between items-center hover:bg-red-50/10 transition-all">
                  <span className="font-black text-red-600">₪{e.amount}</span>
                  <div className="text-right font-black">
                    <p>{e.category}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{e.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'machines' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-black mb-6 text-blue-900">إضافة ماكنة جديدة</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await supabase.from('machines').insert([{ name: f.get('name'), total_price: Number(f.get('p')), monthly_installment: Number(f.get('inst')), paid_amount: 0 }]);
                  (e.target as HTMLFormElement).reset();
                  await fetchAllData(true);
                  showStatus("تمت إضافة الماكنة");
                } catch (err) { showStatus("فشل الحفظ", "error"); }
              }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input name="name" placeholder="نوع الماكنة" required className="p-4 bg-gray-50 rounded-xl text-right border" />
                <input name="p" type="number" placeholder="السعر الإجمالي" required className="p-4 bg-gray-50 rounded-xl text-right border" />
                <input name="inst" type="number" placeholder="قيمة القسط" required className="p-4 bg-gray-50 rounded-xl text-right border" />
                <button className="md:col-span-3 bg-blue-900 text-white py-4 rounded-xl font-black shadow-lg">إدراج الماكنة</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {machines.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-3xl border shadow-sm">
                  <div className="flex justify-between items-center mb-4"><span className="font-black text-xl text-blue-900">₪{m.total_price}</span><h3 className="font-black text-gray-800">{m.name}</h3></div>
                  <div className="flex justify-between text-[10px] font-black mb-2 uppercase tracking-widest">
                    <span className="text-emerald-600">المسدد: ₪{m.paid_amount}</span>
                    <span className="text-red-500">المتبقي: ₪{m.total_price - m.paid_amount}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (m.paid_amount/m.total_price)*100)}%` }}></div>
                  </div>
                  <button onClick={() => setPayingMachineId(m.id)} className="w-full bg-blue-50 text-blue-900 py-3 rounded-xl text-sm font-black hover:bg-blue-100">تسجيل قسط مدفوع</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'owner_withdrawals' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border">
              <h2 className="text-xl font-black mb-6 text-orange-600">سحب مدير (من الأرباح)</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const amt = Number(f.get('amt'));
                if (amt > calculateTotalCash()) return showStatus("السيولة المتاحة أقل من المبلغ المطلوب", "error");
                try {
                  await supabase.from('withdrawals').insert([{ amount: amt, note: f.get('note'), date: new Date().toLocaleDateString('en-CA') }]);
                  (e.target as HTMLFormElement).reset();
                  await fetchAllData(true);
                  showStatus("تم تسجيل السحب بنجاح");
                } catch (err) { showStatus("خطأ في السحب", "error"); }
              }} className="space-y-4">
                <input name="amt" type="number" placeholder="المبلغ المسحوب" required className="w-full p-4 bg-orange-50 rounded-xl text-right border border-orange-100 font-black text-2xl" />
                <input name="note" placeholder="سبب السحب" className="w-full p-4 bg-gray-50 rounded-xl text-right border" />
                <button className="w-full bg-orange-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-orange-700">تأكيد عملية السحب</button>
              </form>
            </div>
            <div className="space-y-2">
              {withdrawals.map(w => (
                <div key={w.id} className="bg-white p-4 border rounded-xl flex justify-between items-center">
                  <span className="font-black text-orange-600">₪{w.amount}</span>
                  <div className="text-right font-black text-gray-700">
                    <p>{w.note}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{w.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-3xl border shadow-sm">
              <h2 className="text-xl font-black mb-6 text-blue-900 border-b pb-4">إدارة فريق العمل</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  await supabase.from('workers').insert([{ full_name: f.get('n'), phone: f.get('p') }]);
                  (e.target as HTMLFormElement).reset();
                  await fetchAllData(true);
                  showStatus("تمت إضافة العاملة بنجاح");
                } catch (err) { showStatus("فشل الإضافة", "error"); }
              }} className="space-y-4 mb-8">
                <input name="n" placeholder="الاسم الكامل للعاملة" required className="w-full p-4 bg-gray-50 rounded-xl text-right border" />
                <input name="p" placeholder="رقم الواتساب" className="w-full p-4 bg-gray-50 rounded-xl text-right border" />
                <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg">إضافة للمشغل</button>
              </form>
              <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                {workers.map(w => (
                  <div key={w.id} className="p-4 border rounded-xl flex justify-between items-center hover:bg-gray-50">
                    <button onClick={async () => { if(confirm(`هل أنت متأكد من حذف العاملة ${w.full_name}؟`)) { await supabase.from('workers').delete().eq('id', w.id); await fetchAllData(true); showStatus("تم الحذف"); } }} className="text-red-400 hover:text-red-600 transition-all"><Trash2 size={18}/></button>
                    <span className="font-black text-gray-800">{w.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-black border border-red-100 hover:bg-red-600 hover:text-white transition-all">تسجيل الخروج من النظام</button>
          </div>
        )}
      </main>

      {/* Floating Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t p-4 flex justify-around items-center lg:hidden z-40 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'worker_tasks', icon: Package },
          { id: 'workers', icon: Users },
          { id: 'customer_work', icon: ShoppingBag },
          { id: 'expenses', icon: CreditCard },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl scale-110 -translate-y-2' : 'text-gray-300'}`}>
            <item.icon size={22} />
          </button>
        ))}
      </nav>

      {/* Modals for updates */}
      {partialPaymentOrderId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-right animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-6 text-gray-800 border-b pb-4">تحصيل دفعة مالية</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const amt = Number(f.get('a'));
              try {
                await supabase.from('supplier_payments').insert([{ order_id: partialPaymentOrderId, amount: amt, date: new Date().toLocaleDateString('en-CA'), note: 'دفعة حساب' }]);
                const order = orders.find(x => x.id === partialPaymentOrderId);
                await supabase.from('supplier_orders').update({ total_paid: (order?.total_paid || 0) + amt }).eq('id', partialPaymentOrderId);
                setPartialPaymentOrderId(null);
                await fetchAllData(true);
                showStatus("تم تحصيل المبلغ وتحديث الحساب");
              } catch (err) { showStatus("فشل التحديث", "error"); }
            }} className="space-y-4">
              <input name="a" type="number" placeholder="المبلغ المحصل من المورد" required className="w-full p-4 bg-gray-50 rounded-xl text-right border font-black text-xl" />
              <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg">تأكيد الاستلام</button>
              <button type="button" onClick={() => setPartialPaymentOrderId(null)} className="w-full text-gray-400 font-bold py-2">إغلاق</button>
            </form>
          </div>
        </div>
      )}

      {payingMachineId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-right animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-6 text-gray-800 border-b pb-4">تسجيل قسط ماكنة</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const amt = Number(f.get('a'));
              if (amt > calculateTotalCash()) return showStatus("السيولة بالصندوق لا تكفي", "error");
              try {
                const m = machines.find(x => x.id === payingMachineId);
                await supabase.from('machines').update({ paid_amount: (m?.paid_amount || 0) + amt }).eq('id', payingMachineId);
                setPayingMachineId(null);
                await fetchAllData(true);
                showStatus("تم دفع القسط بنجاح");
              } catch (err) { showStatus("فشل التحديث", "error"); }
            }} className="space-y-4">
              <input name="a" type="number" placeholder="قيمة القسط المدفوع" required className="w-full p-4 bg-gray-50 rounded-xl text-right border font-black text-xl" />
              <button className="w-full bg-blue-900 text-white py-4 rounded-xl font-black shadow-lg">تأكيد الدفع</button>
              <button type="button" onClick={() => setPayingMachineId(null)} className="w-full text-gray-400 font-bold py-2">إغلاق</button>
            </form>
          </div>
        </div>
      )}

      {statusMsg && (
        <div className={`fixed top-4 left-4 right-4 z-[300] p-4 rounded-xl shadow-2xl flex items-center gap-3 border-l-8 animate-in slide-in-from-top-10 ${statusMsg.type === 'success' ? 'bg-emerald-600 text-white border-emerald-900' : 'bg-red-600 text-white border-red-900'}`}>
           {statusMsg.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
           <p className="font-black text-sm">{statusMsg.text}</p>
        </div>
      )}
    </div>
  );
};

export default App;
