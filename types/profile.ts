export type SubscriptionTier = "free" | "premium" | "enterprise";

export type Subscription = {
  id: string;
  user_id: string;
  subscription_tier: SubscriptionTier;
  override_no_revenue_cat_checker: boolean;
  created_at: string;
  updated_at: string;
};

export type BankAccount = {
  id: string;
  user_id: string;
  active_until: Date | null;
  last_fetched: Date | null;
  active: boolean;
};

export type AdditionalCategoryOverride = {
  id: string;
  name: string;
  icon: string;
  parent?: string;
};

export type CategoryOverride = {
  name: string;
  icon: string;
  parent?: string;
};

export type AdditionalPaymentMethodOverride = {
  id: string;
  name: string;
  icon: string;
};

export type PaymentMethodOverride = {
  name: string;
  icon: string;
};

export type BudgetingData = {
  budget?: {
    amount: number;
    period: "monthly" | "weekly" | "yearly";
  } | null;
  categoryOverrides?: {
    edited: { [categoryId: string]: CategoryOverride };
    deleted: string[];
    added: AdditionalCategoryOverride[];
  };
  paymentMethodOverrides?: {
    edited: { [methodId: string]: PaymentMethodOverride };
    deleted: string[];
    added: AdditionalPaymentMethodOverride[];
  };
};

export type FinancesData = {
  historicalAssets: {
    [date: string]: number;
  };
};

export type ProfileData = {
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  defaultCurrency?: string;
  preferredLanguage?: string;
  budgeting?: BudgetingData;
  finances?: FinancesData;
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
