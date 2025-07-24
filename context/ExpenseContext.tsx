import React, {createContext, useContext, useState, ReactNode, useEffect, useCallback} from 'react';
import {
  ExpenseData,
  ExpenseGroupData,
  ExpenseGroupWithDecryptedData,
  ExpenseWithDecryptedData,
  RecurringExpenseData,
  RecurringExpenseWithDecryptedData,
  GroupRefund,
} from '@/types/expense';
import { useAuth } from '@/context/AuthContext'; // Updated import path
import { useProfile } from '@/context/ProfileContext';
// Use services instead of direct client imports
import {
  apiCreateExpensesGroup,
  apiFetchExpenses,
  apiAddExpense,
  apiUpdateExpense,
  apiDeleteExpense,
  apiInviteUserToGroup,
  apiHandleGroupInvitation,
  apiUpdateExpenseGroup,
  apiRemoveUserFromGroup,
  apiAddRefund,
  apiUpdateRefund,
  apiDeleteRefund,
  apiBulkInsertAndUpdateExpenses,
} from '@/services/expenseService';
import {
  apiFetchRecurringExpenses,
  apiCreateRecurringExpense,
  apiUpdateRecurringExpense,
  apiDeleteRecurringExpense,
  apiProcessRecurringExpenses,
} from '@/services/recurringExpenseService';
import {useEncryption} from "@/context/EncryptionContext";
import { piggusApi } from '@/client/piggusApi';

