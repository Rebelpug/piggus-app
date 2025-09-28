/**
 * Utility functions for Terms of Conditions (ToC) and Privacy Policy links
 */

/**
 * Generate the correct ToC URL based on the current language
 * @param language - The current language code (e.g., 'en', 'es', 'de', etc.)
 * @returns The appropriate ToC URL
 */
export function getTocUrl(language: string): string {
  const baseUrl = "https://piggus.finance/toc-app";

  // For English, use the base URL without language suffix
  if (language === "en") {
    return baseUrl;
  }

  // For other languages, append the language code
  return `${baseUrl}-${language}`;
}

/**
 * Generate the correct Privacy Policy URL based on the current language
 * @param language - The current language code (e.g., 'en', 'es', 'de', etc.)
 * @returns The appropriate Privacy Policy URL
 */
export function getPrivacyPolicyUrl(language: string): string {
  const baseUrl = "https://piggus.finance/privacy-app";

  // For English, use the base URL without language suffix
  if (language === "en") {
    return baseUrl;
  }

  // For other languages, append the language code
  return `${baseUrl}-${language}`;
}

/**
 * Get the ToC URL for the current app language
 * This function can be used when you have access to the localization context
 */
export function getCurrentTocUrl(currentLanguage: string): string {
  return getTocUrl(currentLanguage);
}

/**
 * Get the Privacy Policy URL for the current app language
 * This function can be used when you have access to the localization context
 */
export function getCurrentPrivacyPolicyUrl(currentLanguage: string): string {
  return getPrivacyPolicyUrl(currentLanguage);
}
