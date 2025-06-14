import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { SecureKeyManager } from '@/lib/secureKeyManager';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

interface BiometricLoginProps {
  onBiometricLogin?: () => void;
}

export default function BiometricLogin({ onBiometricLogin }: BiometricLoginProps) {
  const { tryBiometricLogin, isBiometricAvailable, user } = useAuth();
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkStoredCredentials();
  }, [user]);

  const checkStoredCredentials = async () => {
    try {
      // If we have a current user, check if they have stored session data
      if (user) {
        const hasSession = await SecureKeyManager.hasStoredSession(user.id);
        const biometricEnabled = await SecureKeyManager.isBiometricEnabledForUser(user.id);
        setHasStoredCredentials(hasSession && biometricEnabled);
      } else {
        // No current user, check for any stored user IDs
        const userIds = await SecureKeyManager.getBiometricUserIds();
        setHasStoredCredentials(userIds.length > 0);
      }
    } catch (error) {
      console.error('Failed to check stored credentials:', error);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isBiometricAvailable || !hasStoredCredentials) return;

    setIsAuthenticating(true);
    try {
      const success = await tryBiometricLogin();
      if (success) {
        onBiometricLogin?.();
      } else {
        Alert.alert(
          'Authentication Failed',
          'Biometric authentication failed. Please try again or use your password.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      Alert.alert(
        'Error',
        'An error occurred during biometric authentication.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isBiometricAvailable || !hasStoredCredentials) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity
        style={styles.biometricButton}
        onPress={handleBiometricLogin}
        disabled={isAuthenticating}
      >
        <Ionicons
          name="finger-print"
          size={32}
          color={isAuthenticating ? '#666' : '#007AFF'}
        />
        <ThemedText style={styles.biometricText}>
          {isAuthenticating ? 'Authenticating...' : 'Use Biometrics'}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  biometricButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  biometricText: {
    marginTop: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});