interface ExpenseContextType {
  expensesGroups: ExpenseGroupWithDecryptedData[];
  recurringExpenses: RecurringExpenseWithDecryptedData[];
  isLoading: boolean;
  error: string | null;
  addExpense: (groupId: string, expense: ExpenseData) => Promise<ExpenseWithDecryptedData | null>;
  updateExpense: (
      groupId: string,
      expense: {
        created_at: string;
        data: ExpenseData;
        group_id: string;
        id: string;
        updated_at: string;
      }
  ) => Promise<ExpenseWithDecryptedData | null>;
  deleteExpense: (groupId: string, id: string) => Promise<void>;
  createExpensesGroup: (groupData: ExpenseGroupData) => Promise<void>;
  inviteUserToGroup: (
      groupId: string,
      username: string
  ) => Promise<{ success: boolean; error?: string }>;
  removeUserFromGroup: (
      groupId: string,
      userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateExpenseGroup: (
      groupId: string,
      groupData: ExpenseGroupData
  ) => Promise<ExpenseGroupWithDecryptedData | null>;
  handleGroupInvitation: (
      groupId: string,
      accept: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  getPendingInvitations: () => ExpenseGroupWithDecryptedData[];
  addRecurringExpense: (groupId: string, recurringExpense: RecurringExpenseData) => Promise<RecurringExpenseWithDecryptedData | null>;
  updateRecurringExpense: (
      groupId: string,
      recurringExpense: RecurringExpenseWithDecryptedData
  ) => Promise<RecurringExpenseWithDecryptedData | null>;
  deleteRecurringExpense: (groupId: string, id: string) => Promise<void>;
  addRefund: (
      groupId: string,
      refundData: Omit<GroupRefund, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<{ success: boolean; error?: string }>;
  updateRefund: (
      groupId: string,
      refundId: string,
      refundData: Partial<Omit<GroupRefund, 'id' | 'created_at'>>
  ) => Promise<{ success: boolean; error?: string }>;
  deleteRefund: (
      groupId: string,
      refundId: string
  ) => Promise<{ success: boolean; error?: string }>;
  bulkUpdateExpenses: (
      expenses: { id?: string; data: ExpenseData, group_id: string, group_key: string }[]
  ) => Promise<{ success: boolean; data?: ExpenseWithDecryptedData[]; error?: string }>;
  syncBankTransactions: (
      groupId?: string
  ) => Promise<{ success: boolean; addedCount: number; updatedCount: number; error?: string }>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { user, publicKey } = useAuth(); // Added encryptionInitialized
  const { isEncryptionInitialized, createEncryptionKey ,decryptWithPrivateKey, decryptWithExternalEncryptionKey, encryptWithExternalPublicKey, encryptWithExternalEncryptionKey } = useEncryption();
  const { userProfile } = useProfile();
  const [expensesGroups, setExpensesGroups] = useState<ExpenseGroupWithDecryptedData[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseWithDecryptedData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      if (!user || !isEncryptionInitialized || !userProfile) {
        console.error('User or private key not found, or encryption not initialized');
        setIsLoading(false);
        setError('User or private key not found, or encryption not initialized');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Fetch regular expenses
      const result = await apiFetchExpenses(user, decryptWithPrivateKey, decryptWithExternalEncryptionKey);
      if (result.success && result.data) {
        setExpensesGroups(result.data);

        // Fetch recurring expenses
        const recurringResult = await apiFetchRecurringExpenses(user, decryptWithPrivateKey, decryptWithExternalEncryptionKey);

        if (recurringResult.success && recurringResult.data) {
          setRecurringExpenses(recurringResult.data);

          // Process recurring expenses to generate any due expenses
          const groupMemberships = result.data.map(group => ({
            group_id: group.id,
            encrypted_group_key: group.encrypted_key,
          }));

          const processResult = await apiProcessRecurringExpenses(
            user,
            recurringResult.data,
            groupMemberships,
            decryptWithPrivateKey,
            encryptWithExternalEncryptionKey
          );

          if (processResult.success && processResult.generatedExpenses && processResult.generatedExpenses.length > 0) {
            // Update groups with new generated expenses
            setExpensesGroups(prev =>
              prev.map(group => {
                const newExpenses = processResult.generatedExpenses?.filter(exp => exp.group_id === group.id) || [];
                if (newExpenses.length > 0) {
                  return {
                    ...group,
                    expenses: [...newExpenses, ...group.expenses],
                  };
                }
                return group;
              })
            );

            // Update recurring expenses with new generation dates
            if (processResult.updatedRecurring) {
              setRecurringExpenses(prev =>
                prev.map(recurring => {
                  const updated = processResult.updatedRecurring?.find(upd => upd.id === recurring.id);
                  return updated || recurring;
                })
              );
            }
          }
        } else {
          setRecurringExpenses([]);
          console.error(recurringResult.error || 'Failed to load recurring expenses');
        }
      } else {
        setExpensesGroups([]);
        setRecurringExpenses([]);
        setError(result.error || 'Failed to load expense groups');
      }

      setIsLoading(false);
    } catch (e: any) {
      console.error('Failed to fetch expenses', e);
      setIsLoading(false);
      setError(`Failed to fetch expenses ${e.message || e?.toString()}`);
      return;
    }
  }, [user, isEncryptionInitialized, userProfile, decryptWithPrivateKey, decryptWithExternalEncryptionKey]);

  const createExpensesGroup = async (groupData: ExpenseGroupData) => {
    try {
      if (!user || !publicKey || !userProfile || !isEncryptionInitialized) {
        setError('You must be logged in to create an expense group');
        console.error('You must be logged in to create an expense group');
        return;
      }
      const result = await apiCreateExpensesGroup(user, userProfile.username, publicKey, createEncryptionKey, encryptWithExternalPublicKey, encryptWithExternalEncryptionKey, groupData);
      const newGroup = result.data;
      if (result.success && newGroup) {
        setExpensesGroups(prev => [...prev, newGroup]);
      } else {
        setError(result.error || 'Failed to create expense group');
      }
    } catch (error: any) {
      console.error('Failed to create expense group:', error);
      setError(error.message || 'Failed to create expense group');
    }
  };

  const addExpense = async (groupId: string, expense: ExpenseData) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to add an expense');
        setError('You must be logged in to add an expense');
        return null;
      }

      // Find the group
      const group = expensesGroups.find(g => g.id === groupId);
      if (!group) {
        console.error('Expense group not found');
        setError('Expense group not found');
        return null;
      }

      // Get the group key
      const groupKey = group.encrypted_key;
      if (!groupKey) {
        console.error('Could not access group key');
        setError('Could not access encryption key');
        return null;
      }

      const result = await apiAddExpense(user, groupId, groupKey, expense, decryptWithPrivateKey, encryptWithExternalEncryptionKey);
      const addedExpense = result.data;
      if (result.success && addedExpense) {
        // Add to local state
        setExpensesGroups(prev =>
            prev.map(group => {
              if (group.id === groupId) {
                return {
                  ...group,
                  expenses: [addedExpense, ...group.expenses],
                };
              }
              return group;
            })
        );
        return addedExpense;
      } else {
        setError(result.error || 'Failed to add expense');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to add expense:', error);
      setError(error.message || 'Failed to add expense');
      return null;
    }
  };

