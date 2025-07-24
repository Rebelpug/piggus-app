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
import { useLocalization } from '@/context/LocalizationContext';
import { ExpenseWithDecryptedData, RecurringExpenseWithDecryptedData, calculateUserShare, getCategoryDisplayInfo } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/ProfileHeader';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import ExpenseItem from '@/components/expenses/ExpenseItem';
import RecurringExpenseItem from '@/components/expenses/RecurringExpenseItem';
import BudgetCard from '@/components/budget/BudgetCard';
import BankConnectionWizard from '@/components/banking/BankConnectionWizard';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { piggusApi, BankTransaction } from '@/client/piggusApi';
import { BulkExpenseOperation } from '@/types/expense';
import {apiBulkInsertAndUpdateExpenses} from "@/services/expenseService";
import {useEncryption} from "@/context/EncryptionContext";

export default function ExpensesScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { t } = useLocalization();
    const { user } = useAuth();
    const { isEncryptionInitialized, createEncryptionKey ,decryptWithPrivateKey, decryptWithExternalEncryptionKey, encryptWithExternalPublicKey, encryptWithExternalEncryptionKey } = useEncryption();
    const { expensesGroups, recurringExpenses, isLoading, error, addExpense, updateExpense } = useExpense();
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

            // Fetch bank transactions
            const accountsTransactions = await piggusApi.getBankTransactions();
            console.log('Bank transactions fetched:', accountsTransactions);

            // Check if we have any accounts
            if (!accountsTransactions || accountsTransactions.length === 0) {
                Alert.alert('Info', 'No bank accounts found.');
                setRefreshing(false);
                return;
            }

            // Initialize arrays for booked and pending transactions
            let bookedTransactions: any[] = [];
            let pendingTransactions: any[] = [];
            let allSkipped = true;

            // Process each account's transactions
            for (const accountData of accountsTransactions) {
                // Skip accounts that were skipped during fetching
                if (accountData.skipped) {
                    console.log(`Skipped account ${accountData.accountId}: ${accountData.reason || 'No reason provided'}`);
                    continue;
                }

                allSkipped = false;

                // Extract transactions if available
                if (accountData.transactions && accountData.transactions.transactions) {
                    const accountBooked = accountData.transactions.transactions.booked || [];
                    const accountPending = accountData.transactions.transactions.pending || [];

                    bookedTransactions = [...bookedTransactions, ...accountBooked];
                    pendingTransactions = [...pendingTransactions, ...accountPending];
                }
            }

            // Check if all accounts were skipped
            if (allSkipped) {
                const reasons = accountsTransactions
                    .filter(account => account.skipped && account.reason)
                    .map(account => `- ${account.reason}`)
                    .join('\n');

                Alert.alert('Info', `All accounts were skipped:\n${reasons || 'No specific reasons provided'}`);
                setRefreshing(false);
                return;
            }

            // Convert Transaction objects to a format compatible with our app
            const allTransactions = [...bookedTransactions, ...pendingTransactions].map(transaction => ({
                id: transaction.transactionId || transaction.internalTransactionId || '',
                amount: parseFloat(transaction.transactionAmount.amount),
                currency: transaction.transactionAmount.currency,
                description: transaction.remittanceInformationUnstructured ||
                             transaction.remittanceInformationStructured ||
                             `${transaction.creditorName || transaction.debtorName || 'Unknown'} transaction`,
                date: transaction.bookingDate,
                status: pendingTransactions.some(t => t.transactionId === transaction.transactionId) ? 'pending' : 'booked',
                category: transaction.merchantCategoryCode || 'other'
            }));

            if (!allTransactions || allTransactions.length === 0) {
                Alert.alert('Info', 'No bank transactions found.');
                setRefreshing(false);
                return;
            }

            // Get the default expense group (use the first one for now)
            if (!expensesGroups || expensesGroups.length === 0) {
                Alert.alert('Error', 'No expense groups found. Please create a group first.');
                setRefreshing(false);
                return;
            }

            const defaultGroup = expensesGroups[0];

            // Prepare bulk operations
            const bulkOperations: BulkExpenseOperation[] = [];

            for (const transaction of allTransactions) {
                // Let's skip positive transactions for now, we only want expenses
                if (transaction.amount > 0) continue;

                // Use absolute value for negative amounts to ensure they're displayed correctly
                const expenseAmount = Math.abs(transaction.amount);

                // Check if this transaction already exists as an expense
                const existingExpense = allExpenses.find(expense =>
                    expense.data.external_transaction_id === transaction.id
                );

                if (existingExpense) {
                    // Update existing expense
                    // Create a copy of the participants array to update the share amount
                    const updatedParticipants = existingExpense.data.participants.map(participant => {
                        if (participant.user_id === user?.id) {
                            return {
                                ...participant,
                                share_amount: expenseAmount
                            };
                        }
                        return participant;
                    });

                    bulkOperations.push({
                        isNew: false,
                        ...existingExpense.data,
                        amount: expenseAmount,
                        description: transaction.description,
                        date: transaction.date,
                        status: transaction.status,
                        category: transaction.category || existingExpense.data.category,
                        currency: transaction.currency || existingExpense.data.currency,
                        participants: updatedParticipants
                    });
                } else {
                    // Create new expense from transaction
                    bulkOperations.push({
                        name: transaction.description,
                        description: transaction.description,
                        amount: expenseAmount,
                        date: transaction.date,
                        category: transaction.category || 'other', // Default category
                        is_recurring: false,
                        currency: transaction.currency,
                        status: transaction.status,
                        payer_user_id: user?.id || '',
                        payer_username: userProfile?.username || '',
                        participants: [
                            {
                                user_id: user?.id || '',
                                username: userProfile?.username || '',
                                share_amount: expenseAmount
                            }
                        ],
                        split_method: 'equal',
                        external_account_id: 'bank', // Generic identifier for bank account
                        external_transaction_id: transaction.id,
                        isNew: true,
                    });
                }
            }

            // Process bulk operations
            let addedCount = 0;
            let updatedCount = 0;

            if (bulkOperations.length > 0) {
                try {
                    const results = await apiBulkInsertAndUpdateExpenses(user, defaultGroup.id, defaultGroup.encrypted_key, bulkOperations, encryptWithExternalEncryptionKey);

                    // Count added and updated expenses
                    addedCount = bulkOperations.filter(op => op.isNew).length;
                    updatedCount = bulkOperations.filter(op => !op.isNew).length;

                    console.log(`Bulk operation completed: ${results.length} expenses processed`);
                } catch (bulkError) {
                    console.error('Error processing bulk expenses:', bulkError);
                    Alert.alert(
                        'Error',
                        'Failed to process expenses in bulk. Please try again.'
                    );
                }
            }

            // Show results
            Alert.alert(
                'Sync Complete',
                `Successfully processed ${allTransactions.length} transactions.\nAdded: ${addedCount}\nUpdated: ${updatedCount}`
            );

            // Refresh the UI
            onRefresh();
        } catch (error) {
            console.error('Error syncing bank transactions:', error);
            Alert.alert(
                'Error',
                'Failed to sync bank transactions. Please try again.'
            );
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

    const renderBankConnectionBanner = () => (
        <View style={[styles.bankBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.bankBannerContent}>
                <Ionicons name="card" size={24} color={colors.primary} style={styles.bankBannerIcon} />
                <View style={styles.bankBannerText}>
                    <Text category='s1' style={[styles.bannerTitle, { color: colors.text }]}>
                        {userProfile?.has_active_bank_account
                            ? t('banking.bankAccountConnected')
                            : t('banking.connectBankAccount')}
                    </Text>
                </View>
                {userProfile?.has_active_bank_account ? (
                    <View style={styles.bankButtonsContainer}>
                        <Button
                            size='small'
                            style={[styles.bankButton, { marginRight: 8 }]}
                            onPress={handleSyncBankTransactions}
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
