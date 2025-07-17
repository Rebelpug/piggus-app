import React, { useState, useMemo } from 'react';
import { StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, View, Dimensions } from 'react-native';
import {
    Text,
    TopNavigation
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useProfile } from '@/context/ProfileContext';
import { useInvestment } from '@/context/InvestmentContext';
import { useLocalization } from '@/context/LocalizationContext';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/ProfileHeader';
import BudgetCard from '@/components/budget/BudgetCard';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function HomeScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { t } = useLocalization();
    const { isLoading } = useExpense();
    const { userProfile } = useProfile();
    const { portfolios } = useInvestment();
    const [refreshing, setRefreshing] = useState(false);

    // Helper function to calculate bond interest
    const calculateBondInterest = (investment: any) => {
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
                const isBond = investment.data.type === 'bond';

                totalInvested += purchasePrice * quantity;

                // Calculate bond interest if applicable
                const bondInterest = calculateBondInterest(investment);

                if (currentPrice !== null && currentPrice > 0) {
                    const marketValue = currentPrice * quantity;
                    const totalCurrentValue = isBond ? marketValue + bondInterest : marketValue;
                    currentValue += totalCurrentValue;
                    hasCurrentPrices = true;

                    // For year-to-date calculation, use purchase price if bought this year, otherwise use current price
                    if (purchaseDate >= startOfYear) {
                        yearStartValue += purchasePrice * quantity;
                    } else {
                        // For bonds, include estimated interest from start of year
                        if (isBond) {
                            const startYearInterest = calculateBondInterestFromDate(investment, startOfYear);
                            yearStartValue += marketValue + startYearInterest;
                        } else {
                            yearStartValue += marketValue; // Approximation - ideally we'd have historical prices
                        }
                    }
                } else {
                    // If no current price, use purchase price as fallback + bond interest
                    const marketValue = purchasePrice * quantity;
                    const totalCurrentValue = isBond ? marketValue + bondInterest : marketValue;
                    currentValue += totalCurrentValue;
                    yearStartValue += marketValue;
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

    // Helper function to calculate bond interest from a specific date
    const calculateBondInterestFromDate = (investment: any, fromDate: Date) => {
        if (investment.data.type !== 'bond' || !investment.data.interest_rate) return 0;

        const quantity = investment.data.quantity || 0;
        const purchasePrice = investment.data.purchase_price || 0;
        const interestRate = investment.data.interest_rate || 0;

        if (quantity === 0 || purchasePrice === 0 || interestRate === 0) return 0;

        const initialValue = quantity * purchasePrice;
        const currentDate = new Date();
        const purchaseDate = new Date(investment.data.purchase_date);
        const maturityDate = investment.data.maturity_date ? new Date(investment.data.maturity_date) : null;

        // Use the later of purchase date or from date as start
        const startDate = purchaseDate > fromDate ? purchaseDate : fromDate;

        // Determine the end date for interest calculation
        const endDate = maturityDate && currentDate > maturityDate ? maturityDate : currentDate;

        if (startDate >= endDate) return 0;

        // Calculate days from start date until end date
        const daysSinceStart = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const yearsSinceStart = Math.max(0, daysSinceStart / 365.25);

        // Calculate interest return from start date
        const interestReturn = initialValue * (interestRate / 100) * yearsSinceStart;

        return interestReturn;
    };

    const defaultCurrency = userProfile?.profile?.defaultCurrency || 'EUR';

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        // Simulate refresh - the expense context will handle actual refresh
        setTimeout(() => setRefreshing(false), 2000);
    }, []);



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


    const renderLeftActions = () => (
        <ProfileHeader />
    );


    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title={t('home.title')}
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                />
                <AuthSetupLoader />
            </SafeAreaView>
        );
    }


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title={t('home.title')}
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
                        {t('home.welcomeBack')}
                    </Text>
                    <Text style={[styles.welcomeSubtext, { color: colors.icon }]}>
                        {t('home.spendingOverview')}
                    </Text>
                </View>

                <BudgetCard />

                {/* Investment Portfolio Returns Card */}
                {/*<View style={[styles.portfolioCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>*/}
                {/*    <View style={styles.portfolioHeader}>*/}
                {/*        <Text style={[styles.portfolioTitle, { color: colors.text }]}>{t('home.investmentPortfolio')}</Text>*/}
                {/*        <TouchableOpacity onPress={() => router.push('/(protected)/(tabs)/investments')}>*/}
                {/*            <Ionicons name="chevron-forward" size={20} color={colors.icon} />*/}
                {/*        </TouchableOpacity>*/}
                {/*    </View>*/}

                {/*    {portfolioReturns.hasInvestments ? (*/}
                {/*        <View>*/}
                {/*            /!* Current Value *!/*/}
                {/*            <View style={styles.portfolioMainValue}>*/}
                {/*                <Text style={[styles.portfolioValueAmount, { color: colors.text }]}>*/}
                {/*                    {formatCurrency(portfolioReturns.currentValue)}*/}
                {/*                </Text>*/}
                {/*                <Text style={[styles.portfolioValueLabel, { color: colors.icon }]}>*/}
                {/*                    {t('home.currentPortfolioValue')}*/}
                {/*                </Text>*/}
                {/*            </View>*/}

                {/*            /!* Returns Summary *!/*/}
                {/*            <View style={styles.portfolioReturnsContainer}>*/}
                {/*                /!* Total Returns *!/*/}
                {/*                <View style={styles.portfolioReturn}>*/}
                {/*                    <View style={styles.portfolioReturnRow}>*/}
                {/*                        <Text style={[styles.portfolioReturnAmount, {*/}
                {/*                            color: portfolioReturns.totalReturn >= 0 ? colors.success : colors.error*/}
                {/*                        }]}>*/}
                {/*                            {portfolioReturns.totalReturn >= 0 ? '+' : ''}{formatCurrency(portfolioReturns.totalReturn)}*/}
                {/*                        </Text>*/}
                {/*                        <Text style={[styles.portfolioReturnPercentage, {*/}
                {/*                            color: portfolioReturns.totalReturn >= 0 ? colors.success : colors.error*/}
                {/*                        }]}>*/}
                {/*                            {portfolioReturns.totalReturnPercentage >= 0 ? '+' : ''}{portfolioReturns.totalReturnPercentage.toFixed(2)}%*/}
                {/*                        </Text>*/}
                {/*                    </View>*/}
                {/*                    <Text style={[styles.portfolioReturnLabel, { color: colors.icon }]}>*/}
                {/*                        {t('home.totalReturn')}*/}
                {/*                    </Text>*/}
                {/*                </View>*/}

                {/*                /!* Year to Date Returns *!/*/}
                {/*                <View style={styles.portfolioReturn}>*/}
                {/*                    <View style={styles.portfolioReturnRow}>*/}
                {/*                        <Text style={[styles.portfolioReturnAmount, {*/}
                {/*                            color: portfolioReturns.yearReturn >= 0 ? colors.success : colors.error*/}
                {/*                        }]}>*/}
                {/*                            {portfolioReturns.yearReturn >= 0 ? '+' : ''}{formatCurrency(portfolioReturns.yearReturn)}*/}
                {/*                        </Text>*/}
                {/*                        <Text style={[styles.portfolioReturnPercentage, {*/}
                {/*                            color: portfolioReturns.yearReturn >= 0 ? colors.success : colors.error*/}
                {/*                        }]}>*/}
                {/*                            {portfolioReturns.yearReturnPercentage >= 0 ? '+' : ''}{portfolioReturns.yearReturnPercentage.toFixed(2)}%*/}
                {/*                        </Text>*/}
                {/*                    </View>*/}
                {/*                    <Text style={[styles.portfolioReturnLabel, { color: colors.icon }]}>*/}
                {/*                        {t('home.thisYear')}*/}
                {/*                    </Text>*/}
                {/*                </View>*/}
                {/*            </View>*/}

                {/*            {!portfolioReturns.hasCurrentPrices && (*/}
                {/*                <Text style={[styles.portfolioDisclaimer, { color: colors.icon }]}>*/}
                {/*                    {t('home.someInvestmentsLackPrices')}*/}
                {/*                </Text>*/}
                {/*            )}*/}
                {/*            */}
                {/*            /!* See more stats button *!/*/}
                {/*            <TouchableOpacity*/}
                {/*                style={[styles.statsButton, { backgroundColor: colors.background, borderColor: colors.border }]}*/}
                {/*                onPress={() => router.push('/(protected)/investment-statistics')}*/}
                {/*            >*/}
                {/*                <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />*/}
                {/*                <Text style={[styles.statsButtonText, { color: colors.primary }]}>{t('home.seeMoreStats')}</Text>*/}
                {/*            </TouchableOpacity>*/}
                {/*        </View>*/}
                {/*    ) : (*/}
                {/*        <View style={styles.noPortfolioContainer}>*/}
                {/*            <View style={[styles.noPortfolioIcon, { backgroundColor: colors.primary + '20' }]}>*/}
                {/*                <Ionicons name="trending-up-outline" size={32} color={colors.primary} />*/}
                {/*            </View>*/}
                {/*            <Text style={[styles.noPortfolioText, { color: colors.text }]}>*/}
                {/*                {t('home.startInvesting')}*/}
                {/*            </Text>*/}
                {/*            <Text style={[styles.noPortfolioSubtext, { color: colors.icon }]}>*/}
                {/*                {t('home.addFirstInvestment')}*/}
                {/*            </Text>*/}
                {/*            <TouchableOpacity*/}
                {/*                style={[styles.createPortfolioButton, { backgroundColor: colors.primary }]}*/}
                {/*                onPress={() => router.push('/(protected)/add-investment')}*/}
                {/*            >*/}
                {/*                <Text style={styles.createPortfolioButtonText}>{t('home.createInvestment')}</Text>*/}
                {/*            </TouchableOpacity>*/}
                {/*        </View>*/}
                {/*    )}*/}
                {/*</View>*/}

                {/* Guides Call-to-Action Card */}
                <View style={[styles.guidesCtaCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <View style={styles.guidesCtaContent}>
                        <View style={[styles.guidesCtaIcon, { backgroundColor: colors.accent + '20' }]}>
                            <Ionicons name="book-outline" size={28} color={colors.accent} />
                        </View>
                        <View style={styles.guidesCtaText}>
                            <Text style={[styles.guidesCtaTitle, { color: colors.text }]}>
                                {t('home.financialEducation')}
                            </Text>
                            <Text style={[styles.guidesCtaSubtitle, { color: colors.icon }]}>
                                {t('home.masterYourFinances')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.guidesCtaButton, { backgroundColor: colors.accent }]}
                            onPress={() => router.push('/(protected)/(tabs)/guides')}
                        >
                            <Text style={styles.guidesCtaButtonText}>{t('home.learn')}</Text>
                            <Ionicons name="chevron-forward" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

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
        paddingVertical: 0,
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
        marginBottom: 8,
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
    guidesCtaCard: {
        marginBottom: 24,
        padding: 20,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    guidesCtaContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    guidesCtaIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    guidesCtaText: {
        flex: 1,
        marginRight: 16,
    },
    guidesCtaTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    guidesCtaSubtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    guidesCtaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 4,
    },
    guidesCtaButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    statsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 16,
        gap: 6,
    },
    statsButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
