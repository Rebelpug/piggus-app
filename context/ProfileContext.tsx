import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import type { Profile } from "@/types/profile";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { LocalizationImperative } from "@/context/LocalizationContext";
import { supabase } from "@/lib/supabase";
import { profileLanguageSynchronizer } from "@/utils/profileLanguageSynchronizer";
// Use services instead of direct client imports
import { apiCreateExpensesGroup } from "@/services/expenseService";
import { apiCreatePortfolio } from "@/services/investmentService";
import {
  apiCreateProfile,
  apiFetchProfile,
  apiUpdateProfile,
} from "@/services/profileService";
// Keep old client imports as backup
// import { apiCreatePortfolio } from '@/client/investment';
// import { apiCreateExpensesGroup } from '@/client/expense';
// import { apiFetchProfile, apiCreateProfile, apiUpdateProfile } from '@/client/profile';
import { piggusApi } from "@/client/piggusApi";
import { useEncryption } from "@/context/EncryptionContext";
import Purchases from "react-native-purchases";

// Import the form component normally since we fixed the circular dependency
import ProfileCreationForm from "@/components/account/ProfileCreationForm";
import RecoveryKeyForm from "@/components/auth/RecoveryKeyForm";

type ProfileContextType = {
  userProfile: Profile | null;
  loading: boolean;
  error: string | null;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  createUserProfile: (
    username: string,
    defaultCurrency?: string,
  ) => Promise<Profile | null>;
  refreshProfile: () => Promise<void>;
  updateProfile: (profileData: Partial<Profile["profile"]>) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    publicKey,
    encryptData,
    decryptData,
    authInitialized,
    encryptionInitialized,
    needsRecoveryKey,
    storeRecoveryKey,
  } = useAuth();
  // Remove the circular dependency - we'll use the imperative interface instead
  const {
    encryptWithExternalPublicKey,
    createEncryptionKey,
    encryptWithExternalEncryptionKey,
    getPrivateKey,
  } = useEncryption();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileInitialized, setProfileInitialized] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Ref to track the last processed profile language to prevent infinite loops
  const lastProcessedLanguageRef = useRef<string | null>(null);

  const initialisePersonalExpensesGroup = async (
    username: string,
    defaultCurrency: string = "EUR",
  ) => {
    if (!user || !publicKey || !username) {
      console.error("User is not authenticated, cannot create personal group");
      return;
    }

    const { data: groups } = await supabase
      .from("expenses_group_memberships")
      .select("group_id, expenses_groups!inner(*)")
      .eq("user_id", user.id);

    if (!groups || groups.length === 0) {
      await apiCreateExpensesGroup(
        user,
        username,
        publicKey,
        createEncryptionKey,
        encryptWithExternalPublicKey,
        encryptWithExternalEncryptionKey,
        {
          name: "Personal Expenses",
          description: "personal",
          private: true,
          currency: defaultCurrency,
        },
      );
    }
  };

  const initialisePersonalPortfolio = async (username: string) => {
    if (!user || !publicKey) {
      console.error(
        "User is not authenticated, cannot create personal portfolio",
      );
      return;
    }

    const { data: portfolios } = await supabase
      .from("portfolio_memberships")
      .select("portfolio_id, portfolios!inner(*)")
      .eq("user_id", user.id);

    if (!portfolios || portfolios.length === 0) {
      await apiCreatePortfolio(
        user,
        username,
        publicKey,
        createEncryptionKey,
        encryptWithExternalPublicKey,
        encryptWithExternalEncryptionKey,
        {
          name: "Personal Investments",
          description: "My personal investment portfolio",
          private: true,
        },
      );
    }
  };

  // Sync subscription status between RevenueCat and backend
  const syncRevenueCatSubscription = useCallback(
    async (profile: Profile): Promise<Profile> => {
      try {
        // Skip sync in development environment
        if (__DEV__) {
          return profile;
        }

        if (profile.subscription?.override_no_revenue_cat_checker) {
          return profile;
        }

        // Initialize RevenueCat if not already done
        const apiKey =
          (Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_REVENUE_CAT_GOOGLE_API_KEY
            : process.env.EXPO_PUBLIC_REVENUE_CAT_APPLE_API_KEY) || "";

        if (apiKey) {
          Purchases.configure({ apiKey });

          // Get RevenueCat customer info
          const customerInfo = await Purchases.getCustomerInfo();
          const hasRevenueCatPremium =
            typeof customerInfo.entitlements.active["premium"] !== "undefined";
          const hasBackendPremium =
            profile.subscription?.subscription_tier === "premium";

          // Only sync if there's a mismatch
          if (hasRevenueCatPremium !== hasBackendPremium) {
            const targetTier = hasRevenueCatPremium ? "premium" : "free";
            try {
              await piggusApi.updateSubscription(
                targetTier,
                customerInfo.originalAppUserId,
              );

              // Refetch profile to get updated subscription status
              const updatedResult = await apiFetchProfile(
                user!,
                encryptData!,
                decryptData!,
              );
              if (updatedResult.data) {
                return updatedResult.data;
              }
            } catch (backendError: any) {
              console.error("Backend subscription sync failed:", backendError);
              // Don't throw error - return original profile and let app continue
            }
          }
        }
      } catch (error) {
        console.error("Error syncing RevenueCat subscription:", error);
        // Don't throw error - return original profile and let app continue
      }
      return profile;
    },
    [user, encryptData, decryptData],
  );

  // Fetch the user's profile
  const fetchUserProfile = useCallback(async (): Promise<void> => {
    // Don't attempt to fetch if auth is not fully initialized or if we're missing required dependencies
    if (
      !authInitialized ||
      !encryptionInitialized ||
      !user ||
      !encryptData ||
      !decryptData
    ) {
      console.warn(
        "Cannot fetch profile: Auth/Encryption not fully initialized or missing dependencies",
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch profile using the API function
      const result = await apiFetchProfile(user, encryptData, decryptData);

      if (result.data) {
        const syncedProfile = await syncRevenueCatSubscription(result.data);

        setUserProfile(syncedProfile);
        setOnboardingCompleted(!!syncedProfile.profile.budgeting?.budget);
      } else {
        console.warn(
          "No profile found for user, will need to create one",
          result.error,
        );
        // We'll let the UI handle profile creation rather than doing it automatically
        // This ensures the user sees what's happening
      }
      setProfileInitialized(true);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      setError(error.message || "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    encryptData,
    decryptData,
    authInitialized,
    encryptionInitialized,
    syncRevenueCatSubscription,
  ]);

  // Create a profile for the user
  const createUserProfile = useCallback(
    async (
      username: string,
      defaultCurrency: string = "EUR",
    ): Promise<Profile | null> => {
      if (
        !authInitialized ||
        !encryptionInitialized ||
        !user ||
        !encryptData ||
        !decryptData
      ) {
        setError(
          "Cannot create profile: Auth/Encryption not fully initialized or missing user/encryption",
        );
        return null;
      }

      if (!username) {
        setError("Cannot create profile: No name provided");
        return null;
      }

      if (!publicKey) {
        setError("Cannot create profile: No public key found");
        return null;
      }

      try {
        setLoading(true);

        // Create profile using the API function
        const result = await apiCreateProfile(
          user,
          username,
          encryptData,
          decryptData,
          defaultCurrency,
        );

        if (!result.data) {
          throw new Error(result.error || "Failed to create profile");
        }

        await initialisePersonalExpensesGroup(username, defaultCurrency);
        await initialisePersonalPortfolio(username);

        setUserProfile(result.data);
        setOnboardingCompleted(false);
        setLoading(false);
        setProfileInitialized(true);
        return result.data;
      } catch (error: any) {
        console.error("Error creating profile:", error);
        setError(error.message || "Failed to create profile");
        setLoading(false);
        setProfileInitialized(true);
        return null;
      }
    },
    [
      user,
      publicKey,
      encryptData,
      decryptData,
      authInitialized,
      encryptionInitialized,
    ],
  );

  // Update the user's profile
  const updateProfile = useCallback(
    async (profileData: Partial<Profile["profile"]>): Promise<void> => {
      if (
        !authInitialized ||
        !encryptionInitialized ||
        !user ||
        !userProfile ||
        !encryptData ||
        !decryptData
      ) {
        setError(
          "Cannot update profile: Auth/Encryption not fully initialized or missing user/profile/encryption",
        );
        return;
      }

      try {
        setLoading(true);

        // Update profile using the API function
        const result = await apiUpdateProfile(
          user,
          profileData,
          userProfile,
          encryptData,
          decryptData,
        );

        if (!result.data) {
          throw new Error(result.error || "Failed to update profile");
        }

        setUserProfile(result.data);
        // Check if user now has budget after update - if so, onboarding is complete
        if (result.data.profile.budgeting?.budget) {
          setOnboardingCompleted(true);
        }
      } catch (error: any) {
        console.error("Error updating profile:", error);
        setError(error.message || "Failed to update profile");
        Alert.alert("Error", error.message || "Failed to update profile", []);
      } finally {
        setLoading(false);
      }
    },
    [
      user,
      userProfile,
      encryptData,
      decryptData,
      authInitialized,
      encryptionInitialized,
    ],
  );

  // Refresh the user's profile
  const refreshProfile = useCallback(async (): Promise<void> => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  // Effect to fetch profile when auth state changes
  useEffect(() => {
    // Only fetch profile when auth is fully initialized and we have the necessary dependencies
    if (
      authInitialized &&
      encryptionInitialized &&
      user &&
      !profileInitialized
    ) {
      fetchUserProfile();
    } else if (!user) {
      // Reset profile state when user is not authenticated
      setUserProfile(null);
      setLoading(false);
      setProfileInitialized(false);
      setOnboardingCompleted(false);
    }
  }, [
    user,
    encryptData,
    decryptData,
    fetchUserProfile,
    authInitialized,
    encryptionInitialized,
    profileInitialized,
  ]);

  // Create stable callback for language updates using the new synchronizer
  const handleLanguageUpdate = useCallback(
    async (language: string) => {
      if (!language || typeof language !== "string") {
        console.warn(
          "Invalid language provided to handleLanguageUpdate:",
          language,
        );
        return;
      }

      if (userProfile && userProfile.profile?.preferredLanguage !== language) {
        try {
          await updateProfile({ preferredLanguage: language });
          // Update the synchronizer's cached profile language
          profileLanguageSynchronizer.setProfileLanguage(language);
        } catch (error) {
          console.error("Error updating profile language:", error);
          throw error; // Let the synchronizer handle the retry
        }
      }
    },
    [userProfile?.id, userProfile?.profile?.preferredLanguage, updateProfile],
  );

  // Effect to set up the profile language callback when user profile is available
  useEffect(() => {
    if (userProfile?.profile) {
      // Set up the profile update callback in both places
      profileLanguageSynchronizer.setProfileUpdateCallback(
        handleLanguageUpdate,
      );
      LocalizationImperative.setProfileLanguageCallback(handleLanguageUpdate);
    } else {
      // Clear callbacks when no profile
      profileLanguageSynchronizer.setProfileUpdateCallback(null);
      LocalizationImperative.setProfileLanguageCallback(null);
    }
  }, [userProfile?.profile, handleLanguageUpdate]);

  // Effect to sync profile language with localization - only run once when profile first loads
  useEffect(() => {
    if (!userProfile?.profile) {
      // Reset tracking when no profile
      lastProcessedLanguageRef.current = null;
      return;
    }

    const profileLanguage = userProfile.profile.preferredLanguage;

    // Skip if we've already processed this exact language
    if (lastProcessedLanguageRef.current === profileLanguage) {
      return;
    }

    // Only process if we have a valid string language
    if (profileLanguage && typeof profileLanguage === "string") {
      console.log("Profile loaded with language:", profileLanguage);

      // Update the synchronizer's cached language
      profileLanguageSynchronizer.setProfileLanguage(profileLanguage);

      // Sync with localization context
      LocalizationImperative.syncProfileLanguage(profileLanguage);

      // Track that we've processed this language
      lastProcessedLanguageRef.current = profileLanguage;
    } else {
      // Only log once when we first encounter no language
      if (lastProcessedLanguageRef.current !== null) {
        console.log("No valid profile language found");
        // Clear any cached language
        profileLanguageSynchronizer.setProfileLanguage(null);
        lastProcessedLanguageRef.current = null;
      }
    }
  }, [userProfile?.id, userProfile?.profile?.preferredLanguage]); // Only depend on user ID and the specific language field

  // Determine if we're still loading
  const isLoading: boolean = !!(user && !profileInitialized);

  // Render content based on loading state
  const renderContent = () => {
    // If auth is still initializing, don't show anything as AuthProvider will handle it
    if (!authInitialized) {
      return null;
    }

    // If we have a user but encryption is not initialized, don't show anything as AuthProvider will handle it
    if (user && !encryptionInitialized) {
      return null;
    }

    // If we have a user but profile is not initialized yet, show loading
    if (user && !profileInitialized) {
      return (
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading profile...
            </Text>
          </View>
        </View>
      );
    }

    // If we have a user, encryption is initialized, and they need a recovery key, show recovery key form
    if (user && encryptionInitialized && needsRecoveryKey) {
      // Get the private key from the encryption context to generate recovery key
      const privateKey = getPrivateKey();
      if (privateKey) {
        return (
          <View
            style={[styles.container, { backgroundColor: colors.background }]}
          >
            <RecoveryKeyForm
              privateKey={privateKey}
              onComplete={async (encryptedRecoveryPrivateKey: string) => {
                try {
                  await storeRecoveryKey(encryptedRecoveryPrivateKey);
                  // The needsRecoveryKey state will be automatically updated by AuthContext
                } catch (error) {
                  console.error("Error storing recovery key:", error);
                }
              }}
            />
          </View>
        );
      }
    }

    // If we have a user and profile is initialized but no profile exists, show profile creation
    if (user && profileInitialized && !userProfile && !needsRecoveryKey) {
      return (
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.formContainer}>
            <ProfileCreationForm
              onComplete={() => refreshProfile()}
              onCreateProfile={createUserProfile}
            />
          </View>
        </View>
      );
    }

    // If we have a user and profile but onboarding hasn't been completed, we'll handle this in the app layout
    // For now, just render children and let the layout handle onboarding
    if (
      user &&
      profileInitialized &&
      userProfile &&
      !onboardingCompleted &&
      !needsRecoveryKey
    ) {
      // Don't render onboarding here - let the layout handle it
      return children;
    }

    // Otherwise, render the children
    return children;
  };

  return (
    <ProfileContext.Provider
      value={useMemo(
        () => ({
          userProfile,
          loading: isLoading,
          error,
          onboardingCompleted,
          setOnboardingCompleted,
          createUserProfile,
          refreshProfile,
          updateProfile,
        }),
        [
          userProfile,
          isLoading,
          error,
          onboardingCompleted,
          setOnboardingCompleted,
          createUserProfile,
          refreshProfile,
          updateProfile,
        ],
      )}
    >
      {renderContent()}
    </ProfileContext.Provider>
  );
}

// Export the hook to use the context
export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
  },
});
