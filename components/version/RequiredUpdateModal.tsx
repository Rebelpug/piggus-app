import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Modal, Text, Button } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useLocalization } from '@/context/LocalizationContext';

interface RequiredUpdateModalProps {
  visible: boolean;
  currentVersion: string;
  mandatoryVersion: string;
  onUpdatePress: () => void;
}

export const RequiredUpdateModal: React.FC<RequiredUpdateModalProps> = ({
  visible,
  currentVersion,
  mandatoryVersion,
  onUpdatePress,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useLocalization();

  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      // Note: No onBackdropPress for required updates - user must update
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerContainer}>
          <View style={[styles.iconContainer, { backgroundColor: '#FF6B6B20' }]}>
            <Ionicons 
              name="warning" 
              size={32} 
              color="#FF6B6B" 
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('version.updateRequired')}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.description, { color: colors.text }]}>
            {t('version.updateRequiredDescription', { 
              current: currentVersion, 
              mandatory: mandatoryVersion 
            })}
          </Text>
          
          <View style={[styles.warningBox, { backgroundColor: '#FF6B6B10', borderColor: '#FF6B6B30' }]}>
            <Ionicons name="information-circle" size={20} color="#FF6B6B" />
            <Text style={[styles.warningText, { color: colors.text }]}>
              {t('version.appWillNotWorkWarning')}
            </Text>
          </View>
          
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>
            {t('version.thisUpdateIncludes')}
          </Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {t('version.criticalSecurityFixes')}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="bug" size={16} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {t('version.importantBugFixes')}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="sync" size={16} color={colors.primary} />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {t('version.serverCompatibilityUpdates')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            style={[styles.button, styles.updateButton]}
            onPress={onUpdatePress}
            appearance="filled"
            size="large"
          >
            {t('version.updateNow')}
          </Button>
          
          <Text style={[styles.noChoiceText, { color: colors.text + '80' }]}>
            {t('version.updateRequiredTocontinue')}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  container: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    alignSelf: 'center',
  },
  headerContainer: {
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
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  content: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  warningText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 16,
  },
  button: {
    borderRadius: 12,
    width: '100%',
  },
  updateButton: {
    // Primary button styling handled by UI Kitten
  },
  noChoiceText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});