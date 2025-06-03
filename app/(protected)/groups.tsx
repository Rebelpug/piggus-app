import React, { useState } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
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

export default function GroupsScreen() {
    const router = useRouter();
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
            <ListItem
                title={item.data.name || 'Unnamed Group'}
                description={item.data.description || 'No description'}
                accessoryLeft={() => (
                    <Layout style={[
                        styles.statusIndicator,
                        { backgroundColor: getGroupStatusColor(item.membership_status || 'confirmed') }
                    ]} />
                )}
                accessoryRight={() => (
                    <Layout style={styles.groupInfo}>
                        <Text category='c1' appearance='hint' style={styles.groupStats}>
                            {expenseCount} expense{expenseCount !== 1 ? 's' : ''} • {memberCount} member{memberCount !== 1 ? 's' : ''}
                        </Text>
                        <Text category='s2' style={styles.groupTotal}>
                            ${totalAmount.toFixed(2)}
                        </Text>
                        <Text category='c1' style={[
                            styles.groupStatus,
                            { color: getGroupStatusColor(item.membership_status || 'confirmed') }
                        ]}>
                            {getGroupStatusText(item.membership_status || 'confirmed')}
                        </Text>
                    </Layout>
                )}
                onPress={() => handleGroupPress(item)}
            />
        );
    };

    const renderHeader = () => {
        const confirmedGroups = expensesGroups.filter(group => group.membership_status === 'confirmed');
        const pendingGroups = expensesGroups.filter(group => group.membership_status === 'pending');

        return (
            <Layout style={styles.header}>
                <Layout style={styles.summaryCard}>
                    <Card style={styles.card}>
                        <Text category='h6' style={styles.summaryTitle}>Groups Summary</Text>
                        <Layout style={styles.summaryRow}>
                            <Layout style={styles.summaryItem}>
                                <Text category='h5' style={styles.summaryNumber}>
                                    {confirmedGroups.length}
                                </Text>
                                <Text category='c1' appearance='hint'>Active</Text>
                            </Layout>
                            {pendingGroups.length > 0 && (
                                <Layout style={styles.summaryItem}>
                                    <Text category='h5' style={[styles.summaryNumber, { color: '#FF9800' }]}>
                                        {pendingGroups.length}
                                    </Text>
                                    <Text category='c1' appearance='hint'>Pending</Text>
                                </Layout>
                            )}
                        </Layout>
                    </Card>
                </Layout>
            </Layout>
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
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title='Expense Groups'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    accessoryRight={renderRightAction}
                />
                <AuthSetupLoader />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title='Expense Groups'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    accessoryRight={renderRightAction}
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
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <TopNavigation
                title='Expense Groups'
                alignment='center'
                accessoryLeft={renderBackAction}
                accessoryRight={renderRightAction}
            />

            {expensesGroups.length === 0 ? (
                renderEmptyState()
            ) : (
                <List
                    style={styles.list}
                    data={expensesGroups}
                    renderItem={renderGroupItem}
                    ItemSeparatorComponent={Divider}
                    ListHeaderComponent={renderHeader}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                />
            )}

            <Button
                style={styles.fab}
                accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                onPress={handleCreateGroup}
                size='large'
                status='primary'
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
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
    header: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    summaryCard: {
        marginBottom: 16,
    },
    card: {
        padding: 16,
    },
    summaryTitle: {
        marginBottom: 12,
        textAlign: 'center',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryNumber: {
        marginBottom: 4,
        color: '#2E7D32',
    },
    list: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    groupInfo: {
        alignItems: 'flex-end',
    },
    groupStats: {
        marginBottom: 2,
    },
    groupTotal: {
        fontWeight: '600',
        color: '#2E7D32',
        marginBottom: 2,
    },
    groupStatus: {
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
