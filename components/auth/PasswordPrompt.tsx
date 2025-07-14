import React, {useState, useEffect} from 'react';
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
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import {useRouter} from "expo-router";
import {SecureKeyManager} from "@/lib/secureKeyManager";

interface PasswordPromptProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

const PasswordPrompt: React.FC<PasswordPromptProps> = ({ onSuccess, onCancel }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { initializeEncryptionWithPassword, signOut, user, tryBiometricLogin, isAuthenticated } = useAuth();

    useEffect(() => {
        handleBiometricLogin();
    }, []);

    const handleBiometricLogin = async () => {
        try {
            // Check if biometric authentication is available
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            console.log('PasswordPrompt: hasHardware =', hasHardware);

            if (!hasHardware) {
                console.log('PasswordPrompt: No biometric hardware available - skipping biometric login');
                return;
            }

            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            console.log('PasswordPrompt: isEnrolled =', isEnrolled);

            if (!isEnrolled) {
                console.log('PasswordPrompt: No biometric credentials enrolled - skipping biometric login');
                return;
            }

            const hasStoredKeys = await SecureKeyManager.hasStoredKey();
            console.log('PasswordPrompt: hasStoredKeys =', hasStoredKeys);

            // Only attempt biometric login if we have stored keys
            if (!hasStoredKeys) {
                console.log('PasswordPrompt: No stored keys - skipping biometric login');
                return;
            }

            console.log('PasswordPrompt: Attempting biometric authentication...');
            const biometricResult = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Authenticate to unlock your encrypted data',
                cancelLabel: 'Cancel',
                fallbackLabel: 'Use Password',
                disableDeviceFallback: false,
            });

            if (biometricResult.success) {
                setLoading(true);
                console.log('PasswordPrompt: Biometric authentication successful, initializing encryption...');
                // Try to initialize encryption using stored keys
                const success = await tryBiometricLogin();
                if (success) {
                    console.log('PasswordPrompt: Biometric login successful, user is now authenticated');
                    onSuccess?.();
                } else {
                    console.log('PasswordPrompt: Biometric authentication succeeded but encryption initialization failed');
                    Alert.alert(
                        'Session Expired',
                        'Your session has expired. Please sign in again.',
                        [
                            {
                                text: 'OK',
                                onPress: async () => {
                                    try {
                                        await signOut();
                                        onCancel?.();
                                    } catch (error) {
                                        console.error('Sign out failed:', error);
                                    }
                                }
                            }
                        ]
                    );
                }
            } else {
                console.log('PasswordPrompt: Biometric authentication failed or was canceled');
                Alert.alert('Failed to sign in', 'Biometric authentication failed, you will need to login again.');
            }
        } catch (error) {
            console.error('PasswordPrompt: Biometric login error:', error);
            Alert.alert('Failed to sign in', 'Biometric authentication failed, you will need to login again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            await initializeEncryptionWithPassword(password);
            console.log('Password authentication successful, user is now authenticated');
            // Don't redirect - let the auth system handle the navigation
            onSuccess?.();
        } catch (error: any) {
            console.error('Password verification failed:', error);
            Alert.alert(
                'Invalid Password',
                'The password you entered is incorrect. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out? You will need to sign in again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut();
                            onCancel?.();
                        } catch (error) {
                            console.error('Sign out failed:', error);
                        }
                    }
                },
            ]
        );
    };

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
                            <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Enter Password</Text>
                        <Text style={[styles.subtitle, { color: colors.icon }]}>
                            Please enter your password to unlock your encrypted data
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
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
                                    onSubmitEditing={handleSubmit}
                                    autoFocus
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
                                (loading || !password.trim()) && styles.buttonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={loading || !password.trim()}
                            activeOpacity={loading || !password.trim() ? 1 : 0.7}
                        >
                            {loading ? (
                                <View style={styles.buttonContent}>
                                    <ActivityIndicator color="#FFF" size="small" />
                                    <Text style={styles.buttonText}>Unlocking...</Text>
                                </View>
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Text style={styles.buttonText}>Unlock</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleCancel}
                            disabled={loading}
                            style={[styles.cancelButton, loading && { opacity: 0.5 }]}
                            activeOpacity={loading ? 1 : 0.7}
                        >
                            <Text style={[styles.cancelButtonText, { color: colors.icon }]}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

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
        lineHeight: 22,
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
        opacity: 0.6,
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
    cancelButton: {
        marginTop: 16,
        alignItems: 'center',
        padding: 12,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default PasswordPrompt;
