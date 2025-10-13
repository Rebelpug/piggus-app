import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import BankConnectionWizard from "@/components/banking/BankConnectionWizard";
import BudgetCard from "@/components/budget/BudgetCard";
import ExpenseItem from "@/components/expenses/ExpenseItem";
import RecurringExpenseItem from "@/components/expenses/RecurringExpenseItem";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useExpense } from "@/context/ExpenseContext";
import { useLocalization } from "@/context/LocalizationContext";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  ExpenseWithDecryptedData,
  RecurringExpenseWithDecryptedData,
  calculateUserShare,
} from "@/types/expense";
import { formatCurrency } from "@/utils/currencyUtils";
import { Ionicons } from "@expo/vector-icons";
import { Button, Layout, Tab, TabView, Text } from "@ui-kitten/components";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

export default function ExpensesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();
  const { user } = useAuth();
  const {
    expensesGroups,
    recurringExpenses,
    failedRecurringExpenses,
    isLoading,
    error,
    fetchExpensesForMonth,
  } = useExpense();
  const { userProfile } = useProfile();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>("current"); // 'current' for default 3-month view, or specific month like '2025-05'
  const [showBankWizard, setShowBankWizard] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);

  // Generate last 12 months for selector
  const monthOptions = React.useMemo(() => {
    const months = [];
    const now = new Date();

    // Add "Current month" option
    months.push({
      key: "current",
      label: "expenses.currentMonth",
      value: "current",
    });

    // Add previous 11 months (excluding current month)
    for (let i = 1; i <= 11; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      months.push({
        key: monthKey,
        label: monthLabel,
        value: monthKey,
      });
    }

    return months;
  }, []);

  // Flatten all expenses from all groups with error handling
  const allExpenses: (ExpenseWithDecryptedData & { groupName?: string })[] =
    React.useMemo(() => {
      try {
        if (!expensesGroups || !Array.isArray(expensesGroups)) {
          return [];
        }

        return expensesGroups
          .flatMap((group) => {
            if (!group || !group.expenses || !Array.isArray(group.expenses)) {
              return [];
            }

            return group.expenses
              .filter((expense) => {
                // Exclude deleted expenses
                if (expense.data.status === "deleted") {
                  return false;
                }
                // Only include expenses where the user is a participant
                const userShare = calculateUserShare(expense, user?.id || "");
                return userShare > 0;
              })
              .map((expense) => ({
                ...expense,
                groupName: group.data?.name,
              }));
          })
          .sort((a, b) => {
            try {
              return (
                new Date(b.data.date).getTime() -
                new Date(a.data.date).getTime()
              );
            } catch {
              return 0;
            }
          });
      } catch (error) {
        console.error("Error processing expenses:", error);
        return [];
      }
    }, [expensesGroups, user?.id]);

  // Check for failed expenses and recurring expenses
  const failedExpensesCount = React.useMemo(() => {
    const failedExpenses = expensesGroups.reduce((total, group) => {
      return total + (group.failedExpenses?.length || 0);
    }, 0);
    const failedRecurring = failedRecurringExpenses?.length || 0;
    return failedExpenses + failedRecurring;
  }, [expensesGroups, failedRecurringExpenses]);

  // Filter expenses based on selected month
  const filteredExpenses = React.useMemo(() => {
    if (selectedMonth === "current") {
      // Show only current month
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      return allExpenses.filter((expense) => {
        const expenseDate = new Date(expense.data.date);
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth() + 1;
        return expenseYear === currentYear && expenseMonth === currentMonth;
      });
    } else {
      // Show specific month
      const [year, month] = selectedMonth.split("-").map(Number);

      return allExpenses.filter((expense) => {
        const expenseDate = new Date(expense.data.date);
        const expenseYear = expenseDate.getFullYear();
        const expenseMonth = expenseDate.getMonth() + 1;
        return expenseYear === year && expenseMonth === month;
      });
    }
  }, [allExpenses, selectedMonth]);

  // Process recurring expenses with group names
  const allRecurringExpenses: (RecurringExpenseWithDecryptedData & {
    groupName?: string;
  })[] = React.useMemo(() => {
    try {
      if (!recurringExpenses || !Array.isArray(recurringExpenses)) {
        return [];
      }

      return recurringExpenses
        .filter((recurringExpense) => {
          // Only include recurring expenses where the user is a participant
          if (!recurringExpense.data || !recurringExpense.data.participants) {
            return false;
          }
          const userShare =
            recurringExpense.data.participants.find(
              (p) => p.user_id === user?.id,
            )?.share_amount || 0;
          return userShare > 0;
        })
        .map((recurringExpense) => {
          // Find the group name
          const group = expensesGroups?.find(
            (g) => g.id === recurringExpense.group_id,
          );
          return {
            ...recurringExpense,
            groupName: group?.data?.name,
          };
        })
        .sort((a, b) => {
          try {
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
          } catch {
            return 0;
          }
        });
    } catch (error) {
      console.error("Error processing recurring expenses:", error);
      return [];
    }
  }, [recurringExpenses, expensesGroups, user?.id]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // The context will handle refreshing
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const handleAddExpense = () => {
    const isRecurring = selectedIndex === 1;
    router.push(
      isRecurring
        ? "/(protected)/add-expense?isRecurring=true"
        : "/(protected)/add-expense",
    );
  };

  // Group expenses by month
  const groupedExpenses = React.useMemo(() => {
    const getMonthYear = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const isThisMonth =
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear();

        if (isThisMonth) {
          return "expenses.thisMonth";
        }

        return date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      } catch {
        return "common.unknown";
      }
    };

    const groups: {
      [key: string]: (ExpenseWithDecryptedData & { groupName?: string })[];
    } = {};

    filteredExpenses.forEach((expense) => {
      const monthKey = getMonthYear(expense.data.date);
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(expense);
    });

    // Convert to array with month labels
    const result: {
      type: "header" | "expense";
      data: any;
      key: string;
    }[] = [];
    Object.keys(groups).forEach((monthKey) => {
      result.push({
        type: "header",
        data: monthKey,
        key: `header-${monthKey}`,
      });
      // Sort expenses within the same month by created_at descending
      const sortedMonthExpenses = groups[monthKey].sort((a, b) => {
        try {
          // First sort by date (descending), then by created_at (descending)
          const dateCompare =
            new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
          if (dateCompare !== 0) return dateCompare;

          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        } catch {
          return 0;
        }
      });
      sortedMonthExpenses.forEach((expense) => {
        result.push({ type: "expense", data: expense, key: expense.id });
      });
    });

    return result;
  }, [filteredExpenses]);

  const renderMonthHeader = ({ item }: { item: string }) => (
    <View style={[styles.monthHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.monthHeaderText, { color: colors.text }]}>
        {item.includes(".") ? t(item) : item}
      </Text>
    </View>
  );

  const renderListItem = ({
    item,
  }: {
    item: { type: "header" | "expense"; data: any; key: string };
  }) => {
    if (item.type === "header") {
      return renderMonthHeader({ item: item.data });
    } else {
      return <ExpenseItem item={item.data} />;
    }
  };

  const renderRecurringExpenseItem = ({
    item,
  }: {
    item: RecurringExpenseWithDecryptedData & { groupName?: string };
  }) => {
    return <RecurringExpenseItem item={item} />;
  };

  const renderMonthSelector = () => (
    <View
      style={[styles.monthSelector, { backgroundColor: colors.background }]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthSelectorContent}
      >
        {monthOptions.map((month) => (
          <TouchableOpacity
            key={month.key}
            style={[
              styles.monthOption,
              {
                backgroundColor:
                  selectedMonth === month.value ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
            disabled={loadingMonth !== null}
            onPress={async () => {
              setSelectedMonth(month.value);
              setLoadingMonth(month.value);

              try {
                // If not current month, fetch the specific month
                if (month.value !== "current") {
                  const [year, monthNum] = month.value.split("-").map(Number);
                  await fetchExpensesForMonth(year, monthNum);
                }
              } catch (error) {
                console.error("❌ Error fetching month expenses:", error);
              } finally {
                setLoadingMonth(null);
              }
            }}
          >
            <Text
              style={[
                styles.monthOptionText,
                {
                  color: selectedMonth === month.value ? "white" : colors.text,
                  fontWeight: selectedMonth === month.value ? "600" : "500",
                },
              ]}
            >
              {month.label.startsWith("expenses.")
                ? t(month.label)
                : month.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderExpensesHeader = () => {
    return <BudgetCard selectedMonth={selectedMonth} variant="list" />;
  };

  const calculateMonthlyTotal = () => {
    return allRecurringExpenses.reduce((total, expense) => {
      if (!expense.data || !expense.data.participants) {
        return total;
      }

      const participant = expense.data.participants.find(
        (p) => p.user_id === user?.id,
      );
      const userShare = participant?.share_amount || 0;

      // Convert to monthly amount based on interval
      let monthlyAmount = userShare;
      switch (expense.data.interval) {
        case "daily":
          monthlyAmount = userShare * 30;
          break;
        case "weekly":
          monthlyAmount = userShare * 4.33; // Average weeks per month
          break;
        case "monthly":
          monthlyAmount = userShare;
          break;
        case "yearly":
          monthlyAmount = userShare / 12;
          break;
      }

      return total + monthlyAmount;
    }, 0);
  };

  const renderRecurringHeader = () => {
    if (allRecurringExpenses.length === 0) return null;

    const monthlyTotal = calculateMonthlyTotal();
    const currency = userProfile?.profile?.defaultCurrency || "EUR";

    return (
      <View
        style={[
          styles.monthlyTotalCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.monthlyTotalContent}>
          <View
            style={[
              styles.monthlyTotalIcon,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.monthlyTotalText}>
            <Text style={[styles.monthlyTotalLabel, { color: colors.icon }]}>
              {t("expenses.monthlyRecurringTotal")}
            </Text>
            <Text style={[styles.monthlyTotalAmount, { color: colors.text }]}>
              {formatCurrency(monthlyTotal, currency)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderExpensesEmptyState = () => (
    <Layout style={styles.emptyState}>
      <Ionicons
        name="document-text-outline"
        size={64}
        color="#8F9BB3"
        style={styles.emptyIcon}
      />
      <Text category="h6" style={styles.emptyTitle}>
        {t("expenses.noExpensesYet")}
      </Text>
      <Text category="s1" appearance="hint" style={styles.emptyDescription}>
        {t("expenses.startTrackingExpenses")}
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
        onPress={handleAddExpense}
      >
        {t("expenses.addExpense")}
      </Button>
    </Layout>
  );

  const renderRecurringEmptyState = () => (
    <Layout style={styles.emptyState}>
      <Ionicons
        name="repeat"
        size={64}
        color="#8F9BB3"
        style={styles.emptyIcon}
      />
      <Text category="h6" style={styles.emptyTitle}>
        {t("expenses.noRecurringExpenses")}
      </Text>
      <Text category="s1" appearance="hint" style={styles.emptyDescription}>
        {t("expenses.setupRecurringExpenses")}
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
        onPress={handleAddExpense}
      >
        {t("expenses.addRecurringExpense")}
      </Button>
    </Layout>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
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
            {t("expenses.errorLoadingExpenses")}
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

  const renderExpensesTab = () => (
    <View style={[styles.tabContent, { backgroundColor: colors.background }]}>
      {loadingMonth !== null && (
        <View
          style={[
            styles.monthLoadingOverlay,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.monthLoadingText, { color: colors.primary }]}>
            {t("expenses.loadingExpenses")}
          </Text>
        </View>
      )}
      {filteredExpenses.length === 0 ? (
        renderExpensesEmptyState()
      ) : (
        <FlatList
          style={styles.list}
          data={groupedExpenses}
          renderItem={renderListItem}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={renderExpensesHeader}
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
    </View>
  );

  const renderRecurringTab = () => (
    <View style={[styles.tabContent, { backgroundColor: colors.background }]}>
      {allRecurringExpenses.length === 0 ? (
        renderRecurringEmptyState()
      ) : (
        <FlatList
          style={styles.list}
          data={allRecurringExpenses}
          renderItem={renderRecurringExpenseItem}
          ListHeaderComponent={renderRecurringHeader}
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
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {renderMonthSelector()}

      {refreshing && (
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
            {t("expenses.syncingBankTransactions")}
          </Text>
        </View>
      )}

      {failedExpensesCount > 0 && (
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
            {t("expenses.failedToLoadExpenses", { count: failedExpensesCount })}
          </Text>
        </View>
      )}

      <TabView
        selectedIndex={selectedIndex}
        onSelect={(index) => setSelectedIndex(index)}
        style={styles.tabView}
      >
        <Tab
          title={t("expenses.expensesCount", {
            count: filteredExpenses.length,
          })}
          icon={(props) => (
            <Ionicons name="card-outline" size={20} color={colors.icon} />
          )}
        >
          {renderExpensesTab()}
        </Tab>
        <Tab
          title={t("expenses.recurringCount", {
            count: allRecurringExpenses.length,
          })}
          icon={(props) => (
            <Ionicons name="repeat-outline" size={20} color={colors.icon} />
          )}
        >
          {renderRecurringTab()}
        </Tab>
      </TabView>

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
        onPress={handleAddExpense}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      <BankConnectionWizard
        visible={showBankWizard}
        onClose={() => setShowBankWizard(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
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
  list: {
    paddingTop: 10,
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
  tabView: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  monthHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  monthHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.8,
  },
  monthSelector: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  monthSelectorContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  monthOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 100,
    alignItems: "center",
  },
  monthOptionText: {
    fontSize: 14,
  },
  monthLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLoadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  monthLoadingText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
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
  monthlyTotalCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthlyTotalContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthlyTotalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  monthlyTotalText: {
    flex: 1,
  },
  monthlyTotalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  monthlyTotalAmount: {
    fontSize: 24,
    fontWeight: "700",
  },
});