  const updateExpense = async (groupId: string, updatedExpense: ExpenseWithDecryptedData) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to update an expense');
        setError('You must be logged in to update an expense');
        return null;
      }

      // Find the group
      const group = expensesGroups.find(g => g.id === groupId);
      if (!group) {
        console.error('Expense group not found');
        setError('Expense group not found');
        return null;
      }

      // Get the group key
      const groupKey = group.encrypted_key;
      if (!groupKey) {
        console.error('Could not access group key');
        setError('Could not access encryption key');
        return null;
      }

      const result = await apiUpdateExpense(user, groupId, groupKey, updatedExpense, decryptWithPrivateKey, encryptWithExternalEncryptionKey);
      const changedExpense = result.data;
      if (changedExpense) {
        // Update in local state
        setExpensesGroups(prev =>
            prev.map(group => {
              if (group.id === groupId) {
                return {
                  ...group,
                  expenses: group.expenses.map(expense =>
                      expense.id === updatedExpense.id ? changedExpense : expense
                  ),
                };
              }
              return group;
            })
        );
        return changedExpense;
      } else {
        setError(result.error || 'Failed to update expense');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to update expense:', error);
      setError(error.message || 'Failed to update expense');
      return null;
    }
  };

  const deleteExpense = async (groupId: string, id: string) => {
    try {
      if (!user) {
        console.error('You must be logged in to delete an expense');
        setError('You must be logged in to delete an expense');
        return;
      }

      const result = await apiDeleteExpense(user, groupId, id);

      if (result) {
        // Remove from local state
        setExpensesGroups(prev =>
            prev.map(group => {
              if (group.id === groupId) {
                return {
                  ...group,
                  expenses: group.expenses.filter(expense => expense.id !== id),
                };
              }
              return group;
            })
        );
      } else {
        setError(result || 'Failed to delete expense');
      }
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      setError(error.message || 'Failed to delete expense');
    }
  };

  const inviteUserToGroup = async (groupId: string, username: string) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to invite a user');
        setError('You must be logged in to invite a user');
        return { success: false, error: 'Not authenticated' };
      }

      const result = await apiInviteUserToGroup(user, groupId, username, decryptWithPrivateKey, encryptWithExternalPublicKey);

      if (result.success) {
        // Refresh the groups list to get the updated members
        await fetchExpenses();
      }

      return result;
    } catch (error: any) {
      console.error('Failed to invite user to group:', error);
      setError(error.message || 'Failed to invite user');
      return { success: false, error: error.message || 'Failed to invite user' };
    }
  };

  const removeUserFromGroup = async (groupId: string, userId: string) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to remove a user');
        setError('You must be logged in to remove a user');
        return { success: false, error: 'Not authenticated' };
      }

      const result = await apiRemoveUserFromGroup(user, groupId, userId);

      if (result.success) {
        // Update local state to remove the user from the group
        setExpensesGroups(prev =>
            prev.map(group => {
              if (group.id === groupId) {
                return {
                  ...group,
                  members: group.members.filter(member => member.user_id !== userId),
                };
              }
              return group;
            })
        );
      } else {
        setError(result.error || 'Failed to remove user');
      }

      return result;
    } catch (error: any) {
      console.error('Failed to remove user from group:', error);
      setError(error.message || 'Failed to remove user');
      return { success: false, error: error.message || 'Failed to remove user' };
    }
  };

  const handleGroupInvitation = async (groupId: string, accept: boolean) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to handle an invitation');
        setError('You must be logged in to handle an invitation');
        return { success: false, error: 'Not authenticated' };
      }

      const result = await apiHandleGroupInvitation(user, groupId, accept);

      if (result.success) {
        // Update local state
        setExpensesGroups(prev => {
          if (accept) {
            return prev.map(group => {
              if (group.id === groupId) {
                return {
                  ...group,
                  membership_status: 'confirmed',
                  members: group.members.map(member =>
                      member.user_id === user.id ? { ...member, status: 'confirmed' } : member
                  ),
                };
              }
              return group;
            });
          } else {
            return prev.filter(group => group.id !== groupId);
          }
        });
      } else {
        setError(result.error || 'Failed to handle invitation');
      }

      return result;
    } catch (error: any) {
      console.error('Failed to handle group invitation:', error);
      setError(error.message || 'Failed to handle invitation');
      return { success: false, error: error.message || 'Failed to handle invitation' };
    }
  };

  const updateExpenseGroup = async (groupId: string, groupData: ExpenseGroupData) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to update a group');
        setError('You must be logged in to update a group');
        return null;
      }

      // Find the group
      const group = expensesGroups.find(g => g.id === groupId);
      if (!group) {
        console.error('Expense group not found');
        setError('Expense group not found');
        return null;
      }

      // Get the group key
      const encryptedKey = group.encrypted_key;
      if (!encryptedKey) {
        console.error('Could not access group key');
        setError('Could not access encryption key');
        return null;
      }

      const result = await apiUpdateExpenseGroup(user, groupId, encryptedKey, groupData, decryptWithPrivateKey, encryptWithExternalEncryptionKey);

      if (result.success && result.data) {
        // Update local state
        setExpensesGroups(prev =>
            prev.map(group => {
              if (group.id === groupId) {
                return result.data!;
              }
              return group;
            })
        );
        return result.data;
      } else {
        setError(result.error || 'Failed to update group');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to update group:', error);
      setError(error.message || 'Failed to update group');
      return null;
    }
  };

  const getPendingInvitations = () => {
    return expensesGroups.filter(group => group.membership_status === 'pending');
  };

  const addRecurringExpense = async (groupId: string, recurringExpense: RecurringExpenseData) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to add a recurring expense');
        setError('You must be logged in to add a recurring expense');
        return null;
      }

      // Find the group
      const group = expensesGroups.find(g => g.id === groupId);
      if (!group) {
        console.error('Expense group not found');
        setError('Expense group not found');
        return null;
      }

      // Get the group key
      const groupKey = group.encrypted_key;
      if (!groupKey) {
        console.error('Could not access group key');
        setError('Could not access encryption key');
        return null;
      }

      const result = await apiCreateRecurringExpense(user, groupId, groupKey, recurringExpense, decryptWithPrivateKey, encryptWithExternalEncryptionKey);
      const addedRecurringExpense = result.data;
      if (result.success && addedRecurringExpense) {
        // Add to local state
        setRecurringExpenses(prev => [addedRecurringExpense, ...prev]);
        return addedRecurringExpense;
      } else {
        setError(result.error || 'Failed to add recurring expense');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to add recurring expense:', error);
      setError(error.message || 'Failed to add recurring expense');
      return null;
    }
  };

  const updateRecurringExpense = async (groupId: string, updatedRecurringExpense: RecurringExpenseWithDecryptedData) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to update a recurring expense');
        setError('You must be logged in to update a recurring expense');
        return null;
      }

      // Find the group
      const group = expensesGroups.find(g => g.id === groupId);
      if (!group) {
        console.error('Expense group not found');
        setError('Expense group not found');
        return null;
      }

      // Get the group key
      const groupKey = group.encrypted_key;
      if (!groupKey) {
        console.error('Could not access group key');
        setError('Could not access encryption key');
        return null;
      }

      const result = await apiUpdateRecurringExpense(user, groupId, groupKey, updatedRecurringExpense, decryptWithPrivateKey, encryptWithExternalEncryptionKey);
      const changedRecurringExpense = result.data;
      if (result.success && changedRecurringExpense) {
        // Update in local state
        setRecurringExpenses(prev =>
          prev.map(recurringExpense =>
            recurringExpense.id === updatedRecurringExpense.id ? changedRecurringExpense : recurringExpense
          )
        );
        return changedRecurringExpense;
      } else {
        setError(result.error || 'Failed to update recurring expense');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to update recurring expense:', error);
      setError(error.message || 'Failed to update recurring expense');
      return null;
    }
  };

  const deleteRecurringExpense = async (groupId: string, id: string) => {
    try {
      if (!user) {
        console.error('You must be logged in to delete a recurring expense');
        setError('You must be logged in to delete a recurring expense');
        return;
      }

      const result = await apiDeleteRecurringExpense(user, groupId, id);

      if (result.success) {
        // Remove from local state
        setRecurringExpenses(prev => prev.filter(recurringExpense => recurringExpense.id !== id));
      } else {
        setError(result.error || 'Failed to delete recurring expense');
      }
    } catch (error: any) {
      console.error('Failed to delete recurring expense:', error);
      setError(error.message || 'Failed to delete recurring expense');
    }
  };

  const addRefund = async (
    groupId: string,
    refundData: Omit<GroupRefund, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to add a refund',
        };
      }

      const group = expensesGroups.find(g => g.id === groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found',
        };
      }

      const result = await apiAddRefund(
        user,
        groupId,
        group.encrypted_key,
        refundData,
        encryptWithExternalEncryptionKey,
        decryptWithExternalEncryptionKey
      );

      if (result.success && result.data) {
        // Update local state
        setExpensesGroups(prev =>
          prev.map(g => g.id === groupId ? { ...g, data: result.data!.data } : g)
        );
        return { success: true };
      } else {
        setError(result.error || 'Failed to add refund');
        return {
          success: false,
          error: result.error || 'Failed to add refund',
        };
      }
    } catch (error: any) {
      console.error('Failed to add refund:', error);
      const errorMessage = error.message || 'Failed to add refund';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const updateRefund = async (
    groupId: string,
    refundId: string,
    refundData: Partial<Omit<GroupRefund, 'id' | 'created_at'>>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to update a refund',
        };
      }

      const group = expensesGroups.find(g => g.id === groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found',
        };
      }

      const result = await apiUpdateRefund(
        user,
        groupId,
        group.encrypted_key,
        refundId,
        refundData,
        encryptWithExternalEncryptionKey,
        decryptWithExternalEncryptionKey
      );

      if (result.success && result.data) {
        // Update local state
        setExpensesGroups(prev =>
          prev.map(g => g.id === groupId ? { ...g, data: result.data!.data } : g)
        );
        return { success: true };
      } else {
        setError(result.error || 'Failed to update refund');
        return {
          success: false,
          error: result.error || 'Failed to update refund',
        };
      }
    } catch (error: any) {
      console.error('Failed to update refund:', error);
      const errorMessage = error.message || 'Failed to update refund';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const deleteRefund = async (
    groupId: string,
    refundId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!user) {
        return {
          success: false,
          error: 'You must be logged in to delete a refund',
        };
      }

      const group = expensesGroups.find(g => g.id === groupId);
      if (!group) {
        return {
          success: false,
          error: 'Group not found',
        };
      }

      const result = await apiDeleteRefund(
        user,
        groupId,
        group.encrypted_key,
        refundId,
        encryptWithExternalEncryptionKey,
        decryptWithExternalEncryptionKey
      );

      if (result.success && result.data) {
        // Update local state
        setExpensesGroups(prev =>
          prev.map(g => g.id === groupId ? { ...g, data: result.data!.data } : g)
        );
        return { success: true };
      } else {
        setError(result.error || 'Failed to delete refund');
        return {
          success: false,
          error: result.error || 'Failed to delete refund',
        };
      }
    } catch (error: any) {
      console.error('Failed to delete refund:', error);
      const errorMessage = error.message || 'Failed to delete refund';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const bulkUpdateExpenses = async (
      expenses: { id?: string; data: ExpenseData; group_id: string; group_key: string }[]
  ): Promise<{ success: boolean; data?: ExpenseWithDecryptedData[]; error?: string }> => {
    try {
      if (!user || !isEncryptionInitialized) {
        return {
          success: false,
          error: 'You must be logged in to bulk update expenses',
        };
      }

      const result = await apiBulkInsertAndUpdateExpenses(
        user,
        expenses,
        encryptWithExternalEncryptionKey
      );


      if (result.success && result.data) {
        // Update local state
        setExpensesGroups(prev =>
          prev.map(group => {
            const groupExpenses = result.data?.filter(exp => exp.group_id === group.id) || [];
            if (groupExpenses.length === 0) return group;

            const existingExpenses = [...group.expenses];
            const newExpenses: ExpenseWithDecryptedData[] = [];

            // Process the bulk update results
            groupExpenses.forEach(updatedExpense => {
              if (updatedExpense.id) {
                const existingIndex = existingExpenses.findIndex(exp => exp.id === updatedExpense.id);
                if (existingIndex >= 0) {
                  // Update existing expense
                  existingExpenses[existingIndex] = updatedExpense;
                } else {
                  // Add new expense
                  newExpenses.push(updatedExpense);
                }
              } else {
                // Add new expense without ID
                newExpenses.push(updatedExpense);
              }
            });

            return {
              ...group,
              expenses: [...newExpenses, ...existingExpenses],
            };
          })
        );
        return { success: true, data: result.data };
      } else {
        setError(result.error || 'Failed to bulk update expenses');
        return {
          success: false,
          error: result.error || 'Failed to bulk update expenses',
        };
      }
    } catch (error: any) {
      console.error('Failed to bulk update expenses:', error);
      const errorMessage = error.message || 'Failed to bulk update expenses';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const syncBankTransactions = async (
    groupId?: string
  ): Promise<{ success: boolean; addedCount: number; updatedCount: number; error?: string }> => {
    try {
      if (!user || !isEncryptionInitialized || !userProfile) {
        return {
          success: false,
          addedCount: 0,
          updatedCount: 0,
          error: 'User authentication or encryption not available',
        };
      }

      // Fetch bank transactions
      const accountsTransactions = await piggusApi.getBankTransactions();
      console.log('Bank transactions fetched:', accountsTransactions);

      // Check if we have any accounts
      if (!accountsTransactions || accountsTransactions.length === 0) {
        return {
          success: false,
          addedCount: 0,
          updatedCount: 0,
          error: 'No bank accounts found',
        };
      }

      // Initialize arrays for booked transactions
      let bookedTransactions: any[] = [];
      let allSkipped = true;

      // Process each account's transactions
      for (const accountData of accountsTransactions) {
        // Skip accounts that were skipped during fetching
        if (accountData.skipped) {
          console.log(`Skipped account ${accountData.accountId}: ${accountData.reason || 'No reason provided'}`);
          continue;
        }
        allSkipped = false;

        // Extract transactions if available
        if (accountData.transactions && accountData.transactions.transactions) {
          const accountBooked = accountData.transactions.transactions.booked || [];
          for (const transaction of accountBooked) {
            bookedTransactions.push({
              ...transaction,
              accountId: accountData.accountId,
            });
          }
        }
      }

      // Check if all accounts were skipped
      if (allSkipped) {
        const reasons = accountsTransactions
          .filter(account => account.skipped && account.reason)
          .map(account => account.reason)
          .join(', ');
        return {
          success: false,
          addedCount: 0,
          updatedCount: 0,
          error: `All accounts were skipped: ${reasons || 'No specific reasons provided'}`,
        };
      }

      // Convert Transaction objects to a format compatible with our app
      const allTransactions = [...bookedTransactions].map(transaction => ({
        id: transaction.transactionId || transaction.internalTransactionId || '',
        amount: parseFloat(transaction.transactionAmount.amount),
        currency: transaction.transactionAmount.currency,
        description: transaction.remittanceInformationUnstructured ||
                     transaction.remittanceInformationStructured ||
                     `${transaction.creditorName || transaction.debtorName || 'Unknown'} transaction`,
        date: transaction.bookingDate,
        category: transaction.merchantCategoryCode || 'other',
        accountId: transaction.accountId,
      }));

      if (!allTransactions || allTransactions.length === 0) {
        return {
          success: false,
          addedCount: 0,
          updatedCount: 0,
          error: 'No bank transactions found',
        };
      }

      // Get the target expense group
      const targetGroup = groupId
        ? expensesGroups.find(g => g.id === groupId)
        : expensesGroups[0]; // Use first group as default

      if (!targetGroup) {
        return {
          success: false,
          addedCount: 0,
          updatedCount: 0,
          error: 'No expense groups found. Please create a group first.',
        };
      }

      // Get all expenses from all groups for duplicate checking
      const allExpenses = expensesGroups.flatMap(group => group.expenses);

      // Prepare bulk operations
      const groupKeyMap = expensesGroups.reduce((acc, group) => {
        acc[group.id] = group.encrypted_key;
        return acc;
      }, {} as Record<string, string>);

      const bulkOperations: { id?: string; data: ExpenseData, group_id: string, group_key: string }[] = [];

      for (const transaction of allTransactions) {
        // Skip positive transactions, we only want expenses
        if (transaction.amount > 0) continue;

        // Use absolute value for negative amounts
        const expenseAmount = Math.abs(transaction.amount);

        // Check if this transaction already exists as an expense
        const existingExpense = allExpenses.find(expense =>
          expense.data.external_transaction_id === transaction.id
        );

        if (existingExpense) {
          // Skip updating expenses that are marked as deleted
          if (existingExpense.data.status === 'deleted') {
            continue;
          }

          // Update existing expense - create updated participants
          const updatedParticipants = existingExpense.data.participants.map(participant => {
            if (participant.user_id === user.id) {
              return {
                ...participant,
                share_amount: expenseAmount
              };
            }
            return participant;
          });

          bulkOperations.push({
            id: existingExpense.id,
            data: {
              ...existingExpense.data,
              amount: expenseAmount,
              description: transaction.description,
              date: transaction.date,
              category: transaction.category || existingExpense.data.category,
              currency: transaction.currency || existingExpense.data.currency,
              participants: updatedParticipants,
              // Preserve the status field to maintain any existing status like 'deleted'
              status: existingExpense.data.status
            },
            group_id: existingExpense.group_id,
            group_key: groupKeyMap[existingExpense.group_id],
          });
        } else {
          // Create new expense from transaction
          bulkOperations.push({
            data: {
              name: transaction.description,
              description: transaction.description,
              amount: expenseAmount,
              date: transaction.date,
              category: transaction.category || 'other',
              is_recurring: false,
              currency: transaction.currency,
              payer_user_id: user.id,
              payer_username: userProfile.username,
              participants: [
                {
                  user_id: user.id,
                  username: userProfile.username,
                  share_amount: expenseAmount
                }
              ],
              split_method: 'equal' as const,
              external_account_id: transaction.accountId,
              external_transaction_id: transaction.id,
            },
            group_id: targetGroup.id,
            group_key: groupKeyMap[targetGroup.id],
          });
        }
      }

      // Process bulk operations
      let addedCount = 0;
      let updatedCount = 0;

      if (bulkOperations.length > 0) {
        const result = await bulkUpdateExpenses(bulkOperations);

        if (result.success) {
          // Count added and updated expenses
          addedCount = bulkOperations.filter(op => !op.id).length;
          updatedCount = bulkOperations.filter(op => op.id).length;

          console.log(`Bulk operation completed: ${result.data?.length || 0} expenses processed`);
        } else {
          return {
            success: false,
            addedCount: 0,
            updatedCount: 0,
            error: result.error || 'Failed to process expenses in bulk',
          };
        }
      }

      return {
        success: true,
        addedCount,
        updatedCount,
      };
    } catch (error: any) {
      console.error('Error syncing bank transactions:', error);
      return {
        success: false,
        addedCount: 0,
        updatedCount: 0,
        error: error.message || 'Failed to sync bank transactions',
      };
    }
  };

  useEffect(() => {
    if (isEncryptionInitialized) {
      fetchExpenses().catch(error => console.error('Failed to fetch expenses:', error));
    }
  }, [user, userProfile, fetchExpenses, isEncryptionInitialized]);

  return (
      <ExpenseContext.Provider
          value={{
            expensesGroups,
            recurringExpenses,
            isLoading,
            error,
            addExpense,
            updateExpense,
            deleteExpense,
            createExpensesGroup,
            inviteUserToGroup,
            removeUserFromGroup,
            updateExpenseGroup,
            handleGroupInvitation,
            getPendingInvitations,
            addRecurringExpense,
            updateRecurringExpense,
            deleteRecurringExpense,
            addRefund,
            updateRefund,
            deleteRefund,
            bulkUpdateExpenses,
            syncBankTransactions,
          }}
      >
        {children}
      </ExpenseContext.Provider>
  );
}

export function useExpense() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpense must be used within an ExpenseProvider');
  }
  return context;
}
