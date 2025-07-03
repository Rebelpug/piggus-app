import React, {createContext, useContext, useState, ReactNode, useEffect, useCallback} from 'react';
import {
  PortfolioData,
  PortfolioWithDecryptedData,
} from '@/types/portfolio';
import { InvestmentData, InvestmentWithDecryptedData } from '@/types/investment';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
// Use services instead of direct client imports
import {
  apiCreatePortfolio,
  apiFetchPortfolios,
  apiAddInvestment,
  apiUpdateInvestment,
  apiDeleteInvestment,
  apiInviteUserToPortfolio,
  apiHandlePortfolioInvitation,
  apiUpdatePortfolio,
  apiRemoveUserFromPortfolio,
} from '@/services/investmentService';
// Keep old client imports as backup
// import {
//   apiCreatePortfolio,
//   apiFetchPortfolios,
//   apiAddInvestment,
//   apiUpdateInvestment,
//   apiDeleteInvestment,
//   apiInviteUserToPortfolio,
//   apiHandlePortfolioInvitation,
//   apiUpdatePortfolio,
//   apiRemoveUserFromPortfolio,
// } from '@/client/investment';
import {useEncryption} from "@/context/EncryptionContext";

interface InvestmentContextType {
  portfolios: PortfolioWithDecryptedData[];
  isLoading: boolean;
  error: string | null;
  addInvestment: (portfolioId: string, investment: InvestmentData) => Promise<InvestmentWithDecryptedData | null>;
  updateInvestment: (
      portfolioId: string,
      investment: {
        created_at: string;
        data: InvestmentData;
        portfolio_id: string;
        id: string;
        updated_at: string;
      }
  ) => Promise<InvestmentWithDecryptedData | null>;
  deleteInvestment: (portfolioId: string, id: string) => Promise<void>;
  createPortfolio: (portfolioData: PortfolioData) => Promise<void>;
  inviteUserToPortfolio: (
      portfolioId: string,
      username: string
  ) => Promise<{ success: boolean; error?: string }>;
  removeUserFromPortfolio: (
      portfolioId: string,
      userId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updatePortfolio: (
      portfolioId: string,
      portfolioData: PortfolioData
  ) => Promise<PortfolioWithDecryptedData | null>;
  handlePortfolioInvitation: (
      portfolioId: string,
      accept: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  getPendingInvitations: () => PortfolioWithDecryptedData[];
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export function InvestmentProvider({ children }: { children: ReactNode }) {
  const { user, publicKey } = useAuth();
  const { isEncryptionInitialized, createEncryptionKey ,decryptWithPrivateKey, decryptWithExternalEncryptionKey, encryptWithExternalPublicKey, encryptWithExternalEncryptionKey } = useEncryption();
  const { userProfile } = useProfile();
  const [portfolios, setPortfolios] = useState<PortfolioWithDecryptedData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolios = useCallback(async () => {
    try {
      if (!user || !isEncryptionInitialized || !userProfile) {
        console.error('User or private key not found, or encryption not initialized');
        setIsLoading(false);
        setError('User or private key not found, or encryption not initialized');
        return;
      }

      setIsLoading(true);
      setError(null);

      const result = await apiFetchPortfolios(user, decryptWithPrivateKey, decryptWithExternalEncryptionKey);

      if (result.data) {
        setPortfolios(result.data);
      } else {
        setPortfolios([]);
        setError(result.error || 'Failed to load portfolios');
      }

      setIsLoading(false);
    } catch (e: any) {
      console.error('Failed to fetch portfolios', e);
      setIsLoading(false);
      setError(`Failed to fetch portfolios ${e.message || e?.toString()}`);
      return;
    }
  }, [user, isEncryptionInitialized, userProfile, decryptWithPrivateKey, decryptWithExternalEncryptionKey]);

  const createPortfolio = async (portfolioData: PortfolioData) => {
    try {
      if (!user || !publicKey || !userProfile || !isEncryptionInitialized) {
        setError('You must be logged in to create a portfolio');
        console.error('You must be logged in to create a portfolio');
        return;
      }
      const result = await apiCreatePortfolio(user, userProfile.username, publicKey, createEncryptionKey, encryptWithExternalPublicKey, encryptWithExternalEncryptionKey, portfolioData);
      const newPortfolio = result.data;
      if (newPortfolio) {
        setPortfolios(prev => [...prev, newPortfolio]);
      } else {
        setError(result.error || 'Failed to create portfolio');
      }
    } catch (error: any) {
      console.error('Failed to create portfolio:', error);
      setError(error.message || 'Failed to create portfolio');
    }
  };

  const addInvestment = async (portfolioId: string, investment: InvestmentData) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to add an investment');
        setError('You must be logged in to add an investment');
        return null;
      }

      // Find the portfolio
      const portfolio = portfolios.find(p => p.id === portfolioId);
      if (!portfolio) {
        console.error('Portfolio not found');
        setError('Portfolio not found');
        return null;
      }

      // Get the portfolio key
      const portfolioKey = portfolio.encrypted_key;
      if (!portfolioKey) {
        console.error('Could not access portfolio key');
        setError('Could not access encryption key');
        return null;
      }

      const result = await apiAddInvestment(user, portfolioId, portfolioKey, investment, decryptWithPrivateKey, encryptWithExternalEncryptionKey);
      const addedInvestment = result.data;
      if (addedInvestment) {
        // Add to local state
        setPortfolios(prev =>
            prev.map(portfolio => {
              if (portfolio.id === portfolioId) {
                return {
                  ...portfolio,
                  investments: [addedInvestment, ...portfolio.investments],
                };
              }
              return portfolio;
            })
        );
        return addedInvestment;
      } else {
        setError(result.error || 'Failed to add investment');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to add investment:', error);
      setError(error.message || 'Failed to add investment');
      return null;
    }
  };

  const updateInvestment = async (portfolioId: string, updatedInvestment: InvestmentWithDecryptedData) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to update an investment');
        setError('You must be logged in to update an investment');
        return null;
      }

