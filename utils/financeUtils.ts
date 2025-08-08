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
  yearlyDividendInterest: number; // Yearly dividend/interest earnings
  yearlyDividendInterestPercentage: number; // Yearly dividend/interest percentage
  yearlyCapitalGains: number; // Yearly capital gains
  yearlyCapitalGainsPercentage: number; // Yearly capital gains percentage
  projectedValue10Years: number;
  investmentCount: number;
  averageValue: number;
  typeBreakdown: TypeBreakdown;
  cagr: number; // Compound Annual Growth Rate
  estimatedTaxRate: number; // Average estimated tax rate across investments
}

export interface TypeBreakdown {
  [key: string]: {
    value: number;
    count: number;
    gainLoss: number;
    estimatedYearlyGainLoss: number;
    estimatedYearlyGainLossPercentage: number;
    investedValue: number; // Amount invested in this type
  };
}

// Calculate dividends and interest earned for income-generating assets (LIFETIME)
export const calculateDividendsInterestEarned = (investment: InvestmentDetails): number => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;
  const currentPrice = investment.data.current_price || purchasePrice;

  if (quantity === 0 || purchasePrice === 0) return 0;

  const currentDate = new Date();
  const purchaseDate = new Date(investment.data.purchase_date);
  const yearsSincePurchase = Math.max(0, (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  let dividendsInterest = 0;

  // For any investment type with interest rates
  const interestRate = investment.data.interest_rate || 0;
  if (interestRate > 0) {
    const initialValue = quantity * purchasePrice;
    dividendsInterest = initialValue * (interestRate / 100) * yearsSincePurchase;
  }

  // For stocks and ETFs with dividend yields (in addition to interest rates)
  if (['stock', 'etf'].includes(investment.data.type)) {
    const dividendYield = investment.data.dividend_yield || 0;

    if (dividendYield > 0) {
      const currentValue = quantity * currentPrice;
      const dividendIncome = currentValue * (dividendYield / 100) * yearsSincePurchase;
      dividendsInterest += dividendIncome; // Add to existing interest calculation
    }
  }

  // Apply taxation to dividends/interest if it's positive
  if (dividendsInterest > 0) {
    const taxationRate = (investment.data.taxation || 0) / 100;
    dividendsInterest = dividendsInterest * (1 - taxationRate);
  }

  return dividendsInterest;
};

// Calculate yearly dividend/interest earnings
export const calculateYearlyDividendInterest = (investment: InvestmentDetails): number => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;
  const currentPrice = investment.data.current_price || purchasePrice;

  if (quantity === 0 || purchasePrice === 0) return 0;

  let yearlyDividendInterest = 0;

  // For any investment type with interest rates
  const interestRate = investment.data.interest_rate || 0;
  if (interestRate > 0) {
    const initialValue = quantity * purchasePrice;
    yearlyDividendInterest = initialValue * (interestRate / 100);
  }

  // For stocks and ETFs with dividend yields (in addition to interest rates)
  if (['stock', 'etf'].includes(investment.data.type)) {
    const dividendYield = investment.data.dividend_yield || 0;

    if (dividendYield > 0) {
      const currentValue = quantity * currentPrice;
      const yearlyDividendIncome = currentValue * (dividendYield / 100);
      yearlyDividendInterest += yearlyDividendIncome; // Add to existing interest calculation
    }
  }

  // Apply taxation to dividends/interest if it's positive
  if (yearlyDividendInterest > 0) {
    const taxationRate = (investment.data.taxation || 0) / 100;
    yearlyDividendInterest = yearlyDividendInterest * (1 - taxationRate);
  }

  return yearlyDividendInterest;
};

