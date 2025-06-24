import { InvestmentWithDecryptedData } from '@/types/investment';

export type Portfolio = {
  id: string;
  created_at: string;
  updated_at: string;
  encrypted_data: PortfolioData;
};

export type PortfolioData = {
  name: string;
  description?: string | null;
  private: boolean;
};

export type PortfolioMemberWithProfile = {
  id: string;
  user_id: string;
  portfolio_id: string;
  status: string;
  username: string;
  created_at: string;
  updated_at: string;
  encrypted_portfolio_key: string;
};

export type PortfolioWithDecryptedData = {
  id: string;
  created_at: string;
  updated_at: string;
  data: PortfolioData;
  membership_id: string;
  membership_status: 'confirmed' | 'pending' | 'rejected';
  encrypted_key: string;
  investments: InvestmentWithDecryptedData[];
  members: PortfolioMemberWithProfile[];
};

export type PortfolioMembership = {
  id: string;
  user_id: string;
  portfolio_id: string;
  encrypted_portfolio_key: string;
  status: 'confirmed' | 'pending' | 'rejected';
  created_at: string;
};
