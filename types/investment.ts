export type InvestmentData = {
  name: string;
  symbol: string | null;
  isin: string | null;
  exchange_market?: string | null;
  type: string;
  purchase_date: string;
  purchase_price: number;
  quantity: number;
  currency: string;
  current_price: number | null;
  last_updated: string | null;
  notes: string | null;
  interest_rate?: number | null;
  maturity_date?: string | null;
  dividend_yield?: number | null;
  sector?: string | null;
  risk_level?: string | null;
  taxation?: number | null;
};

export type Investment = {
  id: string;
  portfolio_id: string;
  encrypted_data: InvestmentData;
  created_at: string;
  updated_at: string;
};

export type InvestmentWithDecryptedData = {
  id: string;
  portfolio_id: string;
  created_at: string;
  updated_at: string;
  data: InvestmentData;
};

export type InvestmentFormData = {
  name: string;
  symbol: string;
  type: string;
  purchase_date: string;
  purchase_price: number;
  quantity: number;
  current_price: number;
  notes: string;
  // Additional fields for specific investment types
  interest_rate?: number;
  maturity_date?: string;
  dividend_yield?: number;
  sector?: string;
  risk_level?: string;
};

export const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'bond', label: 'Bond' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

export const RISK_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export interface LookupSearchResult {
  Code: string;
  Exchange: string;
  Name: string;
  Type: string;
  Country: string;
  Currency: string;
  ISIN: string;
  previousClose: number;
  previousCloseDate: string;
}

export const SECTORS = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'financials', label: 'Financials' },
  { value: 'consumer', label: 'Consumer' },
  { value: 'industrials', label: 'Industrials' },
  { value: 'energy', label: 'Energy' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'materials', label: 'Materials' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' },
];
