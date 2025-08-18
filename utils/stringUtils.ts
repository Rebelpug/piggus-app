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

/**
 * Formats a string by trimming it and encoding it for URL usage
 * @param input The string to format
 * @returns The URL-safe encoded string
 */
export const encodeStringForUrl = (input: string): string => {
  if (!input) return "";
  return encodeURIComponent(input.trim());
};

/**
 * Normalizes decimal input by converting commas to dots for consistent decimal parsing
 * This handles iOS keyboards that show comma for decimal separator in some locales
 * Use this function when parsing/validating numbers, not on every input change
 * @param input The decimal string input that may contain comma as decimal separator
 * @returns The normalized string with dot as decimal separator
 */
export const normalizeDecimalForParsing = (input: string): string => {
  if (!input) return "";

  // Replace comma with dot for decimal separation
  // This ensures consistent parsing regardless of locale-specific keyboard behavior
  return input.replace(/,/g, ".");
};
