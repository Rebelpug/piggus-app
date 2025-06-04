import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
    Layout,
    Text,
    TopNavigation,
    TopNavigationAction,
    Divider,
    Card,
    Button
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useExpense } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import { ExpenseWithDecryptedData, calculateUserShare } from '@/types/expense';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, CURRENCIES } from '@/types/expense';

export default function ExpenseDetailScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { expenseId, groupId } = useLocalSearchParams<{ expenseId: string, groupId: string }>();
    const { expensesGroups, deleteExpense } = useExpense();
    const [expense, setExpense] = useState<ExpenseWithDecryptedData | null>(null);
    const [groupName, setGroupName] = useState<string>('');
    const [groupMembers, setGroupMembers] = useState<any[]>([]);

    useEffect(() => {
        if (!expenseId || !groupId || !expensesGroups) return;

        const group = expensesGroups.find(g => g.id === groupId);
        if (!group) return;

        setGroupName(group.data?.name || 'Unknown Group');
        setGroupMembers(group.members || []);

        const foundExpense = group.expenses.find(e => e.id === expenseId);
        if (foundExpense) {
            setExpense(foundExpense);
        }
    }, [expenseId, groupId, expensesGroups]);

    const navigateBack = () => {
        router.back();
    };

    const handleEdit = () => {
        // Navigate to edit expense screen (to be implemented)
        Alert.alert('Edit', 'Edit functionality to be implemented');
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Expense',
            'Are you sure you want to delete this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!groupId || !expenseId) return;

                            await deleteExpense(groupId, expenseId);
                            Alert.alert('Success', 'Expense deleted successfully');
                            router.back();
                        } catch (error) {
                            console.error('Failed to delete expense:', error);
                            Alert.alert('Error', 'Failed to delete expense. Please try again.');
                        }
                    }
                },
            ]
        );
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
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    const getCategoryLabel = (categoryValue: string) => {
        const category = EXPENSE_CATEGORIES.find(cat => cat.value === categoryValue);
        return category ? category.label : 'Other';
    };

    const getPaymentMethodLabel = (methodValue: string) => {
        const method = PAYMENT_METHODS.find(m => m.value === methodValue);
        return method ? method.label : methodValue;
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

    const BackIcon = (props: any) => (
        <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
    );

    const BackAction = () => (
        <TopNavigationAction icon={BackIcon} onPress={navigateBack} />
    );

    if (!expense) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title="Expense Details"
                    alignment="center"
                    accessoryLeft={BackAction}
                />
                <Divider />
                <Layout style={styles.loadingContainer}>
                    <Text>Loading expense details...</Text>
                </Layout>
            </SafeAreaView>
        );
    }

    const userShare = calculateUserShare(expense, user?.id || '');
    const isPayer = expense.data.payer_user_id === user?.id;
    const isSharedExpense = expense.data.participants.length > 1;
    const payerMember = groupMembers.find(member => member.user_id === expense.data.payer_user_id);

    return (
        <SafeAreaView style={styles.container}>
            <TopNavigation
                title="Expense Details"
                alignment="center"
                accessoryLeft={BackAction}
            />
            <Divider />
            <ScrollView style={styles.scrollView}>
                <Card style={styles.card}>
                    <Layout style={styles.headerContainer}>
                        <Layout style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(expense.data.category) }]} />
                        <Text category="h5" style={styles.expenseName}>{expense.data.name}</Text>
                    </Layout>

                    <Text category="h3" style={styles.amount}>
                        {formatCurrency(expense.data.amount, expense.data.currency)}
                    </Text>

                    {/* User's Share Section */}
                    {isSharedExpense && (
                        <Card style={styles.shareCard}>
                            <Text category="h6" style={styles.shareTitle}>Your Share</Text>
                            <Layout style={styles.shareInfo}>
                                <Text category="h4" style={[styles.userShareAmount, { color: isPayer ? '#4CAF50' : '#2E7D32' }]}>
                                    {formatCurrency(userShare, expense.data.currency)}
                                </Text>
                                {isPayer && (
                                    <Layout style={styles.payerBadge}>
                                        <Ionicons name="card-outline" size={16} color="#4CAF50" />
                                        <Text style={styles.payerText}>You paid this expense</Text>
                                    </Layout>
                                )}
                            </Layout>
                        </Card>
                    )}

                    <Layout style={styles.detailRow}>
                        <Text appearance="hint">Category:</Text>
                        <Text>{getCategoryLabel(expense.data.category)}</Text>
                    </Layout>

                    <Layout style={styles.detailRow}>
                        <Text appearance="hint">Date:</Text>
                        <Text>{formatDate(expense.data.date)}</Text>
                    </Layout>

                    <Layout style={styles.detailRow}>
                        <Text appearance="hint">Group:</Text>
                        <Text>{groupName}</Text>
                    </Layout>

                    <Layout style={styles.detailRow}>
                        <Text appearance="hint">Paid by:</Text>
                        <Text>
                            {payerMember?.username || expense.data.payer_username || 'Unknown'}
                            {isPayer && ' (You)'}
                        </Text>
                    </Layout>

                    {expense.data.payment_method && (
                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Payment Method:</Text>
                            <Text>{getPaymentMethodLabel(expense.data.payment_method)}</Text>
                        </Layout>
                    )}

                    <Layout style={styles.detailRow}>
                        <Text appearance="hint">Split Method:</Text>
                        <Text style={styles.splitMethodText}>
                            {expense.data.split_method === 'equal' ? 'Split Equally' :
                                expense.data.split_method === 'custom' ? 'Custom Amounts' :
                                    expense.data.split_method === 'percentage' ? 'By Percentage' :
                                        'Equal Split'}
                        </Text>
                    </Layout>

                    {expense.data.is_recurring && (
                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Recurring:</Text>
                            <Text>
                                {expense.data.recurring_interval || 'Monthly'}
                                {expense.data.recurring_end_date ? ` until ${formatDate(expense.data.recurring_end_date)}` : ''}
                            </Text>
                        </Layout>
                    )}

                    {expense.data.status && (
                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Status:</Text>
                            <Text style={styles.statusText}>{expense.data.status}</Text>
                        </Layout>
                    )}

                    {expense.data.tags && expense.data.tags.length > 0 && (
                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Tags:</Text>
                            <Text>{expense.data.tags.join(', ')}</Text>
                        </Layout>
                    )}

                    {expense.data.description && (
                        <Layout style={styles.descriptionContainer}>
                            <Text appearance="hint" style={styles.descriptionLabel}>Description:</Text>
                            <Text style={styles.description}>{expense.data.description}</Text>
                        </Layout>
                    )}
                </Card>

                {/* Participants Section */}
                {isSharedExpense && (
                    <Card style={styles.card}>
                        <Text category="h6" style={styles.participantsTitle}>
                            Shared with ({expense.data.participants.length} participants)
                        </Text>
                        {expense.data.participants.map((participant, index) => {
                            const member = groupMembers.find(m => m.user_id === participant.user_id);
                            const isCurrentUser = participant.user_id === user?.id;

                            return (
                                <Layout key={participant.user_id} style={styles.participantRow}>
                                    <Layout style={styles.participantInfo}>
                                        <Text category="s1" style={styles.participantName}>
                                            {member?.username || participant.username || 'Unknown User'}
                                            {isCurrentUser && ' (You)'}
                                        </Text>
                                    </Layout>
                                    <Text category="s1" style={[styles.participantShare, { color: isCurrentUser ? '#2E7D32' : '#666' }]}>
                                        {formatCurrency(participant.share_amount, expense.data.currency)}
                                    </Text>
                                </Layout>
                            );
                        })}

                        <Layout style={styles.totalShareRow}>
                            <Text category="s1" style={styles.totalShareLabel}>Total:</Text>
                            <Text category="s1" style={styles.totalShareAmount}>
                                {formatCurrency(
                                    expense.data.participants.reduce((sum, p) => sum + p.share_amount, 0),
                                    expense.data.currency
                                )}
                            </Text>
                        </Layout>
                    </Card>
                )}

                {/* Metadata */}
                <Card style={styles.card}>
                    <Layout style={styles.metaContainer}>
                        <Text appearance="hint" category="c1">Created: {new Date(expense.created_at).toLocaleString()}</Text>
                        <Text appearance="hint" category="c1">Last updated: {new Date(expense.updated_at).toLocaleString()}</Text>
                    </Layout>
                </Card>

                <Layout style={styles.actionsContainer}>
                    <Button
                        style={styles.editButton}
                        status="info"
                        onPress={handleEdit}
                        accessoryLeft={(props) => <Ionicons name="pencil" size={20} color={props?.tintColor || '#FFFFFF'} />}
                    >
                        Edit
                    </Button>
                    <Button
                        style={styles.deleteButton}
                        status="danger"
                        onPress={handleDelete}
                        accessoryLeft={(props) => <Ionicons name="trash" size={20} color={props?.tintColor || '#FFFFFF'} />}
                    >
                        Delete
                    </Button>
                </Layout>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        margin: 16,
        marginBottom: 0,
        borderRadius: 8,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 12,
    },
    expenseName: {
        flex: 1,
    },
    amount: {
        marginBottom: 24,
        color: '#2E7D32',
        textAlign: 'center',
    },
    shareCard: {
        backgroundColor: '#F8F9FA',
        marginBottom: 16,
        padding: 16,
    },
    shareTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    shareInfo: {
        alignItems: 'center',
    },
    userShareAmount: {
        marginBottom: 8,
    },
    payerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    payerText: {
        color: '#4CAF50',
        marginLeft: 4,
        fontSize: 12,
        fontWeight: '500',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    splitMethodText: {
        textTransform: 'capitalize',
    },
    statusText: {
        textTransform: 'capitalize',
        color: '#4CAF50',
    },
    descriptionContainer: {
        marginTop: 16,
    },
    descriptionLabel: {
        marginBottom: 8,
    },
    description: {
        lineHeight: 20,
    },
    participantsTitle: {
        marginBottom: 16,
    },
    participantRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontWeight: '500',
    },
    participantShare: {
        fontWeight: '600',
        fontSize: 16,
    },
    totalShareRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 8,
        borderTopWidth: 2,
        borderTopColor: '#E0E0E0',
    },
    totalShareLabel: {
        fontWeight: '600',
    },
    totalShareAmount: {
        fontWeight: '700',
        color: '#2E7D32',
        fontSize: 16,
    },
    metaContainer: {
        paddingVertical: 16,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    editButton: {
        flex: 1,
        marginRight: 8,
    },
    deleteButton: {
        flex: 1,
        marginLeft: 8,
    },
});
