import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useLocalization } from '@/context/LocalizationContext';
import { InvestmentWithDecryptedData } from '@/types/investment';
import { formatDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatPercentage } from '@/utils/stringUtils';

interface InvestmentItemProps {
    item: InvestmentWithDecryptedData & { portfolioName?: string };
    portfolioId?: string;
}

export default function InvestmentItem({ item, portfolioId }: InvestmentItemProps) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { t } = useLocalization();

    if (!item || !item.data) {
        return null;
    }

    const getInvestmentTypeIcon = (type: string) => {
        const icons: { [key: string]: string } = {
            stock: 'trending-up',
            bond: 'shield-checkmark',
            crypto: 'flash',
            etf: 'bar-chart',
            mutual_fund: 'pie-chart',
            real_estate: 'home',
            commodity: 'diamond',
            checkingAccount: 'card',
            savingsAccount: 'wallet',
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
            checkingAccount: '#607D8B',
            savingsAccount: '#4CAF50',
            other: '#9E9E9E',
        };
        return colors[type] || colors.other;
    };

    const calculateBondInterestReturn = (investment: any) => {
        if (!investment.data.interest_rate) return 0;

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

    const supportsInterest = ['bond', 'checkingAccount', 'savingsAccount'].includes(item.data.type);
    const interestEarned = calculateBondInterestReturn(item);
    const marketValue = item.data.quantity * (item.data.current_price || item.data.purchase_price);
    const currentValue = supportsInterest ? marketValue + interestEarned : marketValue;
    const initialValue = item.data.quantity * item.data.purchase_price;
    const investmentCurrency = item.data.currency || 'USD';
    const gainLoss = currentValue - initialValue;
    const gainLossPercentage = (gainLoss / initialValue) * 100;

    const handlePress = () => {
        if (portfolioId) {
            router.push(`/(protected)/investment-detail?investmentId=${item.id}&portfolioId=${portfolioId}`);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.investmentCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
            onPress={handlePress}
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
                                {item.data.symbol || item.data.name || t('investments.unknownInvestment')}
                            </Text>
                            <Text style={[styles.investmentSubtitle, { color: colors.icon }]}>
                                {item.portfolioName || t('investments.unknownPortfolio')} • {item.data.quantity} {t('investments.shares')}
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
}

const styles = StyleSheet.create({
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
});
