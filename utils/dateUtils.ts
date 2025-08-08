export const formatDate = (dateString: string) => {
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    } catch {
        return dateString;
    }
};

/**
 * Creates an ISO string combining the date from expenseDate with the current time
 * This ensures the created_at field uses the expense date but preserves the exact time when the expense was created
 *
 * @param expenseDate - The date string from the expense (e.g., "2024-01-15")
 * @returns ISO string with the expense date and current time, or undefined if no date provided
 */
export function createExpenseTimestamp(expenseDate: string | null | undefined): string | undefined {
  if (!expenseDate) return undefined;

  const expenseDateObj = new Date(expenseDate);
  const now = new Date();

  // Set the date to the expense date but keep the current time
  const dateWithCurrentTime = new Date(
    expenseDateObj.getFullYear(),
    expenseDateObj.getMonth(),
    expenseDateObj.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );

  return dateWithCurrentTime.toISOString();
}

/**
 * Gets the current timestamp as an ISO string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