// Calculate yearly capital gains (excluding dividends/interest)
export const calculateYearlyCapitalGains = (investment: InvestmentDetails): number => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;
  const currentPrice = investment.data.current_price || purchasePrice;

  if (quantity === 0 || purchasePrice === 0) return 0;

  const investedValue = quantity * purchasePrice;
  const currentValue = quantity * currentPrice;

  const currentDate = new Date();
  const purchaseDate = new Date(investment.data.purchase_date);
  const yearsSincePurchase = Math.max(1, (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

  // Calculate yearly capital gains (price appreciation only)
  const totalCapitalGain = currentValue - investedValue;
  const yearlyCapitalGain = totalCapitalGain / yearsSincePurchase;

  // Apply taxation to capital gains if they are positive
  const taxationRate = (investment.data.taxation || 0) / 100;
  const afterTaxYearlyCapitalGain = yearlyCapitalGain > 0 ? yearlyCapitalGain * (1 - taxationRate) : yearlyCapitalGain;

  return afterTaxYearlyCapitalGain;
};

export const calculateCurrentValue = (investment: InvestmentDetails): number => {
  const quantity = investment.data.quantity || 0;
  const currentPrice = investment.data.current_price || investment.data.purchase_price || 0;

  return quantity * currentPrice;
};

// Calculate estimated yearly gain/loss using compound annual growth rate (CAGR) approach
export const calculateEstimatedYearlyGainLoss = (investment: InvestmentDetails): { absolute: number; percentage: number } => {
  const quantity = investment.data.quantity || 0;
  const purchasePrice = investment.data.purchase_price || 0;
  const currentPrice = investment.data.current_price || purchasePrice;

  if (quantity === 0 || purchasePrice === 0) return { absolute: 0, percentage: 0 };

  const investedValue = quantity * purchasePrice;
  const currentValue = quantity * currentPrice;

  const currentDate = new Date();
  const purchaseDate = new Date(investment.data.purchase_date);
  const yearsSincePurchase = Math.max(1, (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)); // Minimum 1 year

  // Special handling for zero coupon bonds - use yield to maturity instead of current performance
  if (investment.data.type === 'bond' && !investment.data.interest_rate && investment.data.maturity_date) {
    const maturityDate = new Date(investment.data.maturity_date);
    const yearsToMaturity = (maturityDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (yearsToMaturity > 0) {
      const yieldToMaturity = Math.pow(currentValue / investedValue, 1 / yearsToMaturity) - 1;
      const annualCapitalGain = investedValue * yieldToMaturity;
      
      // Apply taxation to gains if they are positive
      const taxationRate = (investment.data.taxation || 0) / 100;
      const afterTaxYearlyGain = annualCapitalGain > 0 ? annualCapitalGain * (1 - taxationRate) : annualCapitalGain;
      const afterTaxYearlyGainPercentage = (afterTaxYearlyGain / investedValue) * 100;

      return {
        absolute: afterTaxYearlyGain,
        percentage: afterTaxYearlyGainPercentage
      };
    }
  }

  // Calculate compound annual growth rate (CAGR) for capital gains
  const capitalGainCAGR = currentValue > 0 && investedValue > 0 
    ? Math.pow(currentValue / investedValue, 1 / yearsSincePurchase) - 1
    : 0;

  // Calculate annual capital gain in absolute terms
  const annualCapitalGain = investedValue * capitalGainCAGR;

  // Add any annual interest/dividend income
  const interestRate = investment.data.interest_rate || 0;
  const dividendYield = investment.data.dividend_yield || 0;
  const annualIncome = investedValue * ((interestRate + dividendYield) / 100);

  const totalYearlyGain = annualCapitalGain + annualIncome;

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
  const daysSincePurchase = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
  const yearsSincePurchase = daysSincePurchase / 365.25;

  if (currentValue <= 0 || initialValue <= 0) return 0;

  // For very recent investments (less than 30 days), return simple return rate capped at reasonable bounds
  if (daysSincePurchase < 30) {
    const simpleReturn = (currentValue - initialValue) / initialValue;
    return Math.max(-0.5, Math.min(0.5, simpleReturn)); // Cap at ±50%
  }

  // For investments less than 1 year, use minimum of 3 months for calculation
  const adjustedYears = Math.max(0.25, yearsSincePurchase);

  // CAGR = (Current Value / Invested Amount) ^ (1 / years) - 1
  const cagr = Math.pow(currentValue / initialValue, 1 / adjustedYears) - 1;
  
  // Cap CAGR at reasonable bounds
  return Math.max(-0.95, Math.min(10, cagr)); // Cap between -95% and 1000%
};

// Calculate expected yearly yield based on investment type
export const calculateExpectedYearlyYield = (investment: InvestmentWithDecryptedData): number => {
  const type = investment.data.type;

  // For bonds, use stated interest rate or calculate yield to maturity for zero coupon bonds
  if (type === 'bond') {
    const interestRate = investment.data.interest_rate || 0;
    if (interestRate > 0) {
      return interestRate;
    }
    
    // For zero coupon bonds, use yield to maturity calculation
    if (investment.data.maturity_date) {
      const purchasePrice = investment.data.purchase_price || 0;
      const faceValue = investment.data.current_price || purchasePrice;
      const purchaseDate = new Date(investment.data.purchase_date);
      const maturityDate = new Date(investment.data.maturity_date);
      const yearsToMaturity = (maturityDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      if (yearsToMaturity > 0 && purchasePrice > 0 && faceValue > 0) {
        const yieldToMaturity = (Math.pow(faceValue / purchasePrice, 1 / yearsToMaturity) - 1) * 100;
        return Math.max(0, Math.min(50, yieldToMaturity)); // Cap between 0% and 50%
      }
    }
    
    return 0; // Default for bonds without interest rate or maturity date
  }

  // For any investment with an interest rate, use it as the primary yield
  const interestRate = investment.data.interest_rate || 0;
  if (interestRate > 0) {
    return interestRate;
  }

  // For stocks and ETFs, use dividend yield if available, otherwise use historical performance
  if (['stock', 'etf'].includes(type)) {
    const dividendYield = investment.data.dividend_yield || 0;
    if (dividendYield > 0) {
      return dividendYield;
    }

    // Fall back to historical CAGR
    const cagr = calculateCAGR(investment);
    return Math.max(-50, Math.min(50, cagr * 100)); // Cap between -50% and 50%
  }

  // Default: use historical CAGR
  const cagr = calculateCAGR(investment);
  return Math.max(-50, Math.min(50, cagr * 100)); // Cap between -50% and 50%
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
      const accountInterestRate = (investment.data.interest_rate || 0) / 100;
      const inflationRate = 0.03; // Assume 3% inflation
      expectedAnnualReturn = Math.max(0, accountInterestRate - inflationRate);
      break;

    case 'stock':
    case 'etf':
      // For stocks/ETFs, consider interest rate if specified, otherwise use historical performance
      const stockInterestRate = (investment.data.interest_rate || 0) / 100;
      if (stockInterestRate > 0) {
        // If an interest rate is specified, use it as the primary return expectation
        expectedAnnualReturn = stockInterestRate;
      } else if (historicalROI !== null) {
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
      // For any other investment type, use interest rate if specified
      const defaultInterestRate = (investment.data.interest_rate || 0) / 100;
      expectedAnnualReturn = defaultInterestRate > 0 ? defaultInterestRate : 0.05; // Conservative default
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
        // Cap yield to reasonable bounds
        return Math.max(-0.5, Math.min(0.5, yieldToMaturity)); // Cap between -50% and 50%
      }
    }

    // For regular bonds with interest rates, use the stated interest rate
    if (interestRate) {
      return interestRate / 100;
    }
  }

  // Special handling for any investment with an explicit interest rate
  const interestRate = investment.data.interest_rate || 0;
  if (interestRate > 0) {
    return interestRate / 100;
  }

  // Special handling for checking/savings accounts without interest rates
  if (['checkingAccount', 'savingsAccount'].includes(investment.data.type) && !interestRate) {
    const currentPrice = investment.data.current_price || purchasePrice;
    if (currentPrice !== purchasePrice && yearsSincePurchase > 0) {
      // Calculate based on balance growth
      return Math.pow(currentPrice / purchasePrice, 1 / yearsSincePurchase) - 1;
    }
    // If no growth and no interest rate, assume minimal return (0.01% for liquidity)
    return 0.0001;
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
      yearlyDividendInterest: 0,
      yearlyDividendInterestPercentage: 0,
      yearlyCapitalGains: 0,
      yearlyCapitalGainsPercentage: 0,
      projectedValue10Years: 0,
      investmentCount: 0,
      averageValue: 0,
      typeBreakdown: {},
      cagr: 0,
      estimatedTaxRate: 0,
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
    const investedAmount = (inv.data.quantity || 0) * (inv.data.purchase_price || 0);

    if (!acc[type]) {
      acc[type] = {
        value: 0,
        count: 0,
        gainLoss: 0,
        estimatedYearlyGainLoss: 0,
        estimatedYearlyGainLossPercentage: 0,
        investedValue: 0
      };
    }

    acc[type].value += individualReturns.totalValue;
    acc[type].count += 1;
    acc[type].gainLoss += individualReturns.totalGainLoss;
    acc[type].estimatedYearlyGainLoss += individualReturns.estimatedYearlyGainLoss;
    acc[type].estimatedYearlyGainLossPercentage = acc[type].value > 0 ? (acc[type].estimatedYearlyGainLoss / acc[type].value) * 100 : 0;
    acc[type].investedValue += investedAmount;

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

  // Calculate portfolio CAGR (Compound Annual Growth Rate)
  let portfolioCagr = 0;
  if (totalInvested > 0 && totalWeightedCAGR > 0) {
    portfolioCagr = totalWeightedCAGR / totalInvested;
  }

  // Calculate average estimated tax rate
  let avgTaxRate = 0;
  let totalTaxWeight = 0;
  investments.forEach(inv => {
    const invested = (inv.data.quantity || 0) * (inv.data.purchase_price || 0);
    const taxRate = inv.data.taxation || 0; // Fixed: use taxation field instead of estimated_tax_rate
    if (invested > 0) {
      avgTaxRate += taxRate * invested;
      totalTaxWeight += invested;
    }
  });
  const estimatedTaxRate = totalTaxWeight > 0 ? avgTaxRate / totalTaxWeight : 0;

  // Calculate yearly dividend/interest and capital gains using the new separate functions
  let totalYearlyDividend = 0;
  let totalYearlyCapitalGains = 0;
  investments.forEach(inv => {
    totalYearlyDividend += calculateYearlyDividendInterest(inv);
    totalYearlyCapitalGains += calculateYearlyCapitalGains(inv);
  });

  const yearlyDividendInterestPercentage = totalInvested > 0 ? (totalYearlyDividend / totalInvested) * 100 : 0;
  const yearlyCapitalGainsPercentage = totalInvested > 0 ? (totalYearlyCapitalGains / totalInvested) * 100 : 0;

  return {
    totalValue: totalAfterTaxValue,
    totalInvested,
    totalGainLoss: totalAfterTaxGainLoss,
    totalGainLossPercentage,
    dividendsInterestEarned: totalDividendsInterestEarned,
    dividendsInterestEarnedPercentage,
    estimatedYearlyGainLoss,
    estimatedYearlyGainLossPercentage,
    yearlyDividendInterest: totalYearlyDividend,
    yearlyDividendInterestPercentage,
    yearlyCapitalGains: totalYearlyCapitalGains,
    yearlyCapitalGainsPercentage,
    projectedValue10Years,
    investmentCount: investments.length,
    averageValue: investments.length > 0 ? totalAfterTaxValue / investments.length : 0,
    typeBreakdown,
    cagr: portfolioCagr,
    estimatedTaxRate,
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
