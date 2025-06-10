import React, { useState, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import {
    Layout,
    Text,
    Card,
    Button,
    Spinner,
    TopNavigation,
    Modal,
    Input,
    Select,
    SelectItem,
    IndexPath
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, calculateUserShare, calculateUserBalance } from '@/types/expense';
import ProfileHeader from '@/components/ProfileHeader';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { expensesGroups, isLoading } = useExpense();
    const { userProfile, updateProfile } = useProfile();
    const [refreshing, setRefreshing] = useState(false);
    const [budgetModalVisible, setBudgetModalVisible] = useState(false);
    const [budgetAmount, setBudgetAmount] = useState(userProfile?.profile?.budget?.amount?.toString() || '0');
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(CURRENCIES.findIndex((cur) => cur.value === userProfile?.profile?.defaultCurrency)));
    const [savingBudget, setSavingBudget] = useState(false);

    // Calculate current month's expenses - only user's share
    const currentMonthData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalSpent = 0;
        let transactionCount = 0;
        const categories: { [key: string]: number } = {};

        expensesGroups.forEach(group => {
            if (group.membership_status === 'confirmed') {
                group.expenses.forEach(expense => {
                    const expenseDate = new Date(expense.data.date);
                    if (expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear) {
                        // Only count user's share of the expense
                        const userShare = calculateUserShare(expense, user?.id || '');
                        if (userShare > 0) {
                            totalSpent += userShare;
                            transactionCount++;

                            const category = expense.data.category || 'other';
                            categories[category] = (categories[category] || 0) + userShare;
                        }
                    }
                });
            }
        });

        // Get top spending category
        const topCategory = Object.entries(categories).reduce(
            (max, [category, amount]) => amount > max.amount ? { category, amount } : max,
            { category: 'none', amount: 0 }
        );

        return {
            totalSpent,
            transactionCount,
            topCategory: topCategory.category !== 'none' ? topCategory : null
        };
    }, [expensesGroups, user?.id]);

    // Get budget information from profile
    const budget = userProfile?.profile?.budget;
    const budgetAmount_profile = budget?.amount || 0;
    const defaultCurrency = userProfile?.profile?.defaultCurrency || 'EUR';
    const budgetRemaining = budgetAmount_profile - currentMonthData.totalSpent;
    const budgetPercentUsed = budgetAmount_profile > 0 ? (currentMonthData.totalSpent / budgetAmount_profile) * 100 : 0;

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        // Simulate refresh - the expense context will handle actual refresh
        setTimeout(() => setRefreshing(false), 2000);
    }, []);

    const handleAddExpense = () => {
        router.push('/(protected)/add-expense');
    };

    const handleViewGroups = () => {
        router.push('/(protected)/groups');
    };

    const handleViewAllExpenses = () => {
        router.push('/(protected)/(tabs)/expenses');
    };

    const handleSetBudget = async () => {
        if (!budgetAmount.trim() || isNaN(Number(budgetAmount)) || Number(budgetAmount) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid budget amount');
            return;
        }

        setSavingBudget(true);
        try {
            const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
            await updateProfile({
                budget: {
                    amount: Number(budgetAmount),
                    period: 'monthly'
                }
            });

            setBudgetModalVisible(false);
            setBudgetAmount('');
            Alert.alert('Success', 'Budget has been set successfully!');
        } catch (error) {
            Alert.alert('Error', 'Failed to set budget. Please try again.');
        } finally {
            setSavingBudget(false);
        }
    };

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

    const getBudgetStatus = () => {
        if (budgetPercentUsed <= 50) return { color: '#4CAF50', status: 'On Track' };
        if (budgetPercentUsed <= 80) return { color: '#FF9800', status: 'Watch Out' };
        return { color: '#F44336', status: 'Over Budget' };
    };

    const renderLeftActions = () => (
        <ProfileHeader />
    );

    const renderRightActions = () => (
        <Layout style={styles.headerActions}>
            <TouchableOpacity onPress={handleViewGroups} style={styles.groupsButton}>
                <Ionicons name="people-outline" size={24} color="#8F9BB3" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh" size={24} color="#8F9BB3" />
            </TouchableOpacity>
        </Layout>
    );

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title='Dashboard'
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                    accessoryRight={renderRightActions}
                />
                <AuthSetupLoader />
            </SafeAreaView>
        );
    }

    const budgetStatusInfo = getBudgetStatus();

    return (
        <SafeAreaView style={styles.container}>
            <TopNavigation
                title='Dashboard'
                alignment='center'
                accessoryLeft={renderLeftActions}
                accessoryRight={renderRightActions}
            />

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Budget Overview Card */}
                <Card style={styles.budgetCard}>
                    <Layout style={styles.budgetHeader}>
                        <Text category='h6'>Monthly Budget</Text>
                        {budget ? (
                            <TouchableOpacity onPress={() => setBudgetModalVisible(true)}>
                                <Ionicons name="settings-outline" size={20} color="#8F9BB3" />
                            </TouchableOpacity>
                        ) : null}
                    </Layout>

                    {budget ? (
                        <Layout>
                            <Layout style={styles.budgetAmounts}>
                                <Layout style={styles.budgetItem}>
                                    <Text category='h5' style={styles.spentAmount}>
                                        {formatCurrency(currentMonthData.totalSpent)}
                                    </Text>
                                    <Text category='c1' appearance='hint'>Your Share</Text>
                                </Layout>
                                <Layout style={styles.budgetDivider} />
                                <Layout style={styles.budgetItem}>
                                    <Text category='h5' style={[styles.remainingAmount, { color: budgetRemaining >= 0 ? '#4CAF50' : '#F44336' }]}>
                                        {formatCurrency(Math.abs(budgetRemaining))}
                                    </Text>
                                    <Text category='c1' appearance='hint'>
                                        {budgetRemaining >= 0 ? 'Remaining' : 'Over Budget'}
                                    </Text>
                                </Layout>
                            </Layout>

                            {/* Budget Progress Bar */}
                            <Layout style={styles.progressContainer}>
                                <Layout style={styles.progressBar}>
                                    <Layout
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${Math.min(budgetPercentUsed, 100)}%`,
                                                backgroundColor: budgetStatusInfo.color
                                            }
                                        ]}
                                    />
                                </Layout>
                                <Text category='c1' style={[styles.budgetStatus, { color: budgetStatusInfo.color }]}>
                                    {budgetStatusInfo.status} ({budgetPercentUsed.toFixed(0)}%)
                                </Text>
                            </Layout>

                            <Text category='c1' appearance='hint' style={styles.budgetTotal}>
                                Budget: {formatCurrency(budgetAmount_profile)}
                            </Text>
                        </Layout>
                    ) : (
                        <Layout style={styles.noBudgetContainer}>
                            <Ionicons name="wallet-outline" size={48} color="#8F9BB3" style={styles.noBudgetIcon} />
                            <Text category='s1' appearance='hint' style={styles.noBudgetText}>
                                Set a monthly budget to track your spending
                            </Text>
                            <Button
                                style={styles.setBudgetButton}
                                size='medium'
                                onPress={() => setBudgetModalVisible(true)}
                            >
                                Set Budget
                            </Button>
                        </Layout>
                    )}
                </Card>

                {/* Quick Actions */}
                <Layout style={styles.actionsContainer}>
                    <Button
                        style={styles.primaryAction}
                        size='large'
                        accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                        onPress={handleAddExpense}
                    >
                        Add Expense
                    </Button>

                    <Button
                        style={styles.secondaryAction}
                        appearance='outline'
                        size='large'
                        accessoryLeft={(props) => <Ionicons name="people-outline" size={20} color={props?.tintColor || '#3366FF'} />}
                        onPress={handleViewGroups}
                    >
                        Manage Groups
                    </Button>
                </Layout>
            </ScrollView>

            {/* Budget Modal */}
            <Modal
                visible={budgetModalVisible}
                backdropStyle={styles.backdrop}
                onBackdropPress={() => setBudgetModalVisible(false)}
            >
                <Card disabled={true} style={styles.modalCard}>
                    <Text category='h6' style={styles.modalTitle}>Set Monthly Budget</Text>
                    <Text category='s1' appearance='hint' style={styles.modalDescription}>
                        Set your monthly spending limit to track your expenses better.
                    </Text>

                    <Input
                        style={styles.modalInput}
                        label='Budget Amount'
                        placeholder='Enter amount'
                        value={budgetAmount}
                        onChangeText={setBudgetAmount}
                        keyboardType='decimal-pad'
                    />
                    <Layout style={styles.modalActions}>
                        <Button
                            style={styles.modalButton}
                            appearance='outline'
                            onPress={() => {
                                setBudgetModalVisible(false);
                                setBudgetAmount('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            style={styles.modalButton}
                            onPress={handleSetBudget}
                            disabled={savingBudget}
                            accessoryLeft={savingBudget ? () => <Spinner size='small' status='control' /> : undefined}
                        >
                            {savingBudget ? 'Saving...' : 'Set Budget'}
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
        backgroundColor: '#FAFAFA',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    budgetCard: {
        marginBottom: 16,
        padding: 20,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    budgetAmounts: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    budgetItem: {
        alignItems: 'center',
        flex: 1,
    },
    budgetDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E4E9F2',
        marginHorizontal: 16,
    },
    spentAmount: {
        color: '#FF6B6B',
        marginBottom: 4,
    },
    remainingAmount: {
        marginBottom: 4,
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#E4E9F2',
        borderRadius: 4,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    budgetStatus: {
        textAlign: 'center',
        fontWeight: '500',
    },
    budgetTotal: {
        textAlign: 'center',
    },
    noBudgetContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    noBudgetIcon: {
        marginBottom: 12,
    },
    noBudgetText: {
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    setBudgetButton: {
        paddingHorizontal: 24,
    },
    statsContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
    },
    statContent: {
        alignItems: 'center',
    },
    statNumber: {
        marginVertical: 8,
        textAlign: 'center',
    },
    balancesCard: {
        marginBottom: 16,
        padding: 20,
    },
    balancesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    balanceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    balanceInfo: {
        flex: 1,
    },
    balanceAmount: {
        alignItems: 'flex-end',
    },
    balanceText: {
        fontWeight: '600',
        fontSize: 16,
    },
    balanceStatus: {
        fontSize: 12,
        marginTop: 2,
    },
    activityCard: {
        marginBottom: 16,
        padding: 20,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    viewAllText: {
        color: '#3366FF',
        fontWeight: '500',
    },
    groupItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        marginBottom: 2,
        fontWeight: '500',
    },
    groupTotal: {
        fontWeight: '600',
        color: '#2E7D32',
    },
    noActivityContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    actionsContainer: {
        gap: 12,
        marginBottom: 32,
    },
    primaryAction: {
        // Default styling
    },
    secondaryAction: {
        // Default styling
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalCard: {
        minWidth: 320,
    },
    modalTitle: {
        marginBottom: 8,
    },
    modalDescription: {
        marginBottom: 16,
        lineHeight: 20,
    },
    modalInput: {
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    groupsButton: {
        padding: 8,
        marginRight: 8,
    },
    refreshButton: {
        padding: 8,
    },
});
