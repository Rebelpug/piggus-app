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
  profile: ProfileData;
  created_at: string;
  updated_at: string;
};
