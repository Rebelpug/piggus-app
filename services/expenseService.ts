import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';
import { piggusApi } from '@/client/piggusApi';
import {
  ExpenseData,
  ExpenseGroupData,
  ExpenseGroupWithDecryptedData,
  ExpenseWithDecryptedData,
  GroupRefund,
  ExpenseParticipant,
  calculateEqualSplit,
} from '@/types/expense';
import { User } from '@supabase/supabase-js';

// Expense service functions that bridge the old client API with piggusApi

export const apiFetchExpenses = async (
    user: User,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    decryptWithExternalEncryptionKey: (encryptionKey: string, encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: ExpenseGroupWithDecryptedData[]; error?: string }> => {
  try {
    if (!user || !decryptWithExternalEncryptionKey || !decryptWithPrivateKey) {
      console.error('User credentials are invalid');
      return {
        success: false,
        error: 'User credentials are invalid',
      };
    }

    const memberships = await piggusApi.getExpenseGroups();

    if (!memberships) {
      return {
        success: true,
        data: [],
      };
    }

    const decryptedGroups = await Promise.all(
        memberships.map(async membership => {
          try {
            const group = membership.expenses_groups;
            // Decrypt the group key with the user's private key
            const decryptedGroupKey = await decryptWithPrivateKey(membership.encrypted_group_key);
            // Ensure the decrypted key is a string (base64)
            const groupKeyString = typeof decryptedGroupKey === 'string' ? decryptedGroupKey : JSON.stringify(decryptedGroupKey);
            // Validate that this looks like a base64 string
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(groupKeyString)) {
              console.error('Decrypted group key does not appear to be valid base64:', groupKeyString.substring(0, 50));
              throw new Error('Invalid group key format');
            }
            // Now decrypt the group data using the decrypted group key
            const decryptedExpenseGroupData = await decryptWithExternalEncryptionKey(groupKeyString, group.encrypted_data);

            // Get full group data including expenses and members
            const fullGroupData = await piggusApi.getExpenseGroup(group.id);

            const decryptedExpenses = await Promise.all(
                fullGroupData.expenses.map(async expense => ({
                  ...expense,
                  data: await decryptWithExternalEncryptionKey(groupKeyString, expense.encrypted_data),
                }))
            );

            // Map members with their usernames (would need to be fetched from profiles if needed)
            const membersWithProfiles = fullGroupData.members.map(member => ({
              ...member,
              username: member.username || ''
            }));

            return {
              id: group.id,
              data: decryptedExpenseGroupData,
              expenses: decryptedExpenses,
              members: membersWithProfiles,
              membership_status: membership.status,
              encrypted_key: groupKeyString,
              created_at: group.created_at,
              updated_at: group.updated_at,
            } as ExpenseGroupWithDecryptedData;
          } catch (error: any) {
            console.error('Error decrypting group:', error);
            throw error;
          }
        })
    );

    return {
      success: true,
      data: decryptedGroups,
    };
  } catch (error: any) {
    console.error('Error fetching expense groups:', error);
    return {
      success: false,
      error: error.message || 'Failed to load expense groups',
    };
  }
};

