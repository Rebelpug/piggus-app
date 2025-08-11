import React from "react";
import { StyleSheet, View } from "react-native";
import { Modal, Text, Button } from "@ui-kitten/components";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";

interface SuggestedUpdateModalProps {
  visible: boolean;
  currentVersion: string;
  latestVersion: string;
  onUpdatePress: () => void;
  onLaterPress: () => void;
}

export const SuggestedUpdateModal: React.FC<SuggestedUpdateModalProps> = ({
  visible,
  currentVersion,
  latestVersion,
  onUpdatePress,
  onLaterPress,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();

  return (
    <Modal
      visible={visible}
      backdropStyle={styles.backdrop}
      onBackdropPress={onLaterPress}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerContainer}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Ionicons name="refresh" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("version.newVersionAvailable")}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.description, { color: colors.text }]}>
            {t("version.newVersionDescription", {
              current: currentVersion,
              latest: latestVersion,
            })}
          </Text>

          <Text style={[styles.benefitsTitle, { color: colors.text }]}>
            {t("version.whatsNew")}
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {t("version.improvementsAndBugFixes")}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {t("version.enhancedPerformance")}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {t("version.newFeatures")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            style={[styles.button, styles.updateButton]}
            onPress={onUpdatePress}
            appearance="filled"
          >
            {t("version.updateNow")}
          </Button>

          <Button
            style={[styles.button, styles.laterButton]}
            onPress={onLaterPress}
            appearance="outline"
          >
            {t("version.later")}
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    alignSelf: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  content: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
  },
  updateButton: {
    // Primary button styling handled by UI Kitten
  },
  laterButton: {
    // Outline button styling handled by UI Kitten
  },
});
