
export interface Worker {
  id: string;
  full_name: string;
  phone: string; // رقم الواتساب للعاملة (مطلوب للإرسال)
}

export interface SupplierPayment {
  id: string;
  order_id: string;
  amount: number;
  date: string;
  note: string;
}

export interface SupplierOrder {
  id: string;
  supplier_name: string;
  item_name: string;
  total_pieces: number;
  rate_per_piece: number; 
  status: 'active' | 'completed';
  total_paid: number; 
  created_at: string;
}

export interface ProductionRecord {
  id: string;
  worker_id: string;
  order_id?: string;
  task_name: string;
  quantity: number;
  worker_rate: number;
  is_customer_work: boolean;
  is_paid?: boolean;
  recorded_at: string;
  supplier_rate?: number;
}

export interface Advance {
  id: string;
  worker_id: string;
  amount: number;
  note: string;
  date: string;
  is_settled?: boolean;
}

export interface SalaryPayment {
  id: string;
  worker_id: string;
  amount: number;
  date: string;
  period_from: string;
  period_to: string;
  details: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface Machine {
  id: string;
  name: string;
  total_price: number;
  paid_amount: number;
  monthly_installment: number;
}

export interface Withdrawal {
  id: string;
  amount: number;
  note: string;
  date: string;
}

export interface AIDataResponse {
  type: 'production' | 'advance' | 'expense' | 'unknown';
  data: any;
}
