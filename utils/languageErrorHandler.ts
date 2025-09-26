import { languageStorageManager } from "@/utils/languageStorageManager";

export type LanguageErrorType =
  | "storage-read-error"
  | "storage-write-error"
  | "profile-sync-error"
  | "initialization-error"
  | "language-change-error"
  | "system-language-error";

export interface LanguageError {
  type: LanguageErrorType;
  message: string;
  originalError?: Error;
  recoveryAction?: string;
  timestamp: Date;
}

export interface LanguageErrorRecoveryStrategy {
  onStorageError: (error: LanguageError) => Promise<string>;
  onProfileSyncError: (
    error: LanguageError,
    currentLanguage: string,
  ) => Promise<void>;
  onLanguageChangeError: (
    error: LanguageError,
    targetLanguage: string,
    previousLanguage: string,
  ) => Promise<string>;
  onInitializationError: (error: LanguageError) => Promise<string>;
}

class LanguageErrorHandlerImpl implements LanguageErrorRecoveryStrategy {
  private errorLog: LanguageError[] = [];
  private maxErrorLogSize = 50;

  /**
   * Log an error for debugging purposes
   */
  private logError(error: LanguageError): void {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxErrorLogSize);
    }

    console.error(
      `Language Error [${error.type}]:`,
      error.message,
      error.originalError,
    );
  }

  /**
   * Create a language error object
   */
  createError(
    type: LanguageErrorType,
    message: string,
    originalError?: Error,
    recoveryAction?: string,
  ): LanguageError {
    return {
      type,
      message,
      originalError,
      recoveryAction,
      timestamp: new Date(),
    };
  }

  /**
   * Handle storage read/write errors
   */
  async onStorageError(error: LanguageError): Promise<string> {
    this.logError(error);

    try {
      // Try to get system language as fallback
      const systemLanguage = languageStorageManager.getSystemLanguage();
      console.log(
        `Storage error recovery: using system language ${systemLanguage}`,
      );

      return systemLanguage;
    } catch (systemError) {
      console.error("System language detection also failed:", systemError);

      // Ultimate fallback to English
      const fallbackError = this.createError(
        "system-language-error",
        "System language detection failed, using English fallback",
        systemError instanceof Error ? systemError : undefined,
        "Using English as ultimate fallback",
      );
      this.logError(fallbackError);

      return "en";
    }
  }

  /**
   * Handle profile synchronization errors
   */
  async onProfileSyncError(
    error: LanguageError,
    currentLanguage: string,
  ): Promise<void> {
    this.logError(error);

    // For profile sync errors, we continue with current language
    // and let the retry mechanism handle it later
    console.log(
      `Profile sync error recovery: continuing with current language ${currentLanguage}`,
    );

    // Optionally, we could show a user notification here
    // but for now we just log and continue
  }

  /**
   * Handle language change errors with rollback
   */
  async onLanguageChangeError(
    error: LanguageError,
    targetLanguage: string,
    previousLanguage: string,
  ): Promise<string> {
    this.logError(error);

    try {
      // Try to rollback to previous language
      console.log(
        `Language change error recovery: rolling back to ${previousLanguage}`,
      );

      // Attempt to restore previous language in storage
      await languageStorageManager.setStoredLanguage(previousLanguage);

      return previousLanguage;
    } catch (rollbackError) {
      console.error("Rollback also failed:", rollbackError);

      // If rollback fails, use system language
      const rollbackErrorObj = this.createError(
        "storage-write-error",
        "Language rollback failed",
        rollbackError instanceof Error ? rollbackError : undefined,
        "Using system language as fallback",
      );

      return await this.onStorageError(rollbackErrorObj);
    }
  }

  /**
   * Handle initialization errors
   */
  async onInitializationError(error: LanguageError): Promise<string> {
    this.logError(error);

    console.log(
      "Language initialization error recovery: attempting fallback sequence",
    );

    // Try fallback sequence: system language → English
    try {
      const systemLanguage = languageStorageManager.getSystemLanguage();
      console.log(
        `Initialization error recovery: using system language ${systemLanguage}`,
      );

      // Try to store the system language for future use
      try {
        await languageStorageManager.setStoredLanguage(systemLanguage);
      } catch (storageError) {
        console.warn(
          "Could not store system language during recovery:",
          storageError,
        );
      }

      return systemLanguage;
    } catch (systemError) {
      console.error("System language fallback also failed:", systemError);

      // Ultimate fallback to English
      console.log(
        "Initialization error recovery: using English as ultimate fallback",
      );
      return "en";
    }
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count: number = 10): LanguageError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: LanguageErrorType): LanguageError[] {
    return this.errorLog.filter((error) => error.type === type);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<LanguageErrorType, number> {
    const stats: Record<LanguageErrorType, number> = {
      "storage-read-error": 0,
      "storage-write-error": 0,
      "profile-sync-error": 0,
      "initialization-error": 0,
      "language-change-error": 0,
      "system-language-error": 0,
    };

    this.errorLog.forEach((error) => {
      stats[error.type]++;
    });

    return stats;
  }
}

// Export singleton instance
export const languageErrorHandler: LanguageErrorRecoveryStrategy & {
  createError: (
    type: LanguageErrorType,
    message: string,
    originalError?: Error,
    recoveryAction?: string,
  ) => LanguageError;
  getRecentErrors: (count?: number) => LanguageError[];
  getErrorsByType: (type: LanguageErrorType) => LanguageError[];
  clearErrorLog: () => void;
  getErrorStats: () => Record<LanguageErrorType, number>;
} = new LanguageErrorHandlerImpl() as any;

/**
 * Utility functions for error handling
 */
export const LanguageErrorUtils = {
  /**
   * Wrap a language operation with error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorType: LanguageErrorType,
    errorMessage: string,
    recoveryFn?: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const languageError = languageErrorHandler.createError(
        errorType,
        errorMessage,
        error instanceof Error ? error : undefined,
      );

      if (recoveryFn) {
        try {
          return await recoveryFn();
        } catch (recoveryError) {
          console.error("Recovery function also failed:", recoveryError);
          throw languageError;
        }
      }

      throw languageError;
    }
  },

  /**
   * Check if an error is recoverable
   */
  isRecoverableError(errorType: LanguageErrorType): boolean {
    return [
      "storage-read-error",
      "storage-write-error",
      "profile-sync-error",
      "system-language-error",
    ].includes(errorType);
  },

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: LanguageError): string {
    switch (error.type) {
      case "storage-read-error":
        return "Could not load your language preference. Using system default.";
      case "storage-write-error":
        return "Could not save your language preference. Changes may not persist.";
      case "profile-sync-error":
        return "Could not sync language with your profile. Will retry automatically.";
      case "initialization-error":
        return "Could not initialize language settings. Using default language.";
      case "language-change-error":
        return "Could not change language. Reverted to previous setting.";
      case "system-language-error":
        return "Could not detect system language. Using English.";
      default:
        return "An unexpected language error occurred.";
    }
  },

  /**
   * Get recovery action description
   */
  getRecoveryActionDescription(error: LanguageError): string {
    return error.recoveryAction || "No recovery action available";
  },
};
