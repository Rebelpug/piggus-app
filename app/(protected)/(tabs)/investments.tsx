import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import InvestmentItem from "@/components/investments/InvestmentItem";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useInvestment } from "@/context/InvestmentContext";
import { useLocalization } from "@/context/LocalizationContext";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { InvestmentWithDecryptedData } from "@/types/investment";
import { formatCurrency } from "@/utils/currencyUtils";
import { calculateInvestmentStatistics } from "@/utils/financeUtils";
import { formatPercentage } from "@/utils/stringUtils";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  IndexPath,
  Layout,
  Select,
  SelectItem,
  Text,
} from "@ui-kitten/components";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function InvestmentsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();
  const { user } = useAuth();
  const { portfolios, isLoading, isSyncing, error } = useInvestment();
  const { userProfile } = useProfile();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<
    IndexPath | undefined
  >();

  // Find the default personal portfolio (created by the current user or with single member)
  const personalPortfolio = React.useMemo(() => {
    if (!portfolios || portfolios.length === 0) return null;

    // Look for a portfolio with only the current user as member
    const singleMemberPortfolio = portfolios.find(
      (portfolio) =>
        portfolio.members &&
        portfolio.members.length === 1 &&
        portfolio.members[0].user_id === user?.id,
    );

    if (singleMemberPortfolio) return singleMemberPortfolio;

    // Fallback to first portfolio
    return portfolios[0];
  }, [portfolios, user?.id]);

  // Set default portfolio selection
  React.useEffect(() => {
    if (portfolios.length > 0 && selectedPortfolioIndex === undefined) {
      if (personalPortfolio) {
        const index = portfolios.findIndex(
          (p) => p.id === personalPortfolio.id,
        );
        if (index >= 0) {
          setSelectedPortfolioIndex(new IndexPath(index));
        }
      } else {
        setSelectedPortfolioIndex(new IndexPath(0));
      }
    }
  }, [portfolios, personalPortfolio, selectedPortfolioIndex]);

  // Get selected portfolio
  const selectedPortfolio = React.useMemo(() => {
    if (!selectedPortfolioIndex || !portfolios.length) return null;
    return portfolios[selectedPortfolioIndex.row];
  }, [selectedPortfolioIndex, portfolios]);

  // Filter investments based on selected portfolio or show all if no selection
  const filteredInvestments: (InvestmentWithDecryptedData & {
    portfolioName?: string;
  })[] = React.useMemo(() => {
    try {
      if (!portfolios || !Array.isArray(portfolios)) {
        return [];
      }

      const portfoliosToProcess = selectedPortfolio
        ? [selectedPortfolio]
        : portfolios;

      return portfoliosToProcess
        .flatMap((portfolio) => {
          if (
            !portfolio ||
            !portfolio.investments ||
            !Array.isArray(portfolio.investments)
          ) {
            return [];
          }

          return portfolio.investments.map((investment) => ({
            ...investment,
            portfolioName: portfolio.data?.name,
          }));
        })
        .sort((a, b) => {
          try {
            return (
              new Date(b.data.purchase_date).getTime() -
              new Date(a.data.purchase_date).getTime()
            );
          } catch {
            return 0;
          }
        });
    } catch (error) {
      console.error("Error processing investments:", error);
      return [];
    }
  }, [portfolios, selectedPortfolio]);

  // Calculate portfolio statistics using the simplified functions
  const portfolioStats = React.useMemo(() => {
    return calculateInvestmentStatistics(filteredInvestments);
  }, [filteredInvestments]);

  // Check for failed investments
  const failedInvestmentsCount = React.useMemo(() => {
    const portfoliosToCheck = selectedPortfolio
      ? [selectedPortfolio]
      : portfolios;
    return portfoliosToCheck.reduce((total, portfolio) => {
      return total + (portfolio.failedInvestments?.length || 0);
    }, 0);
  }, [portfolios, selectedPortfolio]);

  const totalPortfolioValue = portfolioStats.totalValue;
  const totalGainLoss = portfolioStats.totalGainLoss;

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // The context will handle refreshing
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const handleAddInvestment = () => {
    router.push({
      pathname: "/(protected)/add-investment",
      params: selectedPortfolio ? { portfolioId: selectedPortfolio.id } : {},
    });
  };

  const renderInvestmentItem = ({
    item,
  }: {
    item: InvestmentWithDecryptedData & { portfolioName?: string };
  }) => {
    const portfolioId = portfolios.find((p) =>
      p.investments.some((inv) => inv.id === item.id),
    )?.id;
    return <InvestmentItem item={item} portfolioId={portfolioId} />;
  };

  const renderInvestmentsHeader = () => {
    const gainLossPercentage = portfolioStats.totalGainLossPercentage;
    const showPortfolioSelector = portfolios.length > 1;

    return (
      <View style={styles.header}>
        {showPortfolioSelector && (
          <View
            style={[
              styles.selectorCard,
              { backgroundColor: colors.card, shadowColor: colors.text },
            ]}
          >
            <Text style={[styles.selectorLabel, { color: colors.text }]}>
              {t("investments.portfolio")}
            </Text>
            <Select
              style={styles.portfolioSelector}
              value={
                selectedPortfolio?.data?.name || t("investments.allPortfolios")
              }
              selectedIndex={selectedPortfolioIndex}
              onSelect={(index) =>
                setSelectedPortfolioIndex(index as IndexPath)
              }
              placeholder={t("investments.selectPortfolio")}
            >
              {portfolios.map((portfolio, index) => (
                <SelectItem
                  key={portfolio.id}
                  title={
                    portfolio.data?.name ||
                    t("investments.portfolioNumber", { number: index + 1 })
                  }
                />
              ))}
            </Select>
          </View>
        )}

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, shadowColor: colors.text },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            {selectedPortfolio
              ? selectedPortfolio.data?.name || t("investments.portfolio")
              : t("investments.totalPortfolio")}{" "}
            {t("investments.value")}
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.primary }]}>
            {formatCurrency(
              totalPortfolioValue,
              userProfile?.profile?.defaultCurrency,
            )}
          </Text>
          <Text
            style={[
              styles.summaryGainLoss,
              { color: totalGainLoss >= 0 ? "#4CAF50" : "#F44336" },
            ]}
          >
            {formatCurrency(
              totalGainLoss,
              userProfile?.profile?.defaultCurrency,
            )}{" "}
            ({formatPercentage(gainLossPercentage)})
          </Text>

          {/* See more stats button */}
          <TouchableOpacity
            style={[
              styles.statsButton,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() =>
              router.push({
                pathname: "/(protected)/investment-statistics",
                params: selectedPortfolio
                  ? { portfolioId: selectedPortfolio.id }
                  : {},
              })
            }
          >
            <Ionicons
              name="stats-chart-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={[styles.statsButtonText, { color: colors.primary }]}>
              {t("investments.seeMoreStats")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInvestmentsEmptyState = () => (
    <Layout style={styles.emptyState}>
      <Ionicons
        name="trending-up-outline"
        size={64}
        color="#8F9BB3"
        style={styles.emptyIcon}
      />
      <Text category="h6" style={styles.emptyTitle}>
        {t("investments.noInvestmentsYet")}
      </Text>
      <Text category="s1" appearance="hint" style={styles.emptyDescription}>
        {t("investments.startBuildingPortfolio")}
      </Text>
      <Button
        style={styles.addButton}
        accessoryLeft={(props) => (
          <Ionicons
            name="add"
            size={20}
            color={props?.tintColor || "#FFFFFF"}
          />
        )}
        onPress={handleAddInvestment}
      >
        {t("investments.addInvestment")}
      </Button>
    </Layout>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <AuthSetupLoader />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Layout style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color="#FF6B6B"
            style={styles.errorIcon}
          />
          <Text category="h6" style={styles.errorTitle}>
            {t("investments.errorLoadingInvestments")}
          </Text>
          <Text category="s1" appearance="hint" style={styles.errorDescription}>
            {error}
          </Text>
          <Button
            style={styles.retryButton}
            status="primary"
            onPress={onRefresh}
          >
            {t("common.tryAgain")}
          </Button>
        </Layout>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {isSyncing && (
        <View
          style={[
            styles.syncAlert,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <Ionicons name="sync" size={16} color={colors.primary} />
          <Text style={[styles.syncAlertText, { color: colors.primary }]}>
            {t("investments.syncingInvestments")}
          </Text>
        </View>
      )}

      {failedInvestmentsCount > 0 && (
        <View
          style={[
            styles.syncAlert,
            {
              backgroundColor: "#FF6B6B15",
              borderColor: "#FF6B6B30",
            },
          ]}
        >
          <Ionicons name="warning" size={16} color="#FF6B6B" />
          <Text style={[styles.syncAlertText, { color: "#FF6B6B" }]}>
            {t("investments.failedToLoadInvestments", {
              count: failedInvestmentsCount,
            })}
          </Text>
        </View>
      )}

      {filteredInvestments.length === 0 ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {portfolios.length > 1 && renderInvestmentsHeader()}
          {renderInvestmentsEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredInvestments}
          renderItem={renderInvestmentItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderInvestmentsHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom:
              Platform.OS === "ios"
                ? Math.max(insets.bottom + 69, 89) // iOS: Account for absolute positioned tab bar (49px base + 20px margin)
                : Math.max(insets.bottom + 20, 30), // Android: Normal spacing since tab bar pushes content up
          },
        ]}
        onPress={handleAddInvestment}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  errorDescription: {
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    marginBottom: 24,
    textAlign: "center",
  },
  addButton: {
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  selectorCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  portfolioSelector: {
    borderRadius: 12,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryGainLoss: {
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  syncAlert: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncAlertText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
});
