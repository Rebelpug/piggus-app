import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import {
  RecurringExpenseData,
  RecurringExpenseWithDecryptedData,
  ExpenseData,
  ExpenseWithDecryptedData,
  calculateNextDueDate,
  isRecurringExpenseDue,
} from '@/types/expense';
import { User } from '@supabase/supabase-js';

export const apiFetchRecurringExpenses = async (
    user: User,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    decryptWithExternalEncryptionKey: (encryptionKey: string, encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: RecurringExpenseWithDecryptedData[]; error?: string }> => {
  try {
    if (!user || !decryptWithExternalEncryptionKey || !decryptWithPrivateKey) {
      console.error('User credentials are invalid');
      return {
        success: false,
        error: 'User credentials are invalid',
      };
    }

    // Get all group memberships for the user
    const { data: memberships, error: membershipError } = await supabase
        .from('expenses_group_memberships')
        .select('group_id, encrypted_group_key')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');

    if (membershipError) {
      console.error('Error fetching expense group memberships:', membershipError);
      return {
        success: false,
        error: membershipError.message || 'Failed to load expense groups membership',
      };
    }

    if (!memberships || memberships.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const groupIds = memberships.map(m => m.group_id);

    // Fetch all recurring expenses for these groups
    const { data: recurringExpenses, error: recurringError } = await supabase
        .from('recurring_expenses')
        .select('*')
        .in('group_id', groupIds);

    if (recurringError) {
      console.error('Error fetching recurring expenses:', recurringError);
      return {
        success: false,
        error: recurringError.message || 'Failed to load recurring expenses',
      };
    }

    if (!recurringExpenses) {
      return {
        success: true,
        data: [],
      };
    }

    // Decrypt each recurring expense
    const decryptedRecurringExpenses = await Promise.all(
        recurringExpenses.map(async recurringExpense => {
          try {
            // Find the corresponding membership to get the group key
            const membership = memberships.find(m => m.group_id === recurringExpense.group_id);
            if (!membership) {
              console.error('No membership found for group:', recurringExpense.group_id);
              return null;
            }

            // Decrypt the group key with the user's private key
            const decryptedGroupKey = await decryptWithPrivateKey(membership.encrypted_group_key);
            const groupKeyString = typeof decryptedGroupKey === 'string' ? decryptedGroupKey : JSON.stringify(decryptedGroupKey);

            // Decrypt the recurring expense data
            const decryptedData = await decryptWithExternalEncryptionKey(groupKeyString, recurringExpense.encrypted_data);

            return {
              id: recurringExpense.id,
              group_id: recurringExpense.group_id,
              created_at: recurringExpense.created_at,
              updated_at: recurringExpense.updated_at,
              data: decryptedData,
            };
          } catch (error) {
            console.error('Error processing recurring expense:', recurringExpense.id, error);
            return null;
          }
        })
    );

    return {
      success: true,
      data: decryptedRecurringExpenses.filter(Boolean) as RecurringExpenseWithDecryptedData[],
    };
  } catch (error: any) {
    console.error('Failed to fetch recurring expenses:', error);
    return {
      success: false,
      error: error.message || 'Failed to load recurring expenses',
    };
  }
};

export const apiCreateRecurringExpense = async (
    user: User,
    groupId: string,
    encryptedGroupKey: string,
    recurringExpenseData: RecurringExpenseData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: RecurringExpenseWithDecryptedData; error?: string }> => {
  try {
    if (!user || !decryptWithPrivateKey || !groupId) {
      console.error('You must be logged in and have access to this expense group');
      return {
        success: false,
        error: 'You must be logged in and have access to this expense group',
      };
    }

    // First decrypt the group key using the private key
    const groupKey = await decryptWithPrivateKey(encryptedGroupKey);
    const groupKeyString = typeof groupKey === 'string' ? groupKey : JSON.stringify(groupKey);
    
    // Encrypt the recurring expense data with the group key
    const encryptedData = await encryptWithExternalEncryptionKey(groupKeyString, recurringExpenseData);

    // Generate a unique ID for the new recurring expense
    const newRecurringExpenseId = uuidv4();

    // Save to database
    const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
          id: newRecurringExpenseId,
          group_id: groupId,
          encrypted_data: encryptedData,
        })
        .select()
        .single();

    if (error) {
      console.error('Failed to add recurring expense:', error);
      return {
        success: false,
        error: error.message || 'Failed to add recurring expense',
      };
    }

    const addedRecurringExpense = {
      id: newRecurringExpenseId,
      group_id: groupId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: recurringExpenseData,
    };

    return {
      success: true,
      data: addedRecurringExpense,
    };
  } catch (e: any) {
    console.error('Failed to add recurring expense:', e);
    return {
      success: false,
      error: e.message || 'Failed to add recurring expense',
    };
  }
};

