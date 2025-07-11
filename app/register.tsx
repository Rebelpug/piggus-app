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
    Alert,
    StatusBar,
    Image,
    Linking
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from "expo-router";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const RegisterScreen = () => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        // Validate inputs
        if (!email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (!email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return;
        }

        if (password.length < 8) {
            Alert.alert('Error', 'Password must be at least 8 characters');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (!acceptTerms) {
            Alert.alert('Error', 'You must accept the terms and conditions to create an account');
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password);
            Alert.alert(
                'Registration Successful',
                'Your account has been created. Please check your email to confirm your account.',
                [{ text: 'OK', onPress: () => router.push('/login') }]
            );
        } catch (error: any) {
            const errorMessage = error?.message || 'Failed to create account. Please try again.';
            Alert.alert('Registration Error', errorMessage);
        } finally {
            setLoading(false);
        }
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
                        <View style={styles.logoContainer}>
                            <Image
                                source={require('@/assets/images/transparent-logo.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={[styles.titleLogo, { color: colors.text }]}>Piggus</Text>
                        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: colors.icon }]}>Sign up to get started</Text>
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
                                    placeholder="Create a password"
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

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm your password"
                                    placeholderTextColor={colors.icon}
                                    secureTextEntry={!showConfirmPassword}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                                        size={20}
                                        color={colors.icon}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Terms and Conditions Checkbox */}
                        <View style={styles.checkboxContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.checkbox,
                                    { borderColor: colors.border },
                                    acceptTerms && { backgroundColor: colors.primary, borderColor: colors.primary }
                                ]}
                                onPress={() => setAcceptTerms(!acceptTerms)}
                                disabled={loading}
                            >
                                {acceptTerms && (
                                    <Ionicons name="checkmark" size={16} color="#FFF" />
                                )}
                            </TouchableOpacity>
                            <View style={styles.checkboxTextContainer}>
                                <Text style={[styles.checkboxText, { color: colors.text }]}>
                                    I accept the{' '}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL('https://piggus.finance/toc-app')}
                                    disabled={loading}
                                >
                                    <Text style={[styles.termsLink, { color: colors.primary }, loading && { opacity: 0.5 }]}>
                                        terms and conditions
                                    </Text>
                                </TouchableOpacity>
                                <Text style={[styles.checkboxText, { color: colors.text }]}>
                                    {' '}and{' '}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => Linking.openURL('https://piggus.finance/privacy-app')}
                                    disabled={loading}
                                >
                                    <Text style={[styles.termsLink, { color: colors.primary }, loading && { opacity: 0.5 }]}>
                                        privacy policy
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.button,
                                { backgroundColor: loading || !acceptTerms ? colors.icon : colors.primary },
                                (loading || !acceptTerms) && styles.buttonDisabled
                            ]}
                            onPress={handleRegister}
                            disabled={loading || !acceptTerms}
                        >
                            {loading ? (
                                <View style={styles.buttonContent}>
                                    <ActivityIndicator color="#FFF" size="small" />
                                    <Text style={styles.buttonText}>Creating Account...</Text>
                                </View>
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Text style={styles.buttonText}>Create Account</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.icon }]}>Already have an account?</Text>
                        <TouchableOpacity onPress={() => router.push('/login')} disabled={loading}>
                            <Text style={[styles.link, { color: colors.primary }, loading && { opacity: 0.5 }]}>
                                Sign In
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
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 0,
    },
    logo: {
        width: 80,
        height: 80,
    },
    titleLogo: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 24,
        textAlign: 'center',
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
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 2,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    checkboxTextContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    checkboxText: {
        fontSize: 14,
        lineHeight: 20,
    },
    termsLink: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});

export default RegisterScreen;
