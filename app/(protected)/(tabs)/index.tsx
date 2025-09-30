import { useExpense } from "@/context/ExpenseContext";
import { useLocalization } from "@/context/LocalizationContext";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@ui-kitten/components";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import BudgetCard from "@/components/budget/BudgetCard";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();
  const { isLoading } = useExpense();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh - the expense context will handle actual refresh
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <AuthSetupLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>
            {t("home.welcomeBack")}
          </Text>
          <Text style={[styles.welcomeSubtext, { color: colors.icon }]}>
            {t("home.spendingOverview")}
          </Text>
        </View>

        <BudgetCard />

        <View
          style={[
            styles.guidesCtaCard,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <View style={styles.guidesCtaContent}>
            <View
              style={[
                styles.guidesCtaIcon,
                { backgroundColor: colors.accent + "20" },
              ]}
            >
              <Ionicons name="book-outline" size={28} color={colors.accent} />
            </View>
            <View style={styles.guidesCtaText}>
              <Text style={[styles.guidesCtaTitle, { color: colors.text }]}>
                {t("home.financialEducation")}
              </Text>
              <Text style={[styles.guidesCtaSubtitle, { color: colors.icon }]}>
                {t("home.masterYourFinances")}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.guidesCtaButton,
                { backgroundColor: colors.accent },
              ]}
              onPress={() => router.push("/(protected)/guides")}
            >
              <Text style={styles.guidesCtaButtonText}>{t("home.learn")}</Text>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    paddingVertical: 0,
    paddingBottom: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 16,
    fontWeight: "400",
  },
  portfolioCard: {
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  portfolioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  portfolioTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  portfolioMainValue: {
    alignItems: "center",
    marginBottom: 24,
  },
  portfolioValueAmount: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  portfolioValueLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  portfolioReturnsContainer: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 16,
  },
  portfolioReturn: {
    flex: 1,
    alignItems: "center",
  },
  portfolioReturnRow: {
    alignItems: "center",
    marginBottom: 4,
  },
  portfolioReturnAmount: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  portfolioReturnPercentage: {
    fontSize: 14,
    fontWeight: "600",
  },
  portfolioReturnLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  portfolioTotalInvested: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 8,
  },
  portfolioDisclaimer: {
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  noPortfolioContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noPortfolioIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  noPortfolioText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  noPortfolioSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  createPortfolioButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createPortfolioButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  guidesCtaCard: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  guidesCtaContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  guidesCtaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  guidesCtaText: {
    flex: 1,
    marginRight: 16,
  },
  guidesCtaTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  guidesCtaSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  guidesCtaButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  guidesCtaButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  statsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 6,
  },
  statsButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
