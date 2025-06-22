import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import {
  PortfolioData,
  PortfolioWithDecryptedData,
} from '@/types/portfolio';
import { User } from '@supabase/supabase-js';
import { InvestmentData, InvestmentWithDecryptedData } from '@/types/investment';
import {arrayBufferToBase64} from "@/lib/encryption";

export const apiFetchPortfolios = async (
    user: User,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    decryptWithExternalEncryptionKey: (encryptionKey: string, encryptedData: string) => Promise<any>
): Promise<{ success: boolean; data?: PortfolioWithDecryptedData[]; error?: string }> => {
  try {
    if (!user || !decryptWithExternalEncryptionKey || !decryptWithPrivateKey) {
      console.error('User credentials are invalid');
      return {
        success: false,
        error: 'User credentials are invalid',
      };
    }

    const { data: memberships, error: membershipError } = await supabase
        .from('portfolio_memberships')
        .select('*, portfolios(*)')
        .eq('user_id', user.id);

    if (membershipError) {
      console.error('Error fetching portfolio memberships:', membershipError);
      return {
        success: false,
        error: membershipError.message || 'Failed to load portfolios membership',
      };
    }

    if (!memberships) {
      return {
        success: true,
        data: [],
      };
    }

    const decryptedPortfolios = await Promise.all(
        memberships.map(async membership => {
          try {
            const portfolio = membership.portfolios;
            // Decrypt the portfolio key with the user's private key
            const decryptedPortfolioKey = await decryptWithPrivateKey(membership.encrypted_portfolio_key);
            // Ensure the decrypted key is a string (base64)
            const portfolioKeyString = typeof decryptedPortfolioKey === 'string' ? decryptedPortfolioKey : JSON.stringify(decryptedPortfolioKey);
            // Validate that this looks like a base64 string
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(portfolioKeyString)) {
              console.error('Decrypted portfolio key does not appear to be valid base64:', portfolioKeyString.substring(0, 50));
              throw new Error('Invalid portfolio key format');
            }
            // Now decrypt the portfolio data using the decrypted portfolio key
            const decryptedPortfolioData = await decryptWithExternalEncryptionKey(portfolioKeyString, portfolio.encrypted_data);
            const { data: investments, error: investmentsError } = await supabase
                .from('investments')
                .select('*')
                .eq('portfolio_id', portfolio.id);

            if (investmentsError) {
              console.error('Error fetching investments:', investmentsError);
              return (await Promise.reject(investmentsError)) as any;
            }

            const decryptedInvestments = await Promise.all(
                investments.map(async investment => ({
                  ...investment,
                  data: await decryptWithExternalEncryptionKey(portfolioKeyString, investment.encrypted_data),
                }))
            );

            // Get members for this portfolio
            const { data: members, error: membersError } = await supabase
                .from('portfolio_memberships')
                .select('*')
                .eq('portfolio_id', portfolio.id);

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

            const portfolioMembers = members.map(member => ({
              id: member.id,
              portfolio_id: member.portfolio_id,
              user_id: member.user_id,
              status: member.status,
              created_at: member.created_at,
              updated_at: member.updated_at,
              encrypted_portfolio_key: member.encrypted_portfolio_key,
              username: usernameMap.get(member.user_id) || '',
            }));

            return {
              id: portfolio.id,
              created_at: portfolio.created_at,
              updated_at: portfolio.updated_at,
              data: decryptedPortfolioData,
              membership_id: membership.id,
              membership_status: membership.status,
              encrypted_key: membership.encrypted_portfolio_key,
              investments: decryptedInvestments.filter(Boolean),
              members: portfolioMembers.filter(Boolean),
            };
          } catch (error) {
            console.error('Error processing portfolio:', membership?.id, error);
            // Return null for failed portfolios rather than throwing
            return null;
          }
        })
    );

    return {
      success: true,
      data: decryptedPortfolios.filter(Boolean) as PortfolioWithDecryptedData[],
    };
  } catch (error: any) {
    console.error('Failed to fetch portfolios:', error);
    return {
      success: false,
      error: error.message || 'Failed to load portfolios',
    };
  }
};

