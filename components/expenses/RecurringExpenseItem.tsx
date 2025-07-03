import React from 'react';
import { StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { Text } from '@ui-kitten/components';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { RecurringExpenseWithDecryptedData, getCategoryDisplayInfo } from '@/types/expense';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface RecurringExpenseItemProps {
    item: RecurringExpenseWithDecryptedData & { groupName?: string };
}

export default function RecurringExpenseItem({ item }: RecurringExpenseItemProps) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { userProfile } = useProfile();

    if (!item || !item.data) {
        return null;
    }

    const userShare = item.data.participants.find(p => p.user_id === user?.id)?.share_amount || 0;
    const totalAmount = item.data.amount || 0;
    const isPayer = item.data.payer_user_id === user?.id;
    const isSharedExpense = item.data.participants.length > 1;

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
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                });
            }
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

    const handlePress = () => {
        router.push({
            pathname: '/(protected)/recurring-expense-detail',
            params: {
                recurringExpenseId: item.id,
                groupId: item.group_id
            }
        });
    };

    const handleEdit = (e: any) => {
        e.stopPropagation();
        router.push({
            pathname: '/(protected)/edit-recurring-expense',
            params: {
                recurringExpenseId: item.id,
                groupId: item.group_id
            }
        });
    };

    return (
        <TouchableOpacity
            style={[styles.expenseCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
            onPress={handlePress}
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
                            onPress={handleEdit}
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
}

const styles = StyleSheet.create({
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
        position: 'relative',
    },
    categoryEmoji: {
        fontSize: 20,
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
        marginBottom: 2,
    },
    nextDueText: {
        fontSize: 12,
        fontWeight: '500',
    },
    expenseAmount: {
        alignItems: 'flex-end',
        position: 'relative',
    },
    amountText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    totalAmountText: {
        fontSize: 12,
        marginBottom: 4,
    },
    editButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        padding: 8,
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
});