export const apiCreateExpensesGroup = async (
    user: User,
    username: string,
    publicKey: string,
    createEncryptionKey: () => Promise<Uint8Array<ArrayBufferLike>>,
    encryptWithExternalPublicKey: (publicKey: string, data: any) => Promise<string>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
    groupData: ExpenseGroupData
): Promise<{ success: boolean; data?: ExpenseGroupWithDecryptedData; error?: string }> => {
  try {
    if (!user || !publicKey || !username) {
      return {
        success: false,
        error: 'User credentials are invalid',
      };
    }

    const groupId = uuidv4();
    const encryptionKey = await createEncryptionKey();

    // Convert encryption key to base64 for storage and transmission
    const encryptionKeyBase64 = Buffer.from(encryptionKey).toString('base64');

    // Encrypt the group data
    const encryptedGroupData = await encryptWithExternalEncryptionKey(encryptionKeyBase64, groupData);

    // Encrypt the group key for the user
    const encryptedGroupKey = await encryptWithExternalPublicKey(publicKey, encryptionKeyBase64);

    const membership = await piggusApi.createExpenseGroup({
      groupId,
      encryptedData: encryptedGroupData,
      encryptedGroupKey,
    });

    // Return the created group in the expected format
    return {
      success: true,
      data: {
        id: groupId,
        data: groupData,
        expenses: [],
        members: [{
          ...membership,
          username,
        }],
        membership_status: membership.status,
        encrypted_key: encryptionKeyBase64,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as ExpenseGroupWithDecryptedData,
    };
  } catch (error: any) {
    console.error('Error creating expense group:', error);
    return {
      success: false,
      error: error.message || 'Failed to create expense group',
    };
  }
};

export const apiAddExpense = async (
    user: User,
    groupId: string,
    groupKey: string,
    expenseData: ExpenseData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>
): Promise<{ success: boolean; data?: ExpenseWithDecryptedData; error?: string }> => {
  try {
    if (!user || !groupId || !groupKey || !expenseData) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    const expenseId = uuidv4();
    const encryptedData = await encryptWithExternalEncryptionKey(groupKey, expenseData);

    const expense = await piggusApi.addExpense(groupId, {
      expenseId,
      encryptedData,
    });

    return {
      success: true,
      data: {
        ...expense,
        data: expenseData,
      } as ExpenseWithDecryptedData,
    };
  } catch (error: any) {
    console.error('Error adding expense:', error);
    return {
      success: false,
      error: error.message || 'Failed to add expense',
    };
  }
};

export const apiUpdateExpense = async (
    user: User,
    groupId: string,
    groupKey: string,
    updatedExpense: ExpenseWithDecryptedData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>
): Promise<{ success: boolean; data?: ExpenseWithDecryptedData; error?: string }> => {
  try {
    if (!user || !groupId || !groupKey || !updatedExpense) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    const encryptedData = await encryptWithExternalEncryptionKey(groupKey, updatedExpense.data);

    const expense = await piggusApi.updateExpense(groupId, updatedExpense.id, {
      encryptedData,
    });

    return {
      success: true,
      data: {
        ...expense,
        data: updatedExpense.data,
      } as ExpenseWithDecryptedData,
    };
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return {
      success: false,
      error: error.message || 'Failed to update expense',
    };
  }
};

export const apiDeleteExpense = async (
    user: User,
    groupId: string,
    expenseId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !groupId || !expenseId) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    const result = await piggusApi.deleteExpense(groupId, expenseId);
    return {
      success: result.success,
    };
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete expense',
    };
  }
};

export const apiInviteUserToGroup = async (
    user: User,
    groupId: string,
    username: string,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalPublicKey: (publicKey: string, data: any) => Promise<string>
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !groupId || !username) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    // 1. Find target user by username and get their public key
    const targetUsers = await piggusApi.searchProfiles(username, 1);
    if (!targetUsers || targetUsers.length === 0) {
      return {
        success: false,
        error: 'User not found',
      };
    }
    const targetUser = targetUsers[0];

    if (!targetUser.encryption_public_key) {
      return {
        success: false,
        error: 'Target user has no public key',
      };
    }

    // 2. Get the current user's group membership to retrieve their encrypted group key
    const groupMemberships = await piggusApi.getExpenseGroups();
    const userMembership = groupMemberships.find(membership =>
      membership.expenses_groups.id === groupId && membership.user_id === user.id
    );

    if (!userMembership) {
      return {
        success: false,
        error: 'You are not a member of this group',
      };
    }

    // 3. Decrypt the group key with the current user's private key
    const groupKey = await decryptWithPrivateKey(userMembership.encrypted_group_key);
    const groupKeyString = typeof groupKey === 'string' ? groupKey : JSON.stringify(groupKey);

    // Validate that this looks like a base64 string
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(groupKeyString)) {
      console.error('Decrypted group key does not appear to be valid base64:', groupKeyString.substring(0, 50));
      return {
        success: false,
        error: 'Invalid group key format'
      };
    }

    // 4. Re-encrypt the group key with the target user's public key
    const encryptedGroupKeyForNewUser = await encryptWithExternalPublicKey(
      targetUser.encryption_public_key,
      groupKeyString
    );

    // 5. Send the invitation with the properly encrypted group key
    await piggusApi.inviteToExpenseGroup(groupId, {
      username,
      encryptedGroupKey: encryptedGroupKeyForNewUser,
    });

    return { success: true };

  } catch (error: any) {
    console.error('Error inviting user to group:', error);
    return {
      success: false,
      error: error.message || 'Failed to invite user',
    };
  }
};

