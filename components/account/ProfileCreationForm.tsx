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

interface ProfileCreationProps {
    onComplete: () => void;
    onCreateProfile: (username: string, defaultCurrency: string) => Promise<any>;
}

export default function ProfileCreationForm({ onComplete, onCreateProfile }: ProfileCreationProps) {
    const { user } = useAuth();
    const [customName, setCustomName] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('EUR'); // Default to EUR
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingName, setIsCheckingName] = useState(false);
    const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

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

            // If user provided a custom name, check if it's taken
            if (finalUsername) {
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

            showToast(
                'Profile Created',
                finalUsername
                    ? `Your profile has been created with the name: ${finalUsername} and default currency: ${selectedCurrency}`
                    : `Your profile has been created with the name: ${finalUsername} and default currency: ${selectedCurrency}`
            );

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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Complete Your Registration</Text>
                    <Text style={styles.cardDescription}>
                        One more step! We need to create your profile to store your encrypted data.
                    </Text>
                </View>

                <View style={styles.cardContent}>
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <Text style={styles.paragraph}>
                        You can share your things with family and friends. This means that they will need to be
                        able to find you. Unless you choose a unique name, you will be assigned something random.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Username (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter a custom name (optional)"
                            value={customName}
                            onChangeText={setCustomName}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Default Currency</Text>
                        <TouchableOpacity
                            style={styles.currencySelector}
                            onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                        >
                            <Text style={styles.currencyText}>{selectedCurrencyLabel}</Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>

                        {showCurrencyDropdown && (
                            <View style={styles.currencyDropdown}>
                                <ScrollView style={styles.currencyList} nestedScrollEnabled>
                                    {CURRENCIES.map((currency) => (
                                        <TouchableOpacity
                                            key={currency.value}
                                            style={[
                                                styles.currencyOption,
                                                selectedCurrency === currency.value && styles.selectedCurrencyOption
                                            ]}
                                            onPress={() => {
                                                setSelectedCurrency(currency.value);
                                                setShowCurrencyDropdown(false);
                                            }}
                                        >
                                            <Text style={[
                                                styles.currencyOptionText,
                                                selectedCurrency === currency.value && styles.selectedCurrencyText
                                            ]}>
                                                {currency.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        <Text style={styles.helperText}>
                            This will be your default currency for expenses and budgets
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            (isCreating || isCheckingName) && styles.buttonDisabled
                        ]}
                        onPress={handleCreateProfile}
                        disabled={isCreating || isCheckingName}
                    >
                        {isCreating || isCheckingName ? (
                            <View style={styles.buttonContent}>
                                <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
                                <Text style={styles.buttonText}>
                                    {isCheckingName ? 'Checking name...' : 'Creating Profile...'}
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
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        shadowColor: '#000',
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
        borderBottomColor: '#F0F0F0',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 14,
        color: '#666666',
    },
    cardContent: {
        padding: 16,
    },
    errorContainer: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#F87171',
        borderRadius: 4,
    },
    errorText: {
        color: '#B91C1C',
    },
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
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        padding: 12,
        fontSize: 16,
    },
    currencySelector: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    currencyText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    dropdownArrow: {
        fontSize: 12,
        color: '#666',
    },
    currencyDropdown: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        maxHeight: 200,
        zIndex: 1000,
        elevation: 5,
        shadowColor: '#000',
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
        borderBottomColor: '#F0F0F0',
    },
    selectedCurrencyOption: {
        backgroundColor: '#E7F3FF',
    },
    currencyOptionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedCurrencyText: {
        color: '#3B82F6',
        fontWeight: '500',
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    button: {
        backgroundColor: '#3B82F6',
        borderRadius: 4,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        backgroundColor: '#93C5FD',
    },
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
