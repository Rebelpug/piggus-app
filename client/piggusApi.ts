import { getHttpClient } from './http';
import {Profile, Subscription} from "@/types/profile";
import { VersionResponse, VersionCheckResponse, VersionCheckRequest } from "@/types/version";
import { LookupSearchResult, InvestmentLookupResultV2 } from "@/types/investment";

const BASE_URL = process.env.EXPO_PUBLIC_PIGGUS_API_URL || ''

// Health Check Types
export interface HealthCheckResponse {
    success: boolean;
    status: string;
    error?: string;
}

// Expense Types
export interface ExpenseGroup {
    id: string;
    encrypted_data: any;
    created_at: string;
    updated_at: string;
}

export interface ExpenseGroupMembership {
    id: string;
    group_id: string;
    user_id: string;
    encrypted_group_key: string;
    status: string;
    created_at: string;
    updated_at: string;
    username?: string;
}

export interface Expense {
    id: string;
    group_id: string;
    encrypted_data: any;
    created_at: string;
    updated_at: string;
    isNew?: boolean
}

// Portfolio Types
export interface Portfolio {
    id: string;
    encrypted_data: any;
    created_at: string;
    updated_at: string;
}

export interface PortfolioMembership {
    id: string;
    portfolio_id: string;
    user_id: string;
    encrypted_portfolio_key: string;
    status: string;
    created_at: string;
    updated_at: string;
    username?: string;
}

export interface Investment {
    id: string;
    portfolio_id: string;
    encrypted_data: any;
    created_at: string;
    updated_at: string;
}


// Recurring Expense Types
export interface RecurringExpense {
    id: string;
    group_id: string;
    encrypted_data: any;
    created_at: string;
    updated_at: string;
}

// Guide Types
export interface Guide {
    id: string;
    icon: string;
    title: string;
    subtitle: string;
    content: string;
    category: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    sort_order: number;
    difficulty_level: number;
}

// Bank Institution Types
export interface Institution {
    id: string;
    name: string;
    bic: string;
    transaction_total_days: string;
    countries: string[];
    logo: string;
}

export interface Transaction {
  transactionId: string;
  debtorName?: string;
  debtorAccount?: {
    iban?: string;
  };
  transactionAmount: {
    amount: string;
    currency: string;
  };
  bankTransactionCode?: string;
  bookingDate: string;
  valueDate?: string;
  remittanceInformationUnstructured?: string;
  remittanceInformationStructured?: string;
  additionalInformation?: string;
  balanceAfterTransaction?: {
    balanceAmount: {
      amount: string;
      currency: string;
    };
  };
  creditorName?: string;
  creditorAccount?: {
    iban?: string;
  };
  ultimateCreditor?: string;
  ultimateDebtor?: string;
  purposeCode?: string;
  merchantCategoryCode?: string;
  proprietaryBankTransactionCode?: string;
  internalTransactionId?: string;
}

export interface TransactionsResponse {
  transactions: {
    booked: Transaction[];
    pending: Transaction[];
  };
}

export interface BankAccountTransactions {
  accountId: string;
  externalAccountId: string;
  skipped: boolean;
  transactionCount?: number;
  transactions?: {
    last_updated: string;
    transactions: {
      booked?: Transaction[];
      pending?: Transaction[];
    };
  };
  lastFetched?: string;
  reason?: string;
}

export interface BankTransaction {
    id: string;
    amount: number;
    currency: string;
    description: string;
    date: string;
    status: string;
    category?: string;
}

export interface BankAgreement {
    id: string;
    institutionId: string;
    maxHistoricalDays: number;
    accessValidForDays: number;
    created: string;
    accepted?: string;
}

export interface BankRequisition {
    id: string;
    created: string;
    redirect: string;
    status: string;
    institutionId: string;
    agreementId: string;
    reference?: string;
    accounts: string[];
    userLanguage: string;
    link: string;
    ssn?: string;
    accountSelection: boolean;
    redirectImmediate: boolean;
}

export interface PiggusApi {
    healthCheck: () => Promise<HealthCheckResponse>;

