import * as React from "react";
import { useMemo, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  Text,
  TopNavigation,
  TopNavigationAction,
  Button,
  Modal,
  Card,
  Layout,
} from "@ui-kitten/components";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useExpense } from "@/context/ExpenseContext";
import { useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import {
  calculateUserShare,
  getCategoryDisplayInfo,
  computeExpenseCategories,
} from "@/types/expense";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import Svg, { Path, Circle } from "react-native-svg";

const { width } = Dimensions.get("window");

// Custom SVG Pie Chart Component
interface PieChartProps {
  data: PieChartData[];
  size: number;
  colors: any;
}

const CustomPieChart: React.FC<PieChartProps> = ({ data, size, colors }) => {
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  // Filter out invalid data and ensure valid percentages
  const validData = data.filter((item) => {
    const value = Number(item.value);
    return !isNaN(value) && isFinite(value) && value > 0;
  });

  // If no valid data, return empty SVG
  if (validData.length === 0) {
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.3}
          fill={colors.background}
        />
      </Svg>
    );
  }

  let slices: React.ReactNode[] = [];

  if (validData.length === 1) {
    // If only one category, draw a full circle
    slices = [
      <Circle
        key="full"
        cx={centerX}
        cy={centerY}
        r={radius}
        fill={validData[0].color}
        stroke={colors.background}
        strokeWidth={2}
      />,
    ];
  } else {
    // Calculate cumulative percentages for positioning
    let cumulativePercentage = 0;

    slices = validData
      .map((item, index) => {
        const percentage = Number(item.value);

        // Defensive checks for all calculations
        if (!isFinite(percentage) || isNaN(percentage) || percentage <= 0) {
          return null;
        }

        const startAngle = (cumulativePercentage / 100) * 360;
        const endAngle = ((cumulativePercentage + percentage) / 100) * 360;

        cumulativePercentage += percentage;

        // Convert to radians and adjust rotation (start from top)
        const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
        const endAngleRad = ((endAngle - 90) * Math.PI) / 180;

        // Calculate arc path with defensive checks
        const cosStart = Math.cos(startAngleRad);
        const sinStart = Math.sin(startAngleRad);
        const cosEnd = Math.cos(endAngleRad);
        const sinEnd = Math.sin(endAngleRad);

        if (
          !isFinite(cosStart) ||
          !isFinite(sinStart) ||
          !isFinite(cosEnd) ||
          !isFinite(sinEnd)
        ) {
          return null;
        }

        const x1 = centerX + radius * cosStart;
        const y1 = centerY + radius * sinStart;
        const x2 = centerX + radius * cosEnd;
        const y2 = centerY + radius * sinEnd;

        // Final validation of coordinates
        if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) {
          return null;
        }

        const largeArcFlag = percentage > 50 ? 1 : 0;

        const pathData = [
          `M ${centerX} ${centerY}`, // Move to center
          `L ${x1} ${y1}`, // Line to start of arc
          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arc
          "Z", // Close path
        ].join(" ");

        return (
          <Path
            key={index}
            d={pathData}
            fill={item.color}
            stroke={colors.background}
            strokeWidth={2}
          />
        );
      })
      .filter(Boolean);
  }

  return (
    <Svg width={size} height={size}>
      {slices}
      {/* Center circle for donut effect */}
      <Circle
        cx={centerX}
        cy={centerY}
        r={radius * 0.3}
        fill={colors.background}
      />
    </Svg>
  );
};

interface CategoryStats {
  category: string;
  name: string;
  icon: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  parent?: string;
  subcategories?: CategoryStats[];
}

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface MonthlyStats {
  month: string;
  totalAmount: number;
  transactionCount: number;
}

type PeriodType = "year" | "month";

interface PeriodFilter {
  type: PeriodType;
  year?: number;
  month?: number;
}

interface BudgetComparison {
  budgetAmount: number;
  actualSpending: number;
  savings: number;
  isOverBudget: boolean;
}

