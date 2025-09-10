import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "@ui-kitten/components";
import { useAppVersion } from "@/context/AppVersionContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";
import { SuggestedUpdateModal } from "./SuggestedUpdateModal";
import { RequiredUpdateModal } from "./RequiredUpdateModal";

/**
 * Development component for testing version modals
 * Only render this in development mode
 */
export const VersionTestControls: React.FC = () => {
  const [showSuggestedTest, setShowSuggestedTest] = useState(false);
  const [showRequiredTest, setShowRequiredTest] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { retryVersionCheck, isLoading } = useAppVersion();
  const { t } = useLocalization();

  // Only show in development
  if (!__DEV__) {
    return null;
  }

  const handleUpdatePress = () => {
    setShowSuggestedTest(false);
    setShowRequiredTest(false);
  };

  const handleLaterPress = () => {
    setShowSuggestedTest(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t("version.versionTesting")}
      </Text>

      <View style={styles.buttonsContainer}>
        <Button
          style={styles.button}
          onPress={() => setShowSuggestedTest(true)}
          appearance="outline"
          size="small"
        >
          {t("version.testSuggestedUpdate")}
        </Button>

        <Button
          style={styles.button}
          onPress={() => setShowRequiredTest(true)}
          appearance="outline"
          size="small"
        >
          {t("version.testRequiredUpdate")}
        </Button>

        <Button
          style={styles.button}
          onPress={retryVersionCheck}
          appearance="outline"
          size="small"
          disabled={isLoading}
        >
          {isLoading ? t("version.checking") : t("version.forceVersionCheck")}
        </Button>
      </View>

      <SuggestedUpdateModal
        visible={showSuggestedTest}
        currentVersion="1.0.0"
        latestVersion="1.2.0"
        onUpdatePress={handleUpdatePress}
        onLaterPress={handleLaterPress}
      />

      <RequiredUpdateModal
        visible={showRequiredTest}
        currentVersion="1.0.0"
        mandatoryVersion="1.1.0"
        onUpdatePress={handleUpdatePress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    right: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    minWidth: 200,
    zIndex: 1000,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  buttonsContainer: {
    gap: 8,
  },
  button: {
    borderRadius: 6,
  },
});