    // Expense Group Methods
    getExpenseGroups: () => Promise<(ExpenseGroupMembership & { expenses_groups: ExpenseGroup })[]>;
    createExpenseGroup: (data: { groupId: string; encryptedData: any; encryptedGroupKey: string }) => Promise<ExpenseGroupMembership>;
    getExpenseGroup: (groupId: string) => Promise<{ expenses: Expense[]; members: ExpenseGroupMembership[]; [key: string]: any }>;
    updateExpenseGroup: (groupId: string, data: { encryptedData: any }) => Promise<ExpenseGroup>;
    getExpensesForGroup: (groupId: string) => Promise<Expense[]>;
    getExpensesForGroupPaginated: (groupId: string, params: { page: number; limit: number; startDate?: string; endDate?: string }) => Promise<{ expenses: Expense[]; total: number; page: number; limit: number; totalPages: number }>;
    addExpense: (groupId: string, data: { expenseId: string; encryptedData: any; created_at?: string }) => Promise<Expense>;
    updateExpense: (groupId: string, expenseId: string, data: { encryptedData: any; created_at?: string }) => Promise<Expense>;
    deleteExpense: (groupId: string, expenseId: string) => Promise<{ success: boolean }>;
    inviteToExpenseGroup: (groupId: string, data: { username: string; encryptedGroupKey: string }) => Promise<ExpenseGroupMembership>;
    handleExpenseGroupInvite: (groupId: string, data: { accept: boolean }) => Promise<{ success: boolean }>;
    removeExpenseGroupMember: (groupId: string, userId: string) => Promise<{ success: boolean }>;

    // Portfolio Methods
    getPortfolios: () => Promise<(PortfolioMembership & { portfolios: Portfolio })[]>;
    createPortfolio: (data: { portfolioId: string; encryptedData: any; encryptedPortfolioKey: string }) => Promise<{ portfolio: Portfolio; membership: PortfolioMembership }>;
    getPortfolio: (portfolioId: string) => Promise<{ investments: Investment[]; members: PortfolioMembership[]; [key: string]: any }>;
    updatePortfolio: (portfolioId: string, data: { encryptedData: any }) => Promise<Portfolio>;
    getInvestmentsForPortfolio: (portfolioId: string) => Promise<Investment[]>;
    addInvestment: (portfolioId: string, data: { investmentId: string; encryptedData: any }) => Promise<Investment>;
    updateInvestment: (portfolioId: string, investmentId: string, data: { encryptedData: any }) => Promise<Investment>;
    deleteInvestment: (portfolioId: string, investmentId: string) => Promise<{ success: boolean }>;
    inviteToPortfolio: (portfolioId: string, data: { username: string; encryptedPortfolioKey: string }) => Promise<PortfolioMembership>;
    handlePortfolioInvite: (portfolioId: string, data: { accept: boolean }) => Promise<{ success: boolean }>;
    removePortfolioMember: (portfolioId: string, userId: string) => Promise<{ success: boolean }>;
    lookupInvestmentByIsin: (isin: string, exchange: string, type: string, currency: string) => Promise<LookupSearchResult[]>;
    lookupInvestmentBySymbol: (symbol: string, exchangeMarket: string, type: string, currency: string) => Promise<InvestmentLookupResultV2 | null>;

    // Profile Methods
    getProfile: () => Promise<Profile>;
    createProfile: (data: { username: string; encryptionPublicKey: string; encryptedProfile: any }) => Promise<Profile>;
    updateProfile: (data: { encryptedProfile: any }) => Promise<Profile>;
    deleteProfile: () => Promise<{ success: boolean }>;
    searchProfiles: (query: string, limit?: number) => Promise<{ id: string; username: string; encryption_public_key: string }[]>;

    // Recurring Expense Methods
    getRecurringExpenses: () => Promise<(RecurringExpense & { group_membership: any })[]>;
    createRecurringExpense: (data: { recurringExpenseId: string; groupId: string; encryptedData: any }) => Promise<RecurringExpense>;
    updateRecurringExpense: (recurringId: string, data: { groupId: string; encryptedData: any }) => Promise<RecurringExpense>;
    deleteRecurringExpense: (recurringId: string, data: { groupId: string }) => Promise<{ success: boolean }>;
    generateExpenseFromRecurring: (recurringId: string, data: { expenseId: string; groupId: string; encryptedExpenseData: any; updatedRecurringData: any }) => Promise<{ expense: any; updatedRecurring: RecurringExpense }>;

    // Guide Methods
    getGuides: () => Promise<Guide[]>;
    getGuide: (guideId: string) => Promise<Guide>;

    // Version Methods
    getVersion: () => Promise<VersionResponse>;
    checkVersion: (data: VersionCheckRequest) => Promise<VersionCheckResponse>;

