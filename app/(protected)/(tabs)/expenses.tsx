import React, { useState } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity, View, FlatList } from 'react-native';
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

    const handleViewGroups = () => {
        router.push('/(protected)/groups');
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

    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: { [key: string]: string } = {
            food: '#FF6B6B',
            transportation: '#4ECDC4',
            housing: '#45B7D1',
            utilities: '#96CEB4',
            entertainment: '#FFEAA7',
            shopping: '#DDA0DD',
            health: '#98D8C8',
            education: '#A8E6CF',
            personal: '#FFB6C1',
            travel: '#87CEEB',
            other: '#D3D3D3',
        };
        return colors[category] || colors.other;
    };

    const getCategoryInfo = (categoryId: string) => {
        const categoryInfo = getCategoryDisplayInfo(categoryId, userProfile?.profile?.budgeting?.categoryOverrides);
        return categoryInfo;
    };

    const getCategoryIcon = (category: string) => {
        const categoryInfo = getCategoryInfo(category);
        // For now, return a default icon since we're using emojis in the new system
        return 'pricetag-outline';
    };

    const renderExpenseItem = ({ item }: { item: ExpenseWithDecryptedData & { groupName?: string } }) => {
        if (!item || !item.data) {
            return null;
        }

        const userShare = calculateUserShare(item, user?.id || '');
        const totalAmount = item.data.amount || 0;
        const isPayer = item.data.payer_user_id === user?.id;
        const isSharedExpense = item.data.participants.length > 1;

        return (
            <TouchableOpacity
                style={[styles.expenseCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
                onPress={() => {
                    router.push({
                        pathname: '/(protected)/expense-detail',
                        params: {
                            expenseId: item.id,
                            groupId: item.group_id
                        }
                    });
                }}
            >
                <View style={styles.expenseCardContent}>
                    <View style={styles.expenseHeader}>
                        <View style={styles.expenseMainInfo}>
                            <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.data.category) + '20' }]}>
                                <Text style={styles.categoryEmoji}>
                                    {getCategoryInfo(item.data.category).icon}
                                </Text>
                            </View>
                            <View style={styles.expenseDetails}>
                                <Text style={[styles.expenseTitle, { color: colors.text }]}>
                                    {item.data.name || 'Unnamed Expense'}
                                </Text>
                                <Text style={[styles.expenseSubtitle, { color: colors.icon }]}>
                                    {item.groupName || 'Unknown Group'} • {formatDate(item.data.date)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.expenseAmount}>
                            <Text style={[styles.amountText, { color: colors.text }]}>
                                {formatCurrency(userShare, item.data.currency)}
                            </Text>
                            {isSharedExpense && (
                                <Text style={[styles.totalAmountText, { color: colors.icon }]}>
                                    of {formatCurrency(totalAmount, item.data.currency)}
                                </Text>
                            )}
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    router.push({
                                        pathname: '/(protected)/edit-expense',
                                        params: {
                                            expenseId: item.id,
                                            groupId: item.group_id
                                        }
                                    });
                                }}
                            >
                                <Ionicons name="pencil-outline" size={18} color={colors.icon} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <View style={styles.expenseFooter}>
                        <View style={styles.expenseCategory}>
                            <Text style={[styles.categoryText, { color: colors.icon }]}>
                                {(() => {
                                    const categoryInfo = getCategoryInfo(item.data.category || 'other');
                                    return `${categoryInfo.icon} ${categoryInfo.name}${categoryInfo.isDeleted ? ' (Deleted)' : ''}`;
                                })()}
                            </Text>
                        </View>
                        {isPayer && (
                            <View style={[styles.payerBadge, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.payerText, { color: colors.primary }]}>
                                    You paid
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderRecurringExpenseItem = ({ item }: { item: RecurringExpenseWithDecryptedData & { groupName?: string } }) => {
        if (!item || !item.data) {
            return null;
        }

        const userShare = item.data.participants.find(p => p.user_id === user?.id)?.share_amount || 0;
        const totalAmount = item.data.amount || 0;
        const isPayer = item.data.payer_user_id === user?.id;
        const isSharedExpense = item.data.participants.length > 1;

        const getIntervalDisplay = (interval: string) => {
            const intervalMap = {
                daily: 'Daily',
                weekly: 'Weekly', 
                monthly: 'Monthly',
                yearly: 'Yearly'
            };
            return intervalMap[interval as keyof typeof intervalMap] || interval;
        };

        const formatNextDueDate = (dateString: string) => {
            try {
                const date = new Date(dateString);
                const today = new Date();
                const diffTime = date.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) {
                    return 'Overdue';
                } else if (diffDays === 0) {
                    return 'Due today';
                } else if (diffDays === 1) {
                    return 'Due tomorrow';
                } else if (diffDays <= 7) {
                    return `Due in ${diffDays} days`;
                } else {
                    return formatDate(dateString);
                }
            } catch {
                return dateString;
            }
        };

        return (
            <TouchableOpacity
                style={[styles.expenseCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
                onPress={() => {
                    // TODO: Navigate to recurring expense detail screen
                    Alert.alert('Recurring Expense', `${item.data.name}\n${getIntervalDisplay(item.data.interval)} - ${formatCurrency(userShare, item.data.currency)}`);
                }}
            >
                <View style={styles.expenseCardContent}>
                    <View style={styles.expenseHeader}>
                        <View style={styles.expenseMainInfo}>
                            <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.data.category) + '20' }]}>
                                <Text style={styles.categoryEmoji}>
                                    {getCategoryInfo(item.data.category).icon}
                                </Text>
                                <View style={[styles.recurringBadge, { backgroundColor: colors.primary }]}>
                                    <Ionicons name="repeat" size={10} color="white" />
                                </View>
                            </View>
                            <View style={styles.expenseDetails}>
                                <Text style={[styles.expenseTitle, { color: colors.text }]}>
                                    {item.data.name || 'Unnamed Recurring Expense'}
                                </Text>
                                <Text style={[styles.expenseSubtitle, { color: colors.icon }]}>
                                    {item.groupName || 'Unknown Group'} • {getIntervalDisplay(item.data.interval)}
                                </Text>
                                <Text style={[styles.nextDueText, { color: item.data.is_active ? colors.primary : colors.icon }]}>
                                    {item.data.is_active ? formatNextDueDate(item.data.next_due_date) : 'Inactive'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.expenseAmount}>
                            <Text style={[styles.amountText, { color: colors.text }]}>
                                {formatCurrency(userShare, item.data.currency)}
                            </Text>
                            {isSharedExpense && (
                                <Text style={[styles.totalAmountText, { color: colors.icon }]}>
                                    of {formatCurrency(totalAmount, item.data.currency)}
                                </Text>
                            )}
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    // TODO: Navigate to edit recurring expense screen
                                    Alert.alert('Edit Recurring Expense', 'Feature coming soon!');
                                }}
                            >
                                <Ionicons name="pencil-outline" size={18} color={colors.icon} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    
                    <View style={styles.expenseFooter}>
                        <View style={styles.expenseCategory}>
                            <Text style={[styles.categoryText, { color: colors.icon }]}>
                                {(() => {
                                    const categoryInfo = getCategoryInfo(item.data.category || 'other');
                                    return `${categoryInfo.icon} ${categoryInfo.name}${categoryInfo.isDeleted ? ' (Deleted)' : ''}`;
                                })()}
                            </Text>
                        </View>
                        {isPayer && (
                            <View style={[styles.payerBadge, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.payerText, { color: colors.primary }]}>
                                    You pay
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderExpensesHeader = () => {
        const totalUserSpent = allExpenses.reduce((sum, expense) => {
            try {
                const userShare = calculateUserShare(expense, user?.id || '');
                return sum + userShare;
            } catch {
                return sum;
            }
        }, 0);

        return (
            <View style={styles.header}>
                <View style={[styles.summaryCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>Total Expenses</Text>
                    <Text style={[styles.summaryAmount, { color: colors.primary }]}>
                        {formatCurrency(totalUserSpent)}
                    </Text>
                    <Text style={[styles.summarySubtitle, { color: colors.icon }]}>
                        {allExpenses.length} transaction{allExpenses.length !== 1 ? 's' : ''} you're part of
                    </Text>
                </View>
            </View>
        );
    };

    const renderRecurringHeader = () => {
        const totalRecurringAmount = allRecurringExpenses.reduce((sum, recurringExpense) => {
            try {
                const userShare = recurringExpense.data.participants.find(p => p.user_id === user?.id)?.share_amount || 0;
                return sum + userShare;
            } catch {
                return sum;
            }
        }, 0);

        const activeRecurringCount = allRecurringExpenses.filter(item => item.data.is_active).length;

        return (
            <View style={styles.header}>
                <View style={[styles.summaryCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>Recurring Expenses</Text>
                    <Text style={[styles.summaryAmount, { color: colors.primary }]}>
                        {formatCurrency(totalRecurringAmount)}
                    </Text>
                    <Text style={[styles.summarySubtitle, { color: colors.icon }]}>
                        {activeRecurringCount} active • {allRecurringExpenses.length} total
                    </Text>
                </View>
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
                    title='Expenses'
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                    accessoryRight={renderRightActions}
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
                    accessoryRight={renderRightActions}
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
            {allExpenses.length === 0 ? (
                renderExpensesEmptyState()
            ) : (
                <FlatList
                    style={styles.list}
                    data={allExpenses}
                    renderItem={renderExpenseItem}
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
                accessoryRight={renderRightActions}
                style={{ backgroundColor: colors.background }}
            />

            <TabView
                selectedIndex={selectedIndex}
                onSelect={index => setSelectedIndex(index)}
                style={styles.tabView}
            >
                <Tab 
                    title={`Expenses (${allExpenses.length})`}
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
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    summaryCard: {
        padding: 24,
        borderRadius: 20,
        marginBottom: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    summaryAmount: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    summarySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 100,
    },
    expenseCard: {
        marginHorizontal: 20,
        marginVertical: 6,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    expenseCardContent: {
        padding: 16,
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    expenseMainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    categoryEmoji: {
        fontSize: 20,
    },
    expenseDetails: {
        flex: 1,
    },
    expenseTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    expenseSubtitle: {
        fontSize: 14,
    },
    expenseAmount: {
        alignItems: 'flex-end',
        position: 'relative',
    },
    editButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        padding: 8,
        borderRadius: 16,
    },
    amountText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    totalAmountText: {
        fontSize: 12,
    },
    expenseFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    expenseCategory: {
        flex: 1,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    payerBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    payerText: {
        fontSize: 12,
        fontWeight: '600',
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
    tabView: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
    },
    recurringBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextDueText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
});
