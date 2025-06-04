// types/expense.ts - Updated with sharing functionality

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
  currency: string;
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

// Updated ExpenseParticipant type
export type ExpenseParticipant = {
  user_id: string;
  username: string;
  share_amount: number; // Individual share amount
  share_percentage?: number; // Optional: percentage of total
};

export type ExpenseData = {
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
  payer_user_id: string; // Who actually paid for this expense
  payer_username?: string; // Username of the payer (for display)
  participants: ExpenseParticipant[]; // Who shares this expense and their amounts
  split_method: 'equal' | 'custom' | 'percentage'; // How the expense is split
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
  payer_user_id: string;
  payer_username?: string;
  participants: ExpenseParticipant[];
  split_method: 'equal' | 'custom' | 'percentage';
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

export const SPLIT_METHODS = [
  { value: 'equal', label: 'Split Equally' },
  { value: 'custom', label: 'Custom Amounts' },
  { value: 'percentage', label: 'By Percentage' },
];

// Utility functions for expense calculations
export const calculateEqualSplit = (amount: number, participantCount: number): number => {
  return Math.round((amount / participantCount) * 100) / 100;
};

export const calculateUserShare = (expense: ExpenseWithDecryptedData, userId: string): number => {
  const participant = expense.data.participants.find(p => p.user_id === userId);
  return participant ? participant.share_amount : 0;
};

export const calculateUserBalance = (expenses: ExpenseWithDecryptedData[], userId: string): number => {
  let balance = 0;

  expenses.forEach(expense => {
    // If user paid, they get credit for the full amount
    if (expense.data.payer_user_id === userId) {
      balance += expense.data.amount;
    }

    // Subtract what they owe
    const userShare = calculateUserShare(expense, userId);
    balance -= userShare;
  });

  return Math.round(balance * 100) / 100;
};

export const calculateGroupBalances = (
    expenses: ExpenseWithDecryptedData[],
    members: ExpenseGroupMember[]
): { [userId: string]: number } => {
  const balances: { [userId: string]: number } = {};

  // Initialize balances
  members.forEach(member => {
    balances[member.user_id] = 0;
  });

  // Calculate balances
  expenses.forEach(expense => {
    // Credit the payer
    if (balances.hasOwnProperty(expense.data.payer_user_id)) {
      balances[expense.data.payer_user_id] += expense.data.amount;
    }

    // Debit participants
    expense.data.participants.forEach(participant => {
      if (balances.hasOwnProperty(participant.user_id)) {
        balances[participant.user_id] -= participant.share_amount;
      }
    });
  });

  // Round to 2 decimal places
  Object.keys(balances).forEach(userId => {
    balances[userId] = Math.round(balances[userId] * 100) / 100;
  });

  return balances;
};