export const apiInviteUserToPortfolio = async (
    user: User,
    portfolioId: string,
    username: string,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalPublicKey: (recipientPublicKey: string, data: any) => Promise<string>,
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
        .from('portfolio_memberships')
        .select('user_id, portfolio_id, status')
        .eq('portfolio_id', portfolioId)
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

    // 3. Get the current user's portfolio membership
    const { data: membership, error: portfolioKeyError } = await supabase
        .from('portfolio_memberships')
        .select('encrypted_portfolio_key')
        .eq('portfolio_id', portfolioId)
        .eq('user_id', user.id)
        .single();

    if (portfolioKeyError || !membership) {
      console.error('Portfolio access denied:', portfolioKeyError);
      return { success: false, error: 'Portfolio access denied' };
    }

    // 4. Decrypt the portfolio key with the current user's private key
    const portfolioKey = await decryptWithPrivateKey(membership.encrypted_portfolio_key);
    // Ensure the decrypted key is a string (base64)
    const portfolioKeyString = typeof portfolioKey === 'string' ? portfolioKey : JSON.stringify(portfolioKey);
    // Validate that this looks like a base64 string
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(portfolioKeyString)) {
      console.error('Decrypted portfolio key does not appear to be valid base64:', portfolioKeyString.substring(0, 50));
      return { success: false, error: 'Invalid portfolio key format' };
    }

    // 5. Re-encrypt the portfolio key with the target user's public key
    const targetUserPublicKey = targetUser.encryption_public_key;
    const encryptedPortfolioKeyForNewUser = await encryptWithExternalPublicKey(
        targetUserPublicKey,
        portfolioKeyString
    );

    if (!encryptedPortfolioKeyForNewUser) {
      console.error('Failed to encrypt portfolio key for new user');
      return { success: false, error: 'Failed to encrypt portfolio key for new user' };
    }

    console.log('Successfully encrypted portfolio key for new user');
    console.log('New encrypted portfolio key length:', encryptedPortfolioKeyForNewUser.length);

    // 6. Create the membership for the invited user
    const { error: inviteError } = await supabase.from('portfolio_memberships').insert({
      portfolio_id: portfolioId,
      user_id: targetUser.id,
      encrypted_portfolio_key: encryptedPortfolioKeyForNewUser,
      status: 'pending',
    });

    if (inviteError) {
      console.error('Failed to invite user:', inviteError);
      return { success: false, error: 'Failed to invite user' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to invite user to portfolio:', error);
    return { success: false, error: error.message || 'Failed to invite user' };
  }
};

