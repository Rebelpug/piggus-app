/**
 * PasswordPromptScreen.tsx
 * Prompts for password to initialize encryption when a session exists but encryption keys are not initialized
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useAuth } from '@/context/AuthContext';

const PasswordPromptScreen: React.FC = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { initializeEncryptionWithPassword, signOut } = useAuth();

    const handleUnlock = async () => {
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);

        try {
            await initializeEncryptionWithPassword(password);
            // No need to navigate - the AuthProvider will handle rendering the main app
        } catch (error: any) {
            const errorMessage = error?.message || 'Failed to initialize encryption. Please check your password.';
            Alert.alert('Encryption Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                        } catch (error) {
                            console.error('Sign out error:', error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Unlock Your Data</Text>
                    <Text style={styles.subtitle}>
                        Please enter your password to decrypt your data.
                        This is required each time you restart the app.
                    </Text>

                    <View style={styles.form}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            secureTextEntry
                            autoFocus
                        />

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleUnlock}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>Unlock</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.signOutButton}
                            onPress={handleSignOut}
                        >
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>
                            Your data is encrypted and can only be accessed with your password.
                            If you forgot your password, you'll need to sign out and create a new account.
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    keyboardView: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        marginBottom: 30,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 15,
        marginBottom: 16,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#4A69FF',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#A0AEC0',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    signOutButton: {
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    signOutText: {
        color: '#FF4A69',
        fontSize: 16,
        fontWeight: '600',
    },
    infoContainer: {
        backgroundColor: '#E6F7FF',
        borderRadius: 8,
        padding: 15,
        borderLeftWidth: 4,
        borderLeftColor: '#1890FF',
    },
    infoText: {
        color: '#333',
        fontSize: 14,
        lineHeight: 20,
    }
});

export default PasswordPromptScreen;
