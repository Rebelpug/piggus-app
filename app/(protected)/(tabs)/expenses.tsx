import React, { useState } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import {
    Layout,
    Text,
    Card,
    Button,
    Spinner,
    TopNavigation,
    List,
    ListItem,
    Divider
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { ExpenseWithDecryptedData } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';

export default function ExpensesScreen() {
    const router = useRouter();
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

                return group.expenses.map(expense => ({
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
    }, [expensesGroups]);

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
            return `$${amount.toFixed(2)}`;
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

    const renderExpenseItem = ({ item }: { item: ExpenseWithDecryptedData & { groupName?: string } }) => {
        if (!item || !item.data) {
            return null;
        }

        return (
            <ListItem
                title={item.data.name || 'Unnamed Expense'}
                description={`${item.groupName || 'Unknown Group'} • ${formatDate(item.data.date)}`}
                accessoryLeft={() => (
                    <Layout style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(item.data.category) }]} />
                )}
                accessoryRight={() => (
                    <Layout style={styles.amountContainer}>
                        <Text category='s1' style={styles.amount}>
                            {formatCurrency(item.data.amount || 0, item.data.currency)}
                        </Text>
                        <Text category='c1' appearance='hint' style={styles.category}>
                            {item.data.category || 'other'}
                        </Text>
                    </Layout>
                )}
                onPress={() => {
                    Alert.alert(
                        'Expense Details',
                        `${item.data.name || 'Unnamed'}\n${item.data.description || 'No description'}`
                    );
                }}
            />
        );
    };

    const renderHeader = () => {
        const totalAmount = allExpenses.reduce((sum, expense) => {
            try {
                return sum + (expense.data?.amount || 0);
            } catch {
                return sum;
            }
        }, 0);

        return (
            <Layout style={styles.header}>
                <Layout style={styles.summaryCard}>
                    <Card style={styles.card}>
                        <Text category='h6' style={styles.summaryTitle}>Total Expenses</Text>
                        <Text category='h4' style={styles.summaryAmount}>
                            {formatCurrency(totalAmount)}
                        </Text>
                        <Text category='c1' appearance='hint'>
                            {allExpenses.length} transaction{allExpenses.length !== 1 ? 's' : ''}
                        </Text>
                    </Card>
                </Layout>
            </Layout>
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
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.style?.tintColor || '#FFFFFF'} />}
                onPress={handleAddExpense}
            >
                Add Expense
            </Button>
        </Layout>
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
                    accessoryRight={renderRightActions}
                />
                <Layout style={styles.loadingContainer}>
                    <Spinner size='large' />
                    <Text category='s1' style={styles.loadingText}>Loading expenses...</Text>
                </Layout>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title='Expenses'
                    alignment='center'
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
        <SafeAreaView style={styles.container}>
            <TopNavigation
                title='Expenses'
                alignment='center'
                accessoryRight={renderRightActions}
            />

            {allExpenses.length === 0 ? (
                renderEmptyState()
            ) : (
                <List
                    style={styles.list}
                    data={allExpenses}
                    renderItem={renderExpenseItem}
                    ItemSeparatorComponent={Divider}
                    ListHeaderComponent={renderHeader}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                />
            )}

            {allExpenses.length > 0 && (
                <Button
                    style={styles.fab}
                    accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.style?.tintColor || '#FFFFFF'} />}
                    onPress={handleAddExpense}
                    size='large'
                    status='primary'
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
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
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    summaryCard: {
        marginBottom: 16,
    },
    card: {
        padding: 16,
    },
    summaryTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    summaryAmount: {
        marginBottom: 4,
        textAlign: 'center',
        color: '#2E7D32',
    },
    list: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    categoryIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontWeight: '600',
        color: '#2E7D32',
    },
    category: {
        textTransform: 'capitalize',
        marginTop: 2,
    },
    fab: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        borderRadius: 28,
        elevation: 8,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
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
