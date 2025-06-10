import React, { useState } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity, View, FlatList, StatusBar, ScrollView } from 'react-native';
import {
    Layout,
    Text,
    Card,
    Button,
    Spinner,
    TopNavigation,
    List,
    ListItem,
    Divider
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { ExpenseGroupWithDecryptedData } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';

export default function GroupsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { expensesGroups, isLoading, error } = useExpense();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        // The context will handle refreshing
        setTimeout(() => setRefreshing(false), 2000);
    }, []);

    const handleCreateGroup = () => {
        router.push('/(protected)/create-group');
    };

    const handleGroupPress = (group: ExpenseGroupWithDecryptedData) => {
        router.push(`/(protected)/group-detail?id=${group.id}`);
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
                return 'Active';
            case 'pending':
                return 'Pending';
            case 'rejected':
                return 'Rejected';
            default:
                return 'Unknown';
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
                                    {item.data.name || 'Unnamed Group'}
                                </Text>
                                <Text style={[styles.groupSubtitle, { color: colors.icon }]}>
                                    {item.data.description || 'No description'}
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
                                    {expenseCount} expense{expenseCount !== 1 ? 's' : ''}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Ionicons name="people-outline" size={14} color={colors.icon} />
                                <Text style={[styles.statText, { color: colors.icon }]}>
                                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <Layout style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
            <Text category='h6' style={styles.emptyTitle}>No expense groups yet</Text>
            <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                Create your first expense group to start sharing expenses with others
            </Text>
            <Button
                style={styles.addButton}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleCreateGroup}
            >
                Create Group
            </Button>
        </Layout>
    );

    const renderRightAction = () => (
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#8F9BB3" />
        </TouchableOpacity>
    );

    const navigateBack = () => {
        router.back();
    };

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
    );

    if (isLoading && !refreshing) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <TopNavigation
                        title='Expense Groups'
                        alignment='center'
                        accessoryLeft={renderBackAction}
                        accessoryRight={renderRightAction}
                        style={{ backgroundColor: colors.background }}
                    />
                    <AuthSetupLoader />
                </SafeAreaView>
            </ThemedView>
        );
    }

    if (error) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <TopNavigation
                        title='Expense Groups'
                        alignment='center'
                        accessoryLeft={renderBackAction}
                        accessoryRight={renderRightAction}
                        style={{ backgroundColor: colors.background }}
                    />
                    <Layout style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" style={styles.errorIcon} />
                        <Text category='h6' style={styles.errorTitle}>Error loading groups</Text>
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
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <TopNavigation
                    title='Expense Groups'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    accessoryRight={renderRightAction}
                    style={{ backgroundColor: colors.background }}
                />

                {expensesGroups.length === 0 ? (
                    renderEmptyState()
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

                <Button
                    style={styles.fab}
                    accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                    onPress={handleCreateGroup}
                    size='large'
                    status='primary'
                />
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
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
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        paddingVertical: 20,
        paddingBottom: 16,
    },
    welcomeSection: {
        marginBottom: 24,
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
    summaryCard: {
        padding: 24,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 24,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    summaryNumber: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    groupsList: {
        gap: 12,
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
        borderRadius: 28,
        elevation: 8,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    refreshButton: {
        padding: 8,
    },
    backButton: {
        padding: 8,
    },
});
