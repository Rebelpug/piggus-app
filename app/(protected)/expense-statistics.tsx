import React, { useMemo, useState } from 'react';
import { StyleSheet, ScrollView, View, Dimensions, TouchableOpacity } from 'react-native';
import { Text, TopNavigation, TopNavigationAction, Button, Modal, Card, Layout } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExpense } from '@/context/ExpenseContext';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import { calculateUserShare, getCategoryDisplayInfo } from '@/types/expense';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

interface CategoryStats {
  category: string;
  name: string;
  icon: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

interface MonthlyStats {
  month: string;
  totalAmount: number;
  transactionCount: number;
}

type PeriodType = 'all' | 'year' | 'month';

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
  const colors = Colors[colorScheme || 'light'];
  const { user } = useAuth();
  const { expensesGroups } = useExpense();
  const { userProfile } = useProfile();

  // Debug logging
  console.log('ExpenseStatistics - colorScheme:', colorScheme);
  console.log('ExpenseStatistics - colors.card:', colors.card);

  const defaultCurrency = userProfile?.profile?.defaultCurrency || 'EUR';

  // Period filter state
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({ type: 'all' });
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [filterStep, setFilterStep] = useState<'type' | 'year' | 'month'>('type');
  const [filterMode, setFilterMode] = useState<'year' | 'month'>('year');

