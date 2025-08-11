import { InvestmentWithDecryptedData } from "@/types/investment";

export type InvestmentDetails = Omit<
  InvestmentWithDecryptedData,
  "portfolio_id" | "created_at" | "updated_at"
>;

export interface InvestmentStats {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  dividendsInterestEarned: number;
  dividendsInterestEarnedPercentage: number;
  estimatedYearlyGainLoss: number;
  estimatedYearlyGainLossPercentage: number;
  yearlyDividendInterest: number;
  yearlyDividendInterestPercentage: number;
  yearlyCapitalGains: number;
  yearlyCapitalGainsPercentage: number;
  projectedValue10Years: number;
  investmentCount: number;
  averageValue: number;
  typeBreakdown: TypeBreakdown;
  cagr: number;
  estimatedTaxRate: number;
}

export interface TypeBreakdown {
  [key: string]: {
    value: number;
    count: number;
    gainLoss: number;
    estimatedYearlyGainLoss: number;
    estimatedYearlyGainLossPercentage: number;
    investedValue: number;
  };
}

/**
 * Apply tax to a positive amount; does nothing on zero or negative values.
 */
const applyTax = (amount: number, taxRatePercent: number | null): number => {
  if (taxRatePercent === null) return amount;
  if (amount <= 0 || taxRatePercent <= 0) return amount;
  return amount * (1 - taxRatePercent / 100);
};

/**
 * Calculate lifetime dividends and interest earned after tax.
 */
export const calculateDividendsInterestEarned = (
  investment: InvestmentDetails,
): number => {
  const {
    quantity = 0,
    purchase_price = 0,
    current_price,
    interest_rate = 0,
    dividend_yield = 0,
    taxation = 0,
    purchase_date,
    type,
  } = investment.data;

  if (quantity === 0 || purchase_price === 0) return 0;

  const currPrice = current_price ?? purchase_price;

  const currentDate = new Date();
  const purchaseDate = new Date(purchase_date);
  let yearsSincePurchase =
    (currentDate.getTime() - purchaseDate.getTime()) /
    (1000 * 60 * 60 * 24 * 365.25);

  if (yearsSincePurchase < 0) yearsSincePurchase = 0;

  let dividendsInterest = 0;

  if (interest_rate && interest_rate > 0) {
    const initialValue = quantity * purchase_price;
    dividendsInterest +=
      initialValue * (interest_rate / 100) * yearsSincePurchase;
  }

  if (["stock", "etf"].includes(type)) {
    if (dividend_yield && dividend_yield > 0) {
      const currentValue = quantity * currPrice;
      dividendsInterest +=
        currentValue * (dividend_yield / 100) * yearsSincePurchase;
    }
  }

  return applyTax(dividendsInterest, taxation);
};

/**
 * Calculate estimated yearly dividend and interest earnings after tax.
 */
export const calculateYearlyDividendInterest = (
  investment: InvestmentDetails,
): number => {
  const {
    quantity = 0,
    purchase_price = 0,
    current_price,
    interest_rate = 0,
    dividend_yield = 0,
    taxation = 0,
    type,
  } = investment.data;

  if (quantity === 0 || purchase_price === 0) return 0;

  const currPrice = current_price ?? purchase_price;

  let yearlyDividendInterest = 0;

  if (interest_rate && interest_rate > 0) {
    const initialValue = quantity * purchase_price;
    yearlyDividendInterest += initialValue * (interest_rate / 100);
  }

  if (["stock", "etf"].includes(type)) {
    if (dividend_yield && dividend_yield > 0) {
      const currentValue = quantity * currPrice;
      yearlyDividendInterest += currentValue * (dividend_yield / 100);
    }
  }

  return applyTax(yearlyDividendInterest, taxation);
};

