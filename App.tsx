
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Users, CreditCard, Settings, Plus, Menu, X, Wrench, 
  Trash2, CheckCircle2, AlertCircle, Banknote, ShoppingBag, Truck, 
  DollarSign, Package, Edit3, Save, Printer, FileText, ChevronLeft, Wallet, TrendingUp, TrendingDown, Landmark, Lock, Key, MessageCircle, LogIn, User, Loader2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Dashboard from './components/Dashboard';
import AIInput from './components/AIInput';
import { Worker, ProductionRecord, Advance, Expense, Machine, SupplierOrder, SalaryPayment, Withdrawal, AIDataResponse, SupplierPayment } from './types';

// Initialize Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App: React.FC = () => {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [loginInput, setLoginInput] = useState({ user: '', pass: '' });

  // --- UI States ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'supplier_orders' | 'worker_tasks' | 'customer_work' | 'workers' | 'machines' | 'owner_withdrawals' | 'settings' | 'expenses'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetPassInput, setResetPassInput] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // --- Core State ---
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [orders, setOrders] = useState<SupplierOrder[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  // Editing & UI States
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [payingMachineId, setPayingMachineId] = useState<string | null>(null);
  const [reportConfig, setReportConfig] = useState<{ type: 'worker' | 'supplier' | 'profit', id?: string } | null>(null);
  const [partialPaymentOrderId, setPartialPaymentOrderId] = useState<string | null>(null);

  // --- Data Fetching Logic (Enhanced for Reliability) ---
  const fetchAllData = useCallback(async () => {
    setIsInitialLoading(true);
    setDbError(null);
    try {
      // Check for valid config before attempting anything
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Supabase configuration is missing");
      }

      // Fetch data using individual calls to prevent one table failure from breaking everything
      const results = await Promise.allSettled([
        supabase.from('workers').select('*'),
        supabase.from('supplier_orders').select('*'),
        supabase.from('supplier_payments').select('*'),
        supabase.from('production_records').select('*'),
        supabase.from('advances').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('machines').select('*'),
        supabase.from('salary_payments').select('*'),
        supabase.from('withdrawals').select('*'),
        supabase.from('app_config').select('*').maybeSingle()
      ]);

      // Assign values based on successful results
      if (results[0].status === 'fulfilled' && results[0].value.data) setWorkers(results[0].value.data);
      if (results[1].status === 'fulfilled' && results[1].value.data) setOrders(results[1].value.data);
      if (results[2].status === 'fulfilled' && results[2].value.data) setSupplierPayments(results[2].value.data);
      if (results[3].status === 'fulfilled' && results[3].value.data) setRecords(results[3].value.data);
      if (results[4].status === 'fulfilled' && results[4].value.data) setAdvances(results[4].value.data);
      if (results[5].status === 'fulfilled' && results[5].value.data) setExpenses(results[5].value.data);
      if (results[6].status === 'fulfilled' && results[6].value.data) setMachines(results[6].value.data);
      if (results[7].status === 'fulfilled' && results[7].value.data) setPayments(results[7].value.data);
      if (results[8].status === 'fulfilled' && results[8].value.data) setWithdrawals(results[8].value.data);
      
      // Handle config separately
      if (results[9].status === 'fulfilled' && results[9].value.data) {
        setUsername(results[9].value.data.username || 'admin');
        setPassword(results[9].value.data.password || '1234');
      }
      
      // Check session even if some DB calls failed
      const storedLogin = localStorage.getItem('app_is_logged_in') === 'true';
      if (storedLogin) setIsLoggedIn(true);

    } catch (error: any) {
      console.error("Supabase load error:", error);
      setDbError(error.message || "فشل الاتصال بقاعدة البيانات");
      showStatus("خطأ في الاتصال بالسحابة", "error");
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // --- Handlers ---
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInput.user === username && loginInput.pass === password) {
      setIsLoggedIn(true);
      localStorage.setItem('app_is_logged_in', 'true');
      showStatus("مرحباً بك مجدداً في نظام عبير");
    } else {
      showStatus("بيانات الدخول غير صحيحة!", "error");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab('dashboard');
    localStorage.setItem('app_is_logged_in', 'false');
  };

  const handleFullReset = async () => {
    if (resetPassInput === password) {
      const tables = ['workers', 'supplier_orders', 'supplier_payments', 'production_records', 'advances', 'expenses', 'machines', 'salary_payments', 'withdrawals'];
      try {
        await Promise.all(tables.map(table => supabase.from(table).delete().neq('id', '0')));
        window.location.reload();
      } catch (err) {
        showStatus("فشل في عملية التهيئة", "error");
      }
    } else {
      showStatus("كلمة السر خاطئة! لا يمكن التهيئة.", "error");
      setResetPassInput('');
    }
  };

  // --- Financial Calculations ---
  const getWorkerEarned = (workerId: string) => {
    return records
      .filter(r => r.worker_id === workerId && !r.is_paid && !r.is_customer_work)
      .reduce((a, b) => a + (b.quantity * b.worker_rate), 0);
  };

  const getWorkerAdvances = (workerId: string) => {
    return advances
      .filter(a => a.worker_id === workerId && !a.is_settled)
      .reduce((a, b) => a + b.amount, 0);
  };

  const getWorkerBalance = (workerId: string) => {
    return getWorkerEarned(workerId) - getWorkerAdvances(workerId);
  };

  const calculateTotalCash = () => {
    const totalIn = orders.reduce((acc, o) => acc + (o.total_paid || 0), 0) + records.filter(r => r.is_customer_work).reduce((acc, r) => acc + (r.supplier_rate || 0), 0);
    const machinePayments = machines.reduce((acc, m) => acc + (m.paid_amount || 0), 0);
    const totalOut = expenses.reduce((acc, e) => acc + e.amount, 0) + payments.reduce((acc, p) => acc + p.amount, 0) + withdrawals.reduce((acc, w) => acc + w.amount, 0) + machinePayments;
    return totalIn - totalOut;
  };

  // --- CRUD Functions with Supabase ---

  const handleAISuccess = async (result: AIDataResponse) => {
    if (result.type === 'unknown') {
      showStatus("لم أفهم النص بوضوح، يرجى المحاولة مرة أخرى بصيغة أوضح", "error");
      return;
    }
    
    const findWorkerId = (name: string) => {
      if (!name) return null;
      const worker = workers.find(w => w.full_name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(w.full_name.toLowerCase()));
      return worker?.id || null;
    };

    try {
      if (result.type === 'production') {
        const workerId = findWorkerId(result.data.worker_name);
        if (!workerId) { showStatus(`لم أجد عاملة باسم "${result.data.worker_name}"`, "error"); return; }
        const newR = { worker_id: workerId, task_name: result.data.task_name || "مهمة غير محددة", quantity: result.data.quantity || 0, worker_rate: result.data.worker_rate || 0, is_customer_work: false, recorded_at: new Date().toLocaleDateString('en-CA'), is_paid: false };
        const { data } = await supabase.from('production_records').insert([newR]).select();
        if (data) setRecords([data[0], ...records]);
        showStatus(`تم تسجيل إنتاج: ${result.data.task_name}`);
      } else if (result.type === 'advance') {
        const workerId = findWorkerId(result.data.worker_name);
        if (!workerId) { showStatus(`لم أجد عاملة باسم "${result.data.worker_name}"`, "error"); return; }
        const amount = result.data.amount || 0;
        if (amount > calculateTotalCash()) { showStatus(`السيولة في الصندوق لا تكفي`, "error"); return; }
        const newA = { worker_id: workerId, amount, note: result.data.note || "سلفة ذكية", date: new Date().toLocaleDateString('en-CA'), is_settled: false };
        const { data } = await supabase.from('advances').insert([newA]).select();
        if (data) setAdvances([data[0], ...advances]);
        showStatus(`تم صرف سلفة: ₪${amount}`);
      } else if (result.type === 'expense') {
        const newE = { category: result.data.category || "عام", amount: result.data.amount || 0, description: result.data.note || "مصروف ذكي", date: new Date().toLocaleDateString('en-CA') };
        const { data } = await supabase.from('expenses').insert([newE]).select();
        if (data) setExpenses([data[0], ...expenses]);
        showStatus(`تم تسجيل مصروف بقيمة: ₪${result.data.amount}`);
      }
    } catch (err) {
      showStatus("حدث خطأ أثناء الاتصال بالخادم", "error");
    }
  };

  const paySalary = async (workerId: string) => {
    const balance = getWorkerBalance(workerId);
    if (balance <= 0) return showStatus("لا يوجد رصيد متبقي للصرف", "error");
    if (balance > calculateTotalCash()) return showStatus(`السيولة بالصندوق لا تكفي!`, "error");

    try {
      const newPayment = { worker_id: workerId, amount: balance, date: new Date().toLocaleDateString('en-CA'), period_from: "سابقة", period_to: "اليوم", details: "تصفية حساب وبدء دورة جديدة" };
      
      const [pResult, rResult, aResult] = await Promise.all([
        supabase.from('salary_payments').insert([newPayment]).select(),
        supabase.from('production_records').update({ is_paid: true }).eq('worker_id', workerId).eq('is_paid', false),
        supabase.from('advances').update({ is_settled: true }).eq('worker_id', workerId).eq('is_settled', false)
      ]);

      if (pResult.data) {
        setPayments([pResult.data[0], ...payments]);
        setRecords(records.map(r => r.worker_id === workerId ? { ...r, is_paid: true } : r));
        setAdvances(advances.map(a => a.worker_id === workerId ? { ...a, is_settled: true } : a));
        showStatus("تمت التصفية النهائية بنجاح");
      }
    } catch (err) {
      showStatus("فشل في إتمام عملية الصرف", "error");
    }
  };

  const handlePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialPaymentOrderId) return;
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(f.get('amount'));
    const note = f.get('note') as string || "دفعة من الحساب";

    try {
      const newPay = { order_id: partialPaymentOrderId, amount, date: new Date().toLocaleDateString('en-CA'), note };
      const { data } = await supabase.from('supplier_payments').insert([newPay]).select();
      
      const currentOrder = orders.find(o => o.id === partialPaymentOrderId);
      if (currentOrder) {
        await supabase.from('supplier_orders').update({ total_paid: (currentOrder.total_paid || 0) + amount }).eq('id', partialPaymentOrderId);
        setOrders(orders.map(o => o.id === partialPaymentOrderId ? { ...o, total_paid: (o.total_paid || 0) + amount } : o));
      }
      
      if (data) setSupplierPayments([data[0], ...supplierPayments]);
      setPartialPaymentOrderId(null);
      showStatus("تم تحصيل الدفعة");
    } catch (err) {
      showStatus("فشل الاتصال بالخادم", "error");
    }
  };

  const handleMachinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingMachineId) return;
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(f.get('amount'));
    if (amount > calculateTotalCash()) { showStatus("السيولة غير كافية بالصندوق", "error"); return; }
    
    try {
      const m = machines.find(x => x.id === payingMachineId);
      const newTotal = (m?.paid_amount || 0) + amount;
      await supabase.from('machines').update({ paid_amount: newTotal }).eq('id', payingMachineId);
      setMachines(machines.map(m => m.id === payingMachineId ? { ...m, paid_amount: newTotal } : m));
      setPayingMachineId(null);
      showStatus("تم تسديد القسط بنجاح");
    } catch (err) {
      showStatus("خطأ في تحديث بيانات الماكنة", "error");
    }
  };

  const addOrUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const expenseData = { 
      category: f.get('category') as string, 
      amount: Number(f.get('amount')), 
      description: f.get('desc') as string, 
      date: expenses.find(x => x.id === editingExpenseId)?.date || new Date().toLocaleDateString('en-CA') 
    };

    try {
      if (editingExpenseId) {
        await supabase.from('expenses').update(expenseData).eq('id', editingExpenseId);
        setExpenses(expenses.map(x => x.id === editingExpenseId ? { ...x, ...expenseData } : x));
      } else {
        const { data } = await supabase.from('expenses').insert([expenseData]).select();
        if (data) setExpenses([data[0], ...expenses]);
      }
      setEditingExpenseId(null);
      (e.currentTarget as HTMLFormElement).reset();
      showStatus("تم حفظ المصروف");
    } catch (err) {
      showStatus("خطأ في حفظ البيانات", "error");
    }
  };

  const addOrUpdateMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const machineData = { 
      name: f.get('name') as string, 
      total_price: Number(f.get('price')), 
      monthly_installment: Number(f.get('inst')), 
      paid_amount: machines.find(x => x.id === editingMachineId)?.paid_amount || 0 
    };

    try {
      if (editingMachineId) {
        await supabase.from('machines').update(machineData).eq('id', editingMachineId);
        setMachines(machines.map(x => x.id === editingMachineId ? { ...x, ...machineData } : x));
      } else {
        const { data } = await supabase.from('machines').insert([machineData]).select();
        if (data) setMachines([...machines, data[0]]);
      }
      setEditingMachineId(null);
      (e.currentTarget as HTMLFormElement).reset();
      showStatus("تم حفظ الماكنة بنجاح");
    } catch (err) {
      showStatus("خطأ في تسجيل الماكنة", "error");
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(f.get('amount'));
    const note = f.get('note') as string;

    if (amount > calculateTotalCash()) {
      showStatus(`السيولة المتاحة لا تكفي!`, "error");
      return;
    }

    try {
      const newW = { amount, note, date: new Date().toLocaleDateString('en-CA') };
      const { data } = await supabase.from('withdrawals').insert([newW]).select();
      if (data) setWithdrawals([data[0], ...withdrawals]);
      (e.currentTarget as HTMLFormElement).reset();
      showStatus("تم تسجيل سحب المدير");
    } catch (err) {
      showStatus("خطأ في الاتصال بالخادم", "error");
    }
  };

  const sendWorkerWhatsApp = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker || !worker.phone) return showStatus("يرجى إضافة رقم واتساب للعاملة أولاً", "error");
    const balance = getWorkerBalance(workerId);
    const message = `مرحباً ${worker.full_name}، كشف حسابك من مشغل عبير: ₪${balance.toFixed(1)} صافي مستحق.`;
    window.open(`https://wa.me/${worker.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- Initial Loading Screen ---
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-['Cairo']">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
        <p className="text-white font-bold animate-pulse">جاري جلب بيانات مشغل عبير من السحابة...</p>
        <p className="text-white/40 text-[10px] mt-4 uppercase tracking-[0.3em]">Smart Sewing-Tech ERP</p>
      </div>
    );
  }

  // --- Render Login Screen (Always reachable even with partial DB failure) ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-black flex flex-col items-center justify-center p-4 font-['Cairo'] relative">
        {dbError && (
          <div className="absolute top-4 left-4 right-4 bg-red-600/20 border border-red-600/50 p-3 rounded-xl flex items-center gap-3 text-red-200 text-xs font-bold animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={16}/> {dbError} (سيعمل النظام ببيانات افتراضية)
          </div>
        )}
        
        <div className="w-full max-w-md bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/20 animate-in zoom-in-95 duration-500">
           <div className="text-center mb-10">
              <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
                 <span className="text-blue-900 font-black text-4xl">ع</span>
              </div>
              <h1 className="text-white text-3xl font-black mb-2">نظام مشغل عبير</h1>
              <p className="text-blue-200/60 font-bold uppercase tracking-widest text-xs">Cloud-Based ERP Solution</p>
           </div>
           
           <form onSubmit={handleLogin} className="space-y-6 text-right">
              <div className="space-y-2">
                 <label className="text-blue-100 text-xs font-bold mr-2 uppercase block">اسم المستخدم</label>
                 <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={20}/>
                    <input 
                       type="text" required value={loginInput.user} 
                       onChange={(e) => setLoginInput({ ...loginInput, user: e.target.value })}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-right"
                       placeholder="admin"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-blue-100 text-xs font-bold mr-2 uppercase block">كلمة المرور</label>
                 <div className="relative">
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={20}/>
                    <input 
                       type="password" required value={loginInput.pass} 
                       onChange={(e) => setLoginInput({ ...loginInput, pass: e.target.value })}
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-right"
                       placeholder="••••••••"
                    />
                 </div>
              </div>
              <button type="submit" className="w-full bg-white text-blue-900 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                 <LogIn size={20}/> دخول النظام
              </button>
           </form>
           <div className="mt-10 pt-8 border-t border-white/10 text-center">
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                 جميع الحقوق محفوظة &copy; مشغل عبير 2025<br/>نظام محاسبي سحابي ذكي
              </p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 pb-20 lg:pb-0 font-['Cairo']">
      
      {/* Modals */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-[500] bg-blue-950/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><AlertCircle size={32}/></div>
              <h3 className="text-xl font-black text-gray-900 mb-4">تهيئة النظام بالكامل؟</h3>
              <p className="text-gray-500 text-sm mb-8 font-bold leading-relaxed">هذا الإجراء سيحذف كافة السجلات المالية من الخادم نهائياً.</p>
              <div className="space-y-6">
                 <input type="password" value={resetPassInput} onChange={(e) => setResetPassInput(e.target.value)} placeholder="كلمة المرور الحالية" className="w-full p-4 bg-slate-100 rounded-2xl border-none font-black text-center text-xl tracking-widest focus:ring-2 focus:ring-red-500/20" />
                 <div className="flex gap-3">
                    <button onClick={handleFullReset} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg">تأكيد الحذف</button>
                    <button onClick={() => { setIsResetConfirmOpen(false); setResetPassInput(''); }} className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-2xl font-black">إلغاء</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {reportConfig && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto p-4 md:p-8 print:block">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6 print:hidden">
               <button onClick={() => setReportConfig(null)} className="flex items-center gap-1 text-gray-500 hover:text-red-500 font-bold transition-all text-sm"><X size={16}/> إغلاق</button>
               <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl font-black shadow-md text-sm"><Printer size={16}/> طباعة الكشف</button>
            </div>
            <div className="text-center mb-10 border-b-4 border-blue-900 pb-8 text-right">
               <div className="flex justify-center items-center gap-5 mb-4">
                  <div className="w-16 h-16 bg-blue-900 rounded-xl flex items-center justify-center text-white font-black text-3xl shadow-lg">ع</div>
                  <div className="text-right">
                    <h1 className="text-3xl font-black text-blue-900">مشغل عبير للخياطة</h1>
                    <p className="text-xs text-gray-400 font-bold tracking-widest uppercase opacity-60">Cloud Smart ERP</p>
                  </div>
               </div>
            </div>
            {reportConfig.type === 'worker' && reportConfig.id && (
              <div className="space-y-6 text-right">
                <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 mb-8 shadow-inner">
                   <h3 className="text-lg font-black text-slate-800 mb-6 border-b pb-2">ملخص الحساب الجاري للعاملة: {workers.find(w=>w.id===reportConfig.id)?.full_name}</h3>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1"><p className="text-xs font-bold text-slate-400">إجمالي الإنتاج</p><p className="text-2xl font-black text-blue-900">₪{getWorkerEarned(reportConfig.id).toFixed(1)}</p></div>
                      <div className="space-y-1"><p className="text-xs font-bold text-red-400">السلف</p><p className="text-2xl font-black text-red-600">₪{getWorkerAdvances(reportConfig.id).toFixed(1)}</p></div>
                      <div className="space-y-1 bg-emerald-600 text-white p-4 rounded-2xl"><p className="text-xs font-bold opacity-70">الصافي</p><p className="text-2xl font-black">₪{getWorkerBalance(reportConfig.id).toFixed(1)}</p></div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-500 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8 border-b-2 pb-6">
            <div className="flex items-center gap-3 text-blue-900 font-black text-2xl">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl shadow-lg">ع</div>
              <span>مشغل عبير</span>
            </div>
            <button className="lg:hidden p-1 hover:bg-gray-50 rounded-lg" onClick={() => setIsSidebarOpen(false)}><X size={24}/></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {[
              { id: 'dashboard', label: 'لوحة الأرباح', icon: LayoutDashboard },
              { id: 'supplier_orders', label: 'الموردين والتحصيل', icon: Truck },
              { id: 'worker_tasks', label: 'الإنتاج اليومي', icon: Package },
              { id: 'customer_work', label: 'إيراد الزبائن', icon: ShoppingBag },
              { id: 'workers', label: 'الرواتب والسلف', icon: Users },
              { id: 'expenses', label: 'المصاريف العامة', icon: CreditCard },
              { id: 'machines', label: 'الماكينات والأقساط', icon: Wrench },
              { id: 'owner_withdrawals', label: 'مسحوبات المدير', icon: Landmark },
              { id: 'settings', label: 'الإعدادات والحماية', icon: Settings },
            ].map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white font-black shadow-lg scale-[1.02]' : 'text-gray-500 hover:bg-gray-50'} flex-row-reverse`}>
                <item.icon size={18} /><span className="text-sm whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="lg:mr-64 min-h-screen p-4 md:p-8 lg:p-10 text-right">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <AIInput onDataExtracted={handleAISuccess} />
            <Dashboard orders={orders} records={records} expenses={expenses} machines={machines} workers={workers} advances={advances} withdrawals={withdrawals} />
            <button onClick={() => setReportConfig({type:'profit'})} className="w-full bg-blue-900 text-white py-8 rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-4 hover:bg-blue-800 transition-all">
               <FileText size={24}/> استخراج التقرير المالي العام
            </button>
          </div>
        )}

        {activeTab === 'workers' && (
          <div className="max-w-4xl mx-auto space-y-8 text-right">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100">
               <h2 className="text-xl font-black mb-6 text-red-600 border-b-2 pb-4 leading-none text-right flex flex-row-reverse items-center gap-2"><DollarSign size={20}/> صرف سلفة مالية</h2>
               <form onSubmit={async (e) => {
                 e.preventDefault();
                 const f = new FormData(e.currentTarget as HTMLFormElement);
                 const workerId = f.get('worker_id') as string;
                 const amount = Number(f.get('amount'));
                 if (amount > calculateTotalCash()) return showStatus(`لا يوجد سيولة كافية!`, "error");
                 const newA = { worker_id: workerId, amount, note: f.get('note') as string, date: new Date().toLocaleDateString('en-CA'), is_settled: false };
                 const { data } = await supabase.from('advances').insert([newA]).select();
                 if (data) {
                   setAdvances([data[0], ...advances]);
                   (e.currentTarget as HTMLFormElement).reset();
                   showStatus("تم صرف السلفة بنجاح");
                 }
               }} className="space-y-8">
                  <select name="worker_id" required className="w-full p-4 bg-gray-50 rounded-xl font-black text-sm border-none shadow-inner text-right">
                     <option value="">اختيار العاملة..</option>
                     {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} (رصيد: ₪{getWorkerBalance(w.id).toFixed(1)})</option>)}
                  </select>
                  <div className="relative">
                    <input name="amount" type="number" required placeholder="0.00" className="w-full p-12 bg-red-50 text-red-700 text-center font-black text-6xl rounded-2xl border-none shadow-inner" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-3xl font-black text-red-200">₪</span>
                  </div>
                  <input name="note" placeholder="ملاحظة السلفة.." className="w-full p-4 bg-gray-50 rounded-xl font-black text-sm border-none shadow-inner text-right" />
                  <button className="w-full bg-red-600 text-white font-black py-6 rounded-xl shadow-lg text-2xl active:scale-95 transition-all">تأكيد صرف السلفة</button>
               </form>
            </div>
            <div className="space-y-6">
               <h3 className="font-black text-gray-500 text-xl px-4 border-r-8 border-blue-600 mr-1 uppercase tracking-widest leading-none mb-6">إدارة الرواتب والذمم</h3>
               {workers.map(w => (
                 <div key={w.id} className="bg-white p-10 rounded-2xl flex justify-between items-center shadow-sm border border-gray-100 hover:border-blue-300 transition-all text-right">
                    <div className="space-y-1 text-right">
                      <p className="font-black text-2xl text-blue-950">{w.full_name}</p>
                      <p className="text-blue-600 font-black text-4xl leading-none mt-2">₪{getWorkerBalance(w.id).toFixed(1)} <span className="text-xs text-gray-400 font-bold opacity-60">صافي المتبقي</span></p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => sendWorkerWhatsApp(w.id)} className="p-4 bg-emerald-50 text-emerald-600 rounded-xl shadow-md transition-all"><MessageCircle size={18}/></button>
                      <button onClick={() => setReportConfig({type:'worker', id: w.id})} className="bg-blue-50 text-blue-600 px-6 py-2 rounded-xl font-black text-sm">كشف</button>
                      <button onClick={() => paySalary(w.id)} className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-black text-sm shadow-md active:scale-95 transition-all">تصفية</button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-10">
             <div className="bg-white p-12 rounded-3xl shadow-sm border-2 border-gray-100 text-right">
                <h2 className="text-xl font-black mb-8 border-b-2 pb-6 flex items-center gap-3 text-blue-950 leading-none flex-row-reverse"><Lock size={20}/> حماية النظام والدخول</h2>
                <form onSubmit={async (e) => {
                   e.preventDefault();
                   const f = new FormData(e.currentTarget as HTMLFormElement);
                   const oldPass = f.get('old') as string;
                   const newUser = f.get('user') as string;
                   const newPass = f.get('new') as string;
                   
                   if (oldPass !== password) return showStatus("كلمة السر الحالية خاطئة!", "error");
                   
                   try {
                     await supabase.from('app_config').update({ username: newUser, password: newPass }).eq('id', 1);
                     setUsername(newUser); setPassword(newPass);
                     showStatus("تم تحديث بيانات الدخول بنجاح");
                     (e.currentTarget as HTMLFormElement).reset();
                   } catch (err) { showStatus("فشل في تحديث الإعدادات", "error"); }
                }} className="space-y-6 text-right">
                   <input name="user" required defaultValue={username} placeholder="اسم المستخدم الجديد" className="w-full p-4 bg-gray-50 rounded-xl border-none font-black text-right shadow-inner" />
                   <input name="new" type="password" required placeholder="كلمة المرور الجديدة" className="w-full p-4 bg-gray-50 rounded-xl border-none font-black text-center shadow-inner" />
                   <input name="old" type="password" required placeholder="كلمة السر الحالية للتأكيد" className="w-full p-4 bg-blue-50 rounded-xl border-none font-black text-center shadow-inner" />
                   <button className="w-full bg-blue-950 text-white py-6 rounded-xl font-black text-xl shadow-md active:scale-95 transition-all">تحديث بيانات القفل</button>
                </form>
             </div>

             <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-right">
                <h2 className="text-xl font-black mb-6 border-b-2 pb-4 text-right">إضافة عاملة جديدة</h2>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget as HTMLFormElement);
                  const name = f.get('name') as string;
                  const phone = f.get('phone') as string;
                  try {
                    const { data } = await supabase.from('workers').insert([{ full_name: name, phone: phone }]).select();
                    if (data) {
                      setWorkers([...workers, data[0]]);
                      (e.currentTarget as HTMLFormElement).reset();
                      showStatus("تمت إضافة العاملة بنجاح");
                    }
                  } catch (err) { showStatus("خطأ في إضافة العاملة", "error"); }
                }} className="space-y-4 mb-10 text-right">
                   <input name="name" required placeholder="اسم العاملة.." className="w-full p-4 bg-gray-50 rounded-xl border-none font-black shadow-inner text-right" />
                   <input name="phone" placeholder="رقم الواتساب.." className="w-full p-4 bg-gray-50 rounded-xl border-none font-black shadow-inner text-right" />
                   <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-md">إضافة للمشغل</button>
                </form>
                <div className="space-y-4 text-right">
                   {workers.map(w => (
                     <div key={w.id} className="p-6 border-2 border-gray-50 flex justify-between items-center hover:bg-gray-50 rounded-xl group">
                        <div className="text-right"><span className="font-black text-lg text-blue-950">{w.full_name}</span></div>
                        <button onClick={async () => { 
                          if(confirm('حذف العاملة؟')) {
                            await supabase.from('workers').delete().eq('id', w.id);
                            setWorkers(workers.filter(x => x.id !== w.id)); 
                          }
                        }} className="p-2 text-red-200 hover:text-red-600 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-red-50 p-10 rounded-[2.5rem] border-4 border-dashed border-red-200 text-center">
               <button onClick={() => setIsResetConfirmOpen(true)} className="w-full py-6 text-red-600 font-black bg-white rounded-2xl hover:bg-red-600 hover:text-white transition-all text-xl shadow-sm">تهيئة النظام بالكامل (حذف البيانات من السحاب)</button>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-3xl border-t border-gray-100 p-4 flex justify-around items-center lg:hidden z-40 shadow-xl rounded-t-[2rem] print:hidden">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'supplier_orders', icon: Truck },
          { id: 'worker_tasks', icon: Package },
          { id: 'workers', icon: Users },
          { id: 'expenses', icon: CreditCard },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`p-4 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg scale-110 -translate-y-4' : 'text-gray-300'}`}>
            <item.icon size={24} />
          </button>
        ))}
      </nav>

      {statusMsg && (
        <div className={`fixed top-4 left-4 right-4 z-[300] p-4 rounded-xl shadow-2xl flex items-center gap-3 border-l-8 ${statusMsg.type === 'success' ? 'bg-emerald-600 text-white border-emerald-900' : 'bg-red-600 text-white border-red-900'}`}>
           {statusMsg.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
           <p className="font-black text-sm">{statusMsg.text}</p>
        </div>
      )}
    </div>
  );
};

export default App;
