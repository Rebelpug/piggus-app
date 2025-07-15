export const formatCurrency = (amount: number, currency: string = 'USD') => {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    } catch {
        return `${amount.toFixed(2)}`;
    }
};
