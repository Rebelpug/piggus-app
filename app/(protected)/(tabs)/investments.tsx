import React, { useState } from "react";
import {
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  View,
  FlatList,
  ScrollView,
} from "react-native";
import {
  Layout,
  Text,
  Button,
  TopNavigation,
  Select,
  SelectItem,
  IndexPath,
} from "@ui-kitten/components";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useInvestment } from "@/context/InvestmentContext";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useLocalization } from "@/context/LocalizationContext";
import { InvestmentWithDecryptedData } from "@/types/investment";
import { Ionicons } from "@expo/vector-icons";
import ProfileHeader from "@/components/ProfileHeader";
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import InvestmentItem from "@/components/investments/InvestmentItem";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { formatCurrency } from "@/utils/currencyUtils";
import { formatPercentage } from "@/utils/stringUtils";
import { calculateInvestmentStatistics } from "@/utils/financeUtils";

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
              Portfolio
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
              placeholder="Select portfolio"
            >
              {portfolios.map((portfolio, index) => (
                <SelectItem
                  key={portfolio.id}
                  title={portfolio.data?.name || `Portfolio ${index + 1}`}
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
              See more stats
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

  const renderLeftActions = () => <ProfileHeader />;

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNavigation
          title={t("investments.title")}
          alignment="center"
          accessoryLeft={renderLeftActions}
        />
        <AuthSetupLoader />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <TopNavigation
          title={t("investments.title")}
          alignment="center"
          accessoryLeft={renderLeftActions}
        />
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
      <TopNavigation
        title={t("investments.title")}
        alignment="center"
        accessoryLeft={renderLeftActions}
        style={{ backgroundColor: colors.background }}
      />

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
            Syncing investments...
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
            bottom: Math.max(insets.bottom + 20, 60), // Ensure minimum 90px from bottom, or safe area + tab bar height
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