export const apiUpdateRecurringExpense = async (
    user: User,
    groupId: string,
    encryptedGroupKey: string,
    updatedRecurringExpense: RecurringExpenseWithDecryptedData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: RecurringExpenseWithDecryptedData; error?: string }> => {
  try {
    if (!user || !decryptWithPrivateKey || !groupId || !encryptWithExternalEncryptionKey) {
      console.error('You must be logged in and have access to this expense group');
      return {
        success: false,
        error: 'You must be logged in and have access to this expense group',
      };
    }

    // First decrypt the group key using the private key
    const groupKey = await decryptWithPrivateKey(encryptedGroupKey);
    const groupKeyString = typeof groupKey === 'string' ? groupKey : JSON.stringify(groupKey);
    
    // Encrypt the recurring expense data with the group key
    const encryptedData = await encryptWithExternalEncryptionKey(groupKeyString, updatedRecurringExpense.data);

    // Update in database
    const { error } = await supabase
        .from('recurring_expenses')
        .update({
          encrypted_data: encryptedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedRecurringExpense.id)
        .eq('group_id', groupId);

    if (error) {
      console.error('Failed to update recurring expense:', error);
      return {
        success: false,
        error: error.message || 'Failed to update recurring expense',
      };
    }

    return {
      success: true,
      data: updatedRecurringExpense,
    };
  } catch (e: any) {
    console.error('Failed to update recurring expense:', e);
    return {
      success: false,
      error: e.message || 'Failed to update recurring expense',
    };
  }
};

export const apiDeleteRecurringExpense = async (
    user: User,
    groupId: string,
    recurringExpenseId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !groupId) {
      console.error('You must be logged in and have access to this expense group');
      return {
        success: false,
        error: 'You must be logged in and have access to this expense group',
      };
    }

    // Delete from database
    const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', recurringExpenseId)
        .eq('group_id', groupId);

    if (error) {
      console.error('Failed to delete recurring expense:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete recurring expense',
      };
    }

    return {
      success: true,
    };
  } catch (e: any) {
    console.error('Failed to delete recurring expense:', e);
    return {
      success: false,
      error: e.message || 'Failed to delete recurring expense',
    };
  }
};

