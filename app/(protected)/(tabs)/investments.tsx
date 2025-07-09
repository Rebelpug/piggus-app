import React, { useState } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity, View, FlatList, ScrollView } from 'react-native';
import {
    Layout,
    Text,
    Button,
    TopNavigation,
    Select,
    SelectItem,
    IndexPath
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInvestment } from '@/context/InvestmentContext';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { InvestmentWithDecryptedData } from '@/types/investment';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/ProfileHeader';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function InvestmentsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { portfolios, isLoading, error } = useInvestment();
    const { userProfile } = useProfile();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<IndexPath | undefined>();

    // Find the default personal portfolio (created by the current user or with single member)
    const personalPortfolio = React.useMemo(() => {
        if (!portfolios || portfolios.length === 0) return null;

        // Look for a portfolio with only the current user as member
        const singleMemberPortfolio = portfolios.find(portfolio =>
            portfolio.members && portfolio.members.length === 1 &&
            portfolio.members[0].user_id === user?.id
        );

        if (singleMemberPortfolio) return singleMemberPortfolio;

        // Fallback to first portfolio
        return portfolios[0];
    }, [portfolios, user?.id]);

    // Set default portfolio selection
    React.useEffect(() => {
        if (portfolios.length > 0 && selectedPortfolioIndex === undefined) {
            if (personalPortfolio) {
                const index = portfolios.findIndex(p => p.id === personalPortfolio.id);
                if (index >= 0) {
                    setSelectedPortfolioIndex(new IndexPath(index));
                }
            } else {
                setSelectedPortfolioIndex(new IndexPath(0));
            }
        }
    }, [portfolios, personalPortfolio, selectedPortfolioIndex]);

    // Get selected portfolio
    const selectedPortfolio = React.useMemo(() => {
        if (!selectedPortfolioIndex || !portfolios.length) return null;
        return portfolios[selectedPortfolioIndex.row];
    }, [selectedPortfolioIndex, portfolios]);

    // Filter investments based on selected portfolio or show all if no selection
    const filteredInvestments: (InvestmentWithDecryptedData & { portfolioName?: string })[] = React.useMemo(() => {
        try {
            if (!portfolios || !Array.isArray(portfolios)) {
                return [];
            }

            const portfoliosToProcess = selectedPortfolio ? [selectedPortfolio] : portfolios;

            return portfoliosToProcess.flatMap(portfolio => {
                if (!portfolio || !portfolio.investments || !Array.isArray(portfolio.investments)) {
                    return [];
                }

                return portfolio.investments.map(investment => ({
                    ...investment,
                    portfolioName: portfolio.data?.name || 'Unknown Portfolio'
                }));
            }).sort((a, b) => {
                try {
                    return new Date(b.data.purchase_date).getTime() - new Date(a.data.purchase_date).getTime();
                } catch {
                    return 0;
                }
            });
        } catch (error) {
            console.error('Error processing investments:', error);
            return [];
        }
    }, [portfolios, selectedPortfolio]);

    // Helper function to calculate bond interest
    const calculateBondInterestForInvestment = (investment: any) => {
        if (investment.data.type !== 'bond' || !investment.data.interest_rate) return 0;
        
        const quantity = investment.data.quantity || 0;
        const purchasePrice = investment.data.purchase_price || 0;
        const interestRate = investment.data.interest_rate || 0;
        
        if (quantity === 0 || purchasePrice === 0 || interestRate === 0) return 0;
        
        const initialValue = quantity * purchasePrice;
        
        // Calculate time periods
        const currentDate = new Date();
        const purchaseDate = new Date(investment.data.purchase_date);
        const maturityDate = investment.data.maturity_date ? new Date(investment.data.maturity_date) : null;
        
        // Determine the end date for interest calculation
        const endDate = maturityDate && currentDate > maturityDate ? maturityDate : currentDate;
        
        // Calculate days since purchase until end date
        const daysSincePurchase = Math.floor((endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const yearsSincePurchase = Math.max(0, daysSincePurchase / 365.25);
        
        // For demonstration purposes, if purchase date is today, use 1 year as example
        const yearsForCalculation = yearsSincePurchase === 0 ? 1 : yearsSincePurchase;
        
        // Calculate annual interest return
        const annualInterestReturn = initialValue * (interestRate / 100) * yearsForCalculation;
        
        return annualInterestReturn;
    };

    // Calculate total portfolio value based on filtered investments
    const totalPortfolioValue = React.useMemo(() => {
        return filteredInvestments.reduce((sum, investment) => {
            try {
                const marketValue = investment.data.quantity * (investment.data.current_price || investment.data.purchase_price);
                const interestEarned = calculateBondInterestForInvestment(investment);
                const currentValue = investment.data.type === 'bond' ? marketValue + interestEarned : marketValue;
                return sum + currentValue;
            } catch {
                return sum;
            }
        }, 0);
    }, [filteredInvestments]);

    // Calculate total gain/loss based on filtered investments
    const totalGainLoss = React.useMemo(() => {
        return filteredInvestments.reduce((sum, investment) => {
            try {
                const marketValue = investment.data.quantity * (investment.data.current_price || investment.data.purchase_price);
                const interestEarned = calculateBondInterestForInvestment(investment);
                const currentValue = investment.data.type === 'bond' ? marketValue + interestEarned : marketValue;
                const initialValue = investment.data.quantity * investment.data.purchase_price;
                return sum + (currentValue - initialValue);
            } catch {
                return sum;
            }
        }, 0);
    }, [filteredInvestments]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        // The context will handle refreshing
        setTimeout(() => setRefreshing(false), 2000);
    }, []);

    const handleAddInvestment = () => {
        router.push('/(protected)/add-investment');
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

    const formatPercentage = (value: number) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const getInvestmentTypeIcon = (type: string) => {
        const icons: { [key: string]: string } = {
            stock: 'trending-up',
            bond: 'shield-checkmark',
            crypto: 'flash',
            etf: 'bar-chart',
            mutual_fund: 'pie-chart',
            real_estate: 'home',
            commodity: 'diamond',
            other: 'ellipsis-horizontal',
        };
        return icons[type] || icons.other;
    };

    const getInvestmentTypeColor = (type: string) => {
        const colors: { [key: string]: string } = {
            stock: '#4CAF50',
            bond: '#2196F3',
            crypto: '#FF9800',
            etf: '#9C27B0',
            mutual_fund: '#3F51B5',
            real_estate: '#795548',
            commodity: '#FFC107',
            other: '#9E9E9E',
        };
        return colors[type] || colors.other;
    };

    const renderInvestmentItem = ({ item }: { item: InvestmentWithDecryptedData & { portfolioName?: string } }) => {
        if (!item || !item.data) {
            return null;
        }

        // Bond-specific calculations
        const calculateBondInterestReturn = (investment: any) => {
            if (investment.data.type !== 'bond' || !investment.data.interest_rate) return 0;
            
            const quantity = investment.data.quantity || 0;
            const purchasePrice = investment.data.purchase_price || 0;
            const interestRate = investment.data.interest_rate || 0;
            
            if (quantity === 0 || purchasePrice === 0 || interestRate === 0) return 0;
            
            const initialValue = quantity * purchasePrice;
            
            // Calculate time periods
            const currentDate = new Date();
            const purchaseDate = new Date(investment.data.purchase_date);
            const maturityDate = investment.data.maturity_date ? new Date(investment.data.maturity_date) : null;
            
            // Determine the end date for interest calculation
            const endDate = maturityDate && currentDate > maturityDate ? maturityDate : currentDate;
            
            // Calculate days since purchase until end date
            const daysSincePurchase = Math.floor((endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
            const yearsSincePurchase = Math.max(0, daysSincePurchase / 365.25);
            
            // For demonstration purposes, if purchase date is today, use 1 year as example
            const yearsForCalculation = yearsSincePurchase === 0 ? 1 : yearsSincePurchase;
            
            // Calculate annual interest return
            const annualInterestReturn = initialValue * (interestRate / 100) * yearsForCalculation;
            
            return annualInterestReturn;
        };

        const isBond = item.data.type === 'bond';
        const interestEarned = calculateBondInterestReturn(item);
        const marketValue = item.data.quantity * (item.data.current_price || item.data.purchase_price);
        const currentValue = isBond ? marketValue + interestEarned : marketValue;
        const initialValue = item.data.quantity * item.data.purchase_price;
        const investmentCurrency = item.data.currency || 'USD';
        const gainLoss = currentValue - initialValue;
        const gainLossPercentage = (gainLoss / initialValue) * 100;

        return (
            <TouchableOpacity
                style={[styles.investmentCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
                onPress={() => {
                    // Navigate to investment detail screen
                    const portfolioId = portfolios.find(p => p.investments.some(inv => inv.id === item.id))?.id;
                    if (portfolioId) {
                        router.push(`/(protected)/investment-detail?investmentId=${item.id}&portfolioId=${portfolioId}`);
                    }
                }}
            >
                <View style={styles.investmentCardContent}>
                    <View style={styles.investmentHeader}>
                        <View style={styles.investmentMainInfo}>
                            <View style={[
                                styles.typeIcon,
                                { backgroundColor: getInvestmentTypeColor(item.data.type) + '20' }
                            ]}>
                                <Ionicons
                                    name={getInvestmentTypeIcon(item.data.type) as any}
                                    size={20}
                                    color={getInvestmentTypeColor(item.data.type)}
                                />
                            </View>
                            <View style={styles.investmentDetails}>
                                <Text style={[styles.investmentTitle, { color: colors.text }]}>
                                    {item.data.symbol || item.data.name || 'Unknown Investment'}
                                </Text>
                                <Text style={[styles.investmentSubtitle, { color: colors.icon }]}>
                                    {item.portfolioName || 'Unknown Portfolio'} • {item.data.quantity} shares
                                </Text>
                                <Text style={[styles.purchaseDate, { color: colors.icon }]}>
                                    Purchased {formatDate(item.data.purchase_date)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.investmentAmount}>
                            <Text style={[styles.currentValueText, { color: colors.text }]}>
                                {formatCurrency(currentValue, investmentCurrency)}
                            </Text>
                            <Text style={[
                                styles.gainLossText,
                                { color: gainLoss >= 0 ? '#4CAF50' : '#F44336' }
                            ]}>
                                {formatCurrency(gainLoss, investmentCurrency)} ({formatPercentage(gainLossPercentage)})
                            </Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderInvestmentsHeader = () => {
        const gainLossPercentage = totalPortfolioValue > 0 ? (totalGainLoss / (totalPortfolioValue - totalGainLoss)) * 100 : 0;
        const showPortfolioSelector = portfolios.length > 1;

        return (
            <View style={styles.header}>
                {showPortfolioSelector && (
                    <View style={[styles.selectorCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                        <Text style={[styles.selectorLabel, { color: colors.text }]}>Portfolio</Text>
                        <Select
                            style={styles.portfolioSelector}
                            value={selectedPortfolio?.data?.name || 'All Portfolios'}
                            selectedIndex={selectedPortfolioIndex}
                            onSelect={(index) => setSelectedPortfolioIndex(index as IndexPath)}
                            placeholder="Select portfolio"
                        >
                            {portfolios.map((portfolio, index) => (
                                <SelectItem
                                    key={portfolio.id}
                                    title={portfolio.data?.name || `Portfolio ${index + 1}`}
                                />
                            ))}
                        </Select>
                    </View>
                )}

                <View style={[styles.summaryCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.summaryTitle, { color: colors.text }]}>
                        {selectedPortfolio ? selectedPortfolio.data?.name || 'Portfolio' : 'Total Portfolio'} Value
                    </Text>
                    <Text style={[styles.summaryAmount, { color: colors.primary }]}>
                        {formatCurrency(totalPortfolioValue)}
                    </Text>
                    <Text style={[
                        styles.summaryGainLoss,
                        { color: totalGainLoss >= 0 ? '#4CAF50' : '#F44336' }
                    ]}>
                        {formatCurrency(totalGainLoss)} ({formatPercentage(gainLossPercentage)})
                    </Text>
                </View>
            </View>
        );
    };

    const renderInvestmentsEmptyState = () => (
        <Layout style={styles.emptyState}>
            <Ionicons name="trending-up-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
            <Text category='h6' style={styles.emptyTitle}>No investments yet</Text>
            <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                Start building your investment portfolio by adding your first investment
            </Text>
            <Button
                style={styles.addButton}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleAddInvestment}
            >
                Add Investment
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
                    title='Investments'
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
                    title='Investments'
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                />
                <Layout style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" style={styles.errorIcon} />
                    <Text category='h6' style={styles.errorTitle}>Error loading investments</Text>
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
                title='Investments'
                alignment='center'
                accessoryLeft={renderLeftActions}
                style={{ backgroundColor: colors.background }}
            />

            {filteredInvestments.length === 0 ? (
                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    {portfolios.length > 1 && renderInvestmentsHeader()}
                    {renderInvestmentsEmptyState()}
                </ScrollView>
            ) : (
                <FlatList
                    style={styles.list}
                    data={filteredInvestments}
                    renderItem={renderInvestmentItem}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={renderInvestmentsHeader}
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

            {filteredInvestments.length > 0 && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={handleAddInvestment}
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
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    selectorCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    selectorLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    portfolioSelector: {
        borderRadius: 12,
    },
    summaryCard: {
        padding: 20,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    summaryAmount: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    summaryGainLoss: {
        fontSize: 16,
        fontWeight: '600',
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingBottom: 100,
    },
    investmentCard: {
        marginHorizontal: 20,
        marginVertical: 6,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    investmentCardContent: {
        padding: 16,
    },
    investmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    investmentMainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    investmentDetails: {
        flex: 1,
    },
    investmentTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    investmentSubtitle: {
        fontSize: 14,
        marginBottom: 2,
    },
    purchaseDate: {
        fontSize: 12,
    },
    investmentAmount: {
        alignItems: 'flex-end',
    },
    currentValueText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    gainLossText: {
        fontSize: 14,
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
});
