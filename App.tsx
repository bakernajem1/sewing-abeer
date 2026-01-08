
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, CreditCard, Settings, Plus, Menu, X, Wrench, 
  Trash2, CheckCircle2, AlertCircle, Banknote, ShoppingBag, Truck, 
  DollarSign, Package, Edit3, Save, Printer, FileText, ChevronLeft, Wallet, TrendingUp, TrendingDown, Landmark, Lock, Key, MessageCircle
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import AIInput from './components/AIInput';
import { Worker, ProductionRecord, Advance, Expense, Machine, SupplierOrder, SalaryPayment, Withdrawal, AIDataResponse, SupplierPayment } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'supplier_orders' | 'worker_tasks' | 'customer_work' | 'workers' | 'machines' | 'owner_withdrawals' | 'settings' | 'expenses'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // --- Core State ---
  const [workers, setWorkers] = useState<Worker[]>(() => JSON.parse(localStorage.getItem('workers') || '[]'));
  const [orders, setOrders] = useState<SupplierOrder[]>(() => JSON.parse(localStorage.getItem('orders') || '[]'));
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>(() => JSON.parse(localStorage.getItem('supplier_payments') || '[]'));
  const [records, setRecords] = useState<ProductionRecord[]>(() => JSON.parse(localStorage.getItem('records') || '[]'));
  const [advances, setAdvances] = useState<Advance[]>(() => JSON.parse(localStorage.getItem('advances') || '[]'));
  const [expenses, setExpenses] = useState<Expense[]>(() => JSON.parse(localStorage.getItem('expenses') || '[]'));
  const [machines, setMachines] = useState<Machine[]>(() => JSON.parse(localStorage.getItem('machines') || '[]'));
  const [payments, setPayments] = useState<SalaryPayment[]>(() => JSON.parse(localStorage.getItem('payments') || '[]'));
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(() => JSON.parse(localStorage.getItem('withdrawals') || '[]'));
  const [password, setPassword] = useState(() => localStorage.getItem('app_password') || '1234');

  // Editing & UI States
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [payingMachineId, setPayingMachineId] = useState<string | null>(null);
  const [reportConfig, setReportConfig] = useState<{ type: 'worker' | 'supplier' | 'profit', id?: string } | null>(null);
  const [partialPaymentOrderId, setPartialPaymentOrderId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('workers', JSON.stringify(workers));
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('supplier_payments', JSON.stringify(supplierPayments));
    localStorage.setItem('records', JSON.stringify(records));
    localStorage.setItem('advances', JSON.stringify(advances));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('machines', JSON.stringify(machines));
    localStorage.setItem('payments', JSON.stringify(payments));
    localStorage.setItem('withdrawals', JSON.stringify(withdrawals));
    localStorage.setItem('app_password', password);
  }, [workers, orders, supplierPayments, records, advances, expenses, machines, payments, withdrawals, password]);

  // --- Financial Calculations (Audited Logic) ---
  
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
    const earned = getWorkerEarned(workerId);
    const advancesTaken = getWorkerAdvances(workerId);
    return earned - advancesTaken;
  };

  const calculateTotalCash = () => {
    const totalIn = orders.reduce((acc, o) => acc + (o.total_paid || 0), 0) + records.filter(r => r.is_customer_work).reduce((acc, r) => acc + (r.supplier_rate || 0), 0);
    const machinePayments = machines.reduce((acc, m) => acc + (m.paid_amount || 0), 0);
    const totalOut = expenses.reduce((acc, e) => acc + e.amount, 0) + payments.reduce((acc, p) => acc + p.amount, 0) + withdrawals.reduce((acc, w) => acc + w.amount, 0) + machinePayments;
    return totalIn - totalOut;
  };

  // --- AI Success Handler ---
  const handleAISuccess = (result: AIDataResponse) => {
    if (result.type === 'unknown') {
      showStatus("لم أفهم النص بوضوح، يرجى المحاولة مرة أخرى بصيغة أوضح", "error");
      return;
    }

    const findWorkerId = (name: string) => {
      if (!name) return null;
      const worker = workers.find(w => 
        w.full_name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(w.full_name.toLowerCase())
      );
      return worker?.id || null;
    };

    if (result.type === 'production') {
      const workerId = findWorkerId(result.data.worker_name);
      if (!workerId) {
        showStatus(`لم أجد عاملة باسم "${result.data.worker_name}"، يرجى التأكد من الاسم`, "error");
        return;
      }

      const newR: ProductionRecord = {
        id: Math.random().toString(36).substr(2, 9),
        worker_id: workerId,
        task_name: result.data.task_name || "مهمة غير محددة",
        quantity: result.data.quantity || 0,
        worker_rate: result.data.worker_rate || 0,
        is_customer_work: false,
        recorded_at: new Date().toLocaleDateString('en-CA'),
        is_paid: false
      };
      setRecords([newR, ...records]);
      showStatus(`تم تسجيل إنتاج: ${result.data.task_name} لـ ${result.data.worker_name}`);
    } else if (result.type === 'advance') {
      const workerId = findWorkerId(result.data.worker_name);
      if (!workerId) {
        showStatus(`لم أجد عاملة باسم "${result.data.worker_name}"`, "error");
        return;
      }
      
      const amount = result.data.amount || 0;
      const balance = getWorkerBalance(workerId);
      if (amount > balance && balance > 0) {
        if(!confirm(`المبلغ (₪${amount}) يتجاوز الرصيد الصافي المتبقي (₪${balance.toFixed(1)}). هل تريد صرف السلفة؟`)) return;
      }
      if (amount > calculateTotalCash()) {
        showStatus(`السيولة في الصندوق لا تكفي لصرف هذا المبلغ`, "error");
        return;
      }

      const newA: Advance = {
        id: Math.random().toString(36).substr(2, 9),
        worker_id: workerId,
        amount,
        note: result.data.note || "سلفة ذكية",
        date: new Date().toLocaleDateString('en-CA'),
        is_settled: false
      };
      setAdvances([newA, ...advances]);
      showStatus(`تم صرف سلفة: ₪${amount} لـ ${result.data.worker_name}`);
    } else if (result.type === 'expense') {
      const newE: Expense = {
        id: Math.random().toString(36).substr(2, 9),
        category: result.data.category || "عام",
        amount: result.data.amount || 0,
        description: result.data.note || "مصروف ذكي",
        date: new Date().toLocaleDateString('en-CA')
      };
      setExpenses([newE, ...expenses]);
      showStatus(`تم تسجيل مصروف بقيمة: ₪${result.data.amount}`);
    }
  };

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const getDayArabic = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ar-EG', { weekday: 'long' });
    } catch {
      return "غير محدد";
    }
  };

  const sendWorkerWhatsApp = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker || !worker.phone) return showStatus("يرجى إضافة رقم واتساب للعاملة أولاً", "error");
    
    const balance = getWorkerBalance(workerId);
    const message = `مرحباً ${worker.full_name}، كشف حسابك من مشغل عبير بتاريخ اليوم ${new Date().toLocaleDateString('ar-EG')}: 
- الرصيد المستحق (الصافي): ₪${balance.toFixed(1)}
يرجى مراجعة المشغل لاستلام مستحقاتك. شكراً لك.`;
    
    const url = `https://wa.me/${worker.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handlePartialPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partialPaymentOrderId) return;
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(f.get('amount'));
    const note = f.get('note') as string || "دفعة من الحساب";
    
    const newPay: SupplierPayment = {
      id: Math.random().toString(36).substr(2, 9),
      order_id: partialPaymentOrderId,
      amount,
      date: new Date().toLocaleDateString('en-CA'),
      note
    };

    setSupplierPayments([newPay, ...supplierPayments]);
    setOrders(orders.map(o => o.id === partialPaymentOrderId ? { ...o, total_paid: (o.total_paid || 0) + amount } : o));
    setPartialPaymentOrderId(null);
    showStatus("تم تحصيل الدفعة بنجاح");
  };

  const handleMachinePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingMachineId) return;
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(f.get('amount'));
    
    const cash = calculateTotalCash();
    if (amount > cash) {
      showStatus("السيولة غير كافية لتسديد القسط", "error");
      return;
    }

    setMachines(machines.map(m => m.id === payingMachineId ? { ...m, paid_amount: (m.paid_amount || 0) + amount } : m));
    setPayingMachineId(null);
    showStatus("تم تسديد مبلغ من ثمن الماكنة");
  };

  const paySalary = (workerId: string) => {
    const balance = getWorkerBalance(workerId);
    if (balance <= 0) return showStatus("لا يوجد رصيد متبقي للصرف حالياً", "error");
    
    const cash = calculateTotalCash();
    if (balance > cash) return showStatus(`السيولة لا تكفي لتصفية الحساب! المتوفر: ₪${cash.toFixed(1)}`, "error");

    const newPayment: SalaryPayment = { 
      id: Math.random().toString(36).substr(2, 9), 
      worker_id: workerId, 
      amount: balance, 
      date: new Date().toLocaleDateString('en-CA'), 
      period_from: "تصفية دورية", 
      period_to: "اليوم", 
      details: "إقفال حساب وبدء دورة جديدة (شامل تسوية السلف)" 
    };
    
    setPayments([newPayment, ...payments]);
    setRecords(records.map(r => r.worker_id === workerId ? { ...r, is_paid: true } : r));
    setAdvances(advances.map(a => a.worker_id === workerId ? { ...a, is_settled: true } : a));
    
    showStatus("تمت التصفية النهائية.. الحساب يبدأ الآن من الصفر");
  };

  const addOrUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(f.get('amount'));
    const category = f.get('category') as string;
    const desc = f.get('desc') as string;

    const newE: Expense = {
      id: editingExpenseId || Math.random().toString(36).substr(2, 9),
      category,
      amount,
      description: desc,
      date: expenses.find(x => x.id === editingExpenseId)?.date || new Date().toLocaleDateString('en-CA')
    };

    if (editingExpenseId) setExpenses(expenses.map(x => x.id === editingExpenseId ? newE : x));
    else setExpenses([newE, ...expenses]);

    setEditingExpenseId(null);
    (e.currentTarget as HTMLFormElement).reset();
    showStatus("تم حفظ المصروف");
  };

  const addOrUpdateMachine = (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const newM: Machine = {
      id: editingMachineId || Math.random().toString(36).substr(2, 9),
      name: f.get('name') as string,
      total_price: Number(f.get('price')),
      monthly_installment: Number(f.get('inst')),
      paid_amount: machines.find(x => x.id === editingMachineId)?.paid_amount || 0
    };
    if (editingMachineId) setMachines(machines.map(x => x.id === editingMachineId ? newM : x));
    else setMachines([...machines, newM]);
    setEditingMachineId(null);
    (e.currentTarget as HTMLFormElement).reset();
    showStatus("تم حفظ بيانات الماكنة");
  };

  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget as HTMLFormElement);
    const amount = Number(f.get('amount'));
    const note = f.get('note') as string;

    const cash = calculateTotalCash();
    if (amount > cash) {
      showStatus(`لا يمكن السحب! الأرباح المتوفرة (₪${cash.toFixed(1)}) أقل من المطلوب.`, "error");
      return;
    }

    const newW: Withdrawal = {
      id: Math.random().toString(36).substr(2, 9),
      amount,
      note,
      date: new Date().toLocaleDateString('en-CA')
    };

    setWithdrawals([newW, ...withdrawals]);
    (e.currentTarget as HTMLFormElement).reset();
    showStatus("تم تسجيل سحب المدير الشخصي");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 pb-20 lg:pb-0 font-['Cairo'] text-xs md:text-sm lg:text-base">
      
      {/* Report Modal - Full Audited History Statement */}
      {reportConfig && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto p-4 md:p-8 print:block print:relative print:z-0 print:p-0 print:m-0">
          <div className="max-w-4xl mx-auto print:max-w-none print:w-full">
            <div className="flex justify-between items-center mb-6 print:hidden">
               <button onClick={() => setReportConfig(null)} className="flex items-center gap-1 text-gray-500 hover:text-red-500 font-bold transition-all text-sm"><X size={16}/> إغلاق</button>
               <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 text-white px-4 md:px-6 py-2 rounded-xl font-black shadow-md text-sm"><Printer size={16}/> طباعة الكشف</button>
            </div>

            <div className="text-center mb-6 md:mb-10 border-b-2 md:border-b-4 border-blue-900 pb-4 md:pb-8">
               <div className="flex flex-col md:flex-row justify-center items-center gap-3 md:gap-5 mb-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-900 rounded-xl flex items-center justify-center text-white font-black text-xl md:text-3xl shadow-lg">ع</div>
                  <div className="text-right">
                    <h1 className="text-xl md:text-3xl font-black text-blue-900 leading-tight">مشغل عبير للخياطة</h1>
                    <p className="text-[10px] md:text-xs text-gray-400 font-bold tracking-widest mt-1 uppercase opacity-60">Smart ERP Solution</p>
                  </div>
               </div>
               <div className="flex flex-col md:flex-row justify-between items-end mt-6 px-2 md:px-4 gap-2">
                  <div className="text-right space-y-1">
                    <p className="font-bold text-sm md:text-lg">البيان: <span className="text-blue-700">{reportConfig.type === 'worker' ? 'كشف حساب تفصيلي مدقق' : reportConfig.type === 'supplier' ? 'كشف حساب مورد موحد' : 'تقرير الأرباح والإيرادات'}</span></p>
                    {reportConfig.id && <p className="font-black text-gray-600 text-xs md:text-base">الجهة: <span className="underline decoration-blue-200 decoration-2 underline-offset-4">{reportConfig.type === 'worker' ? workers.find(w=>w.id===reportConfig.id)?.full_name : reportConfig.id}</span></p>}
                  </div>
                  <div className="text-left font-bold text-gray-400 text-[10px] md:text-xs whitespace-nowrap">التاريخ: {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
               </div>
            </div>

            {reportConfig.type === 'worker' && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 mb-8 shadow-inner print:bg-white print:border-gray-300">
                   <h3 className="text-sm md:text-lg font-black text-slate-800 mb-6 border-b pb-2">ملخص الحساب الجاري</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                         <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest text-right">إجمالي الإنتاج (مستحق)</p>
                         <p className="text-xl md:text-3xl font-black text-blue-900 text-right">₪{getWorkerEarned(reportConfig.id!).toFixed(1)}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[10px] md:text-xs font-bold text-red-400 uppercase tracking-widest text-right">السلف المدفوعة (خصم)</p>
                         <p className="text-xl md:text-3xl font-black text-red-600 text-right">₪{getWorkerAdvances(reportConfig.id!).toFixed(1)}</p>
                      </div>
                      <div className="space-y-1 bg-emerald-600 text-white p-4 rounded-2xl shadow-md print:bg-emerald-50 print:text-emerald-900 print:border print:border-emerald-200">
                         <p className="text-[10px] md:text-xs font-bold opacity-70 print:opacity-100 uppercase tracking-widest text-right">صافي الراتب للتصفية</p>
                         <p className="text-xl md:text-3xl font-black leading-none mt-1 text-right">₪{getWorkerBalance(reportConfig.id!).toFixed(1)}</p>
                      </div>
                   </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse min-w-[600px] text-right">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-200 text-[10px] md:text-sm">
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">البيان التفصيلي</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-center">سعر القطعة</th>
                        <th className="p-3 text-left">المبلغ (₪)</th>
                        <th className="p-3 text-left">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.filter(r => r.worker_id === reportConfig.id && !r.is_paid).map(r => (
                        <tr key={r.id} className="border-b text-[10px] md:text-sm hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-gray-500 whitespace-nowrap">{r.recorded_at}</td>
                          <td className="p-3 font-black text-blue-900">{r.task_name}</td>
                          <td className="p-3 text-center font-bold">{r.quantity}</td>
                          <td className="p-3 text-center font-bold text-gray-600">₪{r.worker_rate}</td>
                          <td className="p-3 text-left font-black">{(r.quantity * (r.worker_rate || 0)).toFixed(1)}</td>
                          <td className="p-3 text-left text-blue-600 font-bold italic">جاري</td>
                        </tr>
                      ))}
                      {advances.filter(a => a.worker_id === reportConfig.id && !a.is_settled).map(a => (
                        <tr key={a.id} className="border-b text-red-600 bg-red-50/20 text-[10px] md:text-sm">
                          <td className="p-3 font-bold whitespace-nowrap">{a.date}</td>
                          <td className="p-3 font-black">سلفة مدفوعة من الراتب ({a.note})</td>
                          <td className="p-3 text-center">-</td>
                          <td className="p-3 text-center">-</td>
                          <td className="p-3 text-left font-black">- {a.amount.toFixed(1)}</td>
                          <td className="p-3 text-left font-bold italic">خصم جاري</td>
                        </tr>
                      ))}
                      
                      <tr className="bg-gray-50 print:bg-transparent">
                        <td colSpan={6} className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-y">السجلات المؤرشفة (سابقة)</td>
                      </tr>

                      {[...records.filter(r => r.worker_id === reportConfig.id && r.is_paid),
                        ...advances.filter(a => a.worker_id === reportConfig.id && a.is_settled),
                        ...payments.filter(p => p.worker_id === reportConfig.id)
                      ].sort((a, b) => {
                         const dateA = (a as any).date || (a as any).recorded_at;
                         const dateB = (b as any).date || (b as any).recorded_at;
                         return new Date(dateB).getTime() - new Date(dateA).getTime();
                      }).map((item: any) => {
                         const isProduction = 'task_name' in item;
                         const isAdvance = 'note' in item && 'amount' in item && !('details' in item);
                         const isPayment = 'details' in item;

                         return (
                            <tr key={item.id} className="border-b opacity-50 text-[10px] md:text-xs">
                               <td className="p-2 whitespace-nowrap">{item.date || item.recorded_at}</td>
                               <td className="p-2 font-bold">{isProduction ? item.task_name : isAdvance ? `سلفة: ${item.note}` : `تصفية: ${item.details}`}</td>
                               <td className="p-2 text-center">{item.quantity || '-'}</td>
                               <td className="p-2 text-center">{item.worker_rate ? `₪${item.worker_rate}` : '-'}</td>
                               <td className={`p-2 text-left font-bold ${isProduction ? 'text-gray-600' : 'text-emerald-700'}`}>
                                  {isProduction ? (item.quantity * item.worker_rate).toFixed(1) : `-${item.amount.toFixed(1)}`}
                               </td>
                               <td className="p-2 text-left italic">{isPayment ? 'منصرف' : 'تمت التسوية'}</td>
                            </tr>
                         )
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex flex-col md:flex-row justify-between items-center p-6 md:p-10 bg-blue-900 text-white rounded-3xl mt-8 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:border-2 print:border-black print:shadow-none">
                  <DollarSign size={80} className="absolute -left-5 -bottom-5 opacity-10 print:hidden"/>
                  <div className="text-right z-10 mb-4 md:mb-0">
                     <p className="text-xs font-bold opacity-60 uppercase tracking-widest leading-none print:opacity-100">إجمالي المستحق حالياً للتصفية</p>
                     <p className="text-xs opacity-40 mt-1 font-bold print:opacity-100">(الإنتاج - السلف الجارية)</p>
                  </div>
                  <div className="text-left z-10">
                    <p className="text-4xl md:text-6xl font-black leading-none">₪{getWorkerBalance(reportConfig.id!).toFixed(1)}</p>
                  </div>
                </div>
              </div>
            )}

            {reportConfig.type === 'supplier' && (
              <div className="space-y-6">
                <div className="mb-6 space-y-4">
                  <h3 className="text-lg font-black text-blue-900 border-b pb-2 print:text-black">سجل التوريدات (كافة الطلبيات لـ {reportConfig.id})</h3>
                  <div className="grid gap-4">
                    {orders.filter(o => o.supplier_name === reportConfig.id).map(o => (
                      <div key={o.id} className="p-4 bg-blue-50 rounded-xl border border-blue-100 print:bg-white print:border-gray-400">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-blue-900 text-sm print:text-black">{o.item_name} <span className="text-[10px] text-gray-400 mr-2">({o.created_at})</span></p>
                          <p className="font-black text-blue-800 text-sm">₪{(o.total_pieces * o.rate_per_piece).toFixed(1)}</p>
                        </div>
                        <p className="text-[10px] text-gray-500">الكمية: {o.total_pieces} | السعر: {o.rate_per_piece} ₪ للقطعة</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <h3 className="text-lg font-black text-emerald-700 mb-4 border-b pb-2 print:text-black">سجل الدفعات والمقبوضات</h3>
                  <table className="w-full border-collapse min-w-[400px] text-right">
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200 text-[10px] md:text-sm">
                        <th className="p-2">التاريخ</th>
                        <th className="p-2">البيان</th>
                        <th className="p-2 text-left">المبلغ المحصل (₪)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierPayments.filter(p => orders.find(o => o.id === p.order_id)?.supplier_name === reportConfig.id).map(p => (
                        <tr key={p.id} className="border-b text-[10px] md:text-sm hover:bg-slate-50">
                          <td className="p-2 font-bold whitespace-nowrap">{p.date}</td>
                          <td className="p-2 font-black text-blue-900">{p.note} (لـ {orders.find(o=>o.id===p.order_id)?.item_name})</td>
                          <td className="p-2 text-left font-black text-emerald-600">{p.amount.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-6 md:p-10 bg-emerald-50 rounded-2xl border-2 border-dashed border-emerald-200 text-center shadow-inner print:bg-white print:border-black">
                  {(() => {
                    const filteredOrders = orders.filter(o => o.supplier_name === reportConfig.id);
                    const totalCost = filteredOrders.reduce((a, b) => a + (b.total_pieces * b.rate_per_piece), 0);
                    const totalPaid = filteredOrders.reduce((a, b) => a + (b.total_paid || 0), 0);
                    return (
                      <>
                        <p className="text-xs md:text-lg font-bold text-emerald-700 mb-2 print:text-black">إجمالي المستحقات المتبقية بذمة المورد</p>
                        <p className="text-4xl md:text-6xl font-black text-red-600">₪{(totalCost - totalPaid).toFixed(1)}</p>
                        <div className="mt-6 border-t-2 border-emerald-100 pt-4 flex justify-between px-4 md:px-10 print:border-black">
                           <div className="text-right">
                              <p className="text-[10px] md:text-xs font-bold opacity-40 print:opacity-100">إجمالي قيمة التوريدات</p>
                              <p className="text-sm md:text-xl font-black">₪{totalCost.toFixed(1)}</p>
                           </div>
                           <div className="text-left">
                              <p className="text-[10px] md:text-xs font-bold opacity-40 print:opacity-100">إجمالي ما تم سداده</p>
                              <p className="text-sm md:text-xl font-black text-emerald-600">₪{totalPaid.toFixed(1)}</p>
                           </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {reportConfig.type === 'profit' && (
               <div className="space-y-8 text-right">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    <div className="space-y-3 md:space-y-4">
                       <h3 className="text-lg md:text-xl font-black text-emerald-700 border-b-2 pb-2 print:text-black print:border-black">الإيرادات</h3>
                       <div className="flex justify-between p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-base print:bg-transparent print:border-b"><span>الموردين:</span> <span>₪{orders.reduce((a,b)=>a+(b.total_paid||0),0).toFixed(1)}</span></div>
                       <div className="flex justify-between p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-base text-indigo-700 print:text-black print:bg-transparent print:border-b"><span>الزبائن:</span> <span>₪{records.filter(r=>r.is_customer_work).reduce((a,b)=>a+(b.supplier_rate||0),0).toFixed(1)}</span></div>
                    </div>
                    <div className="space-y-3 md:space-y-4">
                       <h3 className="text-lg md:text-xl font-black text-red-700 border-b-2 pb-2 print:text-black print:border-black">النفقات</h3>
                       <div className="flex justify-between p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-base print:bg-transparent print:border-b"><span>المصاريف:</span> <span>₪{expenses.reduce((a,b)=>a+b.amount,0).toFixed(1)}</span></div>
                       <div className="flex justify-between p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-base print:bg-transparent print:border-b"><span>الرواتب:</span> <span>₪{payments.reduce((a,b)=>a+b.amount,0).toFixed(1)}</span></div>
                       <div className="flex justify-between p-3 md:p-4 bg-orange-50 rounded-xl font-black text-xs md:text-base text-orange-600 print:text-black print:bg-transparent print:border-b"><span>سحوبات المدير:</span> <span>₪{withdrawals.reduce((a,b)=>a+b.amount,0).toFixed(1)}</span></div>
                       <div className="flex justify-between p-3 md:p-4 bg-red-50 rounded-xl font-black text-xs md:text-base text-red-700 print:text-black print:bg-transparent print:border-b"><span>أقساط الماكينات:</span> <span>₪{machines.reduce((a,b)=>a+(b.paid_amount||0),0).toFixed(1)}</span></div>
                    </div>
                  </div>
                  <div className="bg-blue-900 text-white p-8 md:p-14 rounded-2xl md:rounded-[3rem] text-center shadow-xl relative overflow-hidden border-4 md:border-8 border-blue-800 print:bg-white print:text-black print:border-black">
                     <p className="text-xs md:text-lg font-bold opacity-60 mb-4 uppercase tracking-widest print:opacity-100">صافي السيولة بالصندوق</p>
                     <p className="text-4xl md:text-7xl font-black leading-none">₪{calculateTotalCash().toFixed(1)}</p>
                  </div>
               </div>
            )}

            <div className="mt-12 flex flex-col md:flex-row justify-around opacity-40 font-black text-[10px] md:text-sm gap-4 text-center border-t pt-8 print:opacity-100">
               <div className="border-t-2 border-gray-400 pt-4 px-10 print:border-black">توقيع المدير</div>
               <div className="border-t-2 border-gray-400 pt-4 px-10 print:border-black">ختم المشغل</div>
            </div>
          </div>
        </div>
      )}

      {/* Partial Payment Prompt (Orders) */}
      {partialPaymentOrderId && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black mb-6 text-emerald-800 flex items-center gap-2 leading-none"><Landmark size={20}/> تحصيل دفعة من مورد</h3>
            <form onSubmit={handlePartialPayment} className="space-y-6">
               <div className="relative">
                <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full p-6 bg-emerald-50 text-emerald-900 text-center font-black text-4xl rounded-xl border-none shadow-inner" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-emerald-200">₪</span>
               </div>
               <input name="note" placeholder="ملاحظة الدفعة.." className="w-full p-3 bg-gray-50 rounded-xl font-black text-sm border-none shadow-inner" />
               <div className="flex gap-2">
                 <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-black text-base shadow-md transition-all">تأكيد</button>
                 <button type="button" onClick={() => setPartialPaymentOrderId(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-base transition-all">إلغاء</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Machine Payment Prompt */}
      {payingMachineId && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black mb-6 text-orange-800 flex items-center gap-2 leading-none"><Wrench size={20}/> تسديد قسط ماكنة</h3>
            <form onSubmit={handleMachinePayment} className="space-y-6">
               <div className="relative">
                <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full p-6 bg-orange-50 text-orange-900 text-center font-black text-4xl rounded-xl border-none shadow-inner" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-orange-200">₪</span>
               </div>
               <p className="text-[10px] text-gray-500 text-center">سيتم خصم هذا المبلغ من السيولة النقدية المتوفرة</p>
               <div className="flex gap-2">
                 <button type="submit" className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-black text-base shadow-md transition-all">تأكيد التسديد</button>
                 <button type="button" onClick={() => setPayingMachineId(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-base transition-all">إلغاء</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar Nav */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 md:w-72 bg-white shadow-2xl transform transition-transform duration-500 lg:translate-x-0 print:hidden ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8 border-b-2 pb-6">
            <div className="flex items-center gap-3 text-blue-900 font-black text-xl md:text-2xl">
              <div className="w-8 h-8 md:w-12 md:h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl md:text-3xl shadow-lg">ع</div>
              <div className="flex flex-col">
                <span className="leading-tight">مشغل</span>
                <span className="leading-tight">عبير</span>
              </div>
            </div>
            <button className="lg:hidden p-1 hover:bg-gray-50 rounded-lg" onClick={() => setIsSidebarOpen(false)}><X size={24}/></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {[
              { id: 'dashboard', label: 'لوحة الأرباح', icon: LayoutDashboard },
              { id: 'supplier_orders', label: 'الموردين والتحصيل', icon: Truck },
              { id: 'worker_tasks', label: 'الإنتاج اليومي', icon: Package },
              { id: 'customer_work', label: 'إيراد الزبائن (خاص)', icon: ShoppingBag },
              { id: 'workers', label: 'الرواتب والسلف', icon: Users },
              { id: 'expenses', label: 'المصاريف العامة', icon: CreditCard },
              { id: 'machines', label: 'الماكينات والأقساط', icon: Wrench },
              { id: 'owner_withdrawals', label: 'مسحوبات المدير', icon: Landmark },
              { id: 'settings', label: 'الإعدادات والسر', icon: Settings },
            ].map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id as any); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === item.id ? 'bg-blue-600 text-white font-black shadow-lg scale-[1.02]' : 'text-gray-500 hover:bg-gray-50'}`}>
                <item.icon size={18} />
                <span className="text-xs md:text-sm whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="lg:mr-72 min-h-screen p-4 md:p-8 lg:p-10 text-right print:hidden">
        
        {calculateTotalCash() <= 200 && activeTab === 'dashboard' && (
           <div className="mb-6 bg-red-600 text-white p-4 md:p-6 rounded-2xl flex items-center justify-between animate-pulse shadow-lg border-2 border-white/20">
              <div className="flex items-center gap-3 md:gap-4">
                <AlertCircle size={24} className="text-red-100"/>
                <div className="space-y-1 text-right">
                  <p className="text-base md:text-lg font-black leading-tight">تنبيه: السيولة منخفضة!</p>
                  <p className="text-[10px] md:text-xs font-bold opacity-80 leading-tight">الرصيد المتاح: ₪{calculateTotalCash().toFixed(1)} فقط.</p>
                </div>
              </div>
           </div>
        )}

        <header className="flex justify-between items-center mb-6 lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white rounded-xl shadow-md border border-gray-100 active:scale-90 transition-transform"><Menu size={24} className="text-blue-900"/></button>
          <div className="text-center">
             <h1 className="font-black text-lg text-blue-900 leading-none">مشغل عبير</h1>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <AIInput onDataExtracted={handleAISuccess} />
            <Dashboard orders={orders} records={records} expenses={expenses} machines={machines} workers={workers} advances={advances} withdrawals={withdrawals} />
            <button onClick={() => setReportConfig({type:'profit'})} className="w-full bg-blue-900 text-white py-6 md:py-8 rounded-xl md:rounded-[2rem] font-black text-base md:text-xl shadow-xl flex items-center justify-center gap-3 md:gap-4 hover:bg-blue-800 transition-all transform active:scale-95">
               <FileText size={20} className="md:w-6 md:h-6"/> استخراج التقرير المالي العام
            </button>
          </div>
        )}

        {activeTab === 'supplier_orders' && (
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-100">
               <h2 className="text-lg md:text-xl font-black mb-6 md:mb-8 flex items-center gap-2 border-b-2 pb-4 leading-none text-right"><Truck size={20} className="text-blue-600 ml-2"/> {editingOrderId ? 'تعديل الطلبية' : 'إضافة طلبية مورد'}</h2>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const f = new FormData(e.currentTarget as HTMLFormElement);
                 const newO: SupplierOrder = {
                   id: editingOrderId || Math.random().toString(36).substr(2, 9),
                   supplier_name: f.get('supplier') as string,
                   item_name: f.get('item') as string,
                   total_pieces: Number(f.get('qty')),
                   rate_per_piece: Number(f.get('rate')),
                   status: 'active',
                   total_paid: orders.find(x => x.id === editingOrderId)?.total_paid || 0,
                   created_at: orders.find(x => x.id === editingOrderId)?.created_at || new Date().toLocaleDateString('en-CA')
                 };
                 if (editingOrderId) setOrders(orders.map(o => o.id === editingOrderId ? newO : o));
                 else setOrders([newO, ...orders]);
                 setEditingOrderId(null);
                 (e.currentTarget as HTMLFormElement).reset();
                 showStatus("تم الحفظ بنجاح");
               }} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-right">
                  <input name="supplier" required placeholder="اسم المورد" defaultValue={orders.find(x => x.id === editingOrderId)?.supplier_name} className="p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-sm border-none shadow-inner" />
                  <input name="item" required placeholder="الصنف / الموديل" defaultValue={orders.find(x => x.id === editingOrderId)?.item_name} className="p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-sm border-none shadow-inner" />
                  <input name="qty" type="number" required placeholder="الكمية الكلية" defaultValue={orders.find(x => x.id === editingOrderId)?.total_pieces} className="p-3 md:p-4 bg-gray-50 rounded-xl font-black text-center text-xs md:text-sm border-none shadow-inner" />
                  <input name="rate" type="number" step="0.01" required placeholder="سعر القطعة (₪)" defaultValue={orders.find(x => x.id === editingOrderId)?.rate_per_piece} className="p-3 md:p-4 bg-blue-50 text-blue-800 font-black text-center text-xl md:text-2xl rounded-xl border-none shadow-inner" />
                  <div className="md:col-span-2 flex gap-3 pt-4">
                    <button className="flex-1 bg-blue-600 text-white font-black py-4 rounded-xl shadow-md text-sm md:text-lg transition-all active:scale-95">{editingOrderId ? 'حفظ' : 'تأكيد'}</button>
                    {editingOrderId && <button type="button" onClick={() => setEditingOrderId(null)} className="bg-gray-200 px-6 rounded-xl font-black text-xs md:text-sm">إلغاء</button>}
                  </div>
               </form>
            </div>
            <div className="grid gap-4">
              {orders.map(o => (
                <div key={o.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4 hover:border-blue-200 transition-all text-right">
                  <div className="space-y-1 w-full">
                    <p className="font-black text-base md:text-xl text-blue-950 leading-tight">{o.item_name} <span className="text-blue-600 text-xs md:text-sm font-bold opacity-60 mr-2">| {o.supplier_name}</span></p>
                    <p className="text-[10px] md:text-xs text-gray-400 font-black uppercase tracking-widest">إجمالي: ₪{(o.total_pieces*o.rate_per_piece).toFixed(1)} <span className="mx-1 opacity-20">|</span> المحصل: <span className="text-emerald-600 font-black">₪{(o.total_paid || 0).toFixed(1)}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setPartialPaymentOrderId(o.id)} className="flex-1 md:flex-none bg-emerald-600 text-white px-4 py-2 rounded-lg font-black shadow-md active:scale-95 transition-all text-[10px] md:text-xs">تحصيل</button>
                    <button onClick={() => setReportConfig({type:'supplier', id: o.supplier_name})} title="كشف حساب موحد للمورد" className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><FileText size={18}/></button>
                    <button onClick={() => setEditingOrderId(o.id)} className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit3 size={18}/></button>
                    <button onClick={() => { if(confirm('حذف الطلبية؟')) setOrders(orders.filter(x => x.id !== o.id)); }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'worker_tasks' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-100">
               <h2 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2 border-b-2 pb-4 text-emerald-700 leading-none text-right"><Package size={20} className="ml-2"/> تسجيل الإنتاج اليومي</h2>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const f = new FormData(e.currentTarget as HTMLFormElement);
                 const newR: ProductionRecord = {
                   id: editingRecordId || Math.random().toString(36).substr(2, 9),
                   worker_id: f.get('worker_id') as string,
                   task_name: f.get('task') as string,
                   quantity: Number(f.get('qty')),
                   worker_rate: Number(f.get('rate')),
                   is_customer_work: false,
                   recorded_at: records.find(x => x.id === editingRecordId)?.recorded_at || new Date().toLocaleDateString('en-CA'),
                   is_paid: false
                 };
                 if (editingRecordId) setRecords(records.map(r => r.id === editingRecordId ? newR : r));
                 else setRecords([newR, ...records]);
                 setEditingRecordId(null);
                 (e.currentTarget as HTMLFormElement).reset();
                 showStatus("تم التسجيل");
               }} className="space-y-6 md:space-y-8 text-right">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                    <select name="worker_id" required defaultValue={records.find(x => x.id === editingRecordId)?.worker_id} className="p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-sm shadow-inner border-none text-right">
                       <option value="">اختيار العاملة..</option>
                       {workers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                    </select>
                    <input name="task" required placeholder="المهمة" defaultValue={records.find(x => x.id === editingRecordId)?.task_name} className="p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-sm shadow-inner border-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="qty" type="number" required placeholder="الكمية" defaultValue={records.find(x => x.id === editingRecordId)?.quantity} className="p-3 md:p-4 bg-gray-50 rounded-xl font-black text-center text-sm md:text-lg shadow-inner border-none" />
                    <input name="rate" type="number" step="0.01" required placeholder="الأجرة (₪)" defaultValue={records.find(x => x.id === editingRecordId)?.worker_rate} className="p-3 md:p-4 bg-emerald-50 text-emerald-800 font-black text-center text-xl md:text-3xl rounded-xl shadow-inner border-none" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg text-sm md:text-xl hover:bg-emerald-700 active:scale-95 transition-all leading-none">{editingRecordId ? 'تعديل' : 'تأكيد'}</button>
                    {editingRecordId && <button type="button" onClick={() => setEditingRecordId(null)} className="bg-gray-200 px-8 rounded-xl font-black text-xs md:text-sm">إلغاء</button>}
                  </div>
               </form>
            </div>
          </div>
        )}

        {activeTab === 'workers' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-100">
               <h2 className="text-lg md:text-xl font-black mb-6 text-red-600 flex items-center gap-2 border-b-2 pb-4 leading-none text-right"><DollarSign size={20} className="ml-2"/> صرف سلفة مالية</h2>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const f = new FormData(e.currentTarget as HTMLFormElement);
                 const workerId = f.get('worker_id') as string;
                 const amount = Number(f.get('amount'));
                 const balance = getWorkerBalance(workerId);

                 if (amount > balance && balance > 0) {
                    if(!confirm(`المبلغ (₪${amount}) يتجاوز الرصيد المستحق الحالي (₪${balance.toFixed(1)}). هل تريد صرف السلفة؟`)) return;
                 }
                 if (amount > calculateTotalCash()) return showStatus(`لا يوجد سيولة كافية في الصندوق حالياً!`, "error");

                 const newA: Advance = { id: Math.random().toString(36).substr(2, 9), worker_id: workerId, amount, note: f.get('note') as string, date: new Date().toLocaleDateString('en-CA'), is_settled: false };
                 setAdvances([newA, ...advances]);
                 (e.currentTarget as HTMLFormElement).reset();
                 showStatus("تم صرف السلفة وتوثيقها كجزء من الراتب");
               }} className="space-y-6 md:space-y-8 text-right">
                  <select name="worker_id" required className="w-full p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-sm border-none shadow-inner text-right">
                     <option value="">العاملة..</option>
                     {workers.map(w => <option key={w.id} value={w.id}>{w.full_name} (رصيد صافي: ₪{getWorkerBalance(w.id).toFixed(1)})</option>)}
                  </select>
                  <div className="relative">
                    <input name="amount" type="number" required placeholder="0.00" className="w-full p-8 md:p-12 bg-red-50 text-red-700 text-center font-black text-4xl md:text-6xl rounded-2xl border-none shadow-inner" />
                    <span className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 text-xl md:text-3xl font-black text-red-200">₪</span>
                  </div>
                  <input name="note" placeholder="سبب السلفة.." className="w-full p-3 md:p-4 bg-gray-50 rounded-xl font-black text-xs md:text-sm border-none shadow-inner text-right" />
                  <button className="w-full bg-red-600 text-white font-black py-4 md:py-6 rounded-xl shadow-lg text-sm md:text-2xl hover:bg-red-700 active:scale-95 transition-all">تأكيد صرف السلفة</button>
               </form>
            </div>
            
            <div className="space-y-6">
               <h3 className="font-black text-gray-500 text-base md:text-xl px-4 border-r-8 border-blue-600 mr-1 uppercase tracking-widest leading-none mb-6 text-right">إدارة الرواتب والذمم</h3>
               {workers.map(w => (
                 <div key={w.id} className="bg-white p-6 md:p-10 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm border border-gray-100 gap-6 hover:border-blue-300 transition-all text-right">
                    <div className="space-y-1 w-full">
                      <p className="font-black text-lg md:text-2xl text-blue-950 leading-none">{w.full_name}</p>
                      <p className="text-blue-600 font-black text-xl md:text-4xl leading-none mt-2">₪{getWorkerBalance(w.id).toFixed(1)} <span className="text-[10px] md:text-xs text-gray-400 font-bold opacity-60 uppercase tracking-widest">صافي المتبقي</span></p>
                      <p className="text-[10px] md:text-xs text-gray-400 font-black uppercase tracking-wider mt-2">
                         إجمالي الإنتاج: ₪{getWorkerEarned(w.id).toFixed(1)} | سلف مدفوعة: ₪{getWorkerAdvances(w.id).toFixed(1)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      <button onClick={() => sendWorkerWhatsApp(w.id)} className="p-3 md:p-4 bg-emerald-50 text-emerald-600 rounded-xl shadow-md active:scale-95 transition-all"><MessageCircle size={18}/></button>
                      <button onClick={() => setReportConfig({type:'worker', id: w.id})} className="flex-1 md:flex-none bg-blue-50 text-blue-600 px-6 py-2 rounded-xl font-black text-[10px] md:text-xs shadow-sm active:scale-95 transition-all whitespace-nowrap">كشف شامل</button>
                      <button onClick={() => paySalary(w.id)} className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-2 rounded-xl font-black text-[10px] md:text-xs shadow-md active:scale-95 transition-all whitespace-nowrap leading-none">تصفية نهائية</button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* ... Rest of the tabs continue ... */}
        {activeTab === 'expenses' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-100 text-right">
               <h2 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2 border-b-2 pb-4 leading-none"><CreditCard size={20} className="text-blue-600 ml-2"/> {editingExpenseId ? 'تعديل مصروف' : 'إضافة مصروف جديد'}</h2>
               <form onSubmit={addOrUpdateExpense} className="space-y-6 text-right">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="category" required placeholder="التصنيف (خيوط، كهرباء، صيانة..)" defaultValue={expenses.find(e => e.id === editingExpenseId)?.category} className="p-3 md:p-4 bg-gray-50 rounded-xl border-none shadow-inner font-black text-xs md:text-sm text-right" />
                    <input name="amount" type="number" step="0.01" required placeholder="المبلغ (₪)" defaultValue={expenses.find(e => e.id === editingExpenseId)?.amount} className="p-3 md:p-4 bg-red-50 text-red-700 rounded-xl border-none shadow-inner font-black text-center text-sm md:text-lg" />
                  </div>
                  <input name="desc" placeholder="وصف إضافي للمصروف.." defaultValue={expenses.find(e => e.id === editingExpenseId)?.description} className="w-full p-3 md:p-4 bg-gray-50 rounded-xl border-none shadow-inner font-black text-xs md:text-sm text-right" />
                  <div className="flex gap-3">
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black shadow-md text-sm md:text-lg transition-all active:scale-95">{editingExpenseId ? 'حفظ' : 'تأكيد الإضافة'}</button>
                    {editingExpenseId && <button type="button" onClick={() => setEditingExpenseId(null)} className="bg-gray-200 px-6 rounded-xl font-black text-xs md:text-sm">إلغاء</button>}
                  </div>
               </form>
            </div>
            <div className="grid gap-4">
              {expenses.map(e => (
                <div key={e.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm text-right">
                   <div className="w-full">
                      <p className="font-black text-sm md:text-lg text-gray-800">{e.category}</p>
                      <p className="text-[10px] md:text-xs text-gray-400 font-bold">{e.description} | {e.date}</p>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="font-black text-red-600 text-sm md:text-xl">₪{e.amount}</span>
                      <button onClick={() => setEditingExpenseId(e.id)} className="text-blue-400 hover:text-blue-600"><Edit3 size={18}/></button>
                      <button onClick={() => { if(confirm('حذف المصروف؟')) setExpenses(expenses.filter(ex => ex.id !== e.id)); }} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'customer_work' && (
          <div className="max-w-xl mx-auto space-y-10">
             <div className="bg-white p-6 md:p-12 rounded-2xl shadow-sm border-4 border-indigo-50 relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><ShoppingBag size={120}/></div>
                <h2 className="text-lg md:text-2xl font-black mb-6 flex items-center justify-center gap-3 text-indigo-700 border-b-2 pb-4 leading-none"><ShoppingBag size={24} className="ml-2"/> إيراد الزبائن (كاش المشغل)</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget as HTMLFormElement);
                  const newR: ProductionRecord = {
                    id: editingRecordId || Math.random().toString(36).substr(2, 9),
                    worker_id: '1', 
                    task_name: f.get('task') as string,
                    quantity: 1, worker_rate: 0, is_customer_work: true,
                    recorded_at: records.find(x => x.id === editingRecordId)?.recorded_at || new Date().toLocaleDateString('en-CA'), 
                    supplier_rate: Number(f.get('amt'))
                  };
                  if (editingRecordId) setRecords(records.map(r => r.id === editingRecordId ? newR : r));
                  else setRecords([newR, ...records]);
                  setEditingRecordId(null);
                  (e.currentTarget as HTMLFormElement).reset();
                  showStatus("تم ترحيل المبلغ للأرباح");
                }} className="space-y-6 relative z-10 text-right">
                   <p className="text-[10px] md:text-sm font-bold text-gray-500 bg-indigo-50/50 p-4 rounded-xl border-r-4 border-indigo-300 leading-relaxed shadow-sm">تنبيه: مبالغ الزبائن تذهب مباشرة للصندوق كأرباح صافية.</p>
                   <input name="task" required placeholder="وصف الخدمة.." defaultValue={records.find(x => x.id === editingRecordId && x.is_customer_work)?.task_name} className="w-full p-4 md:p-6 bg-gray-50 rounded-xl border-none font-black text-sm md:text-xl shadow-inner text-right" />
                   <div className="relative">
                    <input name="amt" type="number" step="0.01" required placeholder="0.00" defaultValue={records.find(x => x.id === editingRecordId && x.is_customer_work)?.supplier_rate} className="w-full p-8 md:p-12 bg-indigo-50 text-indigo-900 text-center font-black text-4xl md:text-7xl rounded-2xl border-none shadow-inner" />
                    <span className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 text-2xl md:text-4xl font-black text-indigo-200">₪</span>
                   </div>
                   <div className="flex gap-3">
                    <button className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg text-sm md:text-2xl transition-all active:scale-95">إضافة للأرباح</button>
                    {editingRecordId && <button type="button" onClick={() => setEditingRecordId(null)} className="bg-gray-200 px-8 rounded-xl font-black text-sm md:text-xl">تراجع</button>}
                   </div>
                </form>
             </div>
          </div>
        )}

        {activeTab === 'machines' && (
           <div className="max-w-4xl mx-auto space-y-10 text-right">
              <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg md:text-xl font-black mb-6 flex items-center gap-3 border-b-2 pb-4 leading-none"><Wrench size={24} className="text-orange-600 ml-2" /> {editingMachineId ? 'تعديل الماكنة' : 'إضافة ماكنة خياطة'}</h2>
                <form onSubmit={addOrUpdateMachine} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 text-right">
                    <div className="space-y-2">
                      <label className="text-[10px] md:text-xs font-black text-gray-400 px-2 uppercase tracking-widest">موديل الماكنة</label>
                      <input name="name" required defaultValue={machines.find(x => x.id === editingMachineId)?.name} className="w-full p-3 md:p-4 bg-gray-50 rounded-xl border-none font-black text-xs md:text-sm shadow-inner text-right" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] md:text-xs font-black text-gray-400 px-2 uppercase tracking-widest">السعر الكلي (₪)</label>
                      <input name="price" type="number" required defaultValue={machines.find(x => x.id === editingMachineId)?.total_price} className="w-full p-3 md:p-4 bg-gray-50 rounded-xl border-none font-black text-center text-sm md:text-lg shadow-inner" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] md:text-xs font-black text-gray-400 px-2 uppercase tracking-widest">القسط الشهري (₪)</label>
                      <input name="inst" type="number" required defaultValue={machines.find(x => x.id === editingMachineId)?.monthly_installment} className="w-full p-6 md:p-8 bg-orange-50 rounded-2xl border-none font-black text-center text-3xl md:text-4xl text-orange-900 shadow-inner" />
                    </div>
                    <div className="md:col-span-2 flex gap-3 pt-4">
                       <button className="flex-1 bg-orange-600 text-white font-black py-4 rounded-xl shadow-lg text-sm md:text-xl transition-all active:scale-95">حفظ البيانات</button>
                       {editingMachineId && <button type="button" onClick={() => setEditingMachineId(null)} className="bg-gray-200 px-8 rounded-xl font-black text-sm md:text-xl">إلغاء</button>}
                    </div>
                </form>
              </div>

              <div className="grid gap-6">
                 {machines.map(m => (
                   <div key={m.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-orange-200 transition-all text-right">
                      <div className="space-y-1 w-full">
                         <p className="font-black text-lg md:text-2xl text-gray-800">{m.name}</p>
                         <p className="text-xs md:text-sm text-gray-400 font-bold uppercase tracking-widest">السعر: ₪{m.total_price} | القسط: ₪{m.monthly_installment}</p>
                         <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden shadow-inner">
                            <div className="bg-orange-500 h-full transition-all duration-700" style={{ width: `${Math.min(100, ((m.paid_amount || 0) / m.total_price) * 100)}%` }}></div>
                         </div>
                         <p className="text-[10px] md:text-xs text-orange-600 font-black mt-2">المسدد: ₪{m.paid_amount || 0} من أصل ₪{m.total_price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <button onClick={() => setPayingMachineId(m.id)} className="flex-1 md:flex-none bg-orange-600 text-white px-6 py-2 rounded-lg font-black text-xs shadow-md hover:bg-orange-700 active:scale-95 transition-all leading-none">تسديد قسط</button>
                         <button onClick={() => setEditingMachineId(m.id)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-lg"><Edit3 size={18}/></button>
                         <button onClick={() => { if(confirm('حذف الماكنة؟')) setMachines(machines.filter(x => x.id !== m.id)); }} className="p-2 text-red-300 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'owner_withdrawals' && (
          <div className="max-w-xl mx-auto space-y-10 text-center">
            <div className="bg-white p-10 md:p-14 rounded-3xl shadow-xl border-t-8 md:border-t-[12px] border-orange-600 relative overflow-hidden text-right">
               <div className="absolute top-0 left-0 p-10 opacity-5 pointer-events-none -rotate-12"><TrendingUp size={150}/></div>
               <h2 className="text-xl md:text-3xl font-black mb-6 flex items-center justify-center gap-3 text-orange-600 leading-none"><Landmark size={24} className="ml-2"/> سحب الأرباح الشخصية</h2>
               <p className="text-xs md:text-lg text-gray-500 mb-10 font-bold bg-orange-50/50 p-6 rounded-xl border-r-8 border-orange-300 shadow-sm leading-relaxed text-right">
                 هذا القسم مخصص لسحب المدير لمبالغ من صافي أرباح الصندوق بعد خصم كافة المصاريف والرواتب.
               </p>
               <form onSubmit={handleWithdrawal} className="space-y-10 relative z-10 text-right">
                  <div className="relative group">
                    <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full p-8 md:p-14 bg-orange-50 text-orange-900 text-center font-black text-4xl md:text-7xl leading-none rounded-2xl border-none shadow-inner" />
                    <span className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 text-2xl md:text-4xl font-black text-orange-200">₪</span>
                  </div>
                  <input name="note" required placeholder="سبب السحب.." className="w-full p-4 md:p-6 bg-gray-50 rounded-xl border-none font-black text-sm md:text-xl shadow-sm text-right" />
                  <button className="w-full bg-orange-600 text-white font-black py-4 md:py-8 rounded-xl shadow-xl text-lg md:text-3xl active:scale-95 transition-all">تأكيد سحب المبلغ</button>
               </form>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto space-y-10 text-right">
             <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border-2 border-gray-100">
                <h2 className="text-lg md:text-xl font-black mb-8 border-b-2 pb-6 flex items-center gap-3 text-blue-950 leading-none text-right"><Lock size={20} className="ml-2"/> حماية النظام (كلمة السر)</h2>
                <form onSubmit={(e) => {
                   e.preventDefault();
                   const f = new FormData(e.currentTarget as HTMLFormElement);
                   const oldPass = f.get('old') as string;
                   const newPass = f.get('new') as string;
                   const confirmPass = f.get('confirm') as string;
                   
                   if (oldPass !== password) return showStatus("كلمة السر الحالية خاطئة!", "error");
                   if (newPass !== confirmPass) return showStatus("الجديدة غير متطابقة!", "error");
                   if (newPass.length < 4) return showStatus("قصيرة جداً! (4 خانات كحد أدنى)", "error");
                   
                   setPassword(newPass);
                   showStatus("تم تحديث كلمة السر بنجاح");
                   (e.currentTarget as HTMLFormElement).reset();
                }} className="space-y-6 text-right">
                   <div className="space-y-1 text-right">
                     <label className="text-[10px] md:text-xs font-black text-gray-400 px-4">كلمة السر الحالية</label>
                     <input name="old" type="password" required className="w-full p-3 md:p-4 bg-gray-50 rounded-xl border-none font-black text-xl md:text-2xl tracking-widest text-center shadow-inner" />
                   </div>
                   <div className="space-y-1 text-right">
                     <label className="text-[10px] md:text-xs font-black text-gray-400 px-4">الكلمة الجديدة</label>
                     <input name="new" type="password" required className="w-full p-3 md:p-4 bg-gray-50 rounded-xl border-none font-black text-xl md:text-2xl tracking-widest text-center shadow-inner" />
                   </div>
                   <div className="space-y-1 text-right">
                     <label className="text-[10px] md:text-xs font-black text-gray-400 px-4">تأكيد الكلمة</label>
                     <input name="confirm" type="password" required className="w-full p-3 md:p-4 bg-gray-50 rounded-xl border-none font-black text-xl md:text-2xl tracking-widest text-center shadow-inner" />
                   </div>
                   <button className="w-full bg-blue-950 text-white py-4 md:py-6 rounded-xl font-black text-sm md:text-xl shadow-md hover:bg-black active:scale-95 transition-all leading-none"><Key size={18} className="ml-1 inline"/> تحديث القفل</button>
                </form>
             </div>

             <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-gray-100 text-right">
                <h2 className="text-lg md:text-xl font-black mb-6 border-b-2 pb-4 text-right">إدارة بيانات العاملات</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget as HTMLFormElement);
                  const name = f.get('name') as string;
                  const phone = f.get('phone') as string;
                  if (name) {
                    setWorkers([...workers, { id: Math.random().toString(36).substr(2, 9), full_name: name, phone: phone }]);
                    (e.currentTarget as HTMLFormElement).reset();
                    showStatus("تمت إضافة عاملة جديدة");
                  }
                }} className="space-y-4 mb-10 text-right">
                   <input name="name" required placeholder="الاسم بالكامل للعاملة.." className="w-full p-3 md:p-4 bg-gray-50 rounded-xl border-none font-black text-xs md:text-sm shadow-inner text-right" />
                   <input name="phone" placeholder="رقم الواتساب.." className="w-full p-3 md:p-4 bg-gray-50 rounded-xl border-none font-black text-xs md:text-sm text-emerald-800 shadow-inner text-right" />
                   <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-black shadow-md text-sm md:text-xl transition-all leading-none">إضافة عاملة للمشغل</button>
                </form>
                <div className="space-y-4 text-right">
                   {workers.map(w => (
                     <div key={w.id} className="p-4 md:p-6 border-2 border-gray-50 flex justify-between items-center hover:bg-gray-50 rounded-xl transition-all group text-right">
                        <div className="flex flex-col gap-1 text-right w-full">
                          <span className="font-black text-sm md:text-lg text-blue-950 leading-none">{w.full_name}</span>
                          <span className="text-[10px] md:text-xs text-emerald-600 font-bold opacity-70 flex items-center gap-1 mt-1 leading-none"><MessageCircle size={12}/> {w.phone || "لا يوجد رقم"}</span>
                        </div>
                        <button onClick={() => { if(confirm('حذف بيانات العاملة؟')) setWorkers(workers.filter(x => x.id !== w.id)); }} className="p-2 text-red-200 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                     </div>
                   ))}
                </div>
             </div>
             <button onClick={() => { if(confirm('تنبيه خطير! سيتم حذف كافة البيانات والعودة للصفر. هل تريد الاستمرار؟')) { localStorage.clear(); window.location.reload(); } }} className="w-full py-6 text-red-500 font-black border-4 border-dashed border-red-50 rounded-2xl hover:bg-red-50 transition-all text-sm md:text-lg uppercase tracking-widest leading-none">تهيئة النظام بالكامل (حذف كل شيء)</button>
          </div>
        )}
      </main>

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-3xl border-t border-gray-100 p-3 md:p-4 flex justify-around items-center lg:hidden z-40 shadow-xl rounded-t-[2rem] print:hidden">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'supplier_orders', icon: Truck },
          { id: 'worker_tasks', icon: Package },
          { id: 'workers', icon: Users },
          { id: 'expenses', icon: CreditCard },
        ].map(item => (
          <button key={item.id} onClick={() => { setActiveTab(item.id as any); }} className={`p-3 md:p-5 rounded-xl transition-all duration-300 ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg scale-110 -translate-y-4' : 'text-gray-300'}`}>
            <item.icon size={22} className={`${activeTab === item.id ? 'animate-pulse' : ''} md:w-6 md:h-6`} />
          </button>
        ))}
      </nav>

      {/* Status Messages */}
      {statusMsg && (
        <div className={`fixed top-4 left-4 right-4 z-[300] p-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 transition-all flex items-center gap-3 border-l-8 ${statusMsg.type === 'success' ? 'bg-emerald-600 text-white border-emerald-900' : 'bg-red-600 text-white border-red-900'}`}>
           {statusMsg.type === 'success' ? <CheckCircle2 size={24}/> : <AlertCircle size={24}/>}
           <p className="font-black text-sm">{statusMsg.text}</p>
        </div>
      )}

      {/* Machine Pay Dialog */}
      {payingMachineId && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black mb-6 text-orange-800 flex items-center gap-2 leading-none"><Wrench size={20}/> تسديد قسط ماكنة</h3>
            <form onSubmit={handleMachinePayment} className="space-y-6 text-center">
               <div className="relative">
                <input name="amount" type="number" step="0.01" required placeholder="0.00" className="w-full p-6 bg-orange-50 text-orange-900 text-center font-black text-4xl rounded-xl border-none shadow-inner" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-orange-200">₪</span>
               </div>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">المبلغ سيخصم من السيولة الحالية</p>
               <div className="flex gap-2">
                 <button type="submit" className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-black text-base shadow-md transition-all hover:bg-orange-700 active:scale-95 leading-none">تأكيد التسديد</button>
                 <button type="button" onClick={() => setPayingMachineId(null)} className="flex-1 bg-gray-100 py-3 rounded-xl font-bold text-base transition-all hover:bg-gray-200 leading-none">إلغاء</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
