/**
 * LoginScreen.tsx
 * A complete login screen with username/password authentication
 */
import React, { useState, useEffect } from 'react';
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
    Alert,
    StatusBar
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from "expo-router";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import PasswordPrompt from "@/components/auth/PasswordPrompt";

const LoginScreen = () => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [encryptionProgress, setEncryptionProgress] = useState(0);
    const [encryptionStep, setEncryptionStep] = useState('');
    const { signIn, user, encryptionInitialized, needsPasswordPrompt, isAuthenticated } = useAuth();
    const router = useRouter();

    // Redirect to main app when user becomes fully authenticated
    useEffect(() => {
        if (isAuthenticated) {
            console.log('User is fully authenticated, redirecting to main app');
            router.replace('/(protected)');
        }
    }, [isAuthenticated, router]);

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
            router.push('/');

        } catch (error: any) {
            setLoading(false);
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
            setTimeout(() => {
                setEncryptionProgress(0);
                setEncryptionStep('');
            }, 1500);
        }
    };

    // If user is logged in but needs to enter password for encryption
    if (user && needsPasswordPrompt && !encryptionInitialized) {
        return (
            <PasswordPrompt
                onSuccess={() => {
                    console.log('Password prompt success, authentication should be complete');
                }}
            />
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar
                barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor={colors.background}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.contentContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={[styles.logoContainer, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="wallet-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: colors.icon }]}>Sign in to your account</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter your email"
                                    placeholderTextColor={colors.icon}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter your password"
                                    placeholderTextColor={colors.icon}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                                        size={20}
                                        color={colors.icon}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                { backgroundColor: loading ? colors.icon : colors.primary },
                                loading && styles.buttonDisabled
                            ]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <View style={styles.progressContainer}>
                                    <ActivityIndicator color="#FFF" size="small" />
                                    <Text style={styles.progressText}>
                                        Signing In...
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
                                <View style={styles.buttonContent}>
                                    <Text style={styles.buttonText}>Sign In</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.icon }]}>{"Don't have an account?"}</Text>
                        <TouchableOpacity onPress={() => router.push('/register')} disabled={loading}>
                            <Text style={[styles.link, { color: colors.primary }, loading && { opacity: 0.5 }]}>
                                Sign Up
                            </Text>
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
    },
    keyboardView: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 8,
    },
    form: {
        marginBottom: 32,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    eyeIcon: {
        padding: 4,
        marginLeft: 8,
    },
    button: {
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
        gap: 8,
    },
    footerText: {
        fontSize: 16,
    },
    link: {
        fontWeight: '600',
        fontSize: 16,
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
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
