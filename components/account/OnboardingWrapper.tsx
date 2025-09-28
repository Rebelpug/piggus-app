import React from "react";
import { useInvestment } from "@/context/InvestmentContext";
import { useLocalization } from "@/context/LocalizationContext";
import OnboardingForm from "./OnboardingForm";
import { InvestmentData } from "@/types/investment";

interface OnboardingWrapperProps {
  onComplete: () => void;
  currency: string;
}

export default function OnboardingWrapper({
  onComplete,
  currency,
}: OnboardingWrapperProps) {
  const { addInvestment, portfolios } = useInvestment();
  const { t } = useLocalization();

  const createCheckingAccount = async (amount: number) => {
    if (amount > 0 && portfolios.length > 0) {
      const personalPortfolio = portfolios.find(
        (p) => p.data.name === t("onboarding.personalInvestments"),
      );
      if (personalPortfolio) {
        const checkingAccountInvestment: InvestmentData = {
          name: t("onboarding.checkingAccount"),
          symbol: null,
          isin: null,
          exchange_market: null,
          type: "cash",
          purchase_date: new Date().toISOString().split("T")[0],
          purchase_price: amount,
          quantity: 1,
          currency: currency,
          current_price: amount,
          last_updated: new Date().toISOString(),
          last_tentative_update: new Date().toISOString(),
          notes: t("onboarding.initialBankAccountBalance"),
          interest_rate: null,
          maturity_date: null,
          dividend_yield: null,
          sector: null,
          risk_level: "low",
        };

        await addInvestment(personalPortfolio.id, checkingAccountInvestment);
      }
    }
  };

  return (
    <OnboardingForm
      onComplete={onComplete}
      currency={currency}
      onCreateCheckingAccount={createCheckingAccount}
    />
  );
}
