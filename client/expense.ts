import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import {
  ExpenseData,
  ExpenseGroupData,
  ExpenseGroupWithDecryptedData,
  ExpenseWithDecryptedData,
} from '@/types/expense';
import { User } from '@supabase/supabase-js';

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

    const { data: memberships, error: membershipError } = await supabase
        .from('expenses_group_memberships')
        .select('*, expenses_groups(*)')
        .eq('user_id', user.id);

    if (membershipError) {
      console.error('Error fetching expense group memberships:', membershipError);
      return {
        success: false,
        error: membershipError.message || 'Failed to load expense groups membership',
      };
    }

    if (!memberships) {
      return {
        success: true,
        data: [],
      };
    }

    const decryptedGroups = await Promise.all(
        memberships.map(async membership => {
          const group = membership.expenses_groups;
          const decryptedGroupKey = await decryptWithPrivateKey(membership.encrypted_group_key);
          // Now decrypt the group data using the decrypted group key
          const decryptedExpenseGroupData = await decryptWithExternalEncryptionKey(decryptedGroupKey, group.encrypted_data);

          console.log(decryptedExpenseGroupData)

          const { data: expenses, error: expensesError } = await supabase
              .from('expenses')
              .select('*')
              .eq('group_id', group.id);

          if (expensesError) {
            console.error('Error fetching expenses:', expensesError);
            return (await Promise.reject(expensesError)) as any;
          }

          const decryptedExpenses = await Promise.all(
              expenses.map(async expense => ({
                ...expense,
                data: await decryptWithExternalEncryptionKey(decryptedGroupKey, expense.encrypted_data),
              }))
          );

          // Get members for this group
          const { data: members, error: membersError } = await supabase
              .from('expenses_group_memberships')
              .select('*')
              .eq('group_id', group.id);

          if (membersError) {
            console.error('Error fetching members:', membersError);
            return (await Promise.reject(membersError)) as any;
          }

          // Fetch usernames separately
          const userIds = members.map(member => member.user_id);
          const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, username')
              .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            return (await Promise.reject(profilesError)) as any;
          }

          const usernameMap = new Map(profiles?.map(profile => [profile.id, profile.username]) || []);

          const groupMembers = members.map(member => ({
            id: member.id,
            group_id: member.group_id,
            user_id: member.user_id,
            status: member.status,
            created_at: member.created_at,
            updated_at: member.updated_at,
            encrypted_group_key: member.encrypted_group_key,
            username: usernameMap.get(member.user_id) || '',
          }));

          return {
            id: group.id,
            created_at: group.created_at,
            updated_at: group.updated_at,
            data: decryptedExpenseGroupData,
            membership_id: membership.id,
            membership_status: membership.status,
            encrypted_key: membership.encrypted_group_key,
            expenses: decryptedExpenses.filter(Boolean),
            members: groupMembers.filter(Boolean),
          };
        })
    );

    return {
      success: true,
      data: decryptedGroups.filter(Boolean) as ExpenseGroupWithDecryptedData[],
    };
  } catch (error: any) {
    console.error('Failed to fetch expense groups:', error);
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
    encryptWithExternalPublicKey: (recipientPublicKey: string, data: any) => Promise<{ encryptedKey: string, encryptedData: string } | null>,
    groupData: ExpenseGroupData,
): Promise<{ success: boolean; data?: ExpenseGroupWithDecryptedData; error?: string }> => {
  try {
    if (!user || !encryptWithExternalPublicKey) {
      console.error('You must be logged in to create an expense group');
      return {
        success: false,
        error: 'You must be logged in to create an expense group',
      };
    }

    const encryptedResult = await encryptWithExternalPublicKey(publicKey, groupData);

    if (!encryptedResult) {
      console.error('Failed to encrypt group data');
      return {
        success: false,
        error: 'Failed to encrypt group data',
      };
    }

    // 5. Create the group in the database
    const newGroupId = uuidv4();
    const { error: groupError } = await supabase
        .from('expenses_groups')
        .insert({
          id: newGroupId,
          encrypted_data: encryptedResult?.encryptedData,
        })
        .single();

    if (groupError) {
      console.error('Failed to create expense group:', groupError);
      return {
        success: false,
        error: `Failed to create expense group: ${groupError}`,
      };
    }

    // 6. Create the membership for the creator
    const { data: membership, error: membershipError } = await supabase
        .from('expenses_group_memberships')
        .insert({
          group_id: newGroupId,
          user_id: user.id,
          encrypted_group_key: encryptedResult.encryptedKey,
          status: 'confirmed',
        })
        .select()
        .single();

    if (membershipError) {
      console.error('Failed to create expense group membership:', membershipError);
      return {
        success: false,
        error: `Failed to create expense group membership: ${membershipError}`,
      };
    }

    // 7. Return the new group with data
    const newGroupWithData: ExpenseGroupWithDecryptedData = {
      id: newGroupId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: groupData,
      membership_status: 'confirmed',
      encrypted_key: encryptedResult.encryptedKey,
      expenses: [],
      members: [
        {
          id: membership.id,
          group_id: newGroupId,
          user_id: user.id,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          encrypted_group_key: encryptedResult.encryptedKey,
          username: username,
        },
      ],
    };

    return {
      success: true,
      data: newGroupWithData,
    };
  } catch (error: any) {
    console.error('Failed to create expense group:', error);
    return {
      success: false,
      error: `Failed to create expense group: ${error?.message || 'Unknown error'}`,
    };
  }
};

