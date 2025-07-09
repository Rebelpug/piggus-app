import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, View } from 'react-native';
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
import { useProfile } from '@/context/ProfileContext';
import { ExpenseWithDecryptedData, calculateUserShare, getCategoryDisplayInfo } from '@/types/expense';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function ExpenseDetailScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { expenseId, groupId } = useLocalSearchParams<{ expenseId: string, groupId: string }>();
    const { expensesGroups, deleteExpense } = useExpense();
    const { userProfile } = useProfile();
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
        router.push({
            pathname: '/(protected)/edit-expense',
            params: {
                expenseId: expenseId,
                groupId: groupId
            }
        });
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
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    const getCategoryInfo = (categoryId: string) => {
        return getCategoryDisplayInfo(categoryId, userProfile?.profile?.budgeting?.categoryOverrides);
    };

    const getUsernameFromId = (userId: string) => {
        const member = groupMembers.find(m => m.user_id === userId);
        return member ? member.username : 'Unknown User';
    };

    const userShare = expense?.data.participants.find(p => p.user_id === user?.id)?.share_amount || 0;
    const isPayer = expense?.data.payer_user_id === user?.id;

    const renderBackAction = () => (
        <TopNavigationAction
            icon={(props) => <Ionicons name="arrow-back" size={24} color={colors.text} />}
            onPress={navigateBack}
        />
    );

    const renderEditAction = () => (
        <TopNavigationAction
            icon={(props) => <Ionicons name="pencil-outline" size={24} color={colors.text} />}
            onPress={handleEdit}
        />
    );

    if (!expense) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <TopNavigation
                    title='Expense Details'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    style={{ backgroundColor: colors.background }}
                />
                <Layout style={styles.loadingContainer}>
                    <Text category='h6'>Expense not found</Text>
                </Layout>
            </SafeAreaView>
        );
    }

    const categoryInfo = getCategoryInfo(expense.data.category);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title='Expense Details'
                alignment='center'
                accessoryLeft={renderBackAction}
                accessoryRight={renderEditAction}
                style={{ backgroundColor: colors.background }}
            />
            <Divider />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <ThemedView style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                    {/* Header Card */}
                    <Card style={[styles.headerCard, { backgroundColor: colors.card }]}>
                        <View style={styles.headerContent}>
                            <View style={styles.headerLeft}>
                                <Text style={[styles.expenseTitle, { color: colors.text }]}>
                                    {expense.data.name}
                                </Text>
                                <Text style={[styles.groupName, { color: colors.icon }]}>
                                    {groupName} • {formatDate(expense.data.date)}
                                </Text>
                                {expense.data.is_recurring && (
                                    <View style={styles.statusBadge}>
                                        <View style={[
                                            styles.statusIndicator,
                                            { backgroundColor: colors.primary }
                                        ]} />
                                        <Text style={[styles.statusText, { color: colors.text }]}>
                                            Recurring Expense
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.headerRight}>
                                <Text style={[styles.amount, { color: colors.text }]}>
                                    {formatCurrency(userShare, expense.data.currency)}
                                </Text>
                                {expense.data.participants.length > 1 && (
                                    <Text style={[styles.totalAmount, { color: colors.icon }]}>
                                        of {formatCurrency(expense.data.amount, expense.data.currency)}
                                    </Text>
                                )}
                                {expense.data.is_recurring && (
                                    <View style={[styles.recurringBadge, { backgroundColor: colors.primary + '20' }]}>
                                        <Ionicons name="repeat" size={12} color={colors.primary} />
                                        <Text style={[styles.recurringText, { color: colors.primary }]}>
                                            Recurring
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </Card>

                    {/* Expense Details */}
                    <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Category:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {categoryInfo.icon} {categoryInfo.name}
                                {categoryInfo.isDeleted ? ' (Deleted)' : ''}
                            </Text>
                        </View>
                        {expense.data.description && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.icon }]}>Description:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {expense.data.description}
                                </Text>
                            </View>
                        )}
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Amount:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {formatCurrency(expense.data.amount, expense.data.currency)}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Date:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {formatDate(expense.data.date)}
                            </Text>
                        </View>
                        {groupMembers.length > 1 && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.icon }]}>Split Method:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {expense.data.split_method === 'equal' ? 'Split Equally' :
                                     expense.data.split_method === 'custom' ? 'Custom Amounts' : 'By Percentage'}
                                </Text>
                            </View>
                        )}
                    </Card>

                    {/* Participants - Only show if more than one group member */}
                    {groupMembers.length > 1 && (
                        <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Participants</Text>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.icon }]}>Paid by:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {getUsernameFromId(expense.data.payer_user_id)}
                                    {isPayer && ' (You)'}
                                </Text>
                            </View>
                            {expense.data.participants.map((participant, index) => (
                                <View key={participant.user_id} style={styles.participantRow}>
                                    <Text style={[styles.participantName, { color: colors.text }]}>
                                        {getUsernameFromId(participant.user_id)}
                                        {participant.user_id === user?.id && ' (You)'}
                                    </Text>
                                    <Text style={[styles.participantAmount, { color: colors.text }]}>
                                        {formatCurrency(participant.share_amount, expense.data.currency)}
                                    </Text>
                                </View>
                            ))}
                        </Card>
                    )}

                    {/* Single group member - show simplified payer info */}
                    {groupMembers.length >= 1 && (
                        <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment</Text>
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.icon }]}>Paid by:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {getUsernameFromId(expense.data.payer_user_id)}
                                    {isPayer && ' (You)'}
                                </Text>
                            </View>
                        </Card>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <Button
                            style={[styles.actionButton, styles.editButton]}
                            appearance='outline'
                            status='primary'
                            accessoryLeft={() => <Ionicons name="pencil-outline" size={20} color={colors.primary} />}
                            onPress={handleEdit}
                        >
                            Edit
                        </Button>
                        <Button
                            style={[styles.actionButton, styles.deleteButton]}
                            appearance='outline'
                            status='danger'
                            accessoryLeft={() => <Ionicons name="trash-outline" size={20} color={colors.error} />}
                            onPress={handleDelete}
                        >
                            Delete
                        </Button>
                    </View>
                </ThemedView>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    headerCard: {
        marginBottom: 16,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flex: 1,
        marginRight: 16,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    expenseTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    groupName: {
        fontSize: 14,
        marginBottom: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    amount: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    totalAmount: {
        fontSize: 12,
        marginBottom: 8,
    },
    recurringBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    recurringText: {
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 4,
    },
    detailCard: {
        marginBottom: 16,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        flex: 2,
        textAlign: 'right',
    },
    participantRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        marginBottom: 4,
    },
    participantName: {
        fontSize: 14,
        flex: 1,
    },
    participantAmount: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        marginBottom: 32,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
    },
    editButton: {},
    deleteButton: {},
});
