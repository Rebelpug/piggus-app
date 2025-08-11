import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import {
  Text,
  Input,
  Button,
  TopNavigation,
  Spinner,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useInvestment } from "@/context/InvestmentContext";
import { PortfolioData } from "@/types/portfolio";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { ThemedView } from "@/components/ThemedView";
import { useLocalization } from "@/context/LocalizationContext";

export default function CreatePortfolioScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { createPortfolio } = useInvestment();
  const { t } = useLocalization();

  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const navigateBack = () => {
    router.back();
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert(
        t("createPortfolio.validationError"),
        t("createPortfolio.portfolioNameRequired"),
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const portfolioData: PortfolioData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        private: false,
      };

      await createPortfolio(portfolioData);
      router.back();
    } catch (error) {
      console.error("Error creating portfolio:", error);
      Alert.alert(
        t("createPortfolio.error"),
        t("createPortfolio.createPortfolioFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const renderBackAction = () => (
    <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.icon} />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <TopNavigation
          title={t("createPortfolio.title")}
          alignment="center"
          accessoryLeft={renderBackAction}
          style={{ backgroundColor: colors.background }}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, shadowColor: colors.text },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("createPortfolio.portfolioDetails")}
            </Text>

            <Input
              style={styles.input}
              label={t("createPortfolio.portfolioName")}
              placeholder={t("createPortfolio.enterPortfolioName")}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              status={formData.name.trim() ? "basic" : "danger"}
            />

            <Input
              style={styles.input}
              label={t("createPortfolio.description")}
              placeholder={t("createPortfolio.enterPortfolioDescription")}
              value={formData.description}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              multiline
              textStyle={{ minHeight: 64 }}
            />
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, shadowColor: colors.text },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("createPortfolio.aboutPortfolios")}
            </Text>

            <View style={styles.infoRow}>
              <Ionicons
                name="folder-outline"
                size={20}
                color={colors.primary}
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {t("createPortfolio.organizeInvestments")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.primary}
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {t("createPortfolio.sharePortfolios")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="analytics-outline"
                size={20}
                color={colors.primary}
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {t("createPortfolio.trackPerformance")}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.primary}
                style={styles.infoIcon}
              />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {t("createPortfolio.dataEncrypted")}
              </Text>
            </View>
          </View>

          <Button
            style={styles.submitButton}
            size="large"
            onPress={handleSubmit}
            disabled={loading}
            accessoryLeft={
              loading
                ? () => <Spinner size="small" status="control" />
                : undefined
            }
          >
            {loading
              ? t("createPortfolio.creatingPortfolio")
              : t("createPortfolio.createPortfolio")}
          </Button>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
    borderRadius: 12,
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 16,
    height: 56,
  },
  backButton: {
    padding: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