export const apiAddExpense = async (
    user: User,
    groupId: string,
    encryptedGroupKey: string,
    expenseData: ExpenseData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: ExpenseWithDecryptedData; error?: string }> => {
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
    // Encrypt the expense data with the group key
    const encryptedData = encryptWithExternalEncryptionKey(groupKey, expenseData);

    // Generate a unique ID for the new expense
    const newExpenseId = uuidv4();

    // Save to database
    const { data, error } = await supabase
        .from('expenses')
        .insert({
          id: newExpenseId,
          group_id: groupId,
          encrypted_data: encryptedData,
        })
        .select()
        .single();

    if (error) {
      console.error('Failed to add expense:', error);
      return {
        success: false,
        error: error.message || 'Failed to add expense',
      };
    }

    const addedExpense = {
      id: newExpenseId,
      group_id: groupId,
      encrypted_data: encryptedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: expenseData,
    };

    return {
      success: true,
      data: addedExpense,
    };
  } catch (e: any) {
    console.error('Failed to add expense:', e);
    return {
      success: false,
      error: e.message || 'Failed to add expense',
    };
  }
};

export const apiUpdateExpense = async (
    user: User,
    groupId: string,
    encryptedGroupKey: string,
    updatedExpense: ExpenseWithDecryptedData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: ExpenseWithDecryptedData; error?: string }> => {
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
    // Encrypt the expense data with the group key
    const encryptedData = encryptWithExternalEncryptionKey(groupKey, updatedExpense.data);

    // Update in database
    const { error } = await supabase
        .from('expenses')
        .update({
          encrypted_data: encryptedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedExpense.id)
        .eq('group_id', groupId);

    if (error) {
      console.error('Failed to update expense:', error);
      return {
        success: false,
        error: error.message || 'Failed to update expense',
      };
    }

    return {
      success: true,
      data: updatedExpense,
    };
  } catch (e: any) {
    console.error('Failed to update expense:', e);
    return {
      success: false,
      error: e.message || 'Failed to update expense',
    };
  }
};

export const apiDeleteExpense = async (
    user: User,
    groupId: string,
    expenseId: string
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
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('group_id', groupId);

    if (error) {
      console.error('Failed to delete expense:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete expense',
      };
    }

    return {
      success: true,
    };
  } catch (e: any) {
    console.error('Failed to delete expense:', e);
    return {
      success: false,
      error: e.message || 'Failed to delete expense',
    };
  }
};

export const apiInviteUserToGroup = async (
    user: User,
    groupId: string,
    username: string,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalPublicKey: (recipientPublicKey: string, data: any) => Promise<{ encryptedKey: string, encryptedData: string } | null>
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user) {
      console.error('You must be logged in to invite a user');
      return { success: false, error: 'Not authenticated' };
    }

    // 1. Find the user by username
    console.log('Trying to invite user:', username);
    const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('id, username, encryption_public_key')
        .eq('username', username)
        .single();

    if (userError || !targetUser) {
      console.error('User not found:', userError);
      return { success: false, error: 'User not found' };
    }

    // 2. Check if user is already a member
    const { data: existingMembership, error: membershipError } = await supabase
        .from('expenses_group_memberships')
        .select('user_id, group_id, status')
        .eq('group_id', groupId)
        .eq('user_id', targetUser.id)
        .maybeSingle();

    if (existingMembership) {
      const status = existingMembership.status;
      if (status === 'confirmed') {
        console.error('User already a member:', existingMembership);
        return { success: false, error: 'Already a member' };
      } else if (status === 'pending') {
        console.error('User already has a pending invitation:', existingMembership);
        return { success: false, error: 'Invitation already pending' };
      }
    }

    // 3. Get the current user's group membership
    const { data: membership, error: groupKeyError } = await supabase
        .from('expenses_group_memberships')
        .select('encrypted_group_key')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

    if (groupKeyError || !membership) {
      console.error('Group access denied:', groupKeyError);
      return { success: false, error: 'Group access denied' };
    }

    // 4. Decrypt the group key with the current user's private key
    const groupKey = await decryptWithPrivateKey(membership.encrypted_group_key);

    // 5. Re-encrypt the group key with the target user's public key
    const targetUserPublicKey = targetUser.encryption_public_key;
    const encryptedGroupKeyForNewUser = encryptWithExternalPublicKey(
        targetUserPublicKey,
        groupKey
    );

    // 6. Create the membership for the invited user
    const { error: inviteError } = await supabase.from('expenses_group_memberships').insert({
      group_id: groupId,
      user_id: targetUser.id,
      encrypted_group_key: encryptedGroupKeyForNewUser,
      status: 'pending',
    });

    if (inviteError) {
      console.error('Failed to invite user:', inviteError);
      return { success: false, error: 'Failed to invite user' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to invite user to group:', error);
    return { success: false, error: error.message || 'Failed to invite user' };
  }
};

