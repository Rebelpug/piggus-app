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
  currency?: string;
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
  currency?: string;
  receipt_url?: string;
  status?: string;
  payer_user_id: string;
  payer_username?: string;
  participants: ExpenseParticipant[];
  split_method: 'equal' | 'custom' | 'percentage';
};

export const BASE_EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: '🍽️' },
  { id: 'transportation', name: 'Transportation', icon: '🚗' },
  { id: 'housing', name: 'Housing & Rent', icon: '🏠' },
  { id: 'utilities', name: 'Utilities', icon: '💡' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'health', name: 'Health & Medical', icon: '⚕️' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'personal', name: 'Personal Care', icon: '💄' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'gifts', name: 'Gifts & Donations', icon: '🎁' },
  { id: 'investments', name: 'Investments', icon: '📈' },
  { id: 'debt', name: 'Debt Payments', icon: '💳' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️' },
  { id: 'taxes', name: 'Taxes', icon: '📊' },
  { id: 'subscriptions', name: 'Subscriptions', icon: '📱' },
  { id: 'other', name: 'Other', icon: '📋' },
];

// Legacy support - will be computed from base categories + overrides
export const EXPENSE_CATEGORIES = BASE_EXPENSE_CATEGORIES.map(cat => ({
  value: cat.id,
  label: cat.name
}));

// Utility function to compute categories based on base categories and overrides
export const computeExpenseCategories = (categoryOverrides?: {
  edited: { [categoryId: string]: { name: string; icon: string } };
  deleted: string[];
  added: Array<{ id: string; name: string; icon: string }>;
}) => {
  let categories = [...BASE_EXPENSE_CATEGORIES];

  if (categoryOverrides) {
    // Apply edits
    categories = categories.map(cat => {
      const override = categoryOverrides.edited[cat.id];
      return override ? { ...cat, name: override.name, icon: override.icon } : cat;
    });

    // Remove deleted categories
    categories = categories.filter(cat => !categoryOverrides.deleted.includes(cat.id));

    // Add new categories
    categories = [...categories, ...categoryOverrides.added];
  }

  return categories;
};

// Utility function to get category display info (including deleted ones for existing expenses)
export const getCategoryDisplayInfo = (
  categoryId: string, 
  categoryOverrides?: {
    edited: { [categoryId: string]: { name: string; icon: string } };
    deleted: string[];
    added: Array<{ id: string; name: string; icon: string }>;
  }
) => {
  // First check if it's a custom added category
  if (categoryOverrides?.added) {
    const customCategory = categoryOverrides.added.find(cat => cat.id === categoryId);
    if (customCategory) {
      return { name: customCategory.name, icon: customCategory.icon, isDeleted: false };
    }
  }

  // Check if it's a base category
  const baseCategory = BASE_EXPENSE_CATEGORIES.find(cat => cat.id === categoryId);
  if (baseCategory) {
    // Check if it's edited
    const editedInfo = categoryOverrides?.edited[categoryId];
    const isDeleted = categoryOverrides?.deleted.includes(categoryId) || false;
    
    return {
      name: editedInfo?.name || baseCategory.name,
      icon: editedInfo?.icon || baseCategory.icon,
      isDeleted
    };
  }

  // Fallback for unknown categories
  return { name: categoryId, icon: '📋', isDeleted: false };
};

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
