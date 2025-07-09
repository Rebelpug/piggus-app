import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { Text, Modal, Card, Input, Button, Spinner, Layout } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useExpense } from '@/context/ExpenseContext';
import { useProfile } from '@/context/ProfileContext';
import { useAuth } from '@/context/AuthContext';
import { calculateUserShare } from '@/types/expense';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

interface BudgetCardProps {
    selectedMonth?: string; // 'current' for default behavior, or specific month like '2025-05'
    variant?: 'default' | 'list'; // 'default' for index screen, 'list' for expenses screen
}

export default function BudgetCard({ selectedMonth = 'current', variant = 'default' }: BudgetCardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { expensesGroups } = useExpense();
    const { userProfile, updateProfile } = useProfile();
    const [budgetModalVisible, setBudgetModalVisible] = useState(false);
    const [budgetAmount, setBudgetAmount] = useState(userProfile?.profile?.budgeting?.budget?.amount?.toString() || '');
    const [savingBudget, setSavingBudget] = useState(false);

    // Update budget amount when userProfile changes
    useEffect(() => {
        setBudgetAmount(userProfile?.profile?.budgeting?.budget?.amount?.toString() || '');
    }, [userProfile?.profile?.budgeting?.budget?.amount]);

    // Calculate expenses for the selected period - only user's share
    const currentMonthData = useMemo(() => {
        const now = new Date();
        let totalSpent = 0;
        let transactionCount = 0;
        const categories: { [key: string]: number } = {};

        expensesGroups.forEach(group => {
            if (group.membership_status === 'confirmed') {
                group.expenses.forEach(expense => {
                    const expenseDate = new Date(expense.data.date);
                    let includeExpense = false;

                    if (selectedMonth === 'current') {
                        // Show only current month for budget calculations
                        includeExpense = expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
                    } else {
                        // Show specific month
                        const [year, month] = selectedMonth.split('-').map(Number);
                        includeExpense = expenseDate.getFullYear() === year && expenseDate.getMonth() + 1 === month;
                    }

                    if (includeExpense) {
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
    }, [expensesGroups, user?.id, selectedMonth]);

    // Get budget information from profile
    const budget = userProfile?.profile?.budgeting?.budget;
    const budgetAmount_profile = budget?.amount || 0;
    const defaultCurrency = userProfile?.profile?.defaultCurrency || 'EUR';
    const budgetRemaining = budgetAmount_profile - currentMonthData.totalSpent;
    const budgetPercentUsed = budgetAmount_profile > 0 ? (currentMonthData.totalSpent / budgetAmount_profile) * 100 : 0;

    const handleSetBudget = async () => {
        if (!budgetAmount.trim() || isNaN(Number(budgetAmount)) || Number(budgetAmount) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid budget amount');
            return;
        }

        setSavingBudget(true);
        try {
            await updateProfile({
                budgeting: {
                    budget: {
                        amount: Number(budgetAmount),
                        period: 'monthly'
                    }
                }
            });

            setBudgetModalVisible(false);
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

    const budgetStatusInfo = getBudgetStatus();

    return (
        <>
            <View style={[
                styles.budgetCard,
                variant === 'list' && styles.budgetCardList,
                { backgroundColor: colors.card, shadowColor: colors.text }
            ]}>
                <View style={styles.budgetHeader}>
                    <Text style={[styles.budgetTitle, { color: colors.text }]}>Monthly Budget</Text>
                    {budget ? (
                        <TouchableOpacity onPress={() => setBudgetModalVisible(true)}>
                            <Ionicons name="settings-outline" size={20} color={colors.icon} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {budget ? (
                    <View>
                        <View style={styles.budgetMainInfo}>
                            <View style={styles.budgetSpent}>
                                <Text style={[styles.budgetSpentAmount, { color: colors.error }]}>
                                    {formatCurrency(currentMonthData.totalSpent)}
                                </Text>
                                <Text style={[styles.budgetSpentLabel, { color: colors.icon }]}>
                                    {selectedMonth === 'current' ? 'Spending this month' : 'Spending this period'}
                                </Text>
                            </View>
                            <View style={styles.budgetRemaining}>
                                <Text style={[styles.budgetRemainingAmount, { color: budgetRemaining >= 0 ? colors.success : colors.error }]}>
                                    {formatCurrency(Math.abs(budgetRemaining))}
                                </Text>
                                <Text style={[styles.budgetRemainingLabel, { color: colors.icon }]}>
                                    {budgetRemaining >= 0 ? 'Remaining' : 'Over Budget'}
                                </Text>
                            </View>
                        </View>

                        {/* Modern Progress Bar */}
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${Math.min(budgetPercentUsed, 100)}%`,
                                            backgroundColor: budgetStatusInfo.color
                                        }
                                    ]}
                                />
                            </View>
                            <View style={styles.progressInfo}>
                                <Text style={[styles.budgetStatus, { color: budgetStatusInfo.color }]}>
                                    {budgetStatusInfo.status}
                                </Text>
                                <Text style={[styles.budgetPercentage, { color: colors.icon }]}>
                                    {budgetPercentUsed.toFixed(0)}%
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.noBudgetContainer}>
                        <View style={[styles.noBudgetIcon, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="wallet-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.noBudgetText, { color: colors.text }]}>
                            Set a monthly budget
                        </Text>
                        <Text style={[styles.noBudgetSubtext, { color: colors.icon }]}>
                            Track your spending and stay on budget
                        </Text>
                        <TouchableOpacity
                            style={[styles.setBudgetButton, { backgroundColor: colors.primary }]}
                            onPress={() => setBudgetModalVisible(true)}
                        >
                            <Text style={styles.setBudgetButtonText}>Set Budget</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

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
                                setBudgetAmount(userProfile?.profile?.budgeting?.budget?.amount?.toString() || '');
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
        </>
    );
}

const styles = StyleSheet.create({
    budgetCard: {
        marginBottom: 24,
        padding: 24,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    budgetCardList: {
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 16,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    budgetTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    budgetMainInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    budgetSpent: {
        flex: 1,
    },
    budgetSpentAmount: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    budgetSpentLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    budgetRemaining: {
        flex: 1,
        alignItems: 'flex-end',
    },
    budgetRemainingAmount: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    budgetRemainingLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    progressContainer: {
        marginBottom: 4,
    },
    progressTrack: {
        height: 8,
        borderRadius: 6,
        marginBottom: 12,
    },
    progressFill: {
        height: '100%',
        borderRadius: 6,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    budgetStatus: {
        fontSize: 14,
        fontWeight: '600',
    },
    budgetPercentage: {
        fontSize: 14,
        fontWeight: '500',
    },
    budgetTotal: {
        fontSize: 14,
        textAlign: 'center',
    },
    noBudgetContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    noBudgetIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    noBudgetText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    noBudgetSubtext: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    setBudgetButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
    setBudgetButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalCard: {
        minWidth: 320,
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    modalDescription: {
        marginBottom: 20,
        lineHeight: 22,
        fontSize: 14,
    },
    modalInput: {
        marginBottom: 20,
        borderRadius: 12,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        borderRadius: 12,
    },
});
