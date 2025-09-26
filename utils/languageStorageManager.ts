import { getSystemLanguage } from "@/lib/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@piggus_language";

const SUPPORTED_LANGUAGES = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "nl",
  "pl",
  "sv",
];

export interface LanguageStorageManager {
  getStoredLanguage(): Promise<string | null>;
  setStoredLanguage(language: string): Promise<void>;
  getSystemLanguage(): string;
  getSupportedLanguage(language: string): string;
  clearStoredLanguage(): Promise<void>;
}

class LanguageStorageManagerImpl implements LanguageStorageManager {
  /**
   * Get the stored language preference from AsyncStorage
   */
  async getStoredLanguage(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Error reading stored language:", error);
      // Don't throw here - return null to trigger fallback logic
      return null;
    }
  }

  /**
   * Store the language preference in AsyncStorage
   */
  async setStoredLanguage(language: string): Promise<void> {
    try {
      const supportedLanguage = this.getSupportedLanguage(language);
      await AsyncStorage.setItem(STORAGE_KEY, supportedLanguage);
    } catch (error) {
      console.error("Error storing language:", error);
      throw new Error(
        `Failed to store language preference: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get the system language with fallback to English
   */
  getSystemLanguage(): string {
    try {
      return getSystemLanguage();
    } catch (error) {
      console.warn("Error getting system language:", error);
      return "en";
    }
  }

  /**
   * Validate and return a supported language code
   * Falls back to English if the provided language is not supported
   */
  getSupportedLanguage(language: string): string {
    // Handle null, undefined, or non-string values
    if (!language) {
      console.warn(
        "Invalid language value provided:",
        language,
        "- falling back to English",
      );
      return "en";
    }

    // Extract language code from locale (e.g., 'en-US' -> 'en')
    const languageCode = language.includes("-")
      ? language.split("-")[0]
      : language;

    return SUPPORTED_LANGUAGES.includes(languageCode) ? languageCode : "en";
  }

  /**
   * Clear the stored language preference
   */
  async clearStoredLanguage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Error clearing stored language:", error);
      throw new Error("Failed to clear language preference");
    }
  }
}

// Export singleton instance
export const languageStorageManager: LanguageStorageManager =
  new LanguageStorageManagerImpl();

// Export supported languages for use by other components
export const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
  { code: "pl", name: "Polish", nativeName: "Polski" },
  { code: "sv", name: "Swedish", nativeName: "Svenska" },
];
