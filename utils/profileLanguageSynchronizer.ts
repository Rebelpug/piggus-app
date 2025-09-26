import { languageStorageManager } from "@/utils/languageStorageManager";

export interface ProfileLanguageSynchronizer {
  syncLanguageToProfile(language: string): Promise<void>;
  getProfileLanguage(): string | null;
  setProfileLanguage(language: string | null): void;
  onProfileLanguageChange(callback: (language: string) => void): void;
  removeProfileLanguageChangeListener(): void;
  setProfileUpdateCallback(
    callback: ((language: string) => Promise<void>) | null,
  ): void;
}

class ProfileLanguageSynchronizerImpl implements ProfileLanguageSynchronizer {
  private profileLanguage: string | null = null;
  private profileUpdateCallback: ((language: string) => Promise<void>) | null =
    null;
  private changeListeners: ((language: string) => void)[] = [];
  private retryQueue: string[] = [];
  private isRetrying = false;

  /**
   * Set the callback function that will update the profile
   */
  setProfileUpdateCallback(
    callback: ((language: string) => Promise<void>) | null,
  ): void {
    this.profileUpdateCallback = callback;

    // Process any queued updates when callback becomes available
    if (callback && this.retryQueue.length > 0) {
      this.processRetryQueue();
    }
  }

  /**
   * Sync language to profile with retry mechanism
   */
  async syncLanguageToProfile(language: string): Promise<void> {
    const supportedLanguage =
      languageStorageManager.getSupportedLanguage(language);

    if (!this.profileUpdateCallback) {
      console.warn(
        "Profile update callback not available, queuing language update:",
        supportedLanguage,
      );
      this.queueForRetry(supportedLanguage);
      return;
    }

    try {
      await this.profileUpdateCallback(supportedLanguage);
      console.log("Profile language updated successfully:", supportedLanguage);

      // Update our cached profile language
      this.setProfileLanguage(supportedLanguage);
    } catch (error) {
      console.error("Failed to update profile language:", error);

      // Queue for retry
      this.queueForRetry(supportedLanguage);

      // Re-throw to let caller know it failed
      throw new Error(
        `Profile language update failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get the current profile language
   */
  getProfileLanguage(): string | null {
    return this.profileLanguage;
  }

  /**
   * Set the profile language (called when profile data is loaded)
   */
  setProfileLanguage(language: string | null): void {
    // Validate that language is a string if not null
    if (language !== null && false) {
      console.warn("Invalid profile language type:", typeof language, language);
      language = null;
    }

    const previousLanguage = this.profileLanguage;
    this.profileLanguage = language;

    // Notify listeners if language changed
    if (language && language !== previousLanguage) {
      this.notifyLanguageChange(language);
    }
  }

  /**
   * Add a listener for profile language changes
   */
  onProfileLanguageChange(callback: (language: string) => void): void {
    this.changeListeners.push(callback);
  }

  /**
   * Remove all profile language change listeners
   */
  removeProfileLanguageChangeListener(): void {
    this.changeListeners = [];
  }

  /**
   * Queue a language update for retry when profile callback becomes available
   */
  private queueForRetry(language: string): void {
    // Only queue if not already queued
    if (!this.retryQueue.includes(language)) {
      this.retryQueue.push(language);
    }
  }

  /**
   * Process queued language updates
   */
  private async processRetryQueue(): Promise<void> {
    if (this.isRetrying || this.retryQueue.length === 0) {
      return;
    }

    this.isRetrying = true;

    try {
      // Process the most recent language update (ignore older ones)
      const latestLanguage = this.retryQueue[this.retryQueue.length - 1];
      this.retryQueue = [];

      console.log("Processing queued language update:", latestLanguage);
      await this.syncLanguageToProfile(latestLanguage);
    } catch (error) {
      console.warn("Retry queue processing failed:", error);
      // Language will remain in queue for next retry
    } finally {
      this.isRetrying = false;
    }
  }

  /**
   * Notify all listeners of language change
   */
  private notifyLanguageChange(language: string): void {
    this.changeListeners.forEach((callback) => {
      try {
        callback(language);
      } catch (error) {
        console.error("Error in profile language change listener:", error);
      }
    });
  }

  /**
   * Check if there are pending updates
   */
  hasPendingUpdates(): boolean {
    return this.retryQueue.length > 0;
  }

  /**
   * Get pending updates count
   */
  getPendingUpdatesCount(): number {
    return this.retryQueue.length;
  }

  /**
   * Clear all pending updates (useful for cleanup)
   */
  clearPendingUpdates(): void {
    this.retryQueue = [];
  }
}

// Export singleton instance
export const profileLanguageSynchronizer: ProfileLanguageSynchronizer =
  new ProfileLanguageSynchronizerImpl();

/**
 * Utility functions for profile language synchronization
 */
export const ProfileLanguageSyncUtils = {
  /**
   * Check if profile language differs from stored language
   */
  async needsSync(profileLanguage: string | null): Promise<boolean> {
    if (!profileLanguage) return false;

    const storedLanguage = await languageStorageManager.getStoredLanguage();
    const supportedProfileLanguage =
      languageStorageManager.getSupportedLanguage(profileLanguage);

    return storedLanguage !== supportedProfileLanguage;
  },

  /**
   * Sync profile language with storage if they differ
   */
  async syncIfNeeded(profileLanguage: string | null): Promise<boolean> {
    if (!profileLanguage) return false;

    const needsSync = await this.needsSync(profileLanguage);
    if (needsSync) {
      try {
        const supportedLanguage =
          languageStorageManager.getSupportedLanguage(profileLanguage);
        await languageStorageManager.setStoredLanguage(supportedLanguage);
        return true;
      } catch (error) {
        console.error("Error syncing profile language to storage:", error);
        return false;
      }
    }

    return false;
  },

  /**
   * Get language priority description
   */
  getLanguagePriorityDescription(
    hasProfile: boolean,
    hasStorage: boolean,
  ): string {
    if (hasProfile && hasStorage) {
      return "Profile language takes precedence over stored language";
    } else if (hasProfile) {
      return "Using profile language (no stored preference)";
    } else if (hasStorage) {
      return "Using stored language (no profile preference)";
    } else {
      return "Using system language (no profile or stored preference)";
    }
  },
};
