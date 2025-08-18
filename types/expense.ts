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
  refunds?: GroupRefund[];
};

export type ExpenseGroupMember = {
  id: string;
  user_id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  encrypted_group_key: string;
  status: "confirmed" | "pending" | "rejected";
  username: string;
};

export type ExpenseGroupWithDecryptedData = {
  id: string;
  created_at: string;
  updated_at: string;
  data: ExpenseGroupData;
  membership_id?: string;
  membership_status?: "confirmed" | "pending" | "rejected";
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
export type GroupRefund = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
};

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
  recurring_expense_id?: string; // Reference to the recurring expense if this was auto-generated
  currency?: string;
  receipt_url?: string;
  status?: string;
  payer_user_id: string; // Who actually paid for this expense
  payer_username?: string; // Username of the payer (for display)
  participants: ExpenseParticipant[]; // Who shares this expense and their amounts
  split_method: "equal" | "custom"; // How the expense is split
  external_account_id?: string;
  external_transaction_id?: string;
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
  recurring_expense_id?: string;
  currency?: string;
  receipt_url?: string;
  status?: string;
  payer_user_id: string;
  payer_username?: string;
  participants: ExpenseParticipant[];
  split_method: "equal" | "custom";
};

// Recurring expense types
export type RecurringExpense = {
  id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  encrypted_data: RecurringExpenseData;
};

export type RecurringExpenseData = {
  name: string;
  description: string;
  amount: number;
  category: string;
  currency?: string;
  payer_user_id: string;
  payer_username?: string;
  participants: ExpenseParticipant[];
  split_method: "equal" | "custom";
  interval: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date?: string;
  next_due_date: string;
  should_generate_expenses?: boolean;
  last_generated_date?: string;
  is_active: boolean;
};

export type RecurringExpenseWithDecryptedData = {
  id: string;
  group_id: string;
  created_at: string;
  updated_at: string;
  data: RecurringExpenseData;
};

export type RecurringExpenseFormData = {
  name: string;
  description: string;
  amount: number;
  category: string;
  currency?: string;
  payer_user_id: string;
  payer_username?: string;
  participants: ExpenseParticipant[];
  split_method: "equal" | "custom";
  interval: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date?: string;
  is_active: boolean;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  icon: string;
  parent?: string; // If present, this is a subcategory
};

export const BASE_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "food", name: "Food & Dining", icon: "🍽️" },
  { id: "restaurants", name: "Restaurants", icon: "🍽️", parent: "food" },
  { id: "groceries", name: "Groceries", icon: "🛒", parent: "food" },
  { id: "transportation", name: "Transportation", icon: "🚗" },
  { id: "gas", name: "Gas & Fuel", icon: "⛽", parent: "transportation" },
  {
    id: "public_transport",
    name: "Public Transport",
    icon: "🚌",
    parent: "transportation",
  },
  { id: "housing", name: "Housing & Rent", icon: "🏠" },
  { id: "rent", name: "Rent", icon: "🏠", parent: "housing" },
  { id: "maintenance", name: "Maintenance", icon: "🔧", parent: "housing" },
  { id: "utilities", name: "Utilities", icon: "💡" },
  { id: "electricity", name: "Electricity", icon: "💡", parent: "utilities" },
  { id: "water", name: "Water", icon: "💧", parent: "utilities" },
  { id: "internet", name: "Internet", icon: "🌐", parent: "utilities" },
  { id: "entertainment", name: "Entertainment", icon: "🎬" },
  {
    id: "subscriptions",
    name: "Subscriptions",
    icon: "📱",
    parent: "entertainment",
  },
  { id: "movies", name: "Movies & Shows", icon: "🎬", parent: "entertainment" },
  { id: "shopping", name: "Shopping", icon: "🛍️" },
  { id: "clothing", name: "Clothing", icon: "👕", parent: "shopping" },
  { id: "electronics", name: "Electronics", icon: "📱", parent: "shopping" },
  { id: "health", name: "Health & Medical", icon: "⚕️" },
  { id: "doctor", name: "Doctor Visits", icon: "👨‍⚕️", parent: "health" },
  { id: "pharmacy", name: "Pharmacy", icon: "💊", parent: "health" },
  { id: "education", name: "Education", icon: "📚" },
  { id: "personal", name: "Personal Care", icon: "💄" },
  { id: "travel", name: "Travel", icon: "✈️" },
  { id: "gifts", name: "Gifts & Donations", icon: "🎁" },
  { id: "investments", name: "Investments", icon: "📈" },
  { id: "debt", name: "Debt Payments", icon: "💳" },
  { id: "insurance", name: "Insurance", icon: "🛡️" },
  { id: "taxes", name: "Taxes", icon: "📊" },
  { id: "other", name: "Other", icon: "📋" },
];

// Legacy support - will be computed from base categories + overrides
export const EXPENSE_CATEGORIES = BASE_EXPENSE_CATEGORIES.map((cat) => ({
  value: cat.id,
  label: cat.name,
}));

// Utility function to compute categories based on base categories and overrides
export const computeExpenseCategories = (categoryOverrides?: {
  edited: {
    [categoryId: string]: { name: string; icon: string; parent?: string };
  };
  deleted: string[];
  added: { id: string; name: string; icon: string; parent?: string }[];
}) => {
  let categories = [...BASE_EXPENSE_CATEGORIES];

  if (categoryOverrides) {
    // Apply edits
    categories = categories.map((cat) => {
      const override = categoryOverrides.edited[cat.id];
      return override
        ? {
            ...cat,
            name: override.name,
            icon: override.icon,
            parent: override.parent,
          }
        : cat;
    });

    // Remove deleted categories
    categories = categories.filter(
      (cat) => !categoryOverrides.deleted.includes(cat.id),
    );

    // Add new categories
    categories = [...categories, ...categoryOverrides.added];
  }

  return categories;
};

