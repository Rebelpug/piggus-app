/**
 * Utility functions for investment-related operations
 */

// Helper function to safely extract date part from ISO string
const getDatePart = (isoString: string | null | undefined): string | null => {
  if (!isoString || typeof isoString !== "string") return null;
  try {
    return isoString.split("T")[0];
  } catch {
    return null;
  }
};

/**
 * Checks if an automatic price update failed today
 * @param lastTentativeUpdate - The last time an update was attempted
 * @param lastUpdated - The last time an update was successful
 * @returns true if price update failed today
 */
export const isPriceUpdateFailed = (
  lastTentativeUpdate: string | null | undefined,
  lastUpdated: string | null | undefined,
): boolean => {
  const today = new Date().toISOString().split("T")[0];
  const tentativeDate = getDatePart(lastTentativeUpdate);
  const updateDate = getDatePart(lastUpdated);

  return tentativeDate === today && updateDate !== null && updateDate < today;
};
