import { languageStorageManager } from "@/utils/languageStorageManager";

export type LanguageInitState =
  | "uninitialized"
  | "loading-storage"
  | "loading-profile"
  | "applying-language"
  | "initialized"
  | "error";

export interface LanguageInitializationResult {
  language: string;
  source: "user-selection" | "storage" | "profile" | "system" | "fallback";
  state: LanguageInitState;
  error?: string;
}

export interface LanguageInitializer {
  state: LanguageInitState;
  initializeLanguage(
    profileLanguage?: string,
  ): Promise<LanguageInitializationResult>;
  getCurrentLanguage(): string;
  getInitializationSource(): LanguageInitializationResult["source"];
  reset(): void;
}

class LanguageInitializerImpl implements LanguageInitializer {
  private _state: LanguageInitState = "uninitialized";
  private _currentLanguage: string = "en";
  private _initializationSource: LanguageInitializationResult["source"] =
    "fallback";
  private _error?: string;

  get state(): LanguageInitState {
    return this._state;
  }

  getCurrentLanguage(): string {
    return this._currentLanguage;
  }

  getInitializationSource(): LanguageInitializationResult["source"] {
    return this._initializationSource;
  }

  reset(): void {
    this._state = "uninitialized";
    this._currentLanguage = "en";
    this._initializationSource = "fallback";
    this._error = undefined;
  }

  /**
   * Initialize language following the priority order:
   * 1. Profile language (if provided and different from current)
   * 2. Local storage language
   * 3. System language
   * 4. English fallback
   */
  async initializeLanguage(
    profileLanguage?: string,
  ): Promise<LanguageInitializationResult> {
    try {
      this._state = "loading-storage";
      this._error = undefined;

      // Step 1: Check if we have a profile language preference
      if (profileLanguage) {
        const supportedProfileLanguage =
          languageStorageManager.getSupportedLanguage(profileLanguage);

        // Only use profile language if it's different from what we might have in storage
        // This prevents unnecessary changes during initialization
        const storedLanguage = await languageStorageManager.getStoredLanguage();

        if (!storedLanguage || storedLanguage !== supportedProfileLanguage) {
          this._state = "loading-profile";
          console.log("Using profile language:", supportedProfileLanguage);

          // Store the profile language for future use
          await languageStorageManager.setStoredLanguage(
            supportedProfileLanguage,
          );

          return this._completeInitialization(
            supportedProfileLanguage,
            "profile",
          );
        }
      }

      // Step 2: Check local storage
      const storedLanguage = await languageStorageManager.getStoredLanguage();
      if (storedLanguage) {
        const supportedStoredLanguage =
          languageStorageManager.getSupportedLanguage(storedLanguage);
        console.log("Using stored language:", supportedStoredLanguage);

        return this._completeInitialization(supportedStoredLanguage, "storage");
      }

      // Step 3: Use system language
      const systemLanguage = languageStorageManager.getSystemLanguage();
      const supportedSystemLanguage =
        languageStorageManager.getSupportedLanguage(systemLanguage);
      console.log("Using system language:", supportedSystemLanguage);

      // Store system language for future use
      await languageStorageManager.setStoredLanguage(supportedSystemLanguage);

      return this._completeInitialization(supportedSystemLanguage, "system");
    } catch (error) {
      console.error("Error during language initialization:", error);
      this._error =
        error instanceof Error ? error.message : "Unknown initialization error";
      this._state = "error";

      // Fallback to English on any error
      return this._completeInitialization("en", "fallback");
    }
  }

  /**
   * Complete the initialization process
   */
  private _completeInitialization(
    language: string,
    source: LanguageInitializationResult["source"],
  ): LanguageInitializationResult {
    this._state = "applying-language";

    const supportedLanguage =
      languageStorageManager.getSupportedLanguage(language);
    this._currentLanguage = supportedLanguage;
    this._initializationSource = source;

    this._state = "initialized";

    return {
      language: supportedLanguage,
      source,
      state: this._state,
      error: this._error,
    };
  }
}

// Export singleton instance
export const languageInitializer: LanguageInitializer =
  new LanguageInitializerImpl();

/**
 * Utility functions for language initialization
 */
export const LanguageInitializationUtils = {
  /**
   * Check if initialization is complete
   */
  isInitialized(state: LanguageInitState): boolean {
    return state === "initialized";
  },

  /**
   * Check if initialization is in progress
   */
  isInitializing(state: LanguageInitState): boolean {
    return ["loading-storage", "loading-profile", "applying-language"].includes(
      state,
    );
  },

  /**
   * Check if initialization failed
   */
  hasError(state: LanguageInitState): boolean {
    return state === "error";
  },

  /**
   * Get user-friendly state description
   */
  getStateDescription(state: LanguageInitState): string {
    switch (state) {
      case "uninitialized":
        return "Language not initialized";
      case "loading-storage":
        return "Loading language from storage";
      case "loading-profile":
        return "Loading language from profile";
      case "applying-language":
        return "Applying language settings";
      case "initialized":
        return "Language initialized";
      case "error":
        return "Language initialization failed";
      default:
        return "Unknown state";
    }
  },

  /**
   * Get user-friendly source description
   */
  getSourceDescription(source: LanguageInitializationResult["source"]): string {
    switch (source) {
      case "user-selection":
        return "User selected";
      case "storage":
        return "Previously saved preference";
      case "profile":
        return "Profile preference";
      case "system":
        return "System language";
      case "fallback":
        return "Default fallback";
      default:
        return "Unknown source";
    }
  },
};
