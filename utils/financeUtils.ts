import {InvestmentWithDecryptedData} from '@/types/investment';

export type InvestmentDetails = Omit<InvestmentWithDecryptedData, 'portfolio_id' | 'created_at' | 'updated_at'>;

export interface InvestmentStats {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  dividendsInterestEarned: number;
  dividendsInterestEarnedPercentage: number;
  estimatedYearlyGainLoss: number;
  estimatedYearlyGainLossPercentage: number;
  projectedValue10Years: number;
  investmentCount: number;
  averageValue: number;
  typeBreakdown: { [key: string]: { value: number; count: number; gainLoss: number } };
}

export interface TypeBreakdown {
  [key: string]: {
    value: number;
    count: number;
    gainLoss: number;
  };
}

// Calculate dividends and interest earned for income-generating assets
export const calculateDividendsInterestEarned = (investment: InvestmentDetails): number => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;
  const currentPrice = investment.data.current_price || purchasePrice;

  if (quantity === 0 || purchasePrice === 0) return 0;

  const currentDate = new Date();
  const purchaseDate = new Date(investment.data.purchase_date);
  const yearsSincePurchase = Math.max(0, (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  let dividendsInterest = 0;

  // For bonds and accounts with interest rates
  if (['bond', 'checkingAccount', 'savingsAccount'].includes(investment.data.type)) {
    const interestRate = investment.data.interest_rate || 0;

    if (interestRate > 0) {
      const initialValue = quantity * purchasePrice;
      dividendsInterest = initialValue * (interestRate / 100) * yearsSincePurchase;
    }
  }

  // For stocks and ETFs with dividend yields
  if (['stock', 'etf'].includes(investment.data.type)) {
    const dividendYield = investment.data.dividend_yield || 0;

    if (dividendYield > 0) {
      const currentValue = quantity * currentPrice;
      dividendsInterest = currentValue * (dividendYield / 100) * yearsSincePurchase;
    }
  }

  // Apply taxation to dividends/interest if it's positive
  if (dividendsInterest > 0) {
    const taxationRate = (investment.data.taxation || 0) / 100;
    dividendsInterest = dividendsInterest * (1 - taxationRate);
  }

  return dividendsInterest;
};

export const calculateCurrentValue = (investment: InvestmentDetails): number => {
  const quantity = investment.data.quantity || 0;
  const currentPrice = investment.data.current_price || investment.data.purchase_price || 0;

  return quantity * currentPrice;
};

// Calculate estimated yearly gain/loss using the formula:
// ((current value - invested value) / number of years + interest rate * invested value) / invested value
export const calculateEstimatedYearlyGainLoss = (investment: InvestmentDetails): { absolute: number; percentage: number } => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;
  const currentPrice = investment.data.current_price || purchasePrice;

  if (quantity === 0 || purchasePrice === 0) return { absolute: 0, percentage: 0 };

  const investedValue = quantity * purchasePrice;
  const currentValue = quantity * currentPrice;

  const currentDate = new Date();
  const purchaseDate = new Date(investment.data.purchase_date);
  const yearsSincePurchase = Math.max(1, (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)); // Minimum 0.1 years

  // Get interest rate for bonds and accounts
  const interestRate = investment.data.interest_rate || 0;

  // Calculate: ((current value - invested value) / number of years + interest rate * invested value) / invested value
  const capitalGainPerYear = (currentValue - investedValue) / yearsSincePurchase;
  const interestPerYear = (interestRate / 100) * investedValue;
  const totalYearlyGain = capitalGainPerYear + interestPerYear;
  
  // Apply taxation to gains if they are positive
  const taxationRate = (investment.data.taxation || 0) / 100;
  const afterTaxYearlyGain = totalYearlyGain > 0 ? totalYearlyGain * (1 - taxationRate) : totalYearlyGain;
  const afterTaxYearlyGainPercentage = (afterTaxYearlyGain / investedValue) * 100;

  return {
    absolute: afterTaxYearlyGain,
    percentage: afterTaxYearlyGainPercentage
  };
};

