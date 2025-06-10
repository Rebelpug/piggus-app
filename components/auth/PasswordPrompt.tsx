import React, { useState } from 'react';
import {
    View,
    Alert,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from 'react-native';
import {
    Text,
    Input,
    Button,
    Spinner,
} from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/ThemedView';

interface PasswordPromptProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

const PasswordPrompt: React.FC<PasswordPromptProps> = ({ onSuccess, onCancel }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    
    const { initializeEncryptionWithPassword, signOut } = useAuth();

    const handleSubmit = async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            await initializeEncryptionWithPassword(password);
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

    const toggleSecureEntry = () => {
        setSecureTextEntry(!secureTextEntry);
    };

    const renderIcon = (props: any) => (
        <Ionicons
            {...props}
            name={secureTextEntry ? 'eye-off' : 'eye'}
            onPress={toggleSecureEntry}
        />
    );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                <View style={styles.contentContainer}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="lock-closed-outline" size={64} color="#4A69FF" />
                    </View>
                    
                    <Text style={styles.title}>Enter Password</Text>
                    <Text style={styles.subtitle}>
                        Please enter your password to unlock your encrypted data
                    </Text>

                    <View style={styles.form}>
                        <Input
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={secureTextEntry}
                            accessoryRight={renderIcon}
                            onSubmitEditing={handleSubmit}
                            autoFocus
                            style={styles.input}
                        />

                        <Button
                            onPress={handleSubmit}
                            disabled={loading || !password.trim()}
                            accessoryLeft={loading ? () => <Spinner size='small' status='control' /> : undefined}
                            style={styles.button}
                        >
                            {loading ? 'Unlocking...' : 'Unlock'}
                        </Button>

                        <Button
                            appearance='ghost'
                            onPress={handleCancel}
                            disabled={loading}
                            style={styles.cancelButton}
                        >
                            Sign Out
                        </Button>
                    </View>
                </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    contentContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
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
    input: {
        marginBottom: 20,
    },
    button: {
        marginBottom: 16,
    },
    cancelButton: {
        marginTop: 8,
    },
});

export default PasswordPrompt;