export const calculateYearlyCapitalGains = (
  investment: InvestmentDetails,
): number => {
  const {
    quantity = 0,
    purchase_price = 0,
    current_price,
    taxation = 0,
    purchase_date,
    maturity_date,
    type,
  } = investment.data;

  if (quantity === 0 || purchase_price === 0) return 0;

  const currPrice = current_price ?? purchase_price;
  const investedValue = quantity * purchase_price;

  const currentDate = new Date();
  const purchaseDate = new Date(purchase_date);

  let yearsSincePurchase =
    (currentDate.getTime() - purchaseDate.getTime()) /
    (1000 * 60 * 60 * 24 * 365.25);

  // Floor at 0.1 years (~36 days)
  yearsSincePurchase = Math.max(yearsSincePurchase, 0.1);

  // Special handling for zero coupon bonds (no interest rate, has maturity)
  if (type === "bond" && !investment.data.interest_rate && maturity_date) {
    const maturityDate = new Date(maturity_date);
    const yearsToMaturity =
      (maturityDate.getTime() - currentDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);

    if (yearsToMaturity > 0) {
      // The total gain is face value minus invested
      const faceValue = quantity * currPrice; // assuming current_price is face value for zero coupon bonds
      const totalGain = faceValue - investedValue;

      // The realized gain so far is proportional to time elapsed since purchase:
      const totalBondDuration =
        (maturityDate.getTime() - purchaseDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);

      const realizedGain = totalGain * (yearsSincePurchase / totalBondDuration);

      // Annualize the realized gain over time held
      const yearlyCapitalGain = realizedGain / yearsSincePurchase;

      return applyTax(
        yearlyCapitalGain > 0 ? yearlyCapitalGain : realizedGain,
        taxation,
      );
    }
  }

  // For other investment types or bonds without maturity date, use previous logic
  const currentValue = quantity * currPrice;
  const totalCapitalGain = currentValue - investedValue;

  const yearlyCapitalGain = totalCapitalGain / yearsSincePurchase;

  return applyTax(
    yearlyCapitalGain > 0 ? yearlyCapitalGain : totalCapitalGain,
    taxation,
  );
};

/**
 * Calculate current total value of the investment.
 */
export const calculateCurrentValue = (
  investment: InvestmentDetails,
): number => {
  const { quantity = 0, current_price, purchase_price = 0 } = investment.data;
  const currPrice = current_price ?? purchase_price;

  return quantity * currPrice;
};

/**
 * Calculate estimated yearly gain/loss after tax using CAGR for price appreciation plus income.
 * Handles zero-coupon bonds with yield to maturity based on current date to maturity.
 */
export const calculateEstimatedYearlyGainLoss = (
  investment: InvestmentDetails,
): { absolute: number; percentage: number } => {
  const {
    quantity = 0,
    purchase_price = 0,
    current_price,
    interest_rate = 0,
    dividend_yield = 0,
    taxation = 0,
    purchase_date,
    maturity_date,
    type,
  } = investment.data;

  if (quantity === 0 || purchase_price === 0)
    return { absolute: 0, percentage: 0 };

  const currPrice = current_price ?? purchase_price;
  const investedValue = quantity * purchase_price;
  const currentValue = quantity * currPrice;

  const currentDate = new Date();
  const purchaseDate = new Date(purchase_date);

  // Minimum floor of 0.1 years to avoid inflated returns during short holding periods
  let yearsSincePurchase =
    (currentDate.getTime() - purchaseDate.getTime()) /
    (1000 * 60 * 60 * 24 * 365.25);
  yearsSincePurchase = Math.max(yearsSincePurchase, 0.1);

  // Handle zero-coupon bond YTM from current date to maturity date if no interest rate specified
  if (type === "bond" && !interest_rate && maturity_date) {
    const maturityDate = new Date(maturity_date);
    const yearsToMaturity =
      (maturityDate.getTime() - currentDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);

    if (yearsToMaturity > 0) {
      // Use face_value if available, otherwise current price as proxy for maturity value
      const faceValue = quantity * currPrice;

      const yieldToMaturity =
        Math.pow(faceValue / investedValue, 1 / yearsToMaturity) - 1;
      const annualCapitalGain = investedValue * yieldToMaturity;

      const afterTaxGain = applyTax(annualCapitalGain, taxation);

      return {
        absolute: afterTaxGain,
        percentage: (afterTaxGain / investedValue) * 100,
      };
    }
  }

  // Calculate CAGR for capital gains
  const capitalGainCAGR =
    currentValue > 0 && investedValue > 0
      ? Math.pow(currentValue / investedValue, 1 / yearsSincePurchase) - 1
      : 0;

  const annualCapitalGain = investedValue * capitalGainCAGR;
  const annualIncome =
    investedValue * (((interest_rate || 0) + (dividend_yield || 0)) / 100);
  const totalYearlyGain = annualCapitalGain + annualIncome;

  const afterTaxYearlyGain = applyTax(totalYearlyGain, taxation);

  return {
    absolute: afterTaxYearlyGain,
    percentage: (afterTaxYearlyGain / investedValue) * 100,
  };
};