export default function ExpenseStatisticsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme || "light"];
  const { user } = useAuth();
  const { expensesGroups, fetchExpensesForMonth } = useExpense();
  const { userProfile } = useProfile();

  // Ensure current month data is loaded when component mounts
  React.useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    fetchExpensesForMonth(currentYear, currentMonth);
  }, [fetchExpensesForMonth]);

  const defaultCurrency = userProfile?.profile?.defaultCurrency || "EUR";

  // Get computed categories with user customizations
  const allCategories = useMemo(
    () =>
      computeExpenseCategories(
        userProfile?.profile?.budgeting?.categoryOverrides,
      ),
    [userProfile?.profile?.budgeting?.categoryOverrides],
  );

  // Period filter state - Default to current month
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(() => {
    const now = new Date();
    return {
      type: "month",
      year: now.getFullYear(),
      month: now.getMonth(),
    };
  });
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [filterStep, setFilterStep] = useState<"type" | "year" | "month">(
    "type",
  );
  const [filterMode, setFilterMode] = useState<"year" | "month">("year");
  const [loadingFilter, setLoadingFilter] = useState(false);

  // Get available years from expenses
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    expensesGroups.forEach((group) => {
      if (group.membership_status === "confirmed") {
        group.expenses.forEach((expense) => {
          // Exclude deleted expenses from available years
          if (expense.data.status === "deleted") return;

          const year = new Date(expense.data.date).getFullYear();
          years.add(year);
        });
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [expensesGroups]);

  const months = [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" },
  ];

  const renderBackAction = () => (
    <TopNavigationAction
      icon={(props) => (
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      )}
      onPress={() => router.back()}
    />
  );

  const expenseStats = useMemo(() => {
    const matchesFilter = (expenseDate: Date) => {
      const expenseYear = expenseDate.getFullYear();
      const expenseMonth = expenseDate.getMonth();

      switch (periodFilter.type) {
        case "year":
          return expenseYear === periodFilter.year;
        case "month":
          return (
            expenseYear === periodFilter.year &&
            expenseMonth === periodFilter.month
          );
        default:
          return true;
      }
    };

    // Generate period data based on filter
    const generatePeriodData = () => {
      if (periodFilter.type === "month") {
        // Show days of the month
        const year = periodFilter.year!;
        const month = periodFilter.month!;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const periodData = [];

        for (let day = 1; day <= daysInMonth; day++) {
          periodData.push({
            period: day.toString(),
            periodKey: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            totalAmount: 0,
            transactionCount: 0,
          });
        }
        return periodData;
      } else if (periodFilter.type === "year") {
        // Show months of the year
        const year = periodFilter.year!;
        const periodData = [];

        for (let month = 0; month < 12; month++) {
          const date = new Date(year, month, 1);
          periodData.push({
            period: date.toLocaleDateString("en-US", { month: "short" }),
            periodKey: `${year}-${String(month + 1).padStart(2, "0")}`,
            totalAmount: 0,
            transactionCount: 0,
          });
        }
        return periodData;
      } else {
        // Default case - shouldn't happen since we removed 'all' option
        return [];
      }
    };

    const periodData = generatePeriodData();
    let totalSpent = 0;
    let totalTransactions = 0;
    const rawCategories: { [key: string]: CategoryStats } = {};
    const monthlyData: { [key: string]: MonthlyStats } = {};

    periodData.forEach((period) => {
      monthlyData[period.periodKey] = {
        month: period.period,
        totalAmount: 0,
        transactionCount: 0,
      };
    });

    // First pass: collect all expenses and organize by actual categories
    expensesGroups.forEach((group) => {
      if (group.membership_status === "confirmed") {
        group.expenses.forEach((expense) => {
          // Exclude deleted expenses
          if (expense.data.status === "deleted") return;

          const expenseDate = new Date(expense.data.date);

          // Only include expenses that match the filter
          if (!matchesFilter(expenseDate)) return;

          const userShare = calculateUserShare(expense, user?.id || "");
          if (userShare > 0) {
            totalSpent += userShare;
            totalTransactions++;

            const categoryInfo = getCategoryDisplayInfo(
              expense.data.category,
              userProfile?.profile?.budgeting?.categoryOverrides,
            );
            const categoryId = expense.data.category || "other";

            if (!rawCategories[categoryId]) {
              rawCategories[categoryId] = {
                category: categoryId,
                name: categoryInfo.name,
                icon: categoryInfo.icon,
                totalAmount: 0,
                transactionCount: 0,
                percentage: 0,
                parent: categoryInfo.parent,
              };
            }

            rawCategories[categoryId].totalAmount += userShare;
            rawCategories[categoryId].transactionCount++;

            // Add to period data
            let periodKey: string;
            if (periodFilter.type === "month") {
              periodKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, "0")}-${String(expenseDate.getDate()).padStart(2, "0")}`;
            } else {
              periodKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, "0")}`;
            }

            if (monthlyData[periodKey]) {
              monthlyData[periodKey].totalAmount += userShare;
              monthlyData[periodKey].transactionCount++;
            }
          }
        });
      }
    });

    // Second pass: organize into hierarchical structure
    const mainCategories: CategoryStats[] = [];
    const subcategories: { [parentId: string]: CategoryStats[] } = {};

    // Ensure parent categories exist for all subcategories
    Object.values(rawCategories).forEach((category) => {
      if (category.parent && !rawCategories[category.parent]) {
        // Create the missing parent category
        const parentCategoryInfo = getCategoryDisplayInfo(
          category.parent,
          userProfile?.profile?.budgeting?.categoryOverrides,
        );
        rawCategories[category.parent] = {
          category: category.parent,
          name: parentCategoryInfo.name,
          icon: parentCategoryInfo.icon,
          totalAmount: 0,
          transactionCount: 0,
          percentage: 0,
          parent: parentCategoryInfo.parent,
        };
      }
    });

    // Group subcategories by parent
    Object.values(rawCategories).forEach((category) => {
      if (category.parent) {
        if (!subcategories[category.parent]) {
          subcategories[category.parent] = [];
        }
        subcategories[category.parent].push(category);
      }
    });

    // Create main categories with their subcategories
    Object.values(rawCategories).forEach((category) => {
      if (!category.parent) {
        // This is a main category
        const categoryWithSubs: CategoryStats = {
          ...category,
          subcategories: subcategories[category.category] || [],
        };

        // Add subcategory amounts to main category
        categoryWithSubs?.subcategories?.forEach((sub) => {
          categoryWithSubs.totalAmount += sub.totalAmount;
          categoryWithSubs.transactionCount += sub.transactionCount;
        });

        mainCategories.push(categoryWithSubs);
      }
    });

    // Calculate percentages
    [
      ...mainCategories,
      ...Object.values(rawCategories).filter((cat) => cat.parent),
    ].forEach((category) => {
      category.percentage =
        totalSpent > 0 ? (category.totalAmount / totalSpent) * 100 : 0;
    });

    const sortedCategories = mainCategories.sort(
      (a, b) => b.totalAmount - a.totalAmount,
    );
    const sortedMonthlyData = Object.values(monthlyData);

    const averageSpending =
      sortedMonthlyData.length > 0
        ? sortedMonthlyData.reduce(
            (sum, period) => sum + period.totalAmount,
            0,
          ) / sortedMonthlyData.length
        : 0;

    const highestSpendingPeriod = sortedMonthlyData.reduce(
      (max, period) => (period.totalAmount > max.totalAmount ? period : max),
      { month: "", totalAmount: 0, transactionCount: 0 },
    );

    // Create pie chart data (limit to top 8 categories for better readability)
    const categoryColors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
      "#F8C471",
      "#82E0AA",
      "#F1948A",
      "#85C1E9",
      "#D7BDE2",
    ];

    const topCategories = sortedCategories.slice(0, 8);
    const otherCategories = sortedCategories.slice(8);
    const otherTotal = otherCategories.reduce(
      (sum, cat) => sum + cat.totalAmount,
      0,
    );

    const pieData: PieChartData[] = [];

    topCategories.forEach((category, index) => {
      if (category.percentage > 0) {
        pieData.push({
          label: `${category.icon} ${category.name}`,
          value: category.percentage,
          color: categoryColors[index % categoryColors.length],
        });
      }
    });

    // Add "Others" category if there are more than 8 categories
    if (otherTotal > 0) {
      const otherPercentage =
        totalSpent > 0 ? (otherTotal / totalSpent) * 100 : 0;
      pieData.push({
        label: "📊 Others",
        value: otherPercentage,
        color: "#95A5A6",
      });
    }

    return {
      totalSpent,
      totalTransactions,
      categories: sortedCategories,
      pieData,
      monthlyData: sortedMonthlyData,
      averageSpending,
      highestSpendingPeriod,
      averagePerTransaction:
        totalTransactions > 0 ? totalSpent / totalTransactions : 0,
    };
  }, [
    expensesGroups,
    user?.id,
    periodFilter,
    userProfile?.profile?.budgeting?.categoryOverrides,
  ]);

  // Calculate budget comparison for monthly and yearly periods - separate from main stats
  const budgetComparison: BudgetComparison | null = useMemo(() => {
    if (!userProfile?.profile?.budgeting?.budget?.amount) {
      return null;
    }

    if (periodFilter.type === "month") {
      const budgetAmount = userProfile.profile.budgeting.budget.amount;
      const savings = budgetAmount - expenseStats.totalSpent;

      return {
        budgetAmount,
        actualSpending: expenseStats.totalSpent,
        savings,
        isOverBudget: expenseStats.totalSpent > budgetAmount,
      };
    } else if (periodFilter.type === "year") {
      // For yearly view, multiply monthly budget by 12
      const monthlyBudget = userProfile.profile.budgeting.budget.amount;
      const yearlyBudget = monthlyBudget * 12;
      const savings = yearlyBudget - expenseStats.totalSpent;

      return {
        budgetAmount: yearlyBudget,
        actualSpending: expenseStats.totalSpent,
        savings,
        isOverBudget: expenseStats.totalSpent > yearlyBudget,
      };
    }

    return null;
  }, [
    periodFilter.type,
    userProfile?.profile?.budgeting?.budget?.amount,
    expenseStats.totalSpent,
  ]);

  const formatCurrency = (
    amount: number,
    currency: string = defaultCurrency,
  ) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)}`;
    }
  };

  const getProgressWidth = (amount: number, maxAmount: number) => {
    if (
      !isFinite(amount) ||
      !isFinite(maxAmount) ||
      maxAmount === 0 ||
      isNaN(amount) ||
      isNaN(maxAmount)
    ) {
      return 0;
    }
    const percentage = (amount / maxAmount) * 100;
    if (!isFinite(percentage) || isNaN(percentage)) {
      return 0;
    }
    return Math.min(percentage, 100);
  };

  const maxCategoryAmount =
    expenseStats.categories.length > 0
      ? expenseStats.categories[0].totalAmount
      : 0;
  const maxMonthlyAmount =
    expenseStats.monthlyData.length > 0
      ? Math.max(
          ...expenseStats.monthlyData.map((m) =>
            isFinite(m.totalAmount) ? m.totalAmount : 0,
          ),
        )
      : 0;

  const getPeriodLabel = () => {
    switch (periodFilter.type) {
      case "year":
        return `Year ${periodFilter.year}`;
      case "month":
        const monthName = months.find(
          (m) => m.value === periodFilter.month,
        )?.label;
        return `${monthName} ${periodFilter.year}`;
      default:
        return "Unknown Period";
    }
  };

  const getPeriodTrendLabel = () => {
    switch (periodFilter.type) {
      case "year":
        return "Monthly Trend";
      case "month":
        return "Daily Trend";
      default:
        return "Monthly Trend";
    }
  };

  const getAverageLabel = () => {
    switch (periodFilter.type) {
      case "year":
        return "Avg Monthly";
      case "month":
        return "Avg Daily";
      default:
        return "Avg Monthly";
    }
  };

  const getBudgetSectionTitle = () => {
    switch (periodFilter.type) {
      case "year":
        return "Annual Budget vs Actual";
      case "month":
        return "Monthly Budget vs Actual";
      default:
        return "Budget vs Actual";
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TopNavigation
        title="Expense Statistics"
        alignment="center"
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loadingFilter && (
          <View
            style={[
              styles.loadingOverlay,
              {
                backgroundColor: colors.primary + "15",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.primary }]}>
              Loading expenses...
            </Text>
          </View>
        )}
        {/* Period Filter */}
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={[styles.filterButtonText, { color: colors.text }]}>
              {getPeriodLabel()}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.icon} />
          </TouchableOpacity>
        </View>
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Overview
          </Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(expenseStats.totalSpent)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>
                Total Spent
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {expenseStats.totalTransactions}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>
                Transactions
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(expenseStats.averagePerTransaction)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>
                Avg per Transaction
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(expenseStats.averageSpending)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>
                {getAverageLabel()}
              </Text>
            </View>
          </View>
        </View>

        {/* Budget Comparison Section */}
        {budgetComparison && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {getBudgetSectionTitle()}
            </Text>
            {periodFilter.type === "year" && (
              <Text style={[styles.budgetSubtitle, { color: colors.icon }]}>
                Based on monthly budget × 12 months
              </Text>
            )}
            <View
              style={[
                styles.budgetComparisonCard,
                { backgroundColor: colors.card },
              ]}
            >
              <View style={styles.budgetComparisonHeader}>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: colors.icon }]}>
                    Budget
                  </Text>
                  <Text style={[styles.budgetValue, { color: colors.text }]}>
                    {formatCurrency(budgetComparison.budgetAmount)}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: colors.icon }]}>
                    Spent
                  </Text>
                  <Text style={[styles.budgetValue, { color: colors.text }]}>
                    {formatCurrency(budgetComparison.actualSpending)}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: colors.icon }]}>
                    {budgetComparison.isOverBudget ? "Over Budget" : "Saved"}
                  </Text>
                  <Text
                    style={[
                      styles.budgetValue,
                      {
                        color: budgetComparison.isOverBudget
                          ? colors.error
                          : colors.success,
                      },
                    ]}
                  >
                    {budgetComparison.isOverBudget ? "-" : "+"}
                    {formatCurrency(Math.abs(budgetComparison.savings))}
                  </Text>
                </View>
              </View>

              {/* Budget Progress Bar */}
              <View style={styles.budgetProgressContainer}>
                <View
                  style={[
                    styles.budgetProgressTrack,
                    { backgroundColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.budgetProgressFill,
                      {
                        width: `${Math.min(
                          isFinite(
                            budgetComparison.actualSpending /
                              budgetComparison.budgetAmount,
                          ) && budgetComparison.budgetAmount > 0
                            ? (budgetComparison.actualSpending /
                                budgetComparison.budgetAmount) *
                                100
                            : 0,
                          100,
                        )}%`,
                        backgroundColor: budgetComparison.isOverBudget
                          ? colors.error
                          : colors.success,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.budgetProgressText, { color: colors.icon }]}
                >
                  {isFinite(
                    budgetComparison.actualSpending /
                      budgetComparison.budgetAmount,
                  ) && budgetComparison.budgetAmount > 0
                    ? (
                        (budgetComparison.actualSpending /
                          budgetComparison.budgetAmount) *
                        100
                      ).toFixed(1)
                    : "0.0"}
                  % of budget used
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Category Distribution */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Category Distribution
          </Text>

          {/* Custom SVG Pie Chart */}
          {expenseStats.pieData.length > 0 && (
            <View style={styles.pieChartSection}>
              <CustomPieChart
                data={expenseStats.pieData}
                size={280}
                colors={colors}
              />

              {/* Custom Legend Below Chart */}
              <View style={styles.pieChartLegend}>
                {expenseStats.pieData.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendColorBox,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={[styles.legendText, { color: colors.text }]}>
                      {item.label} (
                      {isFinite(item.value) ? item.value.toFixed(1) : "0.0"}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Hierarchical Category Table */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Category Breakdown
          </Text>
          <View
            style={[
              styles.hierarchicalContainer,
              { backgroundColor: colors.card },
            ]}
          >
            {expenseStats.categories.map((category, index) => (
              <View key={category.category} style={styles.hierarchicalCategory}>
                {/* Main Category */}
                <View style={styles.mainCategoryRow}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text
                      style={[
                        styles.categoryName,
                        { color: colors.text, fontWeight: "600" },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </View>
                  <View style={styles.categoryAmounts}>
                    <Text
                      style={[styles.categoryAmount, { color: colors.text }]}
                    >
                      {formatCurrency(category.totalAmount)}
                    </Text>
                    <Text
                      style={[
                        styles.categoryPercentage,
                        { color: colors.icon },
                      ]}
                    >
                      {isFinite(category.percentage)
                        ? category.percentage.toFixed(1)
                        : "0.0"}
                      %
                    </Text>
                  </View>
                </View>

                {/* Progress Bar for Main Category */}
                <View style={styles.categoryProgress}>
                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${getProgressWidth(category.totalAmount, maxCategoryAmount)}%`,
                          backgroundColor:
                            expenseStats.pieData[index]?.color ||
                            colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.categoryCount, { color: colors.icon }]}>
                    {category.transactionCount} transactions
                  </Text>
                </View>

                {/* Subcategories */}
                {category.subcategories &&
                  category.subcategories.length > 0 && (
                    <View style={styles.subcategoriesContainer}>
                      {category.subcategories.map((subcategory) => (
                        <View
                          key={subcategory.category}
                          style={styles.subcategoryRow}
                        >
                          <View style={styles.subcategoryInfo}>
                            <View style={styles.subcategoryIndent}>
                              <Ionicons
                                name="arrow-forward"
                                size={14}
                                color={colors.icon}
                              />
                            </View>
                            <Text style={styles.subcategoryIcon}>
                              {subcategory.icon}
                            </Text>
                            <Text
                              style={[
                                styles.subcategoryName,
                                { color: colors.text },
                              ]}
                            >
                              {subcategory.name}
                            </Text>
                          </View>
                          <View style={styles.subcategoryAmounts}>
                            <Text
                              style={[
                                styles.subcategoryAmount,
                                { color: colors.text },
                              ]}
                            >
                              {formatCurrency(subcategory.totalAmount)}
                            </Text>
                            <Text
                              style={[
                                styles.subcategoryPercentage,
                                { color: colors.icon },
                              ]}
                            >
                              {isFinite(subcategory.percentage)
                                ? subcategory.percentage.toFixed(1)
                                : "0.0"}
                              %
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {getPeriodTrendLabel()}
          </Text>
          <View
            style={[styles.monthlyContainer, { backgroundColor: colors.card }]}
          >
            {expenseStats.monthlyData.map((month, index) => (
              <View key={month.month} style={styles.monthlyItem}>
                <View style={styles.monthlyHeader}>
                  <Text style={[styles.monthlyMonth, { color: colors.text }]}>
                    {month.month}
                  </Text>
                  <Text style={[styles.monthlyAmount, { color: colors.text }]}>
                    {formatCurrency(month.totalAmount)}
                  </Text>
                </View>
                <View style={styles.monthlyProgress}>
                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${getProgressWidth(month.totalAmount, maxMonthlyAmount)}%`,
                          backgroundColor:
                            month.month ===
                            expenseStats.highestSpendingPeriod.month
                              ? colors.error
                              : colors.success,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.monthlyCount, { color: colors.icon }]}>
                    {month.transactionCount} transactions
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        backdropStyle={styles.backdrop}
        onBackdropPress={() => {
          setFilterModalVisible(false);
          setFilterStep("type");
          setSelectedYear(null);
        }}
      >
        <Card disabled={true} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            {filterStep !== "type" && (
              <TouchableOpacity
                onPress={() => {
                  if (filterStep === "month") {
                    setFilterStep("year");
                  } else {
                    setFilterStep("type");
                    setSelectedYear(null);
                  }
                }}
                style={styles.backButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {filterStep === "type" && "Filter by Period"}
              {filterStep === "year" && "Select Year"}
              {filterStep === "month" && `Select Month (${selectedYear})`}
            </Text>
          </View>

          {filterStep === "type" && (
            <View style={styles.filterOptions}>
              {/* Removed All Time option */}

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setFilterMode("year");
                  setFilterStep("year");
                }}
              >
                <Text style={[styles.filterOptionText, { color: colors.text }]}>
                  By Year
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.icon}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterOption,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setFilterMode("month");
                  setFilterStep("year");
                }}
              >
                <Text style={[styles.filterOptionText, { color: colors.text }]}>
                  By Month
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          )}

          {filterStep === "year" && (
            <View style={styles.filterOptions}>
              {availableYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterOption,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    periodFilter.type === "year" &&
                      periodFilter.year === year && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + "20",
                      },
                  ]}
                  onPress={async () => {
                    if (filterMode === "year") {
                      setLoadingFilter(true);
                      try {
                        setPeriodFilter({ type: "year", year });
                        setFilterModalVisible(false);
                        setFilterStep("type");

                        console.log("🔄 Fetching all months for year:", year);
                        // Fetch all months for this year
                        for (let month = 1; month <= 12; month++) {
                          await fetchExpensesForMonth(year, month);
                        }
                        console.log(
                          "✅ Finished fetching all months for year:",
                          year,
                        );
                      } catch (error) {
                        console.error("❌ Error fetching year data:", error);
                      } finally {
                        setLoadingFilter(false);
                      }
                    } else {
                      setSelectedYear(year);
                      setFilterStep("month");
                    }
                  }}
                >
                  <Text
                    style={[styles.filterOptionText, { color: colors.text }]}
                  >
                    {year}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {filterStep === "month" && selectedYear && (
            <View style={styles.monthGrid}>
              {months.map((month) => (
                <TouchableOpacity
                  key={month.value}
                  style={[
                    styles.monthOption,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                    periodFilter.type === "month" &&
                      periodFilter.year === selectedYear &&
                      periodFilter.month === month.value && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + "20",
                      },
                  ]}
                  onPress={async () => {
                    setLoadingFilter(true);
                    try {
                      setPeriodFilter({
                        type: "month",
                        year: selectedYear,
                        month: month.value,
                      });
                      setFilterModalVisible(false);
                      setFilterStep("type");
                      setSelectedYear(null);

                      console.log(
                        "🔄 Fetching specific month:",
                        selectedYear,
                        month.value + 1,
                      );
                      // Fetch the specific month
                      await fetchExpensesForMonth(
                        selectedYear,
                        month.value + 1,
                      ); // month.value is 0-indexed
                      console.log(
                        "✅ Finished fetching specific month:",
                        selectedYear,
                        month.value + 1,
                      );
                    } catch (error) {
                      console.error("❌ Error fetching month data:", error);
                    } finally {
                      setLoadingFilter(false);
                    }
                  }}
                >
                  <Text
                    style={[styles.monthOptionText, { color: colors.text }]}
                  >
                    {month.label.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Layout style={styles.modalActions}>
            <Button
              style={styles.modalButton}
              appearance="outline"
              onPress={() => {
                setFilterModalVisible(false);
                setFilterStep("type");
                setSelectedYear(null);
              }}
            >
              Cancel
            </Button>
          </Layout>
        </Card>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  summarySection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  categoryContainer: {
    borderRadius: 16,
    padding: 16,
  },
  categoryItem: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  categoryAmounts: {
    alignItems: "flex-end",
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: "500",
  },
  categoryProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    flex: 1,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  categoryCount: {
    fontSize: 10,
    fontWeight: "500",
    minWidth: 80,
    textAlign: "right",
  },
  monthlyContainer: {
    borderRadius: 16,
    padding: 16,
  },
  monthlyItem: {
    marginBottom: 16,
  },
  monthlyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  monthlyMonth: {
    fontSize: 14,
    fontWeight: "500",
  },
  monthlyAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  monthlyProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthlyCount: {
    fontSize: 10,
    fontWeight: "500",
    minWidth: 80,
    textAlign: "right",
  },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    minWidth: 320,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
  },
  filterOptions: {
    gap: 12,
    marginBottom: 16,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  yearMonthSelector: {
    gap: 16,
  },
  yearSection: {
    marginBottom: 16,
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    alignContent: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  monthOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    width: (width - 120) / 4,
  },
  monthOptionText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  budgetComparisonCard: {
    borderRadius: 16,
    padding: 20,
  },
  budgetComparisonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  budgetItem: {
    flex: 1,
    alignItems: "center",
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  budgetProgressContainer: {
    marginTop: 8,
  },
  budgetProgressTrack: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  budgetProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  budgetProgressText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  budgetSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
    textAlign: "center",
  },
  // Pie Chart Styles
  pieChartSection: {
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  // Hierarchical Table Styles
  hierarchicalContainer: {
    borderRadius: 16,
    padding: 16,
  },
  hierarchicalCategory: {
    marginBottom: 24,
  },
  mainCategoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subcategoriesContainer: {
    marginTop: 12,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(0, 0, 0, 0.1)",
  },
  subcategoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 4,
  },
  subcategoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  subcategoryIndent: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  subcategoryIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  subcategoryName: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  subcategoryAmounts: {
    alignItems: "flex-end",
  },
  subcategoryAmount: {
    fontSize: 14,
    fontWeight: "600",
  },
  subcategoryPercentage: {
    fontSize: 11,
    fontWeight: "500",
  },
  // Custom Legend Styles
  pieChartLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 10,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legendLabelContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
});
