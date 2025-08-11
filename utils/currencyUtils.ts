export const formatCurrency = (
  amount: number | undefined | null,
  currency: string = "USD",
): string => {
  if (
    amount === undefined ||
    amount === null ||
    Number.isNaN(amount) ||
    !isFinite(amount)
  )
    amount = 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  } catch {
    return `${Number(amount).toFixed(2)}`;
  }
};