export const apiHandlePortfolioInvitation = async (
    user: User,
    portfolioId: string,
    accept: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user) {
      console.error('You must be logged in to handle an invitation');
      return { success: false, error: 'Not authenticated' };
    }

    // Update the membership status
    const { error } = await supabase
        .from('portfolio_memberships')
        .update({
          status: accept ? 'confirmed' : 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('portfolio_id', portfolioId)
        .eq('user_id', user.id)
        .eq('status', 'pending');

    if (error) {
      console.error('Failed to update portfolio membership:', error);
      return { success: false, error: 'Failed to update portfolio membership' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to handle portfolio invitation:', error);
    return { success: false, error: error.message || 'Failed to process invitation' };
  }
};

export const apiCreatePortfolio = async (
    user: User,
    username: string,
    publicKey: string,
    createEncryptionKey: () => Promise<Uint8Array<ArrayBufferLike>>,
    encryptWithExternalPublicKey: (recipientPublicKey: string, data: any) => Promise<string>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
    portfolioData: PortfolioData,
): Promise<{ success: boolean; data?: PortfolioWithDecryptedData; error?: string }> => {
  try {
    if (!user || !encryptWithExternalPublicKey) {
      console.error('You must be logged in to create a portfolio');
      return {
        success: false,
        error: 'You must be logged in to create a portfolio',
      };
    }

    const portfolioEncryptionKey = await createEncryptionKey();
    const stringedPortfolioEncryptionKey = arrayBufferToBase64(portfolioEncryptionKey);
    // Encrypt the portfolio key with the creator's public key
    const encryptedPortfolioKey = await encryptWithExternalPublicKey(publicKey, stringedPortfolioEncryptionKey);
    const encryptedPortfolioData = await encryptWithExternalEncryptionKey(stringedPortfolioEncryptionKey, portfolioData);

    if (!encryptedPortfolioKey || !encryptedPortfolioData) {
      console.error('Failed to encrypt portfolio data');
      return {
        success: false,
        error: 'Failed to encrypt portfolio data',
      };
    }

    // 5. Create the portfolio in the database
    const newPortfolioId = uuidv4();
    const { error: portfolioError } = await supabase
        .from('portfolios')
        .insert({
          id: newPortfolioId,
          encrypted_data: encryptedPortfolioData,
        })
        .single();

    if (portfolioError) {
      console.error('Failed to create portfolio:', portfolioError);
      return {
        success: false,
        error: `Failed to create portfolio: ${portfolioError}`,
      };
    }

    // 6. Create the membership for the creator
    const { data: membership, error: membershipError } = await supabase
        .from('portfolio_memberships')
        .insert({
          portfolio_id: newPortfolioId,
          user_id: user.id,
          encrypted_portfolio_key: encryptedPortfolioKey,
          status: 'confirmed',
        })
        .select()
        .single();

    if (membershipError) {
      console.error('Failed to create portfolio membership:', membershipError);
      return {
        success: false,
        error: `Failed to create portfolio membership: ${membershipError}`,
      };
    }

    // 7. Return the new portfolio with data
    const newPortfolioWithData: PortfolioWithDecryptedData = {
      id: newPortfolioId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: portfolioData,
      membership_id: membership.id,
      membership_status: 'confirmed',
      encrypted_key: encryptedPortfolioKey,
      investments: [],
      members: [
        {
          id: membership.id,
          portfolio_id: newPortfolioId,
          user_id: user.id,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          encrypted_portfolio_key: encryptedPortfolioKey,
          username: username,
        },
      ],
    };

    return {
      success: true,
      data: newPortfolioWithData,
    };
  } catch (error: any) {
    console.error('Failed to create portfolio:', error);
    return {
      success: false,
      error: `Failed to create portfolio: ${error?.message || 'Unknown error'}`,
    };
  }
};

export const apiAddInvestment = async (
    user: User,
    portfolioId: string,
    encryptedPortfolioKey: string,
    investmentData: InvestmentData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: InvestmentWithDecryptedData; error?: string }> => {
  try {
    if (!user || !decryptWithPrivateKey || !portfolioId) {
      console.error('You must be logged in and have access to this portfolio');
      return {
        success: false,
        error: 'You must be logged in and have access to this portfolio',
      };
    }

    // First decrypt the portfolio key using the private key
    const portfolioKey = await decryptWithPrivateKey(encryptedPortfolioKey);
    // Ensure the decrypted key is a string
    const portfolioKeyString = typeof portfolioKey === 'string' ? portfolioKey : JSON.stringify(portfolioKey);
    // Encrypt the investment data with the portfolio key
    const encryptedData = await encryptWithExternalEncryptionKey(portfolioKeyString, investmentData);

    // Generate a unique ID for the new investment
    const newInvestmentId = uuidv4();

    // Save to database
    const { data, error } = await supabase
        .from('investments')
        .insert({
          id: newInvestmentId,
          portfolio_id: portfolioId,
          encrypted_data: encryptedData,
        })
        .select()
        .single();

    if (error) {
      console.error('Failed to add investment:', error);
      return {
        success: false,
        error: error.message || 'Failed to add investment',
      };
    }

    const addedInvestment = {
      id: newInvestmentId,
      portfolio_id: portfolioId,
      encrypted_data: encryptedData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data: investmentData,
    };

    return {
      success: true,
      data: addedInvestment,
    };
  } catch (e: any) {
    console.error('Failed to add investment:', e);
    return {
      success: false,
      error: e.message || 'Failed to add investment',
    };
  }
};

export const apiUpdateInvestment = async (
    user: User,
    portfolioId: string,
    encryptedPortfolioKey: string,
    updatedInvestment: InvestmentWithDecryptedData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: InvestmentWithDecryptedData; error?: string }> => {
  try {
    if (!user || !decryptWithPrivateKey || !portfolioId || !encryptWithExternalEncryptionKey) {
      console.error('You must be logged in and have access to this portfolio');
      return {
        success: false,
        error: 'You must be logged in and have access to this portfolio',
      };
    }

    // First decrypt the portfolio key using the private key
    const portfolioKey = await decryptWithPrivateKey(encryptedPortfolioKey);
    // Ensure the decrypted key is a string
    const portfolioKeyString = typeof portfolioKey === 'string' ? portfolioKey : JSON.stringify(portfolioKey);
    // Encrypt the investment data with the portfolio key
    const encryptedData = await encryptWithExternalEncryptionKey(portfolioKeyString, updatedInvestment.data);

    // Update in database
    const { error } = await supabase
        .from('investments')
        .update({
          encrypted_data: encryptedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedInvestment.id)
        .eq('portfolio_id', portfolioId);

    if (error) {
      console.error('Failed to update investment:', error);
      return {
        success: false,
        error: error.message || 'Failed to update investment',
      };
    }

    return {
      success: true,
      data: updatedInvestment,
    };
  } catch (e: any) {
    console.error('Failed to update investment:', e);
    return {
      success: false,
      error: e.message || 'Failed to update investment',
    };
  }
};

export const apiDeleteInvestment = async (
    user: User,
    portfolioId: string,
    investmentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user || !portfolioId) {
      console.error('You must be logged in and have access to this portfolio');
      return {
        success: false,
        error: 'You must be logged in and have access to this portfolio',
      };
    }

    // Delete from database
    const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId)
        .eq('portfolio_id', portfolioId);

    if (error) {
      console.error('Failed to delete investment:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete investment',
      };
    }

    return {
      success: true,
    };
  } catch (e: any) {
    console.error('Failed to delete investment:', e);
    return {
      success: false,
      error: e.message || 'Failed to delete investment',
    };
  }
};

