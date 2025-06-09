/**
 * LoginScreen.tsx
 * A complete login screen with username/password authentication
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Alert
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import {useRouter} from "expo-router";

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [encryptionProgress, setEncryptionProgress] = useState(0);
    const [encryptionStep, setEncryptionStep] = useState('');
    const { signIn } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        // Validate inputs
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        if (!email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setEncryptionProgress(0);
        setEncryptionStep('');

        try {
            console.log('Attempting login for:', email);

            await signIn(email, password, (progress, step) => {
                setEncryptionProgress(progress);
                setEncryptionStep(step);
                console.log(`Login progress: ${Math.round(progress * 100)}% - ${step}`);
            });

            console.log('Login successful');

        } catch (error: any) {
            console.error('Login failed:', error);
            let errorMessage = 'Failed to sign in. Please check your credentials.';

            if (error?.message?.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error?.message?.includes('Too many requests')) {
                errorMessage = 'Too many login attempts. Please wait a moment and try again.';
            } else if (error?.message?.includes('Network')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error?.message?.includes('encryption')) {
                errorMessage = 'Authentication succeeded but failed to initialize encryption. Please try again.';
            }

            Alert.alert('Sign In Error', errorMessage);
        } finally {
            setLoading(false);
            // Keep progress visible for a moment after completion
            setTimeout(() => {
                setEncryptionProgress(0);
                setEncryptionStep('');
            }, 1500);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Sign in to your account</Text>

                    <View style={styles.form}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                        />

                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Enter your password"
                            secureTextEntry
                            editable={!loading}
                        />

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <View style={styles.progressContainer}>
                                    <ActivityIndicator color="#FFF" size="small" />
                                    <Text style={styles.progressText}>
                                        {encryptionStep || 'Signing In...'}
                                    </Text>
                                    {encryptionProgress > 0 && (
                                        <>
                                            <View style={styles.progressBar}>
                                                <View
                                                    style={[
                                                        styles.progressFill,
                                                        { width: `${encryptionProgress * 100}%` }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.progressPercentage}>
                                                {Math.round(encryptionProgress * 100)}%
                                            </Text>
                                        </>
                                    )}
                                </View>
                            ) : (
                                <Text style={styles.buttonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Do not have an account?</Text>
                        <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
                            <Text style={[styles.link, loading && { opacity: 0.5 }]}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

/**
 * Shared styles for both screens
 */
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
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
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
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: '#666',
        marginRight: 5,
    },
    link: {
        color: '#4A69FF',
        fontWeight: '600',
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
    },
    progressText: {
        color: '#FFF',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
    progressPercentage: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        marginTop: 4,
    },
});

export default LoginScreen;