export const apiGenerateExpenseFromRecurring = async (
    user: User,
    groupId: string,
    encryptedGroupKey: string,
    recurringExpense: RecurringExpenseWithDecryptedData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: { expense: ExpenseWithDecryptedData; updatedRecurring: RecurringExpenseWithDecryptedData }; error?: string }> => {
  try {
    if (!user || !decryptWithPrivateKey || !groupId) {
      console.error('You must be logged in and have access to this expense group');
      return {
        success: false,
        error: 'You must be logged in and have access to this expense group',
      };
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Create expense data from recurring expense
    const expenseData: ExpenseData = {
      name: recurringExpense.data.name,
      description: recurringExpense.data.description,
      amount: recurringExpense.data.amount,
      date: today,
      category: recurringExpense.data.category,
      is_recurring: false,
      recurring_expense_id: recurringExpense.id,
      currency: recurringExpense.data.currency,
      payer_user_id: recurringExpense.data.payer_user_id,
      payer_username: recurringExpense.data.payer_username,
      participants: recurringExpense.data.participants,
      split_method: recurringExpense.data.split_method,
    };

    // First decrypt the group key using the private key
    const groupKey = await decryptWithPrivateKey(encryptedGroupKey);
    const groupKeyString = typeof groupKey === 'string' ? groupKey : JSON.stringify(groupKey);
    
    // Encrypt the expense data with the group key
    const encryptedExpenseData = await encryptWithExternalEncryptionKey(groupKeyString, expenseData);

    // Generate a unique ID for the new expense
    const newExpenseId = uuidv4();

    // Save expense to database
    const { data: expenseResult, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          id: newExpenseId,
          group_id: groupId,
          encrypted_data: encryptedExpenseData,
        })
        .select()
        .single();

    if (expenseError) {
      console.error('Failed to generate expense from recurring:', expenseError);
      return {
        success: false,
        error: expenseError.message || 'Failed to generate expense from recurring',
      };
    }

    // Update recurring expense with new next due date and last generated date
    const updatedRecurringData = {
      ...recurringExpense.data,
      last_generated_date: today,
      next_due_date: calculateNextDueDate(recurringExpense.data.interval, today),
    };

    const encryptedRecurringData = await encryptWithExternalEncryptionKey(groupKeyString, updatedRecurringData);

    // Update recurring expense in database
    const { error: recurringUpdateError } = await supabase
        .from('recurring_expenses')
        .update({
          encrypted_data: encryptedRecurringData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recurringExpense.id)
        .eq('group_id', groupId);

    if (recurringUpdateError) {
      console.error('Failed to update recurring expense after generation:', recurringUpdateError);
      // Note: We don't return error here as the expense was created successfully
    }

    const generatedExpense: ExpenseWithDecryptedData = {
      id: newExpenseId,
      group_id: groupId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: expenseData,
    };

    const updatedRecurringExpense: RecurringExpenseWithDecryptedData = {
      ...recurringExpense,
      data: updatedRecurringData,
      updated_at: new Date().toISOString(),
    };

    return {
      success: true,
      data: {
        expense: generatedExpense,
        updatedRecurring: updatedRecurringExpense,
      },
    };
  } catch (e: any) {
    console.error('Failed to generate expense from recurring:', e);
    return {
      success: false,
      error: e.message || 'Failed to generate expense from recurring',
    };
  }
};

export const apiProcessRecurringExpenses = async (
    user: User,
    recurringExpenses: RecurringExpenseWithDecryptedData[],
    groupMemberships: { group_id: string; encrypted_group_key: string }[],
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; generatedExpenses?: ExpenseWithDecryptedData[]; updatedRecurring?: RecurringExpenseWithDecryptedData[]; error?: string }> => {
  try {
    const generatedExpenses: ExpenseWithDecryptedData[] = [];
    const updatedRecurringExpenses: RecurringExpenseWithDecryptedData[] = [];

    for (const recurringExpense of recurringExpenses) {
      if (isRecurringExpenseDue(recurringExpense)) {
        const membership = groupMemberships.find(m => m.group_id === recurringExpense.group_id);
        if (!membership) {
          console.error('No membership found for group:', recurringExpense.group_id);
          continue;
        }

        const result = await apiGenerateExpenseFromRecurring(
            user,
            recurringExpense.group_id,
            membership.encrypted_group_key,
            recurringExpense,
            decryptWithPrivateKey,
            encryptWithExternalEncryptionKey
        );

        if (result.success && result.data) {
          generatedExpenses.push(result.data.expense);
          updatedRecurringExpenses.push(result.data.updatedRecurring);
        }
      }
    }

    return {
      success: true,
      generatedExpenses,
      updatedRecurring: updatedRecurringExpenses,
    };
  } catch (error: any) {
    console.error('Failed to process recurring expenses:', error);
    return {
      success: false,
      error: error.message || 'Failed to process recurring expenses',
    };
  }
};