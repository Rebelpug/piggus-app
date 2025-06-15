import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { SecureKeyManager } from '@/lib/secureKeyManager';
import { Ionicons } from '@expo/vector-icons';

interface BiometricLoginProps {
  onBiometricLogin?: () => void;
}

export default function BiometricLogin({ onBiometricLogin }: BiometricLoginProps) {
  const { tryBiometricLogin } = useAuth();
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkStoredCredentials();
  }, []);

  const checkStoredCredentials = async () => {
    try {
      console.log('Checking stored credentials...');
      const hasStoredKeys = await SecureKeyManager.hasStoredKeys();
      console.log('Has stored keys:', hasStoredKeys);
      const hasStoredData = await SecureKeyManager.hasAnyStoredSessionData();
      console.log('Has stored data:', hasStoredData);
      if (!hasStoredKeys || !hasStoredData) {
        setHasStoredCredentials(false);
        return;
      }
      setHasStoredCredentials(true);
      await handleBiometricLogin();
    } catch (error) {
      console.error('Failed to check stored credentials:', error);
      setHasStoredCredentials(false);
    }
  };

  const handleBiometricLogin = async () => {
    console.log('handleBiometricLogin...');
    const hasStoredKeys = await SecureKeyManager.hasStoredKeys();
    console.log('Has stored keys:', hasStoredKeys);
    const hasStoredData = await SecureKeyManager.hasAnyStoredSessionData();
    console.log('Has stored data:', hasStoredData);
    if (!hasStoredKeys || !hasStoredData) {
      setHasStoredCredentials(false);
      return;
    }
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

  if (!hasStoredCredentials) {
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
