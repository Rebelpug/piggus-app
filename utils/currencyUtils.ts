export const formatCurrency = (amount: number, currency: string = 'USD') => {
    if (!isFinite(amount)) amount = 0;
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    } catch {
        return `${amount.toFixed(2)}`;
    }
};
