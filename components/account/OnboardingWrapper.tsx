import React from 'react';
import { useInvestment } from '@/context/InvestmentContext';
import OnboardingForm from './OnboardingForm';
import { InvestmentData } from '@/types/investment';

interface OnboardingWrapperProps {
    onComplete: () => void;
    currency: string;
}

export default function OnboardingWrapper({ onComplete, currency }: OnboardingWrapperProps) {
    const { addInvestment, portfolios } = useInvestment();

    const createCheckingAccount = async (amount: number) => {
        if (amount > 0 && portfolios.length > 0) {
            const personalPortfolio = portfolios.find(p => p.data.name === 'Personal Investments');
            if (personalPortfolio) {
                const checkingAccountInvestment: InvestmentData = {
                    name: 'Checking Account',
                    symbol: null,
                    isin: null,
                    exchange_market: null,
                    type: 'cash',
                    purchase_date: new Date().toISOString().split('T')[0],
                    purchase_price: amount,
                    quantity: 1,
                    currency: currency,
                    current_price: amount,
                    last_updated: new Date().toISOString(),
                    notes: 'Initial bank account balance added during onboarding',
                    interest_rate: null,
                    maturity_date: null,
                    dividend_yield: null,
                    sector: null,
                    risk_level: 'low'
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
