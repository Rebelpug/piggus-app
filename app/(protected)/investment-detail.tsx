import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Alert, View, StatusBar } from 'react-native';
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
import { useInvestment } from '@/context/InvestmentContext';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

const investmentTypes = [
    { id: 'stock', name: 'Stock', icon: 'trending-up' },
    { id: 'bond', name: 'Bond', icon: 'shield-checkmark' },
    { id: 'crypto', name: 'Cryptocurrency', icon: 'flash' },
    { id: 'etf', name: 'ETF', icon: 'bar-chart' },
    { id: 'mutual_fund', name: 'Mutual Fund', icon: 'pie-chart' },
    { id: 'real_estate', name: 'Real Estate', icon: 'home' },
    { id: 'commodity', name: 'Commodity', icon: 'diamond' },
    { id: 'other', name: 'Other', icon: 'ellipsis-horizontal' },
];

export default function InvestmentDetailScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { investmentId, portfolioId } = useLocalSearchParams<{ investmentId: string, portfolioId: string }>();
    const { portfolios, deleteInvestment } = useInvestment();
    const [investment, setInvestment] = useState<any>(null);
    const [portfolio, setPortfolio] = useState<any>(null);

    useEffect(() => {
        if (!investmentId || !portfolioId || !portfolios) return;

        const foundPortfolio = portfolios.find(p => p.id === portfolioId);
        if (!foundPortfolio) return;

        setPortfolio(foundPortfolio);

        const foundInvestment = foundPortfolio.investments?.find(i => i.id === investmentId);
        if (foundInvestment) {
            setInvestment(foundInvestment);
        }
    }, [investmentId, portfolioId, portfolios]);

    const navigateBack = () => {
        router.back();
    };

    const handleEdit = () => {
        router.push({
            pathname: '/(protected)/edit-investment',
            params: {
                investmentId: investmentId,
                portfolioId: portfolioId
            }
        });
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Investment',
            'Are you sure you want to delete this investment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!portfolioId || !investmentId) return;

                            await deleteInvestment(portfolioId, investmentId);
                            router.back();
                        } catch (error) {
                            console.error('Failed to delete investment:', error);
                            Alert.alert('Error', 'Failed to delete investment. Please try again.');
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

    const getTypeLabel = (typeValue: string) => {
        const type = investmentTypes.find(t => t.id === typeValue);
        return type ? type.name : typeValue;
    };

    const getTypeColor = (type: string) => {
        const colors: { [key: string]: string } = {
            stock: '#4CAF50',
            bond: '#2196F3',
            crypto: '#FF9800',
            etf: '#9C27B0',
            mutual_fund: '#673AB7',
            real_estate: '#795548',
            commodity: '#FF5722',
            other: '#607D8B',
        };
        return colors[type] || colors.other;
    };

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

    if (!investment || !portfolio) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <TopNavigation
                    title='Investment Details'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    style={{ backgroundColor: colors.background }}
                />
                <Layout style={styles.loadingContainer}>
                    <Text category='h6'>Investment not found</Text>
                </Layout>
            </SafeAreaView>
        );
    }

    // Bond-specific calculations
    const calculateBondInterestReturn = () => {
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
        
        console.log('INVESTMENT DETAIL Bond interest calculation:', {
            investmentType: investment.data.type,
            quantity,
            purchasePrice,
            interestRate,
            initialValue,
            daysSincePurchase,
            yearsSincePurchase,
            yearsForCalculation,
            annualInterestReturn
        });
        
        return annualInterestReturn;
    };

    const getBondStatus = () => {
        if (investment.data.type !== 'bond' || !investment.data.maturity_date) return 'active';
        
        const currentDate = new Date();
        const maturityDate = new Date(investment.data.maturity_date);
        
        return currentDate >= maturityDate ? 'matured' : 'active';
    };

    const getDaysToMaturity = () => {
        if (investment.data.type !== 'bond' || !investment.data.maturity_date) return null;
        
        const currentDate = new Date();
        const maturityDate = new Date(investment.data.maturity_date);
        
        if (currentDate >= maturityDate) {
            return 0;
        }
        
        const daysToMaturity = Math.floor((maturityDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysToMaturity;
    };

    const isBond = investment.data.type === 'bond';
    const interestEarned = calculateBondInterestReturn();
    const marketValue = investment.data.quantity * (investment.data.current_price || investment.data.purchase_price);
    const currentValue = isBond ? marketValue + interestEarned : marketValue;
    const totalInvestment = investment.data.quantity * investment.data.purchase_price;
    const gainLoss = currentValue - totalInvestment;
    const gainLossPercentage = totalInvestment > 0 ? ((gainLoss / totalInvestment) * 100) : 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            <TopNavigation
                title='Investment Details'
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
                                <Text style={[styles.investmentTitle, { color: colors.text }]}>
                                    {investment.data.name}
                                </Text>
                                <Text style={[styles.portfolioName, { color: colors.icon }]}>
                                    {portfolio.data?.name || 'Unknown Portfolio'} • {getTypeLabel(investment.data.type)}
                                </Text>
                                {investment.data.symbol && (
                                    <View style={styles.statusBadge}>
                                        <View style={[
                                            styles.statusIndicator,
                                            { backgroundColor: getTypeColor(investment.data.type) }
                                        ]} />
                                        <Text style={[styles.statusText, { color: colors.text }]}>
                                            {investment.data.symbol}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.headerRight}>
                                <Text style={[styles.amount, { color: colors.text }]}>
                                    {formatCurrency(currentValue, investment.data.currency)}
                                </Text>
                                <Text style={[styles.totalAmount, { color: colors.icon }]}>
                                    {investment.data.quantity} units
                                </Text>
                                <View style={[styles.performanceBadge, {
                                    backgroundColor: gainLoss >= 0 ? '#4CAF50' + '20' : '#F44336' + '20'
                                }]}>
                                    <Ionicons
                                        name={gainLoss >= 0 ? "trending-up" : "trending-down"}
                                        size={12}
                                        color={gainLoss >= 0 ? '#4CAF50' : '#F44336'}
                                    />
                                    <Text style={[styles.performanceText, {
                                        color: gainLoss >= 0 ? '#4CAF50' : '#F44336'
                                    }]}>
                                        {gainLoss >= 0 ? '+' : ''}{gainLossPercentage.toFixed(2)}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Card>

                    {/* Performance Details */}
                    <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Performance</Text>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Total Investment:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {formatCurrency(totalInvestment, investment.data.currency)}
                            </Text>
                        </View>
                        
                        {isBond && interestEarned > 0 && (
                            <>
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.icon }]}>Market Value:</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {formatCurrency(marketValue, investment.data.currency)}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.icon }]}>Interest Earned:</Text>
                                    <Text style={[styles.detailValue, { color: '#4CAF50' }]}>
                                        {formatCurrency(interestEarned, investment.data.currency)}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.icon }]}>Total Current Value:</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {formatCurrency(currentValue, investment.data.currency)}
                                    </Text>
                                </View>
                            </>
                        )}
                        
                        {!isBond && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.icon }]}>Current Value:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {formatCurrency(currentValue, investment.data.currency)}
                                </Text>
                            </View>
                        )}
                        
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Total Gain/Loss:</Text>
                            <Text style={[styles.detailValue, {
                                color: gainLoss >= 0 ? '#4CAF50' : '#F44336'
                            }]}>
                                {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss, investment.data.currency)}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Percentage:</Text>
                            <Text style={[styles.detailValue, {
                                color: gainLoss >= 0 ? '#4CAF50' : '#F44336'
                            }]}>
                                {gainLoss >= 0 ? '+' : ''}{gainLossPercentage.toFixed(2)}%
                            </Text>
                        </View>
                    </Card>

                    {/* Investment Details */}
                    <Card style={[styles.detailCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Type:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {getTypeLabel(investment.data.type)}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Quantity:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {investment.data.quantity}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Purchase Price:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {formatCurrency(investment.data.purchase_price, investment.data.currency)}
                            </Text>
                        </View>
                        {investment.data.current_price && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.icon }]}>Current Price:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {formatCurrency(investment.data.current_price, investment.data.currency)}
                                </Text>
                            </View>
                        )}
                        
                        {isBond && investment.data.interest_rate && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.icon }]}>Interest Rate:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {investment.data.interest_rate}% per year
                                </Text>
                            </View>
                        )}
                        
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Purchase Date:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {formatDate(investment.data.purchase_date)}
                            </Text>
                        </View>
                        
                        {isBond && investment.data.maturity_date && (
                            <>
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.icon }]}>Maturity Date:</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {formatDate(investment.data.maturity_date)}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: colors.icon }]}>Status:</Text>
                                    <Text style={[styles.detailValue, { 
                                        color: getBondStatus() === 'matured' ? '#FF9800' : '#4CAF50'
                                    }]}>
                                        {getBondStatus() === 'matured' ? 'Matured' : 'Active'}
                                    </Text>
                                </View>
                                {getDaysToMaturity() !== null && getBondStatus() === 'active' && (
                                    <View style={styles.detailRow}>
                                        <Text style={[styles.detailLabel, { color: colors.icon }]}>Days to Maturity:</Text>
                                        <Text style={[styles.detailValue, { color: colors.text }]}>
                                            {getDaysToMaturity()} days
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}
                        
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: colors.icon }]}>Currency:</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {investment.data.currency}
                            </Text>
                        </View>
                        {investment.data.notes && (
                            <View style={styles.detailRow}>
                                <Text style={[styles.detailLabel, { color: colors.icon }]}>Notes:</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {investment.data.notes}
                                </Text>
                            </View>
                        )}
                    </Card>

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
    investmentTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    portfolioName: {
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
    performanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    performanceText: {
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
