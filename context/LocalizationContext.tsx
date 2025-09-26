import i18n from "@/lib/i18n";
import { languageErrorHandler } from "@/utils/languageErrorHandler";
import { languageInitializer } from "@/utils/languageInitializer";

import {
  AVAILABLE_LANGUAGES,
  languageStorageManager,
} from "@/utils/languageStorageManager";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface LocalizationContextType {
  currentLanguage: string;
  language: string; // Alias for backward compatibility
  changeLanguage: (language: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  availableLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;
  isInitialized: boolean;
  isProfileSynced: boolean; // New: tracks if profile sync is complete
}

const LocalizationContext = createContext<LocalizationContextType | null>(null);

// Imperative interface for external components (like ProfileContext)
interface LocalizationImperativeHandle {
  setProfileLanguageCallback: (
    callback: ((language: string) => Promise<void>) | null,
  ) => void;
  syncProfileLanguage: (profileLanguage: string) => void;
}

// Global imperative handle - will be set by the provider
let localizationImperativeHandle: LocalizationImperativeHandle | null = null;

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>("en");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isProfileSynced, setIsProfileSynced] = useState<boolean>(false);

  // Use refs to prevent re-render loops
  const profileLanguageRef = useRef<string | null>(null);
  const profileUpdateCallbackRef = useRef<
    ((language: string) => Promise<void>) | null
  >(null);

  /**
   * Apply language to both state and i18n
   */
  const applyLanguage = useCallback((language: string) => {
    const supportedLanguage =
      languageStorageManager.getSupportedLanguage(language);
    setCurrentLanguage(supportedLanguage);
    i18n.locale = supportedLanguage;
  }, []);

  /**
   * Initialize language using the state machine
   */
  const initializeLanguage = useCallback(async () => {
    try {
      const result = await languageInitializer.initializeLanguage(
        profileLanguageRef.current || undefined,
      );

      applyLanguage(result.language);
      console.log(
        `Language initialized: ${result.language} (source: ${result.source})`,
      );
    } catch (error) {
      console.error("Error initializing language:", error);

      // Use error handler for recovery
      const languageError = languageErrorHandler.createError(
        "initialization-error",
        "Language initialization failed",
        error instanceof Error ? error : undefined,
        "Using fallback language",
      );

      const fallbackLanguage =
        await languageErrorHandler.onInitializationError(languageError);
      applyLanguage(fallbackLanguage);
    } finally {
      setIsInitialized(true);
    }
  }, [applyLanguage]);

  /**
   * Change language with proper storage and profile sync
   */
  const changeLanguage = useCallback(
    async (language: string) => {
      try {
        const supportedLanguage =
          languageStorageManager.getSupportedLanguage(language);

        // Update local storage first (synchronous for UI)
        await languageStorageManager.setStoredLanguage(supportedLanguage);

        // Apply the language change immediately
        applyLanguage(supportedLanguage);

        // Update profile asynchronously if callback is available (don't await to keep UI responsive)
        if (profileUpdateCallbackRef.current) {
          profileUpdateCallbackRef
            .current(supportedLanguage)
            .catch(async (profileError) => {
              console.warn(
                "Profile language update failed, but local change preserved:",
                profileError,
              );

              // Create error for profile sync failure but don't revert local change
              const profileSyncError = languageErrorHandler.createError(
                "profile-sync-error",
                "Profile language update failed",
                profileError instanceof Error ? profileError : undefined,
                "Local change preserved, will retry on next app start",
              );

              await languageErrorHandler.onProfileSyncError(
                profileSyncError,
                supportedLanguage,
              );
            });
        }
      } catch (error) {
        console.error("Error changing language:", error);

        // Use error handler for recovery
        const languageError = languageErrorHandler.createError(
          "language-change-error",
          "Language change failed",
          error instanceof Error ? error : undefined,
          "Attempting rollback to previous language",
        );

        try {
          const recoveredLanguage =
            await languageErrorHandler.onLanguageChangeError(
              languageError,
              language,
              currentLanguage,
            );

          // Apply the recovered language
          applyLanguage(recoveredLanguage);

          // Throw error to let caller know the change failed
          throw new Error(
            `Language change failed, reverted to ${recoveredLanguage}`,
          );
        } catch (recoveryError) {
          // If recovery also fails, we're in a bad state
          console.error("Language change recovery failed:", recoveryError);
          throw new Error("Language change failed and recovery also failed");
        }
      }
    },
    [applyLanguage, currentLanguage],
  );

  /**
   * Internal method to handle profile language sync
   * This is called when profile data becomes available
   */
  const handleProfileLanguageSync = useCallback(
    async (profileLanguage: string) => {
      if (!profileLanguage || typeof profileLanguage !== "string") {
        console.warn(
          "Invalid profile language for sync:",
          typeof profileLanguage,
          profileLanguage,
        );
        setIsProfileSynced(true);
        return;
      }

      const supportedProfileLanguage =
        languageStorageManager.getSupportedLanguage(profileLanguage);

      // Only sync if profile language is different from current language
      if (supportedProfileLanguage !== currentLanguage) {
        console.log("Syncing with profile language:", supportedProfileLanguage);

        try {
          // Update storage to match profile
          await languageStorageManager.setStoredLanguage(
            supportedProfileLanguage,
          );

          // Apply the language
          applyLanguage(supportedProfileLanguage);
        } catch (error) {
          console.warn("Error syncing profile language:", error);
        }
      }

      setIsProfileSynced(true);
    },
    [currentLanguage, applyLanguage],
  );

  // Initialize language when component mounts
  useEffect(() => {
    if (!isInitialized) {
      initializeLanguage();
    }
  }, [isInitialized, initializeLanguage]);

  const t = useCallback((key: string, options?: any) => {
    return i18n.t(key, options);
  }, []);

  const value: LocalizationContextType = useMemo(
    () => ({
      currentLanguage,
      language: currentLanguage, // Alias for backward compatibility
      changeLanguage,
      t,
      availableLanguages: AVAILABLE_LANGUAGES,
      isInitialized,
      isProfileSynced,
    }),
    [currentLanguage, changeLanguage, t, isInitialized, isProfileSynced],
  );

  // Set up imperative methods for external use (e.g., ProfileContext)
  // These don't cause re-renders since they use refs
  useEffect(() => {
    localizationImperativeHandle = {
      setProfileLanguageCallback: (
        callback: ((language: string) => Promise<void>) | null,
      ) => {
        profileUpdateCallbackRef.current = callback;
      },
      syncProfileLanguage: (profileLanguage: string) => {
        profileLanguageRef.current = profileLanguage;
        if (isInitialized) {
          handleProfileLanguageSync(profileLanguage);
        }
      },
    };

    // Cleanup on unmount
    return () => {
      localizationImperativeHandle = null;
    };
  }, [isInitialized, handleProfileLanguageSync]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error(
      "useLocalization must be used within a LocalizationProvider",
    );
  }
  return context;
};

// Export imperative interface for external components
export const LocalizationImperative = {
  setProfileLanguageCallback: (
    callback: ((language: string) => Promise<void>) | null,
  ) => {
    localizationImperativeHandle?.setProfileLanguageCallback(callback);
  },
  syncProfileLanguage: (profileLanguage: string) => {
    localizationImperativeHandle?.syncProfileLanguage(profileLanguage);
  },
};
