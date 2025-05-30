import React, {createContext, useContext, useState, ReactNode, useEffect, useCallback} from 'react';
import {
  ExpenseData,
  ExpenseGroupData,
  ExpenseGroupWithDecryptedData,
  ExpenseWithDecryptedData,
} from '@/types/expense';
import { useAuth } from '@/context/AuthContext'; // Updated import path
import { useProfile } from '@/context/ProfileContext';
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
} from '@/client/expense';
import {useEncryption} from "@/context/EncryptionContext";

interface ExpenseContextType {
  expensesGroups: ExpenseGroupWithDecryptedData[];
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
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { user, publicKey } = useAuth(); // Added encryptionInitialized
  const { isEncryptionInitialized, decryptWithPrivateKey, decryptWithExternalEncryptionKey, encryptWithExternalPublicKey, encryptWithExternalEncryptionKey } = useEncryption();
  const { userProfile } = useProfile();
  const [expensesGroups, setExpensesGroups] = useState<ExpenseGroupWithDecryptedData[]>([]);
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

      const result = await apiFetchExpenses(user, decryptWithPrivateKey, decryptWithExternalEncryptionKey);

      if (result.success && result.data) {
        setExpensesGroups(result.data);
      } else {
        setExpensesGroups([]);
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
      const result = await apiCreateExpensesGroup(user, userProfile.username, publicKey, encryptWithExternalPublicKey, groupData);
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
      if (result.success && changedExpense) {
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

      if (result.success) {
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
        setError(result.error || 'Failed to delete expense');
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
      } else {
        setError(result.error || 'Failed to invite user');
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

  useEffect(() => {
    if (isEncryptionInitialized) {
      fetchExpenses().catch(error => console.error('Failed to fetch expenses:', error));
    }
  }, [user, userProfile, fetchExpenses, isEncryptionInitialized]);

  return (
      <ExpenseContext.Provider
          value={{
            expensesGroups,
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
