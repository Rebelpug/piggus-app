export type ExpenseGroup = {
  id: string;
  created_at: string;
  updated_at: string;
  encrypted_data: ExpenseGroupData;
};

export type ExpenseGroupData = {
  name: string;
  description: string;
  private: boolean;
};

export type ExpenseGroupMember = {
  id: string;
  user_id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  encrypted_group_key: string;
  status: 'confirmed' | 'pending' | 'rejected';
  username: string;
};

export type ExpenseGroupWithDecryptedData = {
  id: string;
  created_at: string;
  updated_at: string;
  data: ExpenseGroupData;
  membership_id?: string;
  membership_status?: 'confirmed' | 'pending' | 'rejected';
  encrypted_key: string;
  expenses: ExpenseWithDecryptedData[];
  members: ExpenseGroupMember[];
};

export type Expense = {
  id: string;
  user_id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  encrypted_data: ExpenseData;
};

export type ExpenseData = {
  name: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  is_recurring: boolean;
  // recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurring_interval?: string;
  recurring_end_date?: string;
  payment_method?: string;
  currency?: string;
  tags?: string[];
  receipt_url?: string;
  // status?: 'pending' | 'completed' | 'cancelled';
  status?: string;
  payer?: string; // User who paid
  participants?: { id: string; share: number }[]; // For split expenses
};

export type ExpenseWithDecryptedData = {
  id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  data: ExpenseData;
};

export type ExpenseFormData = {
  name: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  is_recurring: boolean;
  recurring_interval?: string;
  recurring_end_date?: string;
  payment_method?: string;
  currency?: string;
  tags?: string[];
  receipt_url?: string;
  status?: string;
  payer?: string;
  participants?: { id: string; share: number }[];
};

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'housing', label: 'Housing & Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'health', label: 'Health & Medical' },
  { value: 'education', label: 'Education' },
  { value: 'personal', label: 'Personal Care' },
  { value: 'travel', label: 'Travel' },
  { value: 'gifts', label: 'Gifts & Donations' },
  { value: 'investments', label: 'Investments' },
  { value: 'debt', label: 'Debt Payments' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_payment', label: 'Mobile Payment' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

export const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'CHF', label: 'CHF (Fr)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'BRL', label: 'BRL (R$)' },
];
