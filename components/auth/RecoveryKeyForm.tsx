/**
 * RecoveryKeyForm.tsx
 * Component for displaying and handling recovery key generation during first login
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useLocalization } from '@/context/LocalizationContext';
import {
  generateRecoveryKeyPackage,
  formatRecoveryPhraseForDisplay,
  formatRecoveryPhraseForExport
} from '@/lib/recoveryKey';

interface RecoveryKeyFormProps {
  privateKey: string;
  onComplete: (encryptedRecoveryPrivateKey: string) => void;
  onSkip?: () => void;
}

export default function RecoveryKeyForm({ privateKey, onComplete, onSkip }: RecoveryKeyFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useLocalization();

  const [isGenerating, setIsGenerating] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[]>([]);
  const [encryptedPrivateKey, setEncryptedPrivateKey] = useState<string>('');
  const [step, setStep] = useState<'generating' | 'display' | 'confirm'>('generating');
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  useEffect(() => {
    generateRecoveryData();
  }, []);

  const generateRecoveryData = async () => {
    try {
      setIsGenerating(true);
      const recoveryData = await generateRecoveryKeyPackage(privateKey);

      setRecoveryPhrase(recoveryData.recoveryPhrase);
      setEncryptedPrivateKey(recoveryData.encryptedPrivateKey);
      setStep('display');
    } catch (error) {
      console.error('Error generating recovery key:', error);
      Alert.alert(
        t('auth.recoveryKeyError') || 'Recovery Key Error',
        t('auth.recoveryKeyGenerationFailed') || 'Failed to generate recovery key. Please try again.',
        [{ text: t('common.ok') || 'OK', onPress: () => onSkip?.() }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const content = formatRecoveryPhraseForExport(recoveryPhrase);

      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // For mobile, use the Share API
        await Share.share({
          message: content,
          title: 'Piggus Recovery Phrase',
        });
      } else {
        // For other platforms, create a file and share it
        const fileName = `piggus-recovery-phrase-${Date.now()}.txt`;
        const fileUri = FileSystem.documentDirectory + fileName;

        await FileSystem.writeAsStringAsync(fileUri, content);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert(
            t('auth.downloadUnavailable') || 'Download Unavailable',
            t('auth.downloadUnavailableMessage') || 'File sharing is not available on this device.'
          );
        }
      }
    } catch (error) {
      console.error('Error downloading recovery phrase:', error);
      Alert.alert(
        t('auth.downloadError') || 'Download Error',
        t('auth.downloadErrorMessage') || 'Failed to download recovery phrase.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const content = recoveryPhrase.join(' ');
      // In a real app, you'd use @react-native-clipboard/clipboard
      // For now, we'll show an alert with the recovery phrase
      Alert.alert(
        t('auth.recoveryPhrase') || 'Recovery Phrase',
        content,
        [{ text: t('common.ok') || 'OK' }]
      );
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleDone = () => {
    if (!hasAcknowledged) {
      Alert.alert(
        t('auth.acknowledgmentRequired') || 'Acknowledgment Required',
        t('auth.mustAcknowledgeRecoveryKey') || 'Please acknowledge that you have saved your recovery key before continuing.'
      );
      return;
    }

    onComplete(encryptedPrivateKey);
  };

  const renderGeneratingState = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.text }]}>
        {t('auth.generatingRecoveryKey') || 'Generating your recovery key...'}
      </Text>
      <Text style={[styles.loadingSubtext, { color: colors.icon }]}>
        {t('auth.generatingRecoveryKeySubtext') || 'This may take a few moments'}
      </Text>
    </View>
  );

  const renderDisplayState = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('auth.recoveryKeyTitle') || 'Your Recovery Key'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {t('auth.recoveryKeySubtitle') || 'Save this recovery key to restore your account if you forget your password'}
          </Text>
        </View>

        {/* Warning Alert */}
        <View style={[styles.warningAlert, { backgroundColor: '#fef3cd', borderColor: '#ffeaa7' }]}>
          <Ionicons name="warning" size={20} color="#e17055" style={styles.warningIcon} />
          <Text style={[styles.warningText, { color: '#2d3436' }]}>
            {t('auth.recoveryKeyWarning') || 'This is the ONLY way to recover your account. Store it safely and never share it with anyone.'}
          </Text>
        </View>

        {/* Recovery Phrase Display */}
        <View style={[styles.phraseContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.phraseTitle, { color: colors.text }]}>
            {t('auth.recoveryPhrase') || 'Recovery Phrase'} (BIP39)
          </Text>
          <View style={styles.phraseGrid}>
            {recoveryPhrase.map((word, index) => (
              <View key={index} style={[styles.wordContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.wordNumber, { color: colors.icon }]}>{index + 1}</Text>
                <Text style={[styles.wordText, { color: colors.text }]}>{word}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="download-outline" size={20} color={colors.primary} />
            )}
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              {t('auth.downloadRecoveryKey') || 'Download'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleCopyToClipboard}
          >
            <Ionicons name="copy-outline" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              {t('auth.copyRecoveryKey') || 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={[styles.instructionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.instructionsTitle, { color: colors.text }]}>
            {t('auth.recoveryKeyInstructions') || 'How to store your recovery key safely:'}
          </Text>
          <View style={styles.instructionsList}>
            <Text style={[styles.instructionItem, { color: colors.icon }]}>
              • {t('auth.recoveryKeyInstruction1') || 'Write it down on paper and store in a safe place'}
            </Text>
            <Text style={[styles.instructionItem, { color: colors.icon }]}>
              • {t('auth.recoveryKeyInstruction2') || 'Never store it digitally (no screenshots or cloud storage)'}
            </Text>
            <Text style={[styles.instructionItem, { color: colors.icon }]}>
              • {t('auth.recoveryKeyInstruction3') || 'Never share it with anyone'}
            </Text>
            <Text style={[styles.instructionItem, { color: colors.icon }]}>
              • {t('auth.recoveryKeyInstruction4') || 'Keep multiple copies in different secure locations'}
            </Text>
            <Text style={[styles.instructionItem, { color: colors.icon }]}>
              • This uses the BIP39 standard compatible with major cryptocurrency wallets
            </Text>
          </View>
        </View>

        {/* Acknowledgment Checkbox */}
        <TouchableOpacity
          style={styles.acknowledgmentContainer}
          onPress={() => setHasAcknowledged(!hasAcknowledged)}
        >
          <View style={[
            styles.checkbox,
            { borderColor: colors.border },
            hasAcknowledged && { backgroundColor: colors.primary, borderColor: colors.primary }
          ]}>
            {hasAcknowledged && (
              <Ionicons name="checkmark" size={16} color="#FFF" />
            )}
          </View>
          <Text style={[styles.acknowledgmentText, { color: colors.text }]}>
            {t('auth.recoveryKeyAcknowledgment') || 'I have safely stored my recovery key and understand I will lose access to my data if I lose both my password and recovery key.'}
          </Text>
        </TouchableOpacity>

        {/* Done Button */}
        <TouchableOpacity
          style={[
            styles.doneButton,
            { backgroundColor: hasAcknowledged ? colors.primary : colors.icon },
          ]}
          onPress={handleDone}
          disabled={!hasAcknowledged}
        >
          <Text style={styles.doneButtonText}>
            {t('auth.continueToApp') || 'Continue to App'}
          </Text>
        </TouchableOpacity>

        {/* Skip Option (Optional) */}
        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={[styles.skipButtonText, { color: colors.icon }]}>
              {t('auth.skipRecoveryKey') || 'Skip for now (not recommended)'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {step === 'generating' && renderGeneratingState()}
      {step === 'display' && renderDisplayState()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  warningAlert: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  warningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  phraseContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  phraseTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  phraseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  wordContainer: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  wordNumber: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
    minWidth: 20,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  acknowledgmentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  acknowledgmentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  doneButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
  skipButtonText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
