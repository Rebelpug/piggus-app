import React, { useState } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity, View, FlatList, ScrollView } from 'react-native';
import {
    Layout,
    Text,
    Button,
    TopNavigation,
    Tab,
    TabView
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useLocalization } from '@/context/LocalizationContext';
import {
    ExpenseWithDecryptedData,
    RecurringExpenseWithDecryptedData,
    calculateUserShare,
} from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/ProfileHeader';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import ExpenseItem from '@/components/expenses/ExpenseItem';
import RecurringExpenseItem from '@/components/expenses/RecurringExpenseItem';
import BudgetCard from '@/components/budget/BudgetCard';
import BankConnectionWizard from '@/components/banking/BankConnectionWizard';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { piggusApi } from '@/client/piggusApi';

export default function ExpensesScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { t } = useLocalization();
    const { user } = useAuth();
    const { expensesGroups, recurringExpenses, syncBankTransactions, isLoading, error } = useExpense();
    const { userProfile } = useProfile();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedMonth, setSelectedMonth] = useState<string>('current'); // 'current' for default 3-month view, or specific month like '2025-05'
    const [showBankWizard, setShowBankWizard] = useState(false);

    // Generate last 12 months for selector
    const monthOptions = React.useMemo(() => {
        const months = [];
        const now = new Date();

        // Add "Current month" option
        months.push({
            key: 'current',
            label: t('expenses.currentMonth'),
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
                        // Exclude deleted expenses
                        if (expense.data.status === 'deleted') {
                            return false;
                        }
                        // Only include expenses where the user is a participant
                        const userShare = calculateUserShare(expense, user?.id || '');
                        return userShare > 0;
                    })
                    .map(expense => ({
                        ...expense,
                        groupName: group.data?.name || t('expenses.unknownGroup')
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
                        groupName: group?.data?.name || t('expenses.unknownGroup')
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
        const isRecurring = selectedIndex === 1;
        router.push(isRecurring ? '/(protected)/add-expense?isRecurring=true' : '/(protected)/add-expense');
    };

    const getMonthYear = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const isThisMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

            if (isThisMonth) {
                return t('expenses.thisMonth');
            }

            return date.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return t('common.unknown');
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
            // Sort expenses within the same month by created_at descending
            const sortedMonthExpenses = groups[monthKey].sort((a, b) => {
                try {
                    // First sort by date (descending), then by created_at (descending)
                    const dateCompare = new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
                    if (dateCompare !== 0) return dateCompare;

                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                } catch {
                    return 0;
                }
            });
            sortedMonthExpenses.forEach(expense => {
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

    const handleSyncBankTransactions = async () => {
        try {
            // Show loading indicator
            setRefreshing(true);

            // Use the new context function
            const result = await syncBankTransactions();

            if (result.success) {
                Alert.alert(
                    'Sync Complete',
                    `Added: ${result.addedCount}\nUpdated: ${result.updatedCount}`
                );
                // Refresh the UI
                onRefresh();
            } else {
                Alert.alert('Error', result.error || 'Failed to sync bank transactions');
            }
        } catch (error) {
            console.error('Error syncing bank transactions:', error);
            Alert.alert('Error', 'Failed to sync bank transactions. Please try again.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleDisconnectBank = async () => {
        try {
            await piggusApi.disconnectBank();
            Alert.alert(
                'Success',
                'Your bank account has been disconnected successfully.'
            );
            // Refresh the profile to update the bank connection status
            onRefresh();
        } catch (error) {
            console.error('Error disconnecting bank:', error);
            Alert.alert(
                'Error',
                'Failed to disconnect bank account. Please try again.'
            );
        }
    };

    const isPremium = userProfile?.subscription?.subscription_tier === 'premium';
    const hasBankConnection = userProfile?.bank_accounts?.some(bankAccount => bankAccount.active);

    const renderBankConnectionBanner = () => {
        // Show upgrade banner for non-premium users without bank connection
        /*if (!isPremium && !hasBankConnection) {
            return (
                <View style={[styles.bankBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.bankBannerContent}>
                        <Ionicons name="card" size={24} color={colors.primary} style={styles.bankBannerIcon} />
                        <View style={styles.bankBannerText}>
                            <Text category='s1' style={[styles.bannerTitle, { color: colors.text }]}>
                                {t('banking.upgradeForBankConnection')}
                            </Text>
                        </View>
                        <Button
                            size='small'
                            status='primary'
                            style={styles.bankButton}
                            onPress={() => {
                                router.push('/(protected)/subscription');
                            }}
                        >
                            {t('banking.upgrade')}
                        </Button>
                    </View>
                </View>
            );
        }*/

        if (!isPremium && !hasBankConnection) { return null; }

        return (
            <View style={[styles.bankBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.bankBannerContent}>
                    <Ionicons name="card" size={24} color={colors.primary} style={styles.bankBannerIcon} />
                    <View style={styles.bankBannerText}>
                        <Text category='s1' style={[styles.bannerTitle, { color: colors.text }]}>
                            {hasBankConnection
                                ? t('banking.bankAccountConnected')
                                : t('banking.connectBankAccount')}
                        </Text>
                        {hasBankConnection && userProfile?.bank_accounts?.[0]?.last_fetched && (
                            <Text category='c1' appearance='hint'>
                                Last Sync: {new Date(userProfile.bank_accounts[0].last_fetched).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                    {hasBankConnection ? (
                        <View style={styles.bankButtonsContainer}>
                            <Button
                                size='small'
                                style={[styles.bankButton, { marginRight: 8 }]}
                                onPress={handleSyncBankTransactions}
                                disabled={!isPremium}
                            >
                                {t('banking.sync')}
                            </Button>
                            <Button
                                size='small'
                                status='danger'
                                style={styles.bankButton}
                                onPress={handleDisconnectBank}
                            >
                                {t('banking.disconnect')}
                            </Button>
                        </View>
                    ) : (
                        <Button
                            size='small'
                            style={styles.connectButton}
                            onPress={() => setShowBankWizard(true)}
                        >
                            {t('banking.connect')}
                        </Button>
                    )}
                </View>
            </View>
        );
    };

    const renderExpensesHeader = () => {
        return <BudgetCard selectedMonth={selectedMonth} variant="list" />;
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
            <Text category='h6' style={styles.emptyTitle}>{t('expenses.noExpensesYet')}</Text>
            <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                {t('expenses.startTrackingExpenses')}
            </Text>
            <Button
                style={styles.addButton}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleAddExpense}
            >
                {t('expenses.addExpense')}
            </Button>
        </Layout>
    );

    const renderRecurringEmptyState = () => (
        <Layout style={styles.emptyState}>
            <Ionicons name="repeat" size={64} color="#8F9BB3" style={styles.emptyIcon} />
            <Text category='h6' style={styles.emptyTitle}>{t('expenses.noRecurringExpenses')}</Text>
            <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                {t('expenses.setupRecurringExpenses')}
            </Text>
            <Button
                style={styles.addButton}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleAddExpense}
            >
                {t('expenses.addRecurringExpense')}
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
                    title={t('expenses.title')}
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
                    title={t('expenses.title')}
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                />
                <Layout style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" style={styles.errorIcon} />
                    <Text category='h6' style={styles.errorTitle}>{t('expenses.errorLoadingExpenses')}</Text>
                    <Text category='s1' appearance='hint' style={styles.errorDescription}>
                        {error}
                    </Text>
                    <Button
                        style={styles.retryButton}
                        status='primary'
                        onPress={onRefresh}
                    >
                        {t('common.tryAgain')}
                    </Button>
                </Layout>
            </SafeAreaView>
        );
    }

    const renderExpensesTab = () => (
        <View style={[styles.tabContent, { backgroundColor: colors.background }]}>
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
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title={t('expenses.title')}
                alignment='center'
                accessoryLeft={renderLeftActions}
                style={{ backgroundColor: colors.background }}
            />

            {renderMonthSelector()}
            {renderBankConnectionBanner()}

            <TabView
                selectedIndex={selectedIndex}
                onSelect={index => setSelectedIndex(index)}
                style={styles.tabView}
            >
                <Tab
                    title={t('expenses.expensesCount', { count: filteredExpenses.length })}
                    icon={(props) => <Ionicons name="card-outline" size={20} color={props?.focused ? colors.primary : colors.icon} />}
                >
                    {renderExpensesTab()}
                </Tab>
                <Tab
                    title={t('expenses.recurringCount', { count: allRecurringExpenses.length })}
                    icon={(props) => <Ionicons name="repeat-outline" size={20} color={props?.focused ? colors.primary : colors.icon} />}
                >
                    {renderRecurringTab()}
                </Tab>
            </TabView>

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
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
        paddingTop: 10,
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
        paddingBottom: 8,
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
    bankBanner: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
    },
    bankBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bankBannerIcon: {
        marginRight: 12,
    },
    bankBannerText: {
        flex: 1,
        gap: 4,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    connectButton: {
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    bankButtonsContainer: {
        flexDirection: 'row',
    },
    bankButton: {
        paddingHorizontal: 12,
        borderRadius: 8,
    },
});
