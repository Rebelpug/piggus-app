export type SubscriptionTier = 'free' | 'premium' | 'enterprise';

export type Subscription = {
  id: string;
  user_id: string;
  subscription_tier: SubscriptionTier;
  created_at: string;
  updated_at: string;
};

export type BankAccount = {
  id: string;
  user_id: string;
  active_until: Date | null;
  last_fetched: Date | null;
  active: boolean;
}

export type AdditionalCategoryOverride = {
  id: string;
  name: string;
  icon: string;
};

export type CategoryOverride = {
  name: string;
  icon: string;
};

export type BudgetingData = {
  budget?: {
    amount: number;
    period: 'monthly' | 'weekly' | 'yearly';
  } | null;
  categoryOverrides?: {
    edited: { [categoryId: string]: CategoryOverride };
    deleted: string[];
    added: AdditionalCategoryOverride[];
  };
};

export type ProfileData = {
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  defaultCurrency?: string;
  budgeting?: BudgetingData;
};

export type Profile = {
  id: string;
  username: string;
  encryption_public_key: string;
  encrypted_data: string;
  profile: ProfileData;
  created_at: string;
  updated_at: string;
  subscription: Subscription | null;
  bank_accounts: BankAccount[];
};