export const apiHandleGroupInvitation = async (
    user: User,
    groupId: string,
    accept: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !groupId) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    const result = await piggusApi.handleExpenseGroupInvite(groupId, { accept });
    return {
      success: result.success,
    };
  } catch (error: any) {
    console.error('Error handling group invitation:', error);
    return {
      success: false,
      error: error.message || 'Failed to handle invitation',
    };
  }
};

export const apiUpdateExpenseGroup = async (
    user: User,
    groupId: string,
    encryptedKey: string,
    groupData: ExpenseGroupData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>
): Promise<{ success: boolean; data?: ExpenseGroupWithDecryptedData; error?: string }> => {
  try {
    if (!user || !groupId || !encryptedKey || !groupData) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    const encryptedData = await encryptWithExternalEncryptionKey(encryptedKey, groupData);

    const updatedGroup = await piggusApi.updateExpenseGroup(groupId, {
      encryptedData,
    });

    return {
      success: true,
      data: {
        id: updatedGroup.id,
        data: groupData,
        expenses: [],
        members: [],
        membership_status: 'confirmed',
        encrypted_key: encryptedKey,
        created_at: updatedGroup.created_at,
        updated_at: updatedGroup.updated_at,
      } as ExpenseGroupWithDecryptedData,
    };
  } catch (error: any) {
    console.error('Error updating expense group:', error);
    return {
      success: false,
      error: error.message || 'Failed to update expense group',
    };
  }
};

export const apiRemoveUserFromGroup = async (
    user: User,
    groupId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !groupId || !userId) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    const result = await piggusApi.removeExpenseGroupMember(groupId, userId);
    return {
      success: result.success,
    };
  } catch (error: any) {
    console.error('Error removing user from group:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove user from group',
    };
  }
};

