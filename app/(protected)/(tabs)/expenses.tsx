import React, { useState } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity, View, FlatList, ScrollView } from 'react-native';
import {
    Layout,
    Text,
    Card,
    Button,
    TopNavigation,
    List,
    ListItem,
    Divider,
    Tab,
    TabView
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { ExpenseWithDecryptedData, RecurringExpenseWithDecryptedData, calculateUserShare, getCategoryDisplayInfo } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/ProfileHeader';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import ExpenseItem from '@/components/expenses/ExpenseItem';
import RecurringExpenseItem from '@/components/expenses/RecurringExpenseItem';
import BudgetCard from '@/components/budget/BudgetCard';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function ExpensesScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { expensesGroups, recurringExpenses, isLoading, error } = useExpense();
    const { userProfile } = useProfile();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState<string>('current'); // 'current' for default 3-month view, or specific month like '2025-05'

    // Generate last 12 months for selector
    const monthOptions = React.useMemo(() => {
        const months = [];
        const now = new Date();

        // Add "Current month" option
        months.push({
            key: 'current',
            label: 'Current month',
            value: 'current'
        });

        // Add previous 11 months (excluding current month)
        for (let i = 1; i <= 11; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
            });

            months.push({
                key: monthKey,
                label: monthLabel,
                value: monthKey
            });
        }

        return months;
    }, []);

    // Flatten all expenses from all groups with error handling
    const allExpenses: (ExpenseWithDecryptedData & { groupName?: string })[] = React.useMemo(() => {
        try {
            if (!expensesGroups || !Array.isArray(expensesGroups)) {
                return [];
            }

            return expensesGroups.flatMap(group => {
                if (!group || !group.expenses || !Array.isArray(group.expenses)) {
                    return [];
                }

                return group.expenses
                    .filter(expense => {
                        // Only include expenses where the user is a participant
                        const userShare = calculateUserShare(expense, user?.id || '');
                        return userShare > 0;
                    })
                    .map(expense => ({
                        ...expense,
                        groupName: group.data?.name || 'Unknown Group'
                    }));
            }).sort((a, b) => {
                try {
                    return new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
                } catch {
                    return 0;
                }
            });
        } catch (error) {
            console.error('Error processing expenses:', error);
            return [];
        }
    }, [expensesGroups, user?.id]);

    // Filter expenses based on selected month
    const filteredExpenses = React.useMemo(() => {
        if (selectedMonth === 'current') {
            // Show last 3 months
            const now = new Date();
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

            return allExpenses.filter(expense => {
                const expenseDate = new Date(expense.data.date);
                return expenseDate >= threeMonthsAgo;
            });
        } else {
            // Show specific month
            const [year, month] = selectedMonth.split('-').map(Number);

            return allExpenses.filter(expense => {
                const expenseDate = new Date(expense.data.date);
                return expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
            });
        }
    }, [allExpenses, selectedMonth]);

    // Process recurring expenses with group names
    const allRecurringExpenses: (RecurringExpenseWithDecryptedData & { groupName?: string })[] = React.useMemo(() => {
        try {
            if (!recurringExpenses || !Array.isArray(recurringExpenses)) {
                return [];
            }

            return recurringExpenses
                .filter(recurringExpense => {
                    // Only include recurring expenses where the user is a participant
                    const userShare = recurringExpense.data.participants.find(p => p.user_id === user?.id)?.share_amount || 0;
                    return userShare > 0;
                })
                .map(recurringExpense => {
                    // Find the group name
                    const group = expensesGroups?.find(g => g.id === recurringExpense.group_id);
                    return {
                        ...recurringExpense,
                        groupName: group?.data?.name || 'Unknown Group'
                    };
                })
                .sort((a, b) => {
                    try {
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    } catch {
                        return 0;
                    }
                });
        } catch (error) {
            console.error('Error processing recurring expenses:', error);
            return [];
        }
    }, [recurringExpenses, expensesGroups, user?.id]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        // The context will handle refreshing
        setTimeout(() => setRefreshing(false), 2000);
    }, []);

    const handleAddExpense = () => {
        router.push('/(protected)/add-expense');
    };

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
            }).format(amount);
        } catch {
            return `${amount.toFixed(2)}`;
        }
    };

    const getMonthYear = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const isThisMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

            if (isThisMonth) {
                return 'This month';
            }

            return date.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return 'Unknown';
        }
    };

    // Group expenses by month
    const groupedExpenses = React.useMemo(() => {
        const groups: { [key: string]: (ExpenseWithDecryptedData & { groupName?: string })[] } = {};

        filteredExpenses.forEach(expense => {
            const monthKey = getMonthYear(expense.data.date);
            if (!groups[monthKey]) {
                groups[monthKey] = [];
            }
            groups[monthKey].push(expense);
        });

        // Convert to array with month labels
        const result: Array<{ type: 'header' | 'expense'; data: any; key: string }> = [];
        Object.keys(groups).forEach(monthKey => {
            result.push({ type: 'header', data: monthKey, key: `header-${monthKey}` });
            groups[monthKey].forEach(expense => {
                result.push({ type: 'expense', data: expense, key: expense.id });
            });
        });

        return result;
    }, [filteredExpenses]);


    const renderMonthHeader = ({ item }: { item: string }) => (
        <View style={[styles.monthHeader, { backgroundColor: colors.background }]}>
            <Text style={[styles.monthHeaderText, { color: colors.text }]}>
                {item}
            </Text>
        </View>
    );


    const renderListItem = ({ item }: { item: { type: 'header' | 'expense'; data: any; key: string } }) => {
        if (item.type === 'header') {
            return renderMonthHeader({ item: item.data });
        } else {
            return <ExpenseItem item={item.data} />;
        }
    };

    const renderRecurringExpenseItem = ({ item }: { item: RecurringExpenseWithDecryptedData & { groupName?: string } }) => {
        return <RecurringExpenseItem item={item} />;
    };

    const renderMonthSelector = () => (
        <View style={[styles.monthSelector, { backgroundColor: colors.background }]}>
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
                                backgroundColor: selectedMonth === month.value ? colors.primary : colors.card,
                                borderColor: colors.border
                            }
                        ]}
                        onPress={() => setSelectedMonth(month.value)}
                    >
                        <Text style={[
                            styles.monthOptionText,
                            {
                                color: selectedMonth === month.value ? 'white' : colors.text,
                                fontWeight: selectedMonth === month.value ? '600' : '500'
                            }
                        ]}>
                            {month.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderExpensesHeader = () => {
        return <BudgetCard selectedMonth={selectedMonth} />;
    };

    const renderRecurringHeader = () => {
        return (
            <View>
            </View>
        );
    };

    const renderExpensesEmptyState = () => (
        <Layout style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
            <Text category='h6' style={styles.emptyTitle}>No expenses yet</Text>
            <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                Start tracking your expenses by adding your first one
            </Text>
            <Button
                style={styles.addButton}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleAddExpense}
            >
                Add Expense
            </Button>
        </Layout>
    );

    const renderRecurringEmptyState = () => (
        <Layout style={styles.emptyState}>
            <Ionicons name="repeat" size={64} color="#8F9BB3" style={styles.emptyIcon} />
            <Text category='h6' style={styles.emptyTitle}>No recurring expenses</Text>
            <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                Set up recurring expenses to automate your regular payments
            </Text>
            <Button
                style={styles.addButton}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleAddExpense}
            >
                Add Recurring Expense
            </Button>
        </Layout>
    );

    const renderLeftActions = () => (
        <ProfileHeader />
    );


    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title='Expenses'
                    alignment='center'
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
                    title='Expenses'
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                />
                <Layout style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" style={styles.errorIcon} />
                    <Text category='h6' style={styles.errorTitle}>Error loading expenses</Text>
                    <Text category='s1' appearance='hint' style={styles.errorDescription}>
                        {error}
                    </Text>
                    <Button
                        style={styles.retryButton}
                        status='primary'
                        onPress={onRefresh}
                    >
                        Try Again
                    </Button>
                </Layout>
            </SafeAreaView>
        );
    }

    const renderExpensesTab = () => (
        <Layout style={styles.tabContent}>
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
        </Layout>
    );

    const renderRecurringTab = () => (
        <Layout style={styles.tabContent}>
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
        </Layout>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title='Expenses'
                alignment='center'
                accessoryLeft={renderLeftActions}
                style={{ backgroundColor: colors.background }}
            />

            {renderMonthSelector()}

            <TabView
                selectedIndex={selectedIndex}
                onSelect={index => setSelectedIndex(index)}
                style={styles.tabView}
            >
                <Tab
                    title={`Expenses (${filteredExpenses.length})`}
                    icon={(props) => <Ionicons name="card-outline" size={20} color={props?.tintColor} />}
                >
                    {renderExpensesTab()}
                </Tab>
                <Tab
                    title={`Recurring (${allRecurringExpenses.length})`}
                    icon={(props) => <Ionicons name="repeat-outline" size={20} color={props?.tintColor} />}
                >
                    {renderRecurringTab()}
                </Tab>
            </TabView>

            {(allExpenses.length > 0 || allRecurringExpenses.length > 0) && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={handleAddExpense}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorIcon: {
        marginBottom: 16,
    },
    errorTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    errorDescription: {
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        marginBottom: 24,
        textAlign: 'center',
    },
    addButton: {
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 100,
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
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
        fontWeight: '600',
        opacity: 0.8,
    },
    monthSelector: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
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
        alignItems: 'center',
    },
    monthOptionText: {
        fontSize: 14,
    },
});
