import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/context/AuthContext';
import { SecureKeyManager } from '@/lib/secureKeyManager';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface AutoBiometricPromptProps {
  onBiometricSuccess: () => void;
  onCancel: () => void;
}

export default function AutoBiometricPrompt({ onBiometricSuccess, onCancel }: AutoBiometricPromptProps) {
  const { tryBiometricLogin, isBiometricAvailable } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    checkAndShowBiometric();
  }, []);

  const checkAndShowBiometric = async () => {
    try {
      if (!isBiometricAvailable) {
        onCancel();
        return;
      }

      const hasStoredData = await SecureKeyManager.hasAnyStoredSessionData();
      if (hasStoredData) {
        setIsVisible(true);
        // Auto-trigger biometric after a brief delay
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      } else {
        onCancel();
      }
    } catch (error) {
      console.error('Failed to check for stored data:', error);
      onCancel();
    }
  };

  const handleBiometricLogin = async () => {
    setIsAuthenticating(true);
    try {
      const success = await tryBiometricLogin();
      if (success) {
        setIsVisible(false);
        onBiometricSuccess();
      } else {
        setIsVisible(false);
        onCancel();
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      setIsVisible(false);
      onCancel();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCancel = () => {
    setIsVisible(false);
    onCancel();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="finger-print" size={48} color={colors.primary} />
          </View>
          
          <ThemedText style={[styles.title, { color: colors.text }]}>
            {isAuthenticating ? 'Authenticating...' : 'Welcome Back'}
          </ThemedText>
          
          <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
            {isAuthenticating 
              ? 'Please complete biometric authentication'
              : 'Use biometrics to quickly access your account'
            }
          </ThemedText>

          {!isAuthenticating && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.biometricButton, { backgroundColor: colors.primary }]}
                onPress={handleBiometricLogin}
              >
                <Ionicons name="finger-print" size={24} color="#FFF" />
                <ThemedText style={styles.biometricButtonText}>Use Biometrics</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <ThemedText style={[styles.cancelButtonText, { color: colors.icon }]}>
                  Use Password Instead
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  biometricButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});