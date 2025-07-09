import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {View, Text, ActivityIndicator, StyleSheet, Alert} from 'react-native';
import type { Profile } from '@/types/profile';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
// Use services instead of direct client imports
import { apiCreatePortfolio } from '@/services/investmentService';
import { apiCreateExpensesGroup } from '@/services/expenseService';
import { apiFetchProfile, apiCreateProfile, apiUpdateProfile } from '@/services/profileService';
// Keep old client imports as backup
// import { apiCreatePortfolio } from '@/client/investment';
// import { apiCreateExpensesGroup } from '@/client/expense';
// import { apiFetchProfile, apiCreateProfile, apiUpdateProfile } from '@/client/profile';
import {useEncryption} from "@/context/EncryptionContext";

// Import the form component normally since we fixed the circular dependency
import ProfileCreationForm from '@/components/account/ProfileCreationForm';

type ProfileContextType = {
    userProfile: Profile | null;
    loading: boolean;
    error: string | null;
    createUserProfile: (username: string, defaultCurrency?: string) => Promise<Profile | null>;
    refreshProfile: () => Promise<void>;
    updateProfile: (profileData: Partial<Profile['profile']>) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { user, publicKey, encryptData, decryptData, authInitialized, encryptionInitialized } = useAuth();
    const { encryptWithExternalPublicKey, createEncryptionKey, encryptWithExternalEncryptionKey } = useEncryption();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profileInitialized, setProfileInitialized] = useState(false);

    const initialisePersonalExpensesGroup = async (username: string, defaultCurrency: string = 'EUR') => {
        if (!user || !publicKey || !username) {
            console.log('User', user);
            console.log('publicKey', publicKey);
            console.log('username', username);
            console.error('User is not authenticated, cannot create personal group');
            return;
        }

        const { data: groups } = await supabase
            .from('expenses_group_memberships')
            .select('group_id, expenses_groups!inner(*)')
            .eq('user_id', user.id);

        if (!groups || groups.length === 0) {
            await apiCreateExpensesGroup(user, username, publicKey, createEncryptionKey, encryptWithExternalPublicKey, encryptWithExternalEncryptionKey, {
                name: 'Personal Expenses',
                description: 'personal',
                private: true,
                currency: defaultCurrency
            });
        }
    };

    const initialisePersonalPortfolio = async (username: string) => {
        if (!user || !publicKey) {
            console.error('User is not authenticated, cannot create personal portfolio');
            return;
        }

        const { data: portfolios } = await supabase
            .from('portfolio_memberships')
            .select('portfolio_id, portfolios!inner(*)')
            .eq('user_id', user.id);

        if (!portfolios || portfolios.length === 0) {
            await apiCreatePortfolio(user, username, publicKey, createEncryptionKey, encryptWithExternalPublicKey, encryptWithExternalEncryptionKey, {
                name: 'Personal Investments',
                description: 'My personal investment portfolio',
                private: true,
            });
        }
    };

    // Fetch the user's profile
    const fetchUserProfile = useCallback(async (): Promise<void> => {
        // Don't attempt to fetch if auth is not fully initialized or if we're missing required dependencies
        if (!authInitialized || !encryptionInitialized || !user || !encryptData || !decryptData) {
            console.log('Cannot fetch profile: Auth/Encryption not fully initialized or missing dependencies');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch profile using the API function
            const result = await apiFetchProfile(user, encryptData, decryptData);

            if (result.data) {
                console.log('Profile found and loaded');
                setUserProfile(result.data);
            } else {
                console.log('No profile found for user, will need to create one', result.error);
                // We'll let the UI handle profile creation rather than doing it automatically
                // This ensures the user sees what's happening
            }
            setProfileInitialized(true);
        } catch (error: any) {
            console.error('Error fetching profile:', error);
            setError(error.message || 'Failed to fetch profile');
        } finally {
            setLoading(false);
        }
    }, [user, encryptData, decryptData, authInitialized, encryptionInitialized]);

    // Create a profile for the user
    const createUserProfile = useCallback(
        async (username: string, defaultCurrency: string = 'EUR'): Promise<Profile | null> => {
            if (!authInitialized || !encryptionInitialized || !user || !encryptData || !decryptData) {
                setError('Cannot create profile: Auth/Encryption not fully initialized or missing user/encryption');
                return null;
            }
            console.log('Creating user with currency:', defaultCurrency);

            if (!username) {
                setError('Cannot create profile: No name provided');
                return null;
            }

            if (!publicKey) {
                setError('Cannot create profile: No public key found');
                return null;
            }

            try {
                setLoading(true);

                // Create profile using the API function
                const result = await apiCreateProfile(user, username, encryptData, decryptData);

                if (!result.data) {
                    throw new Error(result.error || 'Failed to create profile');
                }

                // Initialize with default currency in profile
                const profileWithCurrency = {
                    ...result.data,
                    profile: {
                        ...result.data.profile,
                        defaultCurrency: defaultCurrency
                    }
                };

                await initialisePersonalExpensesGroup(username, defaultCurrency);
                await initialisePersonalPortfolio(username);

                // Update the profile with the default currency
                await updateProfile({ defaultCurrency: defaultCurrency });

                setUserProfile(profileWithCurrency);
                setLoading(false);
                setProfileInitialized(true);
                return profileWithCurrency;
            } catch (error: any) {
                console.error('Error creating profile:', error);
                setError(error.message || 'Failed to create profile');
                setLoading(false);
                setProfileInitialized(true);
                return null;
            }
        },
        [user, publicKey, encryptData, decryptData, authInitialized, encryptionInitialized]
    );

    // Update the user's profile
    const updateProfile = useCallback(
        async (profileData: Partial<Profile['profile']>): Promise<void> => {
            if (!authInitialized || !encryptionInitialized || !user || !userProfile || !encryptData || !decryptData) {
                setError(
                    'Cannot update profile: Auth/Encryption not fully initialized or missing user/profile/encryption'
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
                    decryptData
                );

                if (!result.data) {
                    throw new Error(result.error || 'Failed to update profile');
                }

                setUserProfile(result.data);
                Alert.alert('Profile updated', 'Your profile has been updated successfully.');
            } catch (error: any) {
                console.error('Error updating profile:', error);
                setError(error.message || 'Failed to update profile');
                Alert.alert('Error', error.message || 'Failed to update profile', [])
            } finally {
                setLoading(false);
            }
        },
        [user, userProfile, encryptData, decryptData, authInitialized, encryptionInitialized]
    );

    // Refresh the user's profile
    const refreshProfile = useCallback(async (): Promise<void> => {
        await fetchUserProfile();
    }, [fetchUserProfile]);

    // Effect to fetch profile when auth state changes
    useEffect(() => {
        // Only fetch profile when auth is fully initialized and we have the necessary dependencies
        if (authInitialized && encryptionInitialized && user && !profileInitialized) {
            fetchUserProfile();
        } else if (!user) {
            // Reset profile state when user is not authenticated
            setUserProfile(null);
            setLoading(false);
            setProfileInitialized(false);
        }
    }, [user, encryptData, decryptData, fetchUserProfile, authInitialized, encryptionInitialized, profileInitialized]);

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
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color="#0000ff" />
                        <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
                    </View>
                </View>
            );
        }

        // If we have a user and profile is initialized but no profile exists, show profile creation
        if (user && profileInitialized && !userProfile) {
            return (
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={styles.formContainer}>
                        <ProfileCreationForm
                            onComplete={() => refreshProfile()}
                            onCreateProfile={createUserProfile}
                        />
                    </View>
                </View>
            );
        }

        // Otherwise, render the children
        return children;
    };

    return (
        <ProfileContext.Provider
            value={{
                userProfile,
                loading: isLoading,
                error,
                createUserProfile,
                refreshProfile,
                updateProfile,
            }}
        >
            {renderContent()}
        </ProfileContext.Provider>
    );
}

// Export the hook to use the context
export function useProfile() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
}

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
        padding: 20,
    }
});
