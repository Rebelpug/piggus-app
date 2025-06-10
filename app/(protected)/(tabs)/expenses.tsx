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
    Divider
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import { ExpenseWithDecryptedData, calculateUserShare } from '@/types/expense';
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
    const { expensesGroups, isLoading, error } = useExpense();
    const [refreshing, setRefreshing] = useState(false);

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

    const getCategoryIcon = (category: string) => {
        const icons: { [key: string]: string } = {
            food: 'restaurant-outline',
            transportation: 'car-outline',
            housing: 'home-outline',
            utilities: 'flash-outline',
            entertainment: 'game-controller-outline',
            shopping: 'bag-outline',
            health: 'medical-outline',
            education: 'book-outline',
            personal: 'person-outline',
            travel: 'airplane-outline',
            other: 'ellipsis-horizontal-outline',
        };
        return icons[category] || icons.other;
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
                                <Ionicons 
                                    name={getCategoryIcon(item.data.category)} 
                                    size={20} 
                                    color={getCategoryColor(item.data.category)} 
                                />
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
                        </View>
                    </View>
                    
                    <View style={styles.expenseFooter}>
                        <View style={styles.expenseCategory}>
                            <Text style={[styles.categoryText, { color: colors.icon }]}>
                                {item.data.category || 'other'}
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

    const renderHeader = () => {
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

    const renderEmptyState = () => (
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

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title='Expenses'
                alignment='center'
                accessoryLeft={renderLeftActions}
                accessoryRight={renderRightActions}
                style={{ backgroundColor: colors.background }}
            />

            {allExpenses.length === 0 ? (
                renderEmptyState()
            ) : (
                <FlatList
                    style={styles.list}
                    data={allExpenses}
                    renderItem={renderExpenseItem}
                    ListHeaderComponent={renderHeader}
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

            {allExpenses.length > 0 && (
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
});