      // Find the portfolio
      const portfolio = portfolios.find(p => p.id === portfolioId);
      if (!portfolio) {
        console.error('Portfolio not found');
        setError('Portfolio not found');
        return null;
      }

      // Get the portfolio key
      const portfolioKey = portfolio.encrypted_key;
      if (!portfolioKey) {
        console.error('Could not access portfolio key');
        setError('Could not access encryption key');
        return null;
      }

      const result = await apiUpdateInvestment(user, portfolioId, portfolioKey, updatedInvestment, decryptWithPrivateKey, encryptWithExternalEncryptionKey);
      const changedInvestment = result.data;
      if (changedInvestment) {
        // Update in local state
        setPortfolios(prev =>
            prev.map(portfolio => {
              if (portfolio.id === portfolioId) {
                return {
                  ...portfolio,
                  investments: portfolio.investments.map(investment =>
                      investment.id === updatedInvestment.id ? changedInvestment : investment
                  ),
                };
              }
              return portfolio;
            })
        );
        return changedInvestment;
      } else {
        setError(result.error || 'Failed to update investment');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to update investment:', error);
      setError(error.message || 'Failed to update investment');
      return null;
    }
  };

  const deleteInvestment = async (portfolioId: string, id: string) => {
    try {
      if (!user) {
        console.error('You must be logged in to delete an investment');
        setError('You must be logged in to delete an investment');
        return;
      }

      const result = await apiDeleteInvestment(user, portfolioId, id);

      if (result) {
        // Remove from local state
        setPortfolios(prev =>
            prev.map(portfolio => {
              if (portfolio.id === portfolioId) {
                return {
                  ...portfolio,
                  investments: portfolio.investments.filter(investment => investment.id !== id),
                };
              }
              return portfolio;
            })
        );
      } else {
        setError(result || 'Failed to delete investment');
      }
    } catch (error: any) {
      console.error('Failed to delete investment:', error);
      setError(error.message || 'Failed to delete investment');
    }
  };

  const inviteUserToPortfolio = async (portfolioId: string, username: string) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to invite a user');
        setError('You must be logged in to invite a user');
        return { success: false, error: 'Not authenticated' };
      }

      const result = await apiInviteUserToPortfolio(user, portfolioId, username, decryptWithPrivateKey, encryptWithExternalPublicKey);

      if (result) {
        // Refresh the portfolios list to get the updated members
        await fetchPortfolios();
      } else {
        setError(result || 'Failed to invite user');
      }

      return result;
    } catch (error: any) {
      console.error('Failed to invite user to portfolio:', error);
      setError(error.message || 'Failed to invite user');
      return { success: false, error: error.message || 'Failed to invite user' };
    }
  };

  const removeUserFromPortfolio = async (portfolioId: string, userId: string) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to remove a user');
        setError('You must be logged in to remove a user');
        return { success: false, error: 'Not authenticated' };
      }

      const result = await apiRemoveUserFromPortfolio(user, portfolioId, userId);

      if (result) {
        // Update local state to remove the user from the portfolio
        setPortfolios(prev =>
            prev.map(portfolio => {
              if (portfolio.id === portfolioId) {
                return {
                  ...portfolio,
                  members: portfolio.members.filter(member => member.user_id !== userId),
                };
              }
              return portfolio;
            })
        );
      } else {
        setError(result || 'Failed to remove user');
      }

      return result;
    } catch (error: any) {
      console.error('Failed to remove user from portfolio:', error);
      setError(error.message || 'Failed to remove user');
      return { success: false, error: error.message || 'Failed to remove user' };
    }
  };

  const handlePortfolioInvitation = async (portfolioId: string, accept: boolean) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to handle an invitation');
        setError('You must be logged in to handle an invitation');
        return { success: false, error: 'Not authenticated' };
      }

      const result = await apiHandlePortfolioInvitation(user, portfolioId, accept);

      if (result) {
        // Update local state
        setPortfolios(prev => {
          if (accept) {
            return prev.map(portfolio => {
              if (portfolio.id === portfolioId) {
                return {
                  ...portfolio,
                  membership_status: 'confirmed',
                  members: portfolio.members.map(member =>
                      member.user_id === user.id ? { ...member, status: 'confirmed' } : member
                  ),
                };
              }
              return portfolio;
            });
          } else {
            return prev.filter(portfolio => portfolio.id !== portfolioId);
          }
        });
      } else {
        setError(result || 'Failed to handle invitation');
      }

      return result;
    } catch (error: any) {
      console.error('Failed to handle portfolio invitation:', error);
      setError(error.message || 'Failed to handle invitation');
      return { success: false, error: error.message || 'Failed to handle invitation' };
    }
  };

  const updatePortfolio = async (portfolioId: string, portfolioData: PortfolioData) => {
    try {
      if (!user || !isEncryptionInitialized) {
        console.error('You must be logged in to update a portfolio');
        setError('You must be logged in to update a portfolio');
        return null;
      }

      // Find the portfolio
      const portfolio = portfolios.find(p => p.id === portfolioId);
      if (!portfolio) {
        console.error('Portfolio not found');
        setError('Portfolio not found');
        return null;
      }

      // Get the portfolio key
      const encryptedKey = portfolio.encrypted_key;
      if (!encryptedKey) {
        console.error('Could not access portfolio key');
        setError('Could not access encryption key');
        return null;
      }

      const result = await apiUpdatePortfolio(user, portfolioId, encryptedKey, portfolioData, decryptWithPrivateKey, encryptWithExternalEncryptionKey);

      if (result.data) {
        // Update local state
        setPortfolios(prev =>
            prev.map(portfolio => {
              if (portfolio.id === portfolioId) {
                return result.data!;
              }
              return portfolio;
            })
        );
        return result.data;
      } else {
        setError(result.error || 'Failed to update portfolio');
        return null;
      }
    } catch (error: any) {
      console.error('Failed to update portfolio:', error);
      setError(error.message || 'Failed to update portfolio');
      return null;
    }
  };

  const getPendingInvitations = () => {
    return portfolios.filter(portfolio => portfolio.membership_status === 'pending');
  };

  useEffect(() => {
    if (isEncryptionInitialized) {
      fetchPortfolios().catch(error => console.error('Failed to fetch portfolios:', error));
    }
  }, [user, userProfile, fetchPortfolios, isEncryptionInitialized]);

  return (
      <InvestmentContext.Provider
          value={{
            portfolios,
            isLoading,
            error,
            addInvestment,
            updateInvestment,
            deleteInvestment,
            createPortfolio,
            inviteUserToPortfolio,
            removeUserFromPortfolio,
            updatePortfolio,
            handlePortfolioInvitation,
            getPendingInvitations,
          }}
      >
        {children}
      </InvestmentContext.Provider>
  );
}

export function useInvestment() {
  const context = useContext(InvestmentContext);
  if (context === undefined) {
    throw new Error('useInvestment must be used within an InvestmentProvider');
  }
  return context;
}