    // Bank Institution Methods
    getBankInstitutions: (countryCode: string) => Promise<Institution[]>;
    createBankAgreement: (institutionId: string, maxHistoricalDays?: number, accessValidForDays?: number) => Promise<BankAgreement>;
    createBankRequisition: (redirectUrl: string, institutionId: string, agreementId: string, reference?: string) => Promise<BankRequisition>;
    getBankTransactions: () => Promise<BankAccountTransactions[]>;
    disconnectBank: () => Promise<{ success: boolean }>;

    // Bulk Operations
    bulkAddUpdateExpenses: (expenses: { id: string; encrypted_data: any; group_id: string; isNew?: boolean; created_at?: string }[]) => Promise<Expense[]>;

    // Subscription Methods
    getSubscription: () => Promise<Subscription>;
    updateSubscription: (subscriptionTier: string, revenueCatCustomerId?: string) => Promise<Subscription>;
}

export const piggusApi: PiggusApi = {
    healthCheck: async (): Promise<HealthCheckResponse> => {
        try {
            console.log('Performing health check...');
            const httpClient = getHttpClient();
            const response = await httpClient.get(`${BASE_URL}/health`);
            console.log('Health check response:', response.data);

            return { success: true, status: 'healthy' };
        } catch (error: any) {
            console.error('Failed to perform health check:', (error as Error)?.message);
            return {
                success: false,
                status: 'error',
                error: error.response?.data?.message || error.message || 'Failed to perform health check'
            };
        }
    },

    // Expense Group Methods
    getExpenseGroups: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/expense-groups`);
        return response.data;
    },

    createExpenseGroup: async (data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/expense-groups`, data);
        return response.data;
    },

    getExpenseGroup: async (groupId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/expense-groups/${groupId}`);
        return response.data;
    },

    updateExpenseGroup: async (groupId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.put(`${BASE_URL}/api/v1/expense-groups/${groupId}`, data);
        return response.data;
    },

    getExpensesForGroup: async (groupId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/expense-groups/${groupId}/expenses`);
        return response.data;
    },

    getExpensesForGroupPaginated: async (groupId: string, params: { page: number; limit: number; startDate?: string; endDate?: string }) => {
        const httpClient = getHttpClient();
        const searchParams = new URLSearchParams({
            page: params.page.toString(),
            limit: params.limit.toString(),
        });

        if (params.startDate) {
            searchParams.append('startDate', params.startDate);
        }
        if (params.endDate) {
            searchParams.append('endDate', params.endDate);
        }

        const response = await httpClient.get(`${BASE_URL}/api/v1/expense-groups/${groupId}/expenses/paginated?${searchParams.toString()}`);
        return response.data;
    },

    addExpense: async (groupId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/expense-groups/${groupId}/expenses`, data);
        return response.data;
    },

    updateExpense: async (groupId: string, expenseId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.put(`${BASE_URL}/api/v1/expense-groups/${groupId}/expenses/${expenseId}`, data);
        return response.data;
    },

    deleteExpense: async (groupId: string, expenseId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.delete(`${BASE_URL}/api/v1/expense-groups/${groupId}/expenses/${expenseId}`);
        return response.data;
    },

    inviteToExpenseGroup: async (groupId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/expense-groups/${groupId}/invite`, data);
        return response.data;
    },

    handleExpenseGroupInvite: async (groupId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/expense-groups/${groupId}/handle-invite`, data);
        return response.data;
    },

    removeExpenseGroupMember: async (groupId: string, userId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.delete(`${BASE_URL}/api/v1/expense-groups/${groupId}/members/${userId}`);
        return response.data;
    },

    // Portfolio Methods
    getPortfolios: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/portfolios`);
        return response.data;
    },

    createPortfolio: async (data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/portfolios`, data);
        return response.data;
    },

    getPortfolio: async (portfolioId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/portfolios/${portfolioId}`);
        return response.data;
    },

    updatePortfolio: async (portfolioId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.put(`${BASE_URL}/api/v1/portfolios/${portfolioId}`, data);
        return response.data;
    },

    getInvestmentsForPortfolio: async (portfolioId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/portfolios/${portfolioId}/investments`);
        return response.data;
    },

    addInvestment: async (portfolioId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/portfolios/${portfolioId}/investments`, data);
        return response.data;
    },

    updateInvestment: async (portfolioId: string, investmentId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.put(`${BASE_URL}/api/v1/portfolios/${portfolioId}/investments/${investmentId}`, data);
        return response.data;
    },

    deleteInvestment: async (portfolioId: string, investmentId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.delete(`${BASE_URL}/api/v1/portfolios/${portfolioId}/investments/${investmentId}`);
        return response.data;
    },

    inviteToPortfolio: async (portfolioId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/portfolios/${portfolioId}/invite`, data);
        return response.data;
    },

    handlePortfolioInvite: async (portfolioId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/portfolios/${portfolioId}/handle-invite`, data);
        return response.data;
    },

    removePortfolioMember: async (portfolioId: string, userId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.delete(`${BASE_URL}/api/v1/portfolios/${portfolioId}/members/${userId}`);
        return response.data;
    },

    lookupInvestmentByIsin: async (isin: string, exchange: string, type: string, currency: string) => {
        const httpClient = getHttpClient();
        const url = `${BASE_URL}/api/v1/portfolios/lookup/isin/${isin}?exchange=${exchange}&type=${type}&currency=${currency}`
        const response = await httpClient.get(url);
        return response.data;
    },

    lookupInvestmentBySymbol: async (symbol: string, exchangeMarket: string, type: string, currency: string) => {
        const httpClient = getHttpClient();
        const url = `${BASE_URL}/api/v1/portfolios/lookup/symbol/${symbol}?exchangeMarket=${exchangeMarket}&type=${type}&currency=${currency}`
        const response = await httpClient.get(url);
        return response.data;
    },

    // Profile Methods
    getProfile: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/profile`);
        return response.data;
    },

    createProfile: async (data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/profile`, data);
        return response.data;
    },

    updateProfile: async (data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.put(`${BASE_URL}/api/v1/profile`, data);
        return response.data;
    },

    searchProfiles: async (query: string, limit: number = 10) => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/profile/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        return response.data;
    },

    deleteProfile: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.delete(`${BASE_URL}/api/v1/profile`);
        return response.data;
    },

    // Recurring Expense Methods
    getRecurringExpenses: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/recurring-expenses`);
        return response.data;
    },

    createRecurringExpense: async (data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/recurring-expenses`, data);
        return response.data;
    },

    updateRecurringExpense: async (recurringId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.put(`${BASE_URL}/api/v1/recurring-expenses/${recurringId}`, data);
        return response.data;
    },

    deleteRecurringExpense: async (recurringId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.delete(`${BASE_URL}/api/v1/recurring-expenses/${recurringId}`, { data });
        return response.data;
    },

    generateExpenseFromRecurring: async (recurringId: string, data) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/recurring-expenses/${recurringId}/generate`, data);
        return response.data;
    },

    // Guide Methods
    getGuides: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/guides`);
        return response.data;
    },

    getGuide: async (guideId: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/guides/${guideId}`);
        return response.data;
    },

    // Version Methods
    getVersion: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/version`);
        return response.data;
    },

    checkVersion: async (data: VersionCheckRequest) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/version/check`, data);
        return response.data;
    },

    // Bank Institution Methods
    getBankInstitutions: async (countryCode: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/bank-institutions/${countryCode.toUpperCase()}`);
        return response.data.data;
    },

    createBankAgreement: async (institutionId: string, maxHistoricalDays: number = 30, accessValidForDays: number = 90) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/bank-agreements`, {
            institutionId,
            maxHistoricalDays,
            accessValidForDays
        });
        return response.data.data;
    },

    createBankRequisition: async (redirectUrl: string, institutionId: string, agreementId: string, reference?: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/bank-requisitions`, {
            redirectUrl,
            institutionId,
            agreementId,
            reference
        });
        return response.data.data;
    },

    getBankTransactions: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/bank-transactions`);
        return response.data.data;
    },

    disconnectBank: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.delete(`${BASE_URL}/api/v1/bank-connection`);
        return response.data;
    },

    // Bulk Operations
    bulkAddUpdateExpenses: async (expenses: { id: string; encrypted_data: any; group_id: string; isNew?: boolean; created_at?: string }[]) => {
        const httpClient = getHttpClient();
        const response = await httpClient.post(`${BASE_URL}/api/v1/expense-groups/bulk-expenses`, {
            expenses
        });
        return response.data.data;
    },

    // Subscription Methods
    getSubscription: async () => {
        const httpClient = getHttpClient();
        const response = await httpClient.get(`${BASE_URL}/api/v1/subscription`);
        return response.data;
    },

    updateSubscription: async (subscriptionTier: string, revenueCatCustomerId?: string) => {
        const httpClient = getHttpClient();
        const response = await httpClient.put(`${BASE_URL}/api/v1/subscription`, {
            subscriptionTier,
            external_customer_id: revenueCatCustomerId
        });
        return response.data;
    }
};
