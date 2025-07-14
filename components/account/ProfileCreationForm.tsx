import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { CURRENCIES } from '@/types/expense';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface ProfileCreationProps {
    onComplete: () => void;
    onCreateProfile: (username: string, defaultCurrency: string) => Promise<any>;
}

export default function ProfileCreationForm({ onComplete, onCreateProfile }: ProfileCreationProps) {
    const { user } = useAuth();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [customName, setCustomName] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('EUR'); // Default to EUR
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

    // Validate and sanitize username
    const sanitizeUsername = (input: string): string => {
        // Remove spaces and special characters, keep only alphanumeric characters
        return input.replace(/[^a-zA-Z0-9]/g, '');
    };

    const validateUsername = (username: string): string | null => {
        if (username.length === 0) return null; // Empty is allowed (will generate random)
        
        if (username.length < 3) {
            return 'Username must be at least 3 characters long';
        }
        
        if (username.length > 20) {
            return 'Username must be no more than 20 characters long';
        }
        
        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            return 'Username can only contain letters and numbers (no spaces or special characters)';
        }
        
        return null;
    };

    // Generate a random human-readable name
    const generateRandomName = () => {
        const adjectives = [
            'Happy',
            'Brave',
            'Clever',
            'Gentle',
            'Swift',
            'Bright',
            'Kind',
            'Calm',
            'Bold',
            'Wise',
        ];
        const nouns = [
            'Tiger',
            'Eagle',
            'River',
            'Mountain',
            'Forest',
            'Ocean',
            'Star',
            'Moon',
            'Falcon',
            'Phoenix',
        ];
        const randomNum = Math.floor(Math.random() * 1000);

        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

        return `${randomAdj}${randomNoun}${randomNum}`;
    };

    // Check if a username is already taken
    const isUsernameTaken = async (username: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .single();

            return !!data; // Return true if a profile with this username exists
        } catch (error) {
            return false;
        }
    };

    const showToast = (title: string, message: string, isError = false) => {
        // Simple Alert-based toast for React Native
        Alert.alert(title, message);
    };

    const handleCreateProfile = async () => {
        setIsCreating(true);
        setError(null);

        if (!user) {
            setError('Cannot create profile: No user is logged in');
            setIsCreating(false);
            return;
        }

        try {
            let finalUsername = customName.trim();

            // If user provided a custom name, validate and check if it's taken
            if (finalUsername) {
                // Validate username format
                const validationError = validateUsername(finalUsername);
                if (validationError) {
                    setError(validationError);
                    setIsCreating(false);
                    return;
                }
                setIsCheckingName(true);
                const taken = await isUsernameTaken(finalUsername);
                setIsCheckingName(false);

                if (taken) {
                    setError('This username is already taken. Please choose a different one.');
                    setIsCreating(false);
                    return;
                }
            } else {
                // Generate a unique random name
                let isUnique = false;
                let attempts = 0;
                const maxAttempts = 10;

                while (!isUnique && attempts < maxAttempts) {
                    finalUsername = generateRandomName();
                    setIsCheckingName(true);
                    const taken = await isUsernameTaken(finalUsername);
                    setIsCheckingName(false);

                    if (!taken) {
                        isUnique = true;
                    }

                    attempts++;
                }

                if (!isUnique) {
                    setError(
                        'Failed to generate a unique username. Please try again or provide a custom name.'
                    );
                    setIsCreating(false);
                    return;
                }
            }

            // Create the profile with the username and default currency
            const profile = await onCreateProfile(finalUsername, selectedCurrency);

            if (!profile) {
                setError('Failed to create profile');
                showToast('Error', 'Failed to create profile', true);
                setIsCreating(false);
                return;
            }

            onComplete();
        } catch (err) {
            setError(`An error occurred: ${err instanceof Error ? err.message : String(err)}`);
            console.error('Profile creation error:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const selectedCurrencyLabel = CURRENCIES.find(c => c.value === selectedCurrency)?.label || selectedCurrency;

    return (
        <ScrollView contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Complete Your Registration</Text>
                    <Text style={[styles.cardDescription, { color: colors.icon }]}>
                        One more step! We need to create your profile to store your encrypted data.
                    </Text>
                </View>

                <View style={styles.cardContent}>
                    {error && (
                        <View style={[styles.errorContainer, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                        </View>
                    )}

                    <Text style={[styles.paragraph, { color: colors.text }]}>
                        You can share your things with family and friends. This means that they will need to be
                        able to find you. Unless you choose a unique name, you will be assigned something random.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Username (Optional)</Text>
                        <TextInput
                            style={[styles.input, {
                                borderColor: colors.border,
                                backgroundColor: colors.background,
                                color: colors.text
                            }]}
                            placeholder="Enter a custom name (optional)"
                            placeholderTextColor={colors.icon}
                            value={customName}
                            onChangeText={(text) => {
                                const sanitized = sanitizeUsername(text);
                                setCustomName(sanitized);
                                setError(null); // Clear error when user types
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Text style={[styles.helperText, { color: colors.icon }]}>
                            Only letters and numbers allowed (3-20 characters). No spaces or special characters.
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Default Currency</Text>
                        <TouchableOpacity
                            style={[styles.currencySelector, {
                                borderColor: colors.border,
                                backgroundColor: colors.background
                            }]}
                            onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                        >
                            <Text style={[styles.currencyText, { color: colors.text }]}>{selectedCurrencyLabel}</Text>
                            <Text style={[styles.dropdownArrow, { color: colors.icon }]}>▼</Text>
                        </TouchableOpacity>

                        {showCurrencyDropdown && (
                            <View style={[styles.currencyDropdown, {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                shadowColor: colors.text
                            }]}>
                                <ScrollView style={styles.currencyList} nestedScrollEnabled>
                                    {CURRENCIES.map((currency) => (
                                        <TouchableOpacity
                                            key={currency.value}
                                            style={[
                                                styles.currencyOption,
                                                { borderBottomColor: colors.border },
                                                selectedCurrency === currency.value && [styles.selectedCurrencyOption, { backgroundColor: colors.primary + '20' }]
                                            ]}
                                            onPress={() => {
                                                setSelectedCurrency(currency.value);
                                                setShowCurrencyDropdown(false);
                                            }}
                                        >
                                            <Text style={[
                                                styles.currencyOptionText,
                                                { color: colors.text },
                                                selectedCurrency === currency.value && [styles.selectedCurrencyText, { color: colors.primary }]
                                            ]}>
                                                {currency.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        <Text style={[styles.helperText, { color: colors.icon }]}>
                            This will be your default currency for expenses and budgets
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            { backgroundColor: colors.primary },
                            (isCreating || isCheckingName) && [styles.buttonDisabled, { backgroundColor: colors.icon }]
                        ]}
                        onPress={handleCreateProfile}
                        disabled={isCreating || isCheckingName}
                    >
                        {isCreating || isCheckingName ? (
                            <View style={styles.buttonContent}>
                                <ActivityIndicator size="small" color="white" style={styles.spinner} />
                                <Text style={styles.buttonText}>
                                    {isCheckingName ? 'Checking...' : 'Creating...'}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.buttonText}>Create Profile</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        borderRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    cardHeader: {
        padding: 16,
        borderBottomWidth: 1,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 14,
    },
    cardContent: {
        padding: 16,
    },
    errorContainer: {
        marginBottom: 16,
        padding: 12,
        borderWidth: 1,
        borderRadius: 4,
    },
    errorText: {},
    paragraph: {
        marginBottom: 16,
        fontSize: 14,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        fontSize: 16,
    },
    currencySelector: {
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currencyText: {
        fontSize: 16,
        flex: 1,
    },
    dropdownArrow: {
        fontSize: 12,
    },
    currencyDropdown: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        borderWidth: 1,
        borderRadius: 4,
        maxHeight: 200,
        zIndex: 1000,
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    currencyList: {
        maxHeight: 200,
    },
    currencyOption: {
        padding: 12,
        borderBottomWidth: 1,
    },
    selectedCurrencyOption: {},
    currencyOptionText: {
        fontSize: 16,
    },
    selectedCurrencyText: {
        fontWeight: '500',
    },
    helperText: {
        fontSize: 12,
        marginTop: 4,
    },
    button: {
        borderRadius: 4,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    buttonDisabled: {},
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '500',
        fontSize: 16,
    },
    spinner: {
        marginRight: 8,
    }
});
