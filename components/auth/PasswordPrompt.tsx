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
    Alert,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import BiometricLogin from '@/components/auth/BiometricLogin';
import {useRouter} from "expo-router";

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
    const router = useRouter();

    const { initializeEncryptionWithPassword, signOut, user } = useAuth();

    const handleSubmit = async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            await initializeEncryptionWithPassword(password);
            router.push('/');
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

                        {/* Show biometric option only if current user has stored biometric data and not currently loading */}
                        {!loading && user && (
                            <BiometricLogin onBiometricLogin={onSuccess} />
                        )}
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