export const apiUpdatePortfolio = async (
    user: User,
    portfolioId: string,
    encryptedPortfolioKey: string,
    updatedPortfolioData: PortfolioData,
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>,
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>,
): Promise<{ success: boolean; data?: PortfolioWithDecryptedData; error?: string }> => {
  try {
    if (!user || !portfolioId) {
      console.error('You must be logged in and have access to this portfolio');
      return {
        success: false,
        error: 'You must be logged in and have access to this portfolio',
      };
    }

    // First decrypt the portfolio key using the private key
    const portfolioKey = await decryptWithPrivateKey(encryptedPortfolioKey);
    // Ensure the decrypted key is a string
    const portfolioKeyString = typeof portfolioKey === 'string' ? portfolioKey : JSON.stringify(portfolioKey);
    // Encrypt the portfolio data with the portfolio key
    const encryptedData = await encryptWithExternalEncryptionKey(portfolioKeyString, updatedPortfolioData);

    // Update in database
    const { error } = await supabase
        .from('portfolios')
        .update({
          encrypted_data: encryptedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', portfolioId);

    if (error) {
      console.error('Failed to update portfolio:', error);
      return {
        success: false,
        error: error.message || 'Failed to update portfolio',
      };
    }

    // Get the updated portfolio with all its data
    const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();

    if (portfolioError || !portfolio) {
      console.error('Failed to fetch updated portfolio:', portfolioError);
      return {
        success: false,
        error: portfolioError?.message || 'Failed to fetch updated portfolio',
      };
    }

    // Get the membership for this portfolio
    const { data: membership, error: membershipError } = await supabase
        .from('portfolio_memberships')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('user_id', user.id)
        .single();

    if (membershipError || !membership) {
      console.error('Failed to fetch portfolio membership:', membershipError);
      return {
        success: false,
        error: membershipError?.message || 'Failed to fetch portfolio membership',
      };
    }

    // Get investments for this portfolio
    const { data: investments, error: investmentsError } = await supabase
        .from('investments')
        .select('*')
        .eq('portfolio_id', portfolioId);

    if (investmentsError) {
      console.error('Failed to fetch investments:', investmentsError);
      return {
        success: false,
        error: investmentsError.message || 'Failed to fetch investments',
      };
    }

    // Decrypt each investment
    const decryptedInvestments = await Promise.all(
        investments.map(async (investment): Promise<InvestmentWithDecryptedData> => {
          const decryptedInvestmentData = await encryptWithExternalEncryptionKey(portfolioKeyString, investment.encrypted_data);
          return {
            ...investment,
            data: decryptedInvestmentData,
          };
        })
    );

    // Get members for this portfolio
    const { data: members, error: membersError } = await supabase
        .from('portfolio_memberships')
        .select('*')
        .eq('portfolio_id', portfolioId);

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

    const portfolioMembers = members.map(member => ({
      id: member.id,
      portfolio_id: member.portfolio_id,
      user_id: member.user_id,
      status: member.status,
      created_at: member.created_at,
      updated_at: member.updated_at,
      encrypted_portfolio_key: member.encrypted_portfolio_key,
      username: usernameMap.get(member.user_id) || '',
    }));

    const updatedPortfolio: PortfolioWithDecryptedData = {
      id: portfolioId,
      created_at: portfolio.created_at,
      updated_at: portfolio.updated_at,
      data: updatedPortfolioData,
      membership_id: membership.id,
      membership_status: membership.status,
      encrypted_key: encryptedPortfolioKey,
      investments: decryptedInvestments,
      members: portfolioMembers,
    };

    return {
      success: true,
      data: updatedPortfolio,
    };
  } catch (e: any) {
    console.error('Failed to update portfolio:', e);
    return {
      success: false,
      error: e.message || 'Failed to update portfolio',
    };
  }
};

export const apiRemoveUserFromPortfolio = async (
    user: User,
    portfolioId: string,
    userIdToRemove: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!user) {
      console.error('You must be logged in to remove a user');
      return { success: false, error: 'Not authenticated' };
    }

    // Check if the current user has permission to remove members (is confirmed member)
    const { data: currentMembership, error: membershipError } = await supabase
        .from('portfolio_memberships')
        .select('status')
        .eq('portfolio_id', portfolioId)
        .eq('user_id', user.id)
        .single();

    if (membershipError || !currentMembership || currentMembership.status !== 'confirmed') {
      console.error('Access denied:', membershipError);
      return { success: false, error: 'Access denied' };
    }

    // Prevent users from removing themselves
    if (userIdToRemove === user.id) {
      return { success: false, error: 'Cannot remove yourself from the portfolio' };
    }

    // Remove the user from the portfolio
    const { error: removeError } = await supabase
        .from('portfolio_memberships')
        .delete()
        .eq('portfolio_id', portfolioId)
        .eq('user_id', userIdToRemove);

    if (removeError) {
      console.error('Failed to remove user:', removeError);
      return { success: false, error: 'Failed to remove user' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to remove user from portfolio:', error);
    return { success: false, error: error.message || 'Failed to remove user' };
  }
};