  // Get available years from expenses
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    expensesGroups.forEach(group => {
      if (group.membership_status === 'confirmed') {
        group.expenses.forEach(expense => {
          const year = new Date(expense.data.date).getFullYear();
          years.add(year);
        });
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [expensesGroups]);

  const months = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];

  const renderBackAction = () => (
    <TopNavigationAction
      icon={(props) => <Ionicons name="chevron-back" size={24} color={colors.text} />}
      onPress={() => router.back()}
    />
  );

  const expenseStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Helper function to check if expense matches the filter
    const matchesFilter = (expenseDate: Date) => {
      const expenseYear = expenseDate.getFullYear();
      const expenseMonth = expenseDate.getMonth();

      switch (periodFilter.type) {
        case 'year':
          return expenseYear === periodFilter.year;
        case 'month':
          return expenseYear === periodFilter.year && expenseMonth === periodFilter.month;
        case 'all':
        default:
          return true;
      }
    };

    // Generate period data based on filter
    const generatePeriodData = () => {
      if (periodFilter.type === 'month') {
        // Show days of the month
        const year = periodFilter.year!;
        const month = periodFilter.month!;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const periodData = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          periodData.push({
            period: day.toString(),
            periodKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            totalAmount: 0,
            transactionCount: 0
          });
        }
        return periodData;
      } else if (periodFilter.type === 'year') {
        // Show months of the year
        const year = periodFilter.year!;
        const periodData = [];

        for (let month = 0; month < 12; month++) {
          const date = new Date(year, month, 1);
          periodData.push({
            period: date.toLocaleDateString('en-US', { month: 'short' }),
            periodKey: `${year}-${String(month + 1).padStart(2, '0')}`,
            totalAmount: 0,
            transactionCount: 0
          });
        }
        return periodData;
      } else {
        // Show last 6 months for 'all' filter
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentYear, currentMonth - i, 1);
          last6Months.push({
            period: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            periodKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            totalAmount: 0,
            transactionCount: 0
          });
        }
        return last6Months;
      }
    };

    const periodData = generatePeriodData();
    let totalSpent = 0;
    let totalTransactions = 0;
    const categories: { [key: string]: CategoryStats } = {};
    const monthlyData: { [key: string]: MonthlyStats } = {};

    periodData.forEach(period => {
      monthlyData[period.periodKey] = {
        month: period.period,
        totalAmount: 0,
        transactionCount: 0
      };
    });

    expensesGroups.forEach(group => {
      if (group.membership_status === 'confirmed') {
        group.expenses.forEach(expense => {
          const expenseDate = new Date(expense.data.date);

          // Only include expenses that match the filter
          if (!matchesFilter(expenseDate)) return;

          const userShare = calculateUserShare(expense, user?.id || '');
          if (userShare > 0) {
            totalSpent += userShare;
            totalTransactions++;

            const categoryInfo = getCategoryDisplayInfo(expense.data.category);
            const categoryId = expense.data.category || 'other';

            if (!categories[categoryId]) {
              categories[categoryId] = {
                category: categoryId,
                name: categoryInfo.name,
                icon: categoryInfo.icon,
                totalAmount: 0,
                transactionCount: 0,
                percentage: 0
              };
            }

            categories[categoryId].totalAmount += userShare;
            categories[categoryId].transactionCount++;

            // Add to period data
            let periodKey: string;
            if (periodFilter.type === 'month') {
              periodKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}-${String(expenseDate.getDate()).padStart(2, '0')}`;
            } else {
              periodKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
            }

            if (monthlyData[periodKey]) {
              monthlyData[periodKey].totalAmount += userShare;
              monthlyData[periodKey].transactionCount++;
            }
          }
        });
      }
    });

    Object.keys(categories).forEach(categoryId => {
      categories[categoryId].percentage = totalSpent > 0 ? (categories[categoryId].totalAmount / totalSpent) * 100 : 0;
    });

    const sortedCategories = Object.values(categories).sort((a, b) => b.totalAmount - a.totalAmount);
    const sortedMonthlyData = Object.values(monthlyData);

    const averageSpending = sortedMonthlyData.length > 0
      ? sortedMonthlyData.reduce((sum, period) => sum + period.totalAmount, 0) / sortedMonthlyData.length
      : 0;

    const highestSpendingPeriod = sortedMonthlyData.reduce((max, period) =>
      period.totalAmount > max.totalAmount ? period : max,
      { month: '', totalAmount: 0, transactionCount: 0 }
    );

    return {
      totalSpent,
      totalTransactions,
      categories: sortedCategories,
      monthlyData: sortedMonthlyData,
      averageSpending,
      highestSpendingPeriod,
      averagePerTransaction: totalTransactions > 0 ? totalSpent / totalTransactions : 0
    };
  }, [expensesGroups, user?.id, periodFilter]);

  // Calculate budget comparison for monthly and yearly periods - separate from main stats
  const budgetComparison: BudgetComparison | null = useMemo(() => {
    if (!userProfile?.profile?.budgeting?.budget?.amount) {
      return null;
    }

    if (periodFilter.type === 'month') {
      const budgetAmount = userProfile.profile.budgeting.budget.amount;
      const savings = budgetAmount - expenseStats.totalSpent;

      return {
        budgetAmount,
        actualSpending: expenseStats.totalSpent,
        savings,
        isOverBudget: expenseStats.totalSpent > budgetAmount
      };
    } else if (periodFilter.type === 'year') {
      // For yearly view, multiply monthly budget by 12
      const monthlyBudget = userProfile.profile.budgeting.budget.amount;
      const yearlyBudget = monthlyBudget * 12;
      const savings = yearlyBudget - expenseStats.totalSpent;

      return {
        budgetAmount: yearlyBudget,
        actualSpending: expenseStats.totalSpent,
        savings,
        isOverBudget: expenseStats.totalSpent > yearlyBudget
      };
    }

    return null;
  }, [periodFilter.type, userProfile?.profile?.budgeting?.budget?.amount, expenseStats.totalSpent]);

  const formatCurrency = (amount: number, currency: string = defaultCurrency) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)}`;
    }
  };

  const getProgressWidth = (amount: number, maxAmount: number) => {
    if (maxAmount === 0) return 0;
    return Math.min((amount / maxAmount) * 100, 100);
  };

  const maxCategoryAmount = expenseStats.categories.length > 0 ? expenseStats.categories[0].totalAmount : 0;
  const maxMonthlyAmount = Math.max(...expenseStats.monthlyData.map(m => m.totalAmount));

  const getPeriodLabel = () => {
    switch (periodFilter.type) {
      case 'year':
        return `Year ${periodFilter.year}`;
      case 'month':
        const monthName = months.find(m => m.value === periodFilter.month)?.label;
        return `${monthName} ${periodFilter.year}`;
      case 'all':
      default:
        return 'All Time';
    }
  };

  const getPeriodTrendLabel = () => {
    switch (periodFilter.type) {
      case 'year':
        return 'Monthly Trend';
      case 'month':
        return 'Daily Trend';
      case 'all':
      default:
        return 'Monthly Trend';
    }
  };

  const getAverageLabel = () => {
    switch (periodFilter.type) {
      case 'year':
        return 'Avg Monthly';
      case 'month':
        return 'Avg Daily';
      case 'all':
      default:
        return 'Avg Monthly';
    }
  };

  const getBudgetSectionTitle = () => {
    switch (periodFilter.type) {
      case 'year':
        return 'Annual Budget vs Actual';
      case 'month':
        return 'Monthly Budget vs Actual';
      default:
        return 'Budget vs Actual';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavigation
        title="Expense Statistics"
        alignment="center"
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Filter */}
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={[styles.filterButtonText, { color: colors.text }]}>
              {getPeriodLabel()}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.icon} />
          </TouchableOpacity>
        </View>
        <View style={styles.summarySection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(expenseStats.totalSpent)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Total Spent</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {expenseStats.totalTransactions}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Transactions</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(expenseStats.averagePerTransaction)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Avg per Transaction</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatCurrency(expenseStats.averageSpending)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>{getAverageLabel()}</Text>
            </View>
          </View>
        </View>

        {/* Budget Comparison Section */}
        {budgetComparison && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{getBudgetSectionTitle()}</Text>
            {periodFilter.type === 'year' && (
              <Text style={[styles.budgetSubtitle, { color: colors.icon }]}>
                Based on monthly budget × 12 months
              </Text>
            )}
            <View style={[styles.budgetComparisonCard, { backgroundColor: colors.card }]}>
              <View style={styles.budgetComparisonHeader}>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: colors.icon }]}>Budget</Text>
                  <Text style={[styles.budgetValue, { color: colors.text }]}>
                    {formatCurrency(budgetComparison.budgetAmount)}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: colors.icon }]}>Spent</Text>
                  <Text style={[styles.budgetValue, { color: colors.text }]}>
                    {formatCurrency(budgetComparison.actualSpending)}
                  </Text>
                </View>
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetLabel, { color: colors.icon }]}>
                    {budgetComparison.isOverBudget ? 'Over Budget' : 'Saved'}
                  </Text>
                  <Text style={[
                    styles.budgetValue,
                    { color: budgetComparison.isOverBudget ? colors.error : colors.success }
                  ]}>
                    {budgetComparison.isOverBudget ? '-' : '+'}
                    {formatCurrency(Math.abs(budgetComparison.savings))}
                  </Text>
                </View>
              </View>

              {/* Budget Progress Bar */}
              <View style={styles.budgetProgressContainer}>
                <View style={[styles.budgetProgressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.budgetProgressFill,
                      {
                        width: `${Math.min((budgetComparison.actualSpending / budgetComparison.budgetAmount) * 100, 100)}%`,
                        backgroundColor: budgetComparison.isOverBudget ? colors.error : colors.success
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.budgetProgressText, { color: colors.icon }]}>
                  {((budgetComparison.actualSpending / budgetComparison.budgetAmount) * 100).toFixed(1)}% of budget used
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
          <View style={[styles.categoryContainer, { backgroundColor: colors.card }]}>
            {expenseStats.categories.slice(0, 8).map((category, index) => (
              <View key={category.category} style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                  </View>
                  <View style={styles.categoryAmounts}>
                    <Text style={[styles.categoryAmount, { color: colors.text }]}>
                      {formatCurrency(category.totalAmount)}
                    </Text>
                    <Text style={[styles.categoryPercentage, { color: colors.icon }]}>
                      {category.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryProgress}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${getProgressWidth(category.totalAmount, maxCategoryAmount)}%`,
                          backgroundColor: colors.primary
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.categoryCount, { color: colors.icon }]}>
                    {category.transactionCount} transactions
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{getPeriodTrendLabel()}</Text>
          <View style={[styles.monthlyContainer, { backgroundColor: colors.card }]}>
            {expenseStats.monthlyData.map((month, index) => (
              <View key={month.month} style={styles.monthlyItem}>
                <View style={styles.monthlyHeader}>
                  <Text style={[styles.monthlyMonth, { color: colors.text }]}>{month.month}</Text>
                  <Text style={[styles.monthlyAmount, { color: colors.text }]}>
                    {formatCurrency(month.totalAmount)}
                  </Text>
                </View>
                <View style={styles.monthlyProgress}>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${getProgressWidth(month.totalAmount, maxMonthlyAmount)}%`,
                          backgroundColor: month.month === expenseStats.highestSpendingPeriod.month ? colors.error : colors.success
                        }
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
          setFilterStep('type');
          setSelectedYear(null);
        }}
      >
        <Card disabled={true} style={styles.modalCard}>
                <View style={styles.modalHeader}>
            {filterStep !== 'type' && (
              <TouchableOpacity
                onPress={() => {
                  if (filterStep === 'month') {
                    setFilterStep('year');
                  } else {
                    setFilterStep('type');
                    setSelectedYear(null);
                  }
                }}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {filterStep === 'type' && 'Filter by Period'}
              {filterStep === 'year' && 'Select Year'}
              {filterStep === 'month' && `Select Month (${selectedYear})`}
            </Text>
          </View>

          {filterStep === 'type' && (
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  periodFilter.type === 'all' && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setPeriodFilter({ type: 'all' });
                  setFilterModalVisible(false);
                  setFilterStep('type');
                }}
              >
                <Text style={[styles.filterOptionText, { color: colors.text }]}>All Time</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => {
                  setFilterMode('year');
                  setFilterStep('year');
                }}
              >
                <Text style={[styles.filterOptionText, { color: colors.text }]}>By Year</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.icon} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => {
                  setFilterMode('month');
                  setFilterStep('year');
                }}
              >
                <Text style={[styles.filterOptionText, { color: colors.text }]}>By Month</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.icon} />
              </TouchableOpacity>
            </View>
          )}

          {filterStep === 'year' && (
            <View style={styles.filterOptions}>
              {availableYears.map(year => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterOption,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    periodFilter.type === 'year' && periodFilter.year === year && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    if (filterMode === 'year') {
                      setPeriodFilter({ type: 'year', year });
                      setFilterModalVisible(false);
                      setFilterStep('type');
                    } else {
                      setSelectedYear(year);
                      setFilterStep('month');
                    }
                  }}
                >
                  <Text style={[styles.filterOptionText, { color: colors.text }]}>{year}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.icon} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {filterStep === 'month' && selectedYear && (
            <View style={styles.monthGrid}>
              {months.map(month => (
                <TouchableOpacity
                  key={month.value}
                  style={[
                    styles.monthOption,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    periodFilter.type === 'month' && periodFilter.year === selectedYear && periodFilter.month === month.value && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setPeriodFilter({ type: 'month', year: selectedYear, month: month.value });
                    setFilterModalVisible(false);
                    setFilterStep('type');
                    setSelectedYear(null);
                  }}
                >
                  <Text style={[styles.monthOptionText, { color: colors.text }]}>{month.label.substring(0, 3)}</Text>
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
                setFilterStep('type');
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (width - 52) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryContainer: {
    borderRadius: 16,
    padding: 16,
  },
  categoryItem: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryPercentage: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    flex: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryCount: {
    fontSize: 10,
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'right',
  },
  monthlyContainer: {
    borderRadius: 16,
    padding: 16,
  },
  monthlyItem: {
    marginBottom: 16,
  },
  monthlyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthlyMonth: {
    fontSize: 14,
    fontWeight: '500',
  },
  monthlyAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthlyProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthlyCount: {
    fontSize: 10,
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'right',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCard: {
    minWidth: 320,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '500',
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
    fontWeight: '600',
    marginBottom: 8,
  },

  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'center',
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
    fontWeight: '500',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  budgetItem: {
    flex: 1,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '700',
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
    height: '100%',
    borderRadius: 4,
  },
  budgetProgressText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  budgetSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
});
