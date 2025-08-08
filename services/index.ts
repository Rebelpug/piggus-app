// Service layer exports - clean API for all business logic services

// Expense services
export {
  apiFetchExpenses, // Keep for backward compatibility if needed elsewhere
  apiFetchExpenseGroupsOnly,
  apiFetchExpensesPaginated,
  apiCreateExpensesGroup,
  apiAddExpense,
  apiUpdateExpense,
  apiDeleteExpense,
  apiInviteUserToGroup,
  apiHandleGroupInvitation,
  apiUpdateExpenseGroup,
  apiRemoveUserFromGroup,
} from './expenseService';

// Investment/Portfolio services
export {
  apiFetchPortfolios,
  apiCreatePortfolio,
  apiAddInvestment,
  apiUpdateInvestment,
  apiDeleteInvestment,
  apiInviteUserToPortfolio,
  apiHandlePortfolioInvitation,
  apiUpdatePortfolio,
  apiRemoveUserFromPortfolio,
  apiLookupInvestmentBySymbol,
} from './investmentService';

// Profile services
export {
  apiFetchProfile,
  apiCreateProfile,
  apiUpdateProfile,
} from './profileService';

// Recurring expense services
export {
  apiFetchRecurringExpenses,
  apiCreateRecurringExpense,
  apiUpdateRecurringExpense,
  apiDeleteRecurringExpense,
  apiProcessRecurringExpenses,
} from './recurringExpenseService';

// Guide services
export {
  apiFetchGuides,
  apiFetchGuide,
} from './guideService';