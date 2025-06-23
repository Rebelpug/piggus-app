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
                            Alert.alert('Success', 'Investment deleted successfully');
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

    const BackIcon = (props: any) => (
        <Ionicons name="arrow-back" size={24} color={colors.icon} />
    );

    const BackAction = () => (
        <TopNavigationAction icon={BackIcon} onPress={navigateBack} />
    );

    if (!investment || !portfolio) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <TopNavigation
                        title="Investment Details"
                        alignment="center"
                        accessoryLeft={BackAction}
                        style={{ backgroundColor: colors.background }}
                    />
                    <Divider />
                    <Layout style={styles.loadingContainer}>
                        <Text style={{ color: colors.text }}>Loading investment details...</Text>
                    </Layout>
                </SafeAreaView>
            </ThemedView>
        );
    }

    const currentValue = investment.data.quantity * (investment.data.current_price || investment.data.purchase_price);
    const totalInvestment = investment.data.quantity * investment.data.purchase_price;
    const gainLoss = currentValue - totalInvestment;
    const gainLossPercentage = totalInvestment > 0 ? ((gainLoss / totalInvestment) * 100) : 0;

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <TopNavigation
                    title="Investment Details"
                    alignment="center"
                    accessoryLeft={BackAction}
                    style={{ backgroundColor: colors.background }}
                />
                <Divider />
                <ScrollView style={styles.scrollView}>
                    <Card style={styles.card}>
                        <Layout style={styles.headerContainer}>
                            <Layout style={[styles.typeIndicator, { backgroundColor: getTypeColor(investment.data.type) }]} />
                            <Text category="h5" style={styles.investmentName}>{investment.data.name}</Text>
                        </Layout>

                        {investment.data.symbol && (
                            <Text category="h6" style={styles.symbol}>{investment.data.symbol}</Text>
                        )}

                        <Text category="h3" style={styles.amount}>
                            {formatCurrency(currentValue, investment.data.currency)}
                        </Text>

                        {/* Gain/Loss Section */}
                        <Card style={styles.performanceCard}>
                            <Text category="h6" style={styles.performanceTitle}>Performance</Text>
                            <Layout style={styles.performanceInfo}>
                                <Text category="h4" style={[styles.gainLossAmount, { color: gainLoss >= 0 ? '#4CAF50' : '#F44336' }]}>
                                    {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss, investment.data.currency)}
                                </Text>
                                <Text style={[styles.gainLossPercentage, { color: gainLoss >= 0 ? '#4CAF50' : '#F44336' }]}>
                                    ({gainLoss >= 0 ? '+' : ''}{gainLossPercentage.toFixed(2)}%)
                                </Text>
                            </Layout>
                        </Card>

                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Type:</Text>
                            <Text>{getTypeLabel(investment.data.type)}</Text>
                        </Layout>

                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Portfolio:</Text>
                            <Text>{portfolio.data?.name || 'Unknown Portfolio'}</Text>
                        </Layout>

                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Quantity:</Text>
                            <Text>{investment.data.quantity}</Text>
                        </Layout>

                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Purchase Price:</Text>
                            <Text>{formatCurrency(investment.data.purchase_price, investment.data.currency)}</Text>
                        </Layout>

                        {investment.data.current_price && (
                            <Layout style={styles.detailRow}>
                                <Text appearance="hint">Current Price:</Text>
                                <Text>{formatCurrency(investment.data.current_price, investment.data.currency)}</Text>
                            </Layout>
                        )}

                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Total Investment:</Text>
                            <Text>{formatCurrency(totalInvestment, investment.data.currency)}</Text>
                        </Layout>

                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Purchase Date:</Text>
                            <Text>{formatDate(investment.data.purchase_date)}</Text>
                        </Layout>

                        <Layout style={styles.detailRow}>
                            <Text appearance="hint">Currency:</Text>
                            <Text>{investment.data.currency}</Text>
                        </Layout>

                        {investment.data.notes && (
                            <Layout style={styles.descriptionContainer}>
                                <Text appearance="hint" style={styles.descriptionLabel}>Notes:</Text>
                                <Text style={styles.description}>{investment.data.notes}</Text>
                            </Layout>
                        )}
                    </Card>

                    {/* Metadata */}
                    <Card style={styles.card}>
                        <Layout style={styles.metaContainer}>
                            <Text appearance="hint" category="c1">Created: {new Date(investment.created_at).toLocaleString()}</Text>
                            <Text appearance="hint" category="c1">Last updated: {new Date(investment.updated_at).toLocaleString()}</Text>
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
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
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
    typeIndicator: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 12,
    },
    investmentName: {
        flex: 1,
    },
    symbol: {
        marginBottom: 16,
        color: '#666',
        textAlign: 'center',
    },
    amount: {
        marginBottom: 24,
        color: '#2E7D32',
        textAlign: 'center',
    },
    performanceCard: {
        backgroundColor: '#F8F9FA',
        marginBottom: 16,
        padding: 16,
    },
    performanceTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    performanceInfo: {
        alignItems: 'center',
    },
    gainLossAmount: {
        marginBottom: 4,
    },
    gainLossPercentage: {
        fontSize: 14,
        fontWeight: '500',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
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