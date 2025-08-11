export const formatPercentage = (value: number) => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

/**
 * Formats a string by trimming it, and removing spaces and special characters
 * @param input The string to format
 * @returns The formatted string
 */
export const formatStringWithoutSpacesAndSpecialChars = (
  input: string,
): string => {
  if (!input) return "";

  // First trim and convert to uppercase
  const upperTrimmed = input.trim();

  // Then remove spaces and special characters (keeping only alphanumeric)
  return upperTrimmed.replace(/[^A-Za-z0-9]/g, "");
};
