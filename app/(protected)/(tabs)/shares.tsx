import React, { useState } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity, View, FlatList, ScrollView } from 'react-native';
import {
    Layout,
    Text,
    Card,
    Button,
    TopNavigation,
    Tab,
    TabView
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useInvestment } from '@/context/InvestmentContext';
import { useLocalization } from '@/context/LocalizationContext';
import { ExpenseGroupWithDecryptedData } from '@/types/expense';
import { PortfolioWithDecryptedData } from '@/types/portfolio';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/ProfileHeader';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function SharesScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { t } = useLocalization();
    const { expensesGroups, isLoading, error } = useExpense();
    const { portfolios, isLoading: portfoliosLoading, error: portfoliosError } = useInvestment();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        // The context will handle refreshing
        setTimeout(() => setRefreshing(false), 2000);
    }, []);

    const handleCreateGroup = () => {
        router.push('/(protected)/create-group');
    };

    const handleCreatePortfolio = () => {
        router.push('/(protected)/create-portfolio');
    };

    const handleGroupPress = (group: ExpenseGroupWithDecryptedData) => {
        router.push(`/(protected)/group-detail?id=${group.id}`);
    };

    const handlePortfolioPress = (portfolio: PortfolioWithDecryptedData) => {
        router.push(`/(protected)/portfolio-detail?id=${portfolio.id}`);
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

    const getGroupStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return '#4CAF50';
            case 'pending':
                return '#FF9800';
            case 'rejected':
                return '#F44336';
            default:
                return '#9E9E9E';
        }
    };

    const getGroupStatusText = (status: string) => {
        switch (status) {
            case 'confirmed':
                return t('shares.active');
            case 'pending':
                return t('shares.pending');
            case 'rejected':
                return t('shares.rejected');
            default:
                return t('shares.unknown');
        }
    };

    const renderGroupItem = ({ item }: { item: ExpenseGroupWithDecryptedData }) => {
        if (!item || !item.data) {
            return null;
        }

        const expenseCount = item.expenses?.length || 0;
        const memberCount = item.members?.length || 0;
        const totalAmount = item.expenses?.reduce((sum, expense) => {
            try {
                return sum + (expense.data?.amount || 0);
            } catch {
                return sum;
            }
        }, 0) || 0;

        return (
            <TouchableOpacity
                style={[styles.groupCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
                onPress={() => handleGroupPress(item)}
            >
                <View style={styles.groupCardContent}>
                    <View style={styles.groupHeader}>
                        <View style={styles.groupMainInfo}>
                            <View style={[
                                styles.statusIcon,
                                { backgroundColor: getGroupStatusColor(item.membership_status || 'confirmed') + '20' }
                            ]}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: getGroupStatusColor(item.membership_status || 'confirmed') }
                                ]} />
                            </View>
                            <View style={styles.groupDetails}>
                                <Text style={[styles.groupTitle, { color: colors.text }]}>
                                    {item.data.name || t('shares.unnamedGroup')}
                                </Text>
                                <Text style={[styles.groupSubtitle, { color: colors.icon }]}>
                                    {item.data.description || t('shares.noDescription')}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.groupAmount}>
                            <Text style={[styles.amountText, { color: colors.text }]}>
                                ${totalAmount.toFixed(2)}
                            </Text>
                            <Text style={[styles.statusText, { color: getGroupStatusColor(item.membership_status || 'confirmed') }]}>
                                {getGroupStatusText(item.membership_status || 'confirmed')}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.groupFooter}>
                        <View style={styles.groupStats}>
                            <View style={styles.statItem}>
                                <Ionicons name="receipt-outline" size={14} color={colors.icon} />
                                <Text style={[styles.statText, { color: colors.icon }]}>
                                    {t('shares.expenseCount', { count: expenseCount })}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Ionicons name="people-outline" size={14} color={colors.icon} />
                                <Text style={[styles.statText, { color: colors.icon }]}>
                                    {t('shares.memberCount', { count: memberCount })}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderPortfolioItem = ({ item }: { item: PortfolioWithDecryptedData }) => {
        if (!item || !item.data) {
            return null;
        }

        const investmentCount = item.investments?.length || 0;
        const memberCount = item.members?.length || 0;
        const totalValue = item.investments?.reduce((sum, investment) => {
            try {
                const currentValue = investment.data.current_price || (investment.data.quantity * (investment.data.current_price || investment.data.purchase_price));
                return sum + currentValue;
            } catch {
                return sum;
            }
        }, 0) || 0;

        const totalGainLoss = item.investments?.reduce((sum, investment) => {
            try {
                const currentValue = investment.data.current_price || (investment.data.quantity * (investment.data.current_price || investment.data.purchase_price));
                const initialValue = investment.data.quantity * investment.data.purchase_price;
                return sum + (currentValue - initialValue);
            } catch {
                return sum;
            }
        }, 0) || 0;

        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
            }).format(amount);
        };

        return (
            <TouchableOpacity
                style={[styles.groupCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
                onPress={() => handlePortfolioPress(item)}
            >
                <View style={styles.groupCardContent}>
                    <View style={styles.groupHeader}>
                        <View style={styles.groupMainInfo}>
                            <View style={[
                                styles.statusIcon,
                                { backgroundColor: colors.primary + '20' }
                            ]}>
                                <Ionicons name="briefcase" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.groupDetails}>
                                <Text style={[styles.groupTitle, { color: colors.text }]}>
                                    {item.data.name || t('shares.unnamedPortfolio')}
                                </Text>
                                <Text style={[styles.groupSubtitle, { color: colors.icon }]}>
                                    {item.data.description || t('shares.noDescription')}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.groupAmount}>
                            <Text style={[styles.amountText, { color: colors.text }]}>
                                {formatCurrency(totalValue)}
                            </Text>
                            <Text style={[
                                styles.statusText,
                                { color: totalGainLoss >= 0 ? '#4CAF50' : '#F44336' }
                            ]}>
                                {formatCurrency(totalGainLoss)}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.groupFooter}>
                        <View style={styles.groupStats}>
                            <View style={styles.statItem}>
                                <Ionicons name="trending-up" size={14} color={colors.icon} />
                                <Text style={[styles.statText, { color: colors.icon }]}>
                                    {t('shares.investmentCount', { count: investmentCount })}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Ionicons name="people-outline" size={14} color={colors.icon} />
                                <Text style={[styles.statText, { color: colors.icon }]}>
                                    {t('shares.memberCount', { count: memberCount })}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderExpenseGroupsEmptyState = () => (
        <Layout style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
            <Text category='h6' style={styles.emptyTitle}>{t('shares.noExpenseGroupsYet')}</Text>
            <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                {t('shares.createFirstExpenseGroup')}
            </Text>
            <Button
                style={styles.addButton}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleCreateGroup}
            >
                {t('shares.createGroup')}
            </Button>
        </Layout>
    );

    const renderPortfoliosEmptyState = () => (
        <Layout style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
            <Text category='h6' style={styles.emptyTitle}>{t('shares.noPortfoliosYet')}</Text>
            <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                {t('shares.createFirstPortfolio')}
            </Text>
            <Button
                style={styles.addButton}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleCreatePortfolio}
            >
                {t('shares.createPortfolio')}
            </Button>
        </Layout>
    );

    const renderExpenseGroupsTab = () => (
        <View style={[styles.tabContent, { backgroundColor: colors.background }]}>
            {expensesGroups.length === 0 ? (
                renderExpenseGroupsEmptyState()
            ) : (
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
                    <View style={styles.groupsList}>
                        {expensesGroups.map((item, index) => (
                            <View key={item.id}>
                                {renderGroupItem({ item })}
                            </View>
                        ))}
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </View>
    );

    const renderPortfoliosTab = () => (
        <View style={[styles.tabContent, { backgroundColor: colors.background }]}>
            {portfolios.length === 0 ? (
                renderPortfoliosEmptyState()
            ) : (
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
                    <View style={styles.groupsList}>
                        {portfolios.map((item, index) => (
                            <View key={item.id}>
                                {renderPortfolioItem({ item })}
                            </View>
                        ))}
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}
        </View>
    );

    const renderLeftActions = () => (
        <ProfileHeader />
    );


    if ((isLoading || portfoliosLoading) && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title={t('shares.title')}
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                />
                <AuthSetupLoader />
            </SafeAreaView>
        );
    }

    if (error || portfoliosError) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title={t('shares.title')}
                    alignment='center'
                    accessoryLeft={renderLeftActions}
                />
                <Layout style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" style={styles.errorIcon} />
                    <Text category='h6' style={styles.errorTitle}>{t('shares.errorLoadingData')}</Text>
                    <Text category='s1' appearance='hint' style={styles.errorDescription}>
                        {error || portfoliosError}
                    </Text>
                    <Button
                        style={styles.retryButton}
                        status='primary'
                        onPress={onRefresh}
                    >
                        {t('common.tryAgain')}
                    </Button>
                </Layout>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title={t('shares.title')}
                alignment='center'
                accessoryLeft={renderLeftActions}
                style={{ backgroundColor: colors.background }}
            />

            <TabView
                selectedIndex={selectedIndex}
                onSelect={index => setSelectedIndex(index)}
                style={styles.tabView}
            >
                <Tab
                    title={t('shares.expenseGroupsCount', { count: expensesGroups.length })}
                    icon={(props) => <Ionicons name="people-outline" size={20} color={props?.focused ? colors.primary : colors.icon} />}
                >
                    {renderExpenseGroupsTab()}
                </Tab>
                <Tab
                    title={t('shares.portfolioGroups')}
                    icon={(props) => <Ionicons name="briefcase-outline" size={20} color={props?.focused ? colors.primary : colors.icon} />}
                >
                    {renderPortfoliosTab()}
                </Tab>
            </TabView>

            {((expensesGroups.length > 0 && selectedIndex === 0) || (portfolios.length > 0 && selectedIndex === 1)) && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.primary }]}
                    onPress={selectedIndex === 0 ? handleCreateGroup : handleCreatePortfolio}
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
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    groupsList: {
        gap: 12,
        paddingVertical: 20,
    },
    groupCard: {
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 12,
    },
    groupCardContent: {
        padding: 16,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    groupMainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    groupDetails: {
        flex: 1,
    },
    groupTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    groupSubtitle: {
        fontSize: 14,
    },
    groupAmount: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    groupFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    groupStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 12,
        fontWeight: '500',
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
    tabView: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
    },
});