export const apiAddRefund = async (
    user: User,
    groupId: string,
    encryptedKey: string,
    refundData: Omit<GroupRefund, 'id' | 'created_at' | 'updated_at'>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
    decryptWithExternalEncryptionKey: (encryptionKey: string, encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: ExpenseGroupWithDecryptedData; error?: string }> => {
  try {
    if (!user || !groupId || !encryptedKey || !refundData) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    // Get current group data
    const groupData = await piggusApi.getExpenseGroup(groupId);
    const decryptedGroupData = await decryptWithExternalEncryptionKey(encryptedKey, groupData.encrypted_data);

    // Create new refund with ID and timestamps
    const newRefund: GroupRefund = {
      ...refundData,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add refund to group data
    const updatedGroupData = {
      ...decryptedGroupData,
      refunds: [...(decryptedGroupData.refunds || []), newRefund],
    };

    // Encrypt and update group
    const encryptedData = await encryptWithExternalEncryptionKey(encryptedKey, updatedGroupData);
    await piggusApi.updateExpenseGroup(groupId, { encryptedData });

    return {
      success: true,
      data: {
        ...groupData,
        data: updatedGroupData,
      } as ExpenseGroupWithDecryptedData,
    };
  } catch (error: any) {
    console.error('Error adding refund:', error);
    return {
      success: false,
      error: error.message || 'Failed to add refund',
    };
  }
};

export const apiUpdateRefund = async (
    user: User,
    groupId: string,
    encryptedKey: string,
    refundId: string,
    refundData: Partial<Omit<GroupRefund, 'id' | 'created_at'>>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
    decryptWithExternalEncryptionKey: (encryptionKey: string, encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: ExpenseGroupWithDecryptedData; error?: string }> => {
  try {
    if (!user || !groupId || !encryptedKey || !refundId || !refundData) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    // Get current group data
    const groupData = await piggusApi.getExpenseGroup(groupId);
    const decryptedGroupData = await decryptWithExternalEncryptionKey(encryptedKey, groupData.encrypted_data);

    // Find and update the refund
    const refundIndex = decryptedGroupData.refunds?.findIndex((r: GroupRefund) => r.id === refundId) ?? -1;
    if (refundIndex === -1) {
      return {
        success: false,
        error: 'Refund not found',
      };
    }

    const updatedRefunds = [...(decryptedGroupData.refunds || [])];
    updatedRefunds[refundIndex] = {
      ...updatedRefunds[refundIndex],
      ...refundData,
      updated_at: new Date().toISOString(),
    };

    // Update group data
    const updatedGroupData = {
      ...decryptedGroupData,
      refunds: updatedRefunds,
    };

    // Encrypt and update group
    const encryptedData = await encryptWithExternalEncryptionKey(encryptedKey, updatedGroupData);
    await piggusApi.updateExpenseGroup(groupId, { encryptedData });

    return {
      success: true,
      data: {
        ...groupData,
        data: updatedGroupData,
      } as ExpenseGroupWithDecryptedData,
    };
  } catch (error: any) {
    console.error('Error updating refund:', error);
    return {
      success: false,
      error: error.message || 'Failed to update refund',
    };
  }
};

export const apiDeleteRefund = async (
    user: User,
    groupId: string,
    encryptedKey: string,
    refundId: string,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
    decryptWithExternalEncryptionKey: (encryptionKey: string, encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: ExpenseGroupWithDecryptedData; error?: string }> => {
  try {
    if (!user || !groupId || !encryptedKey || !refundId) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    // Get current group data
    const groupData = await piggusApi.getExpenseGroup(groupId);
    const decryptedGroupData = await decryptWithExternalEncryptionKey(encryptedKey, groupData.encrypted_data);

    // Remove the refund
    const updatedRefunds = (decryptedGroupData.refunds || []).filter((r: GroupRefund) => r.id !== refundId);

    // Update group data
    const updatedGroupData = {
      ...decryptedGroupData,
      refunds: updatedRefunds,
    };

    // Encrypt and update group
    const encryptedData = await encryptWithExternalEncryptionKey(encryptedKey, updatedGroupData);
    await piggusApi.updateExpenseGroup(groupId, { encryptedData });

    return {
      success: true,
      data: {
        ...groupData,
        data: updatedGroupData,
      } as ExpenseGroupWithDecryptedData,
    };
  } catch (error: any) {
    console.error('Error deleting refund:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete refund',
    };
  }
};

export const apiMoveExpense = async (
    user: User,
    expenseId: string,
    fromGroupId: string,
    toGroupId: string,
    fromGroupKey: string,
    toGroupKey: string,
    updatedExpenseData: ExpenseData,
    decryptWithExternalEncryptionKey: (encryptionKey: string, encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>
): Promise<{ success: boolean; data?: ExpenseWithDecryptedData; error?: string }> => {
  try {
    if (!user || !expenseId || !fromGroupId || !toGroupId || !fromGroupKey || !toGroupKey || !updatedExpenseData) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    // First, delete the expense from the original group
    const deleteResult = await piggusApi.deleteExpense(fromGroupId, expenseId);
    if (!deleteResult.success) {
      return {
        success: false,
        error: 'Failed to remove expense from original group',
      };
    }

    // Then, add the expense to the new group with updated data
    const newExpenseId = uuidv4();
    const encryptedData = await encryptWithExternalEncryptionKey(toGroupKey, updatedExpenseData);

    const newExpense = await piggusApi.addExpense(toGroupId, {
      expenseId: newExpenseId,
      encryptedData,
    });

    return {
      success: true,
      data: {
        ...newExpense,
        data: updatedExpenseData,
      } as ExpenseWithDecryptedData,
    };
  } catch (error: any) {
    console.error('Error moving expense:', error);
    return {
      success: false,
      error: error.message || 'Failed to move expense',
    };
  }
};

export const apiBulkInsertAndUpdateExpenses = async (
    user: User,
    expenses: { id?: string; data: ExpenseData, group_id: string, group_key: string }[],
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>
): Promise<{ success: boolean; data?: ExpenseWithDecryptedData[]; error?: string }> => {
  try {
    if (!user || !expenses || !Array.isArray(expenses)) {
      return {
        success: false,
        error: 'Invalid parameters',
      };
    }

    const encryptedExpenses = await Promise.all(expenses.map(async expense => {
      const expenseId = expense.id || uuidv4();
      const encryptedData = await encryptWithExternalEncryptionKey(expense.group_key, expense.data);
      return {
        expenseId,
        encryptedData,
        originalData: expense.data,
        isNew: !expense.id,
        group_id: expense.group_id,
      };
    }));

    const results = await piggusApi.bulkAddUpdateExpenses(encryptedExpenses.map(({expenseId, encryptedData, group_id, isNew}) => ({
      id: expenseId,
      encrypted_data: encryptedData,
      group_id,
      isNew
    })));

    const processedExpenses = results.map((result, index) => ({
      ...result,
      data: encryptedExpenses[index].originalData,
    } as ExpenseWithDecryptedData));

    return {
      success: true,
      data: processedExpenses,
    };
  } catch (error: any) {
    console.error('Error in bulk expense operation:', error);
    return {
      success: false,
      error: error.message || 'Failed to process expenses',
    };
  }
};