// Calculate CAGR (Compound Annual Growth Rate) for annualized returns
export const calculateCAGR = (investment: InvestmentWithDecryptedData): number => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;
  const currentPrice = investment.data.current_price || purchasePrice;

  if (quantity === 0 || purchasePrice === 0) return 0;

  const initialValue = quantity * purchasePrice;
  const currentValue = quantity * currentPrice;

  const purchaseDate = new Date(investment.data.purchase_date);
  const currentDate = new Date();
  const yearsSincePurchase = Math.max(0.01, (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  if (currentValue <= 0 || initialValue <= 0) return 0;

  // CAGR = (Current Value / Invested Amount) ^ (1 / years) - 1
  return Math.pow(currentValue / initialValue, 1 / yearsSincePurchase) - 1;
};

// Calculate expected yearly yield based on investment type
export const calculateExpectedYearlyYield = (investment: InvestmentWithDecryptedData): number => {
  const type = investment.data.type;

  // For bonds, use stated interest rate
  if (type === 'bond') {
    return investment.data.interest_rate || 0;
  }

  // For savings/checking accounts, use interest rate
  if (['checkingAccount', 'savingsAccount'].includes(type)) {
    return investment.data.interest_rate || 0;
  }

  // For stocks and ETFs, use dividend yield if available, otherwise use historical performance
  if (['stock', 'etf'].includes(type)) {
    const dividendYield = investment.data.dividend_yield || 0;
    if (dividendYield > 0) {
      return dividendYield;
    }

    // Fall back to historical CAGR
    const cagr = calculateCAGR(investment);
    return cagr * 100; // Convert to percentage
  }

  // Default: use historical CAGR
  const cagr = calculateCAGR(investment);
  return cagr * 100; // Convert to percentage
};

// Enhanced function to calculate expected future value
export const calculateExpectedFutureValue = (
    investment: InvestmentWithDecryptedData,
    yearsFromNow: number
): number => {
  const currentValue = calculateCurrentValue(investment);
  const investmentType = investment.data.type;

  // Get historical performance to project future returns
  const historicalROI = calculateIndividualROI(investment);

  let expectedAnnualReturn: number;

  switch (investmentType) {
    case 'bond':
      // For bonds, use the stated interest rate as expected return
      expectedAnnualReturn = (investment.data.interest_rate || 0) / 100;
      break;

    case 'checkingAccount':
    case 'savingsAccount':
      // For accounts, use interest rate but account for inflation
      const interestRate = (investment.data.interest_rate || 0) / 100;
      const inflationRate = 0.03; // Assume 3% inflation
      expectedAnnualReturn = Math.max(0, interestRate - inflationRate);
      break;

    case 'stock':
    case 'etf':
      // For stocks/ETFs, use historical performance but cap extremes
      if (historicalROI !== null) {
        // Use historical performance but moderate it (regression to mean)
        const marketAverage = 0.10; // Assume 10% long-term market average
        expectedAnnualReturn = (historicalROI * 0.7) + (marketAverage * 0.3);
      } else {
        expectedAnnualReturn = 0.10; // Default to market average
      }
      // Cap between -20% and 25% for reasonableness
      expectedAnnualReturn = Math.max(-0.20, Math.min(0.25, expectedAnnualReturn));
      break;

    default:
      expectedAnnualReturn = 0.05; // Conservative default
  }

  // Apply taxation to expected returns if positive
  if (expectedAnnualReturn > 0) {
    const taxationRate = (investment.data.taxation || 0) / 100;
    expectedAnnualReturn = expectedAnnualReturn * (1 - taxationRate);
  }

  return currentValue * Math.pow(1 + expectedAnnualReturn, yearsFromNow);
};

// Calculate individual investment ROI
export const calculateIndividualROI = (investment: InvestmentWithDecryptedData): number | null => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;

  if (quantity === 0 || purchasePrice === 0) return null;

  const initialValue = quantity * purchasePrice;
  const currentValue = calculateCurrentValue(investment);

  const purchaseDate = new Date(investment.data.purchase_date);
  const currentDate = new Date();
  const daysSincePurchase = Math.floor((currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const yearsSincePurchase = daysSincePurchase / 365.25;

  // Special handling for bonds
  if (investment.data.type === 'bond') {
    // For zero coupon bonds, calculate yield to maturity if we have maturity date
    const interestRate = investment.data.interest_rate || 0;

    if (!interestRate && investment.data.maturity_date) {
      const maturityDate = new Date(investment.data.maturity_date);
      const totalDaysToMaturity = Math.floor((maturityDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      const yearsToMaturity = totalDaysToMaturity / 365.25;

      if (yearsToMaturity > 0) {
        // Use face value (current_price) as maturity value for zero coupon bonds
        const faceValue = investment.data.current_price || purchasePrice;
        const yieldToMaturity = Math.pow(faceValue / purchasePrice, 1 / yearsToMaturity) - 1;
        return yieldToMaturity;
      }
    }

    // For regular bonds with interest rates, use the stated interest rate
    if (interestRate) {
      return interestRate / 100;
    }
  }

  // Special handling for checking/savings accounts
  if (['checkingAccount', 'savingsAccount'].includes(investment.data.type)) {
    const interestRate = investment.data.interest_rate || 0;

    // If there's a stated interest rate, use it
    if (interestRate) {
      return interestRate / 100;
    }

    // If no interest rate but there's balance growth, calculate based on that
    if (!interestRate) {
      const currentPrice = investment.data.current_price || purchasePrice;
      if (currentPrice !== purchasePrice && yearsSincePurchase > 0) {
        // Calculate based on balance growth
        return Math.pow(currentPrice / purchasePrice, 1 / yearsSincePurchase) - 1;
      }
      // If no growth and no interest rate, assume minimal return (0.01% for liquidity)
      return 0.0001;
    }
  }

  // For stocks, ETFs, and other market investments
  if (yearsSincePurchase <= 0) {
    // For same-day purchases, estimate based on current vs purchase price
    const currentPrice = investment.data.current_price || purchasePrice;
    if (currentPrice !== purchasePrice) {
      // Assume this represents a reasonable annual expectation
      const priceChange = (currentPrice - purchasePrice) / purchasePrice;
      // Cap the annualized estimate for same-day investments
      return Math.max(-0.5, Math.min(0.5, priceChange));
    }
    return null;
  }

  // Use CAGR for annualized returns
  if (currentValue <= 0 || initialValue <= 0) return null;

  const annualizedReturn = Math.pow(currentValue / initialValue, 1 / yearsSincePurchase) - 1;

  // Filter out extreme outliers but be more lenient for short-term holdings
  const maxReturn = yearsSincePurchase < 0.25 ? 5.0 : 2.0; // 500% for < 3 months, 200% for longer
  if (Math.abs(annualizedReturn) > maxReturn) return null;

  return annualizedReturn;
};

// Calculate weighted average yearly ROI using CAGR
export const calculateYearlyROI = (investments: InvestmentWithDecryptedData[]): number => {
  if (!investments.length) return 0;

  let totalWeightedROI = 0;
  let totalInitialValue = 0;
  let validInvestments = 0;

  for (const investment of investments) {
    const quantity = investment.data.quantity || 0;
    const purchasePrice = investment.data.purchase_price || 0;

    if (quantity === 0 || purchasePrice === 0) continue;

    const initialValue = quantity * purchasePrice;
    const cagr = calculateCAGR(investment);

    // Filter out extreme outliers (beyond ±200% annually)
    if (Math.abs(cagr) > 2.0) continue;

    totalWeightedROI += cagr * initialValue;
    totalInitialValue += initialValue;
    validInvestments++;
  }

  // If no valid investments, return 0
  if (validInvestments === 0 || totalInitialValue === 0) return 0;

  return totalWeightedROI / totalInitialValue;
};

// Simplified investment statistics calculation
export const calculateInvestmentStatistics = (investments: InvestmentWithDecryptedData[]): InvestmentStats => {
  if (!investments?.length) {
    return {
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPercentage: 0,
      dividendsInterestEarned: 0,
      dividendsInterestEarnedPercentage: 0,
      estimatedYearlyGainLoss: 0,
      estimatedYearlyGainLossPercentage: 0,
      projectedValue10Years: 0,
      investmentCount: 0,
      averageValue: 0,
      typeBreakdown: {},
    };
  }

  const totalInvested = investments.reduce((sum, inv) => {
    return sum + (inv.data.quantity * inv.data.purchase_price);
  }, 0);

  // Calculate after-tax values by using individual investment calculations
  let totalAfterTaxValue = 0;
  let totalAfterTaxGainLoss = 0;
  let totalDividendsInterestEarned = 0;

  investments.forEach(inv => {
    const individualReturns = calculateIndividualInvestmentReturns(inv);
    totalAfterTaxValue += individualReturns.totalValue;
    totalAfterTaxGainLoss += individualReturns.totalGainLoss;
    totalDividendsInterestEarned += individualReturns.dividendsInterestEarned;
  });

  const totalGainLossPercentage = totalInvested > 0 ? (totalAfterTaxGainLoss / totalInvested) * 100 : 0;

  // Calculate weighted average CAGR
  let totalWeightedCAGR = 0;
  let totalWeight = 0;

  investments.forEach(inv => {
    const invested = inv.data.quantity * inv.data.purchase_price;
    if (invested > 0) {
      const cagr = calculateCAGR(inv);
      totalWeightedCAGR += cagr * invested;
      totalWeight += invested;
    }
  });

  // Calculate weighted average expected yearly yield using after-tax values
  let totalWeightedYield = 0;
  investments.forEach(inv => {
    const individualReturns = calculateIndividualInvestmentReturns(inv);
    if (individualReturns.totalValue > 0) {
      const expectedYield = calculateExpectedYearlyYield(inv);
      // Apply taxation to expected yield if positive
      const taxationRate = (inv.data.taxation || 0) / 100;
      const afterTaxExpectedYield = expectedYield > 0 ? expectedYield * (1 - taxationRate) : expectedYield;
      totalWeightedYield += afterTaxExpectedYield * individualReturns.totalValue;
    }
  });

  // Type breakdown using after-tax values
  const typeBreakdown: TypeBreakdown = investments.reduce((acc, inv) => {
    const type = inv.data.type || 'other';
    const individualReturns = calculateIndividualInvestmentReturns(inv);

    if (!acc[type]) {
      acc[type] = { value: 0, count: 0, gainLoss: 0 };
    }

    acc[type].value += individualReturns.totalValue;
    acc[type].count += 1;
    acc[type].gainLoss += individualReturns.totalGainLoss;

    return acc;
  }, {} as TypeBreakdown);

  // Calculate dividends/interest earned percentage
  const dividendsInterestEarnedPercentage = totalInvested > 0 ? (totalDividendsInterestEarned / totalInvested) * 100 : 0;

  // Calculate estimated yearly gain/loss using after-tax values
  let totalYearlyGain = 0;
  let totalWeightedYearlyPercentage = 0;
  let totalYearlyWeight = 0;

  investments.forEach(inv => {
    const invested = inv.data.quantity * inv.data.purchase_price;
    if (invested > 0) {
      const yearlyGain = calculateEstimatedYearlyGainLoss(inv); // Already after-tax
      totalYearlyGain += yearlyGain.absolute;
      totalWeightedYearlyPercentage += yearlyGain.percentage * invested;
      totalYearlyWeight += invested;
    }
  });

  const estimatedYearlyGainLoss = totalYearlyGain;
  const estimatedYearlyGainLossPercentage = totalYearlyWeight > 0 ? totalWeightedYearlyPercentage / totalYearlyWeight : 0;

  // Calculate projected value for 10 years using the estimated yearly gain/loss rate
  const yearlyGainLossRate = estimatedYearlyGainLossPercentage / 100;
  const projectedValue10Years = calculateProjectedValueWithComposition(totalAfterTaxValue, yearlyGainLossRate, 10);

  return {
    totalValue: totalAfterTaxValue,
    totalInvested,
    totalGainLoss: totalAfterTaxGainLoss,
    totalGainLossPercentage,
    dividendsInterestEarned: totalDividendsInterestEarned,
    dividendsInterestEarnedPercentage,
    estimatedYearlyGainLoss,
    estimatedYearlyGainLossPercentage,
    projectedValue10Years,
    investmentCount: investments.length,
    averageValue: investments.length > 0 ? totalAfterTaxValue / investments.length : 0,
    typeBreakdown,
  };
};

// Additional utility function for portfolio analysis
export const getInvestmentProjections = (
    investments: InvestmentWithDecryptedData[],
    timeHorizons: number[] = [1, 3, 5, 10]
): { [years: number]: number } => {
  const projections: { [years: number]: number } = {};

  for (const years of timeHorizons) {
    projections[years] = investments.reduce((sum, inv) => {
      return sum + calculateExpectedFutureValue(inv, years);
    }, 0);
  }

  return projections;
};

// Calculate projected value using yearly return composition
export const calculateProjectedValueWithComposition = (
    currentValue: number,
    yearlyROI: number,
    years: number
): number => {
  if (currentValue <= 0 || years <= 0) return currentValue;

  return currentValue * Math.pow(1 + yearlyROI, years);
};

// Generate projection data for charts using yearly return composition
export const generateProjectionData = (
    currentValue: number,
    yearlyROI: number,
    yearRange: number = 10
): { year: number; value: number }[] => {
  const currentYear = new Date().getFullYear();
  const data: { year: number; value: number }[] = [];

  for (let i = 0; i <= yearRange; i++) {
    const year = currentYear + i;
    const value = calculateProjectedValueWithComposition(currentValue, yearlyROI, i);
    data.push({ year, value });
  }

  return data;
};


export const calculateIndividualInvestmentReturns = (investment: InvestmentDetails) => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;
  const totalInvested = quantity * purchasePrice;

  if (totalInvested === 0) {
    return {
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPercentage: 0,
      dividendsInterestEarned: 0,
      dividendsInterestEarnedPercentage: 0,
      estimatedYearlyGainLoss: 0,
      estimatedYearlyGainLossPercentage: 0
    };
  }

  const currentValue = calculateCurrentValue(investment);
  const baseGainLoss = currentValue - totalInvested;
  
  // Apply taxation to capital gains only if positive
  const taxationRate = (investment.data.taxation || 0) / 100;
  const afterTaxBaseGainLoss = baseGainLoss > 0 ? baseGainLoss * (1 - taxationRate) : baseGainLoss;
  
  // dividendsInterestEarned already has taxation applied inside the function
  const dividendsInterestEarned = calculateDividendsInterestEarned(investment);
  
  const totalGainLoss = afterTaxBaseGainLoss + dividendsInterestEarned;
  const totalGainLossPercentage = (totalGainLoss / totalInvested) * 100;
  const dividendsInterestEarnedPercentage = (dividendsInterestEarned / totalInvested) * 100;
  
  // estimatedYearlyGain already has taxation applied inside the function
  const estimatedYearlyGain = calculateEstimatedYearlyGainLoss(investment);

  return {
    totalValue: totalInvested + totalGainLoss, // Invested amount + after-tax gains
    totalInvested,
    totalGainLoss,
    totalGainLossPercentage,
    dividendsInterestEarned,
    dividendsInterestEarnedPercentage,
    estimatedYearlyGainLoss: estimatedYearlyGain.absolute,
    estimatedYearlyGainLossPercentage: estimatedYearlyGain.percentage
  };
};