/**
 * Calculate CAGR (Compound Annual Growth Rate) for capital gains only.
 * Caps values for very short holdings.
 */
export const calculateCAGR = (
  investment: InvestmentWithDecryptedData,
): number => {
  const {
    quantity = 0,
    purchase_price = 0,
    current_price,
    purchase_date,
  } = investment.data;

  if (quantity === 0 || purchase_price === 0) return 0;

  const currPrice = current_price ?? purchase_price;
  const initialValue = quantity * purchase_price;
  const currentValue = quantity * currPrice;

  const purchaseDate = new Date(purchase_date);
  const currentDate = new Date();

  const daysSincePurchase =
    (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
  const yearsSincePurchase = Math.max(daysSincePurchase / 365.25, 0.1); // floor at 0.1 years

  if (currentValue <= 0 || initialValue <= 0) return 0;

  // For very recent investments (< 30 days), use capped simple return
  if (daysSincePurchase < 30) {
    const simpleReturn = (currentValue - initialValue) / initialValue;
    return Math.max(-0.5, Math.min(0.5, simpleReturn)); // cap at ±50%
  }

  // CAGR calculation
  let cagr = Math.pow(currentValue / initialValue, 1 / yearsSincePurchase) - 1;

  return Math.max(-0.95, Math.min(10, cagr)); // cap between -95% and 1000%
};

/**
 * Calculate expected yearly yield based on investment type and attributes.
 * Yields are capped for reasonableness.
 */
export const calculateExpectedYearlyYield = (
  investment: InvestmentWithDecryptedData,
): number => {
  const {
    type,
    interest_rate = 0,
    dividend_yield = 0,
    purchase_price = 0,
    current_price,
    purchase_date,
    maturity_date,
    taxation = 0,
  } = investment.data;

  if (type === "bond") {
    if (interest_rate && interest_rate > 0) {
      return interest_rate;
    }
    if (maturity_date) {
      const purchaseDate = new Date(purchase_date);
      const maturityDate = new Date(maturity_date);
      const currentDate = new Date();

      const yearsToMaturity =
        (maturityDate.getTime() - currentDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      if (yearsToMaturity <= 0) return 0;

      const purchasePrice = purchase_price;
      const faceVal = current_price ?? purchase_price;

      if (purchasePrice > 0 && faceVal > 0) {
        const yieldToMaturity =
          (Math.pow(faceVal / purchasePrice, 1 / yearsToMaturity) - 1) * 100;
        const cappedYield = Math.max(0, Math.min(50, yieldToMaturity));
        return applyTax(cappedYield, taxation);
      }
    }
    return 0;
  }

  if (interest_rate && interest_rate > 0) {
    return applyTax(interest_rate, taxation);
  }

  if (["stock", "etf"].includes(type)) {
    if (dividend_yield && dividend_yield > 0) {
      return applyTax(dividend_yield, taxation);
    }

    // fallback to historical CAGR scaled to percentage
    const cagr = calculateCAGR(investment);
    return Math.max(-50, Math.min(50, cagr * 100));
  }

  // Default conservative estimate 5%
  return 0.05 * 100; // as percentage with no tax here as fallback
};

/**
 * Calculate expected future value after given years, compounding expected yearly return.
 */
export const calculateExpectedFutureValue = (
  investment: InvestmentWithDecryptedData,
  yearsFromNow: number,
): number => {
  const currentValue = calculateCurrentValue(investment);
  if (currentValue <= 0 || yearsFromNow <= 0) return currentValue;

  const expectedYieldPercentage = calculateExpectedYearlyYield(investment) || 0;
  const expectedAnnualReturn = expectedYieldPercentage / 100;

  return currentValue * Math.pow(1 + expectedAnnualReturn, yearsFromNow);
};

/**
 * Calculate individual investment ROI as annualized return.
 */
export const calculateIndividualROI = (
  investment: InvestmentWithDecryptedData,
): number | null => {
  const {
    quantity = 0,
    purchase_price = 0,
    current_price,
    purchase_date,
    maturity_date,
    interest_rate = 0,
    type,
  } = investment.data;

  if (quantity === 0 || purchase_price === 0) return null;

  const currPrice = current_price ?? purchase_price;
  const initialValue = quantity * purchase_price;
  const currentValue = quantity * currPrice;

  const purchaseDate = new Date(purchase_date);
  const currentDate = new Date();

  const daysSincePurchase =
    (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
  const yearsSincePurchase = daysSincePurchase / 365.25;

  if (type === "bond") {
    if (!interest_rate && maturity_date) {
      const maturityDate = new Date(maturity_date);
      const yearsToMaturity =
        (maturityDate.getTime() - currentDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      if (yearsToMaturity > 0) {
        const faceVal = quantity * currPrice;
        const ytm = Math.pow(faceVal / initialValue, 1 / yearsToMaturity) - 1;
        return Math.max(-0.5, Math.min(0.5, ytm));
      }
    }
    if (interest_rate) {
      return interest_rate / 100;
    }
  }

  if (interest_rate && interest_rate > 0) {
    return interest_rate / 100;
  }

  if (["checkingAccount", "savingsAccount"].includes(type) && !interest_rate) {
    if (currPrice !== purchase_price && yearsSincePurchase > 0) {
      return Math.pow(currPrice / purchase_price, 1 / yearsSincePurchase) - 1;
    }
    return 0.0001;
  }

  if (yearsSincePurchase <= 0) {
    const priceChange = (currPrice - purchase_price) / purchase_price;
    return Math.max(-0.5, Math.min(0.5, priceChange));
  }

  if (currentValue <= 0 || initialValue <= 0) return null;

  const annualizedReturn =
    Math.pow(currentValue / initialValue, 1 / yearsSincePurchase) - 1;

  const maxReturn = yearsSincePurchase < 0.25 ? 5.0 : 2.0;
  if (Math.abs(annualizedReturn) > maxReturn) return null;

  return annualizedReturn;
};

/**
 * Calculate portfolio weighted average CAGR based on individual investments.
 */
export const calculateYearlyROI = (
  investments: InvestmentWithDecryptedData[],
): number => {
  if (!investments.length) return 0;

  let totalWeightedROI = 0;
  let totalInitialValue = 0;

  for (const investment of investments) {
    const { quantity = 0, purchase_price = 0 } = investment.data;

    if (quantity === 0 || purchase_price === 0) continue;

    const initialValue = quantity * purchase_price;
    const cagr = calculateCAGR(investment);

    if (Math.abs(cagr) > 2.0) continue;

    totalWeightedROI += cagr * initialValue;
    totalInitialValue += initialValue;
  }

  if (totalInitialValue === 0) return 0;

  return totalWeightedROI / totalInitialValue;
};

/**
 * Calculate comprehensive investment statistics for a list of investments.
 */
export const calculateInvestmentStatistics = (
  investments: InvestmentWithDecryptedData[],
): InvestmentStats => {
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

  const totalInvested = investments.reduce(
    (sum, inv) =>
      sum + (inv.data.quantity || 0) * (inv.data.purchase_price || 0),
    0,
  );

  let totalAfterTaxValue = 0;
  let totalAfterTaxGainLoss = 0;
  let totalDividendsInterestEarned = 0;

  investments.forEach((inv) => {
    const returns = calculateIndividualInvestmentReturns(inv);
    totalAfterTaxValue += returns.totalValue;
    totalAfterTaxGainLoss += returns.totalGainLoss;
    totalDividendsInterestEarned += returns.dividendsInterestEarned;
  });

  const totalGainLossPercentage =
    totalInvested > 0 ? (totalAfterTaxGainLoss / totalInvested) * 100 : 0;

  // Weighted average CAGR
  let totalWeightedCAGR = 0;
  let totalWeight = 0;

  investments.forEach((inv) => {
    const invested = (inv.data.quantity || 0) * (inv.data.purchase_price || 0);
    if (invested > 0) {
      const cagr = calculateCAGR(inv);
      totalWeightedCAGR += cagr * invested;
      totalWeight += invested;
    }
  });

  // Weighted average expected yield
  let totalWeightedYield = 0;
  investments.forEach((inv) => {
    const returns = calculateIndividualInvestmentReturns(inv);
    if (returns.totalValue > 0) {
      const expectedYield = calculateExpectedYearlyYield(inv);
      const taxRate = (inv.data.taxation || 0) / 100;
      const afterTaxExpectedYield =
        expectedYield > 0 ? expectedYield * (1 - taxRate) : expectedYield;
      totalWeightedYield += afterTaxExpectedYield * returns.totalValue;
    }
  });

  // Type breakdown by investment type
  const typeBreakdown: TypeBreakdown = investments.reduce((acc, inv) => {
    const type = inv.data.type || "other";
    const returns = calculateIndividualInvestmentReturns(inv);
    const investedAmount =
      (inv.data.quantity || 0) * (inv.data.purchase_price || 0);

    if (!acc[type]) {
      acc[type] = {
        value: 0,
        count: 0,
        gainLoss: 0,
        estimatedYearlyGainLoss: 0,
        estimatedYearlyGainLossPercentage: 0,
        investedValue: 0,
      };
    }

    acc[type].value += returns.totalValue;
    acc[type].count += 1;
    acc[type].gainLoss += returns.totalGainLoss;
    acc[type].estimatedYearlyGainLoss += returns.estimatedYearlyGainLoss;
    acc[type].estimatedYearlyGainLossPercentage =
      acc[type].value > 0
        ? (acc[type].estimatedYearlyGainLoss / acc[type].value) * 100
        : 0;
    acc[type].investedValue += investedAmount;

    return acc;
  }, {} as TypeBreakdown);

  const dividendsInterestEarnedPercentage =
    totalInvested > 0
      ? (totalDividendsInterestEarned / totalInvested) * 100
      : 0;

  // Estimated yearly gain/loss computations
  let totalYearlyGain = 0;
  let totalWeightedYearlyPercentage = 0;
  let totalYearlyWeight = 0;

  investments.forEach((inv) => {
    const invested = (inv.data.quantity || 0) * (inv.data.purchase_price || 0);
    if (invested > 0) {
      const yearlyGain = calculateEstimatedYearlyGainLoss(inv);
      totalYearlyGain += yearlyGain.absolute;
      totalWeightedYearlyPercentage += yearlyGain.percentage * invested;
      totalYearlyWeight += invested;
    }
  });

  const estimatedYearlyGainLoss = totalYearlyGain;
  const estimatedYearlyGainLossPercentage =
    totalYearlyWeight > 0
      ? totalWeightedYearlyPercentage / totalYearlyWeight
      : 0;

  const yearlyGainLossRate = estimatedYearlyGainLossPercentage / 100;
  const projectedValue10Years = calculateProjectedValueWithComposition(
    totalAfterTaxValue,
    yearlyGainLossRate,
    10,
  );

  let portfolioCagr = 0;
  if (totalInvested > 0 && totalWeight > 0) {
    portfolioCagr = totalWeightedCAGR / totalWeight;
  }

  let avgTaxRate = 0;
  let totalTaxWeight = 0;
  investments.forEach((inv) => {
    const invested = (inv.data.quantity || 0) * (inv.data.purchase_price || 0);
    const taxRate = inv.data.taxation || 0;
    if (invested > 0) {
      avgTaxRate += taxRate * invested;
      totalTaxWeight += invested;
    }
  });
  const estimatedTaxRate = totalTaxWeight > 0 ? avgTaxRate / totalTaxWeight : 0;

  let totalYearlyDividend = 0;
  let totalYearlyCapitalGains = 0;
  investments.forEach((inv) => {
    totalYearlyDividend += calculateYearlyDividendInterest(inv);
    totalYearlyCapitalGains += calculateYearlyCapitalGains(inv);
  });

  const yearlyDividendInterestPercentage =
    totalInvested > 0 ? (totalYearlyDividend / totalInvested) * 100 : 0;
  const yearlyCapitalGainsPercentage =
    totalInvested > 0 ? (totalYearlyCapitalGains / totalInvested) * 100 : 0;

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
    averageValue:
      investments.length > 0 ? totalAfterTaxValue / investments.length : 0,
    typeBreakdown,
    cagr: portfolioCagr,
    estimatedTaxRate,
  };
};

/**
 * Provide projections for portfolio over different time horizons.
 */
export const getInvestmentProjections = (
  investments: InvestmentWithDecryptedData[],
  timeHorizons: number[] = [1, 3, 5, 10],
): { [years: number]: number } => {
  const projections: { [years: number]: number } = {};

  for (const years of timeHorizons) {
    projections[years] = investments.reduce((sum, inv) => {
      return sum + calculateExpectedFutureValue(inv, years);
    }, 0);
  }

  return projections;
};

/**
 * Calculate projected value with compounding yearly ROI.
 */
export const calculateProjectedValueWithComposition = (
  currentValue: number,
  yearlyROI: number,
  years: number,
): number => {
  if (currentValue <= 0 || years <= 0) return currentValue;
  return currentValue * Math.pow(1 + yearlyROI, years);
};

/**
 * Generate projection data points suitable for charts.
 */
export const generateProjectionData = (
  currentValue: number,
  yearlyROI: number,
  yearRange: number = 10,
): { year: number; value: number }[] => {
  const currentYear = new Date().getFullYear();
  const data: { year: number; value: number }[] = [];

  for (let i = 0; i <= yearRange; i++) {
    const year = currentYear + i;
    const value = calculateProjectedValueWithComposition(
      currentValue,
      yearlyROI,
      i,
    );
    data.push({ year, value });
  }

  return data;
};

/**
 * Calculate all returns (total value, gain/loss, dividends, yearly estimates) for a single investment.
 */
export const calculateIndividualInvestmentReturns = (
  investment: InvestmentDetails,
) => {
  const { quantity = 0, purchase_price = 0, taxation = 0 } = investment.data;
  const totalInvested = quantity * purchase_price;

  if (totalInvested === 0) {
    return {
      totalValue: 0,
      totalInvested: 0,
      totalGainLoss: 0,
      totalGainLossPercentage: 0,
      dividendsInterestEarned: 0,
      dividendsInterestEarnedPercentage: 0,
      estimatedYearlyGainLoss: 0,
      estimatedYearlyGainLossPercentage: 0,
    };
  }

  const currentValue = calculateCurrentValue(investment);
  const baseGainLoss = currentValue - totalInvested;

  const afterTaxBaseGainLoss =
    baseGainLoss > 0
      ? baseGainLoss * (1 - (taxation || 0) / 100)
      : baseGainLoss;

  const dividendsInterestEarned = calculateDividendsInterestEarned(investment);

  const totalGainLoss = afterTaxBaseGainLoss + dividendsInterestEarned;
  const totalGainLossPercentage = (totalGainLoss / totalInvested) * 100;
  const dividendsInterestEarnedPercentage =
    (dividendsInterestEarned / totalInvested) * 100;

  const estimatedYearlyGain = calculateEstimatedYearlyGainLoss(investment);

  return {
    totalValue: totalInvested + totalGainLoss,
    totalInvested,
    totalGainLoss,
    totalGainLossPercentage,
    dividendsInterestEarned,
    dividendsInterestEarnedPercentage,
    estimatedYearlyGainLoss: estimatedYearlyGain.absolute,
    estimatedYearlyGainLossPercentage: estimatedYearlyGain.percentage,
  };
};
