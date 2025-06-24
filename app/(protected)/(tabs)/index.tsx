import React, { useState, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, View, Dimensions } from 'react-native';
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
import { useInvestment } from '@/context/InvestmentContext';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, calculateUserShare, calculateUserBalance } from '@/types/expense';
import ProfileHeader from '@/components/ProfileHeader';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { expensesGroups, isLoading } = useExpense();
    const { userProfile, updateProfile } = useProfile();
    const { portfolios } = useInvestment();
    const [refreshing, setRefreshing] = useState(false);
    const [budgetModalVisible, setBudgetModalVisible] = useState(false);
    const [budgetAmount, setBudgetAmount] = useState(userProfile?.profile?.budgeting?.budget?.amount?.toString() || '0');
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

    // Calculate investment portfolio returns
    const portfolioReturns = useMemo(() => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        let totalInvested = 0;
        let currentValue = 0;
        let yearStartValue = 0;
        let hasCurrentPrices = false;

        // Only consider private portfolios (membership_status === 'confirmed' and private === true)
        const privatePortfolios = portfolios.filter(p => p.membership_status === 'confirmed' && p.data.private === true);
        
        privatePortfolios.forEach(portfolio => {
            portfolio.investments.forEach(investment => {
                const purchasePrice = investment.data.purchase_price;
                const quantity = investment.data.quantity;
                const currentPrice = investment.data.current_price;
                const purchaseDate = new Date(investment.data.purchase_date);
                
                totalInvested += purchasePrice * quantity;
                
                if (currentPrice !== null && currentPrice > 0) {
                    currentValue += currentPrice * quantity;
                    hasCurrentPrices = true;
                    
                    // For year-to-date calculation, use purchase price if bought this year, otherwise use current price
                    if (purchaseDate >= startOfYear) {
                        yearStartValue += purchasePrice * quantity;
                    } else {
                        yearStartValue += currentPrice * quantity; // Approximation - ideally we'd have historical prices
                    }
                } else {
                    // If no current price, use purchase price as fallback
                    currentValue += purchasePrice * quantity;
                    yearStartValue += purchasePrice * quantity;
                }
            });
        });

        const totalReturn = currentValue - totalInvested;
        const totalReturnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;
        
        const yearReturn = currentValue - yearStartValue;
        const yearReturnPercentage = yearStartValue > 0 ? (yearReturn / yearStartValue) * 100 : 0;

        return {
            currentValue,
            totalInvested,
            totalReturn,
            totalReturnPercentage,
            yearReturn,
            yearReturnPercentage,
            hasInvestments: privatePortfolios.some(p => p.investments.length > 0),
            hasCurrentPrices
        };
    }, [portfolios]);

    // Get budget information from profile
    const budget = userProfile?.profile?.budgeting?.budget;
    const budgetAmount_profile = budget?.amount || 0;
    const defaultCurrency = userProfile?.profile?.defaultCurrency || 'EUR';
    const budgetRemaining = budgetAmount_profile - currentMonthData.totalSpent;
    const budgetPercentUsed = budgetAmount_profile > 0 ? (currentMonthData.totalSpent / budgetAmount_profile) * 100 : 0;

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        // Simulate refresh - the expense context will handle actual refresh
        setTimeout(() => setRefreshing(false), 2000);
    }, []);


    const handleSetBudget = async () => {
        if (!budgetAmount.trim() || isNaN(Number(budgetAmount)) || Number(budgetAmount) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid budget amount');
            return;
        }

        setSavingBudget(true);
        try {
            const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
            await updateProfile({
                budgeting: {
                    budget: {
                        amount: Number(budgetAmount),
                        period: 'monthly'
                    }
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


    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title='Dashboard'
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                />
                <AuthSetupLoader />
            </SafeAreaView>
        );
    }

    const budgetStatusInfo = getBudgetStatus();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title='Dashboard'
                alignment='center'
                accessoryLeft={renderLeftActions}
                style={{ backgroundColor: colors.background }}
            />

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Welcome Section */}
                <View style={styles.welcomeSection}>
                    <Text style={[styles.welcomeText, { color: colors.text }]}>
                        Welcome back!
                    </Text>
                    <Text style={[styles.welcomeSubtext, { color: colors.icon }]}>
                        Here's your spending overview
                    </Text>
                </View>

                {/* Budget Overview Card */}
                <View style={[styles.budgetCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
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
                                    <Text style={[styles.budgetSpentLabel, { color: colors.icon }]}>Spent this month</Text>
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

                            <Text style={[styles.budgetTotal, { color: colors.icon }]}>
                                Total Budget: {formatCurrency(budgetAmount_profile)}
                            </Text>
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

                {/* Investment Portfolio Returns Card */}
                <View style={[styles.portfolioCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <View style={styles.portfolioHeader}>
                        <Text style={[styles.portfolioTitle, { color: colors.text }]}>Investment Portfolio</Text>
                        <TouchableOpacity onPress={() => router.push('/(protected)/(tabs)/investments')}>
                            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                        </TouchableOpacity>
                    </View>

                    {portfolioReturns.hasInvestments ? (
                        <View>
                            {/* Current Value */}
                            <View style={styles.portfolioMainValue}>
                                <Text style={[styles.portfolioValueAmount, { color: colors.text }]}>
                                    {formatCurrency(portfolioReturns.currentValue)}
                                </Text>
                                <Text style={[styles.portfolioValueLabel, { color: colors.icon }]}>
                                    Current Portfolio Value
                                </Text>
                            </View>

                            {/* Returns Summary */}
                            <View style={styles.portfolioReturnsContainer}>
                                {/* Total Returns */}
                                <View style={styles.portfolioReturn}>
                                    <View style={styles.portfolioReturnRow}>
                                        <Text style={[styles.portfolioReturnAmount, { 
                                            color: portfolioReturns.totalReturn >= 0 ? colors.success : colors.error 
                                        }]}>
                                            {portfolioReturns.totalReturn >= 0 ? '+' : ''}{formatCurrency(portfolioReturns.totalReturn)}
                                        </Text>
                                        <Text style={[styles.portfolioReturnPercentage, { 
                                            color: portfolioReturns.totalReturn >= 0 ? colors.success : colors.error 
                                        }]}>
                                            {portfolioReturns.totalReturnPercentage >= 0 ? '+' : ''}{portfolioReturns.totalReturnPercentage.toFixed(2)}%
                                        </Text>
                                    </View>
                                    <Text style={[styles.portfolioReturnLabel, { color: colors.icon }]}>
                                        Total Return
                                    </Text>
                                </View>

                                {/* Year to Date Returns */}
                                <View style={styles.portfolioReturn}>
                                    <View style={styles.portfolioReturnRow}>
                                        <Text style={[styles.portfolioReturnAmount, { 
                                            color: portfolioReturns.yearReturn >= 0 ? colors.success : colors.error 
                                        }]}>
                                            {portfolioReturns.yearReturn >= 0 ? '+' : ''}{formatCurrency(portfolioReturns.yearReturn)}
                                        </Text>
                                        <Text style={[styles.portfolioReturnPercentage, { 
                                            color: portfolioReturns.yearReturn >= 0 ? colors.success : colors.error 
                                        }]}>
                                            {portfolioReturns.yearReturnPercentage >= 0 ? '+' : ''}{portfolioReturns.yearReturnPercentage.toFixed(2)}%
                                        </Text>
                                    </View>
                                    <Text style={[styles.portfolioReturnLabel, { color: colors.icon }]}>
                                        This Year
                                    </Text>
                                </View>
                            </View>

                            {/* Total Invested */}
                            <Text style={[styles.portfolioTotalInvested, { color: colors.icon }]}>
                                Total Invested: {formatCurrency(portfolioReturns.totalInvested)}
                            </Text>

                            {!portfolioReturns.hasCurrentPrices && (
                                <Text style={[styles.portfolioDisclaimer, { color: colors.icon }]}>
                                    * Some investments lack current prices
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={styles.noPortfolioContainer}>
                            <View style={[styles.noPortfolioIcon, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="trending-up-outline" size={32} color={colors.primary} />
                            </View>
                            <Text style={[styles.noPortfolioText, { color: colors.text }]}>
                                Start investing
                            </Text>
                            <Text style={[styles.noPortfolioSubtext, { color: colors.icon }]}>
                                Create your first investment portfolio to track returns
                            </Text>
                            <TouchableOpacity
                                style={[styles.createPortfolioButton, { backgroundColor: colors.primary }]}
                                onPress={() => router.push('/(protected)/create-portfolio')}
                            >
                                <Text style={styles.createPortfolioButtonText}>Create Portfolio</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
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
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    welcomeSection: {
        paddingVertical: 20,
        paddingBottom: 16,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    welcomeSubtext: {
        fontSize: 16,
        fontWeight: '400',
    },
    budgetCard: {
        marginBottom: 24,
        padding: 24,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
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
        marginBottom: 16,
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
    portfolioCard: {
        marginBottom: 24,
        padding: 24,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    portfolioHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    portfolioTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    portfolioMainValue: {
        alignItems: 'center',
        marginBottom: 24,
    },
    portfolioValueAmount: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 4,
    },
    portfolioValueLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    portfolioReturnsContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 16,
    },
    portfolioReturn: {
        flex: 1,
        alignItems: 'center',
    },
    portfolioReturnRow: {
        alignItems: 'center',
        marginBottom: 4,
    },
    portfolioReturnAmount: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    portfolioReturnPercentage: {
        fontSize: 14,
        fontWeight: '600',
    },
    portfolioReturnLabel: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    portfolioTotalInvested: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
    },
    portfolioDisclaimer: {
        fontSize: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    noPortfolioContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    noPortfolioIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    noPortfolioText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    noPortfolioSubtext: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    createPortfolioButton: {
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
    },
    createPortfolioButtonText: {
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