export const apiHandleGroupInvitation = async (
    user: User,
    groupId: string,
    accept: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user) {
      console.error('You must be logged in to handle an invitation');
      return { success: false, error: 'Not authenticated' };
    }

    // Update the membership status
    const { error } = await supabase
        .from('expenses_group_memberships')
        .update({
          status: accept ? 'confirmed' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

    if (error) {
      console.error('Failed to update group membership:', error);
      return { success: false, error: 'Failed to update group membership' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to handle group invitation:', error);
    return { success: false, error: error.message || 'Failed to process invitation' };
  }
};

export const apiUpdateExpenseGroup = async (
    user: User,
    groupId: string,
    encryptedGroupKey: string,
    updatedGroupData: ExpenseGroupData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: ExpenseGroupWithDecryptedData; error?: string }> => {
  try {
    if (!user || !groupId) {
      console.error('You must be logged in and have access to this expense group');
      return {
        success: false,
        error: 'You must be logged in and have access to this expense group',
      };
    }

    // First decrypt the group key using the private key
    const groupKey = await decryptWithPrivateKey(encryptedGroupKey);
    // Encrypt the group data with the group key
    const encryptedData = encryptWithExternalEncryptionKey(groupKey, updatedGroupData);

    // Update in database
    const { error } = await supabase
        .from('expenses_groups')
        .update({
          encrypted_data: encryptedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

    if (error) {
      console.error('Failed to update expense group:', error);
      return {
        success: false,
        error: error.message || 'Failed to update expense group',
      };
    }

    // Get the updated group with all its data
    const { data: group, error: groupError } = await supabase
        .from('expenses_groups')
        .select('*')
        .eq('id', groupId)
        .single();

    if (groupError || !group) {
      console.error('Failed to fetch updated group:', groupError);
      return {
        success: false,
        error: groupError?.message || 'Failed to fetch updated group',
      };
    }

    // Get the membership for this group
    const { data: membership, error: membershipError } = await supabase
        .from('expenses_group_memberships')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

    if (membershipError || !membership) {
      console.error('Failed to fetch group membership:', membershipError);
      return {
        success: false,
        error: membershipError?.message || 'Failed to fetch group membership',
      };
    }

    // Get expenses for this group
    const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('group_id', groupId);

    if (expensesError) {
      console.error('Failed to fetch expenses:', expensesError);
      return {
        success: false,
        error: expensesError.message || 'Failed to fetch expenses',
      };
    }

    // Decrypt each expense
    const decryptedExpenses = await Promise.all(
        expenses.map(async (expense): Promise<ExpenseWithDecryptedData> => {
          const decryptedExpenseData = encryptWithExternalEncryptionKey(groupKey, expense.encrypted_data);
          return {
            ...expense,
            data: decryptedExpenseData,
          };
        })
    );

    // Get members for this group
    const { data: members, error: membersError } = await supabase
        .from('expenses_group_memberships')
        .select('*')
        .eq('group_id', groupId);

    if (membersError) {
      console.error('Failed to fetch members:', membersError);
      return {
        success: false,
        error: membersError.message || 'Failed to fetch members',
      };
    }

    // Fetch usernames separately
    const userIds = members.map(member => member.user_id);
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

    if (profilesError) {
      console.error('Failed to fetch profiles:', profilesError);
      return {
        success: false,
        error: profilesError.message || 'Failed to fetch profiles',
      };
    }

    const usernameMap = new Map(profiles?.map(profile => [profile.id, profile.username]) || []);

    const groupMembers = members.map(member => ({
      id: member.id,
      group_id: member.group_id,
      user_id: member.user_id,
      status: member.status,
      created_at: member.created_at,
      updated_at: member.updated_at,
      encrypted_group_key: member.encrypted_group_key,
      username: usernameMap.get(member.user_id) || '',
    }));

    const updatedGroup: ExpenseGroupWithDecryptedData = {
      id: groupId,
      created_at: group.created_at,
      updated_at: group.updated_at,
      data: updatedGroupData,
      membership_id: membership.id,
      membership_status: membership.status,
      encrypted_key: encryptedGroupKey,
      expenses: decryptedExpenses,
      members: groupMembers,
    };

    return {
      success: true,
      data: updatedGroup,
    };
  } catch (e: any) {
    console.error('Failed to update expense group:', e);
    return {
      success: false,
      error: e.message || 'Failed to update expense group',
    };
  }
};