// Utility function to get only main categories (no parent)
export const getMainCategories = (
  categories: ExpenseCategory[],
): ExpenseCategory[] => {
  return categories.filter((cat) => !cat.parent);
};

// Utility function to get subcategories for a specific parent
export const getSubcategories = (
  categories: ExpenseCategory[],
  parentId: string,
): ExpenseCategory[] => {
  return categories.filter((cat) => cat.parent === parentId);
};

// Utility function to validate that a subcategory cannot be a child of another subcategory
export const validateCategoryHierarchy = (
  categories: ExpenseCategory[],
  categoryId: string,
  parentId?: string,
): boolean => {
  if (!parentId) return true; // Top-level categories are always valid

  const parentCategory = categories.find((cat) => cat.id === parentId);
  if (!parentCategory) return false; // Parent doesn't exist

  // Check if parent is already a subcategory
  return !parentCategory.parent; // Parent should not have a parent itself
};

// Utility function to get category display info (including deleted ones for existing expenses)
export const getCategoryDisplayInfo = (
  categoryId: string,
  categoryOverrides?: {
    edited: {
      [categoryId: string]: { name: string; icon: string; parent?: string };
    };
    deleted: string[];
    added: { id: string; name: string; icon: string; parent?: string }[];
  },
) => {
  // First check if it's a custom added category
  if (categoryOverrides?.added) {
    const customCategory = categoryOverrides.added.find(
      (cat) => cat.id === categoryId,
    );
    if (customCategory) {
      return {
        name: customCategory.name,
        icon: customCategory.icon,
        parent: customCategory.parent,
        isDeleted: false,
      };
    }
  }

  // Check if it's a base category
  const baseCategory = BASE_EXPENSE_CATEGORIES.find(
    (cat) => cat.id === categoryId,
  );
  if (baseCategory) {
    // Check if it's edited
    const editedInfo = categoryOverrides?.edited[categoryId];
    const isDeleted = categoryOverrides?.deleted.includes(categoryId) || false;

    return {
      name: editedInfo?.name || baseCategory.name,
      icon: editedInfo?.icon || baseCategory.icon,
      parent:
        editedInfo?.parent !== undefined
          ? editedInfo.parent
          : baseCategory.parent,
      isDeleted,
    };
  }

  // Fallback for unknown categories
  return { name: categoryId, icon: "📋", parent: undefined, isDeleted: false };
};

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_payment", label: "Mobile Payment" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

export const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "JPY", label: "JPY (¥)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "CHF", label: "CHF (Fr)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "INR", label: "INR (₹)" },
  { value: "BRL", label: "BRL (R$)" },
];

export const SPLIT_METHODS = [
  { value: "equal", label: "Split Equally" },
  { value: "custom", label: "Custom Amounts" },
];

// Utility functions for expense calculations
export const calculateEqualSplit = (
  amount: number,
  participantCount: number,
): number => {
  return Math.round((amount / participantCount) * 100) / 100;
};

export const calculateUserShare = (
  expense: ExpenseWithDecryptedData,
  userId: string,
): number => {
  const participant = expense.data.participants.find(
    (p) => p.user_id === userId,
  );
  return participant ? participant.share_amount : 0;
};

export const calculateUserBalance = (
  expenses: ExpenseWithDecryptedData[],
  userId: string,
): number => {
  let balance = 0;

  expenses.forEach((expense) => {
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
  members: ExpenseGroupMember[],
  refunds?: GroupRefund[],
): { [userId: string]: number } => {
  const balances: { [userId: string]: number } = {};

  // Initialize balances
  members.forEach((member) => {
    balances[member.user_id] = 0;
  });

  // Calculate balances from expenses
  expenses.forEach((expense) => {
    // Credit the payer
    if (balances.hasOwnProperty(expense.data.payer_user_id)) {
      balances[expense.data.payer_user_id] += expense.data.amount;
    }

    // Debit participants
    expense.data.participants.forEach((participant) => {
      if (balances.hasOwnProperty(participant.user_id)) {
        balances[participant.user_id] -= participant.share_amount;
      }
    });
  });

  // Apply refunds
  if (refunds) {
    refunds.forEach((refund) => {
      if (balances.hasOwnProperty(refund.from_user_id)) {
        balances[refund.from_user_id] += refund.amount;
      }
      if (balances.hasOwnProperty(refund.to_user_id)) {
        balances[refund.to_user_id] -= refund.amount;
      }
    });
  }

  // Round to 2 decimal places
  Object.keys(balances).forEach((userId) => {
    balances[userId] = Math.round(balances[userId] * 100) / 100;
  });

  return balances;
};

// Utility functions for recurring expenses
export const calculateNextDueDate = (
  interval: string,
  lastDate: string,
): string => {
  const date = new Date(lastDate);

  switch (interval) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid interval: ${interval}`);
  }

  return date.toISOString().split("T")[0];
};

export const isRecurringExpenseDue = (
  recurringExpense: RecurringExpenseWithDecryptedData,
): boolean => {
  if (!recurringExpense.data.is_active) return false;

  const today = new Date().toISOString().split("T")[0];
  const nextDueDate = recurringExpense.data.next_due_date;

  // Check if end date has passed
  if (
    recurringExpense.data.end_date &&
    today > recurringExpense.data.end_date
  ) {
    return false;
  }

  return today >= nextDueDate;
};
