import React, { useState, useMemo } from 'react';
import { StyleSheet, RefreshControl, Alert, TouchableOpacity, View, ScrollView } from 'react-native';
import {
    Layout,
    Text,
    Card,
    Button,
    Spinner,
    TopNavigation,
    List,
    ListItem,
    Divider,
    Input,
    Modal,
    Tab,
    TabView
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import { ExpenseWithDecryptedData, calculateGroupBalances, calculateUserShare } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function GroupDetailScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { expensesGroups, inviteUserToGroup, handleGroupInvitation, removeUserFromGroup } = useExpense();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const group = useMemo(() => {
        return expensesGroups.find(g => g.id === id);
    }, [expensesGroups, id]);

    // Calculate group balances
    const groupBalances = useMemo(() => {
        if (!group) return {};
        return calculateGroupBalances(group.expenses, group.members);
    }, [group]);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 2000);
    }, []);

    const navigateBack = () => {
        router.back();
    };

    const handleAddExpense = () => {
        router.push('/(protected)/add-expense');
    };

    const handleInviteUser = async () => {
        if (!inviteUsername.trim() || !group) {
            Alert.alert('Error', 'Please enter a username');
            return;
        }

        setInviteLoading(true);
        try {
            const result = await inviteUserToGroup(group.id, inviteUsername.trim());

            if (result.success) {
                setInviteModalVisible(false);
                setInviteUsername('');
            } else {
                Alert.alert('Error', result.error || 'Failed to invite user');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to invite user');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleRemoveUser = async (userId: string, username: string) => {
        if (!group) return;

        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${username} from this group?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await removeUserFromGroup(group.id, userId);
                            if (!result.success) {
                                Alert.alert('Error', result.error || 'Failed to remove member');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove member');
                        }
                    }
                }
            ]
        );
    };

    const handleInvitation = async (accept: boolean) => {
        if (!group) return;

        try {
            const result = await handleGroupInvitation(group.id, accept);

            if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to handle invitation');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to handle invitation');
        }
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

    const getCategoryColor = (category: string) => {
        const colors: { [key: string]: string } = {
            food: '#FF6B6B',
            transportation: '#4ECDC4',
            housing: '#45B7D1',
            utilities: '#96CEB4',
            entertainment: '#FFEAA7',
            shopping: '#DDA0DD',
            health: '#98D8C8',
            education: '#A8E6CF',
            personal: '#FFB6C1',
            travel: '#87CEEB',
            other: '#D3D3D3',
        };
        return colors[category] || colors.other;
    };

    const renderExpenseItem = ({ item }: { item: ExpenseWithDecryptedData }) => {
        if (!item || !item.data) {
            return null;
        }

        const userShare = calculateUserShare(item, user?.id || '');
        const isPayer = item.data.payer_user_id === user?.id;
        const isSharedExpense = item.data.participants.length > 1;

        return (
            <TouchableOpacity
                style={[styles.expenseCard, { backgroundColor: colors.card, shadowColor: colors.text }]}
                onPress={() => {
                    router.push({
                        pathname: '/(protected)/expense-detail',
                        params: {
                            expenseId: item.id,
                            groupId: item.group_id
                        }
                    });
                }}
            >
                <View style={styles.expenseCardContent}>
                    <View style={styles.expenseHeader}>
                        <View style={styles.expenseMainInfo}>
                            <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.data.category) + '20' }]}>
                                <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(item.data.category) }]} />
                            </View>
                            <View style={styles.expenseDetails}>
                                <Text style={[styles.expenseTitle, { color: colors.text }]}>
                                    {item.data.name || 'Unnamed Expense'}
                                </Text>
                                <Text style={[styles.expenseSubtitle, { color: colors.icon }]}>
                                    {formatDate(item.data.date)} • {item.data.participants.length} participant{item.data.participants.length !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.expenseAmount}>
                            <Text style={[styles.amountText, { color: colors.text }]}>
                                {formatCurrency(userShare, item.data.currency)}
                            </Text>
                            {isSharedExpense && (
                                <Text style={[styles.totalAmountText, { color: colors.icon }]}>
                                    of {formatCurrency(item.data.amount, item.data.currency)}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.expenseFooter}>
                        <View style={styles.expenseCategory}>
                            <Text style={[styles.categoryText, { color: colors.icon }]}>
                                {item.data.category || 'other'}
                            </Text>
                        </View>
                        {isPayer && (
                            <View style={[styles.payerBadge, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.payerText, { color: colors.primary }]}>
                                    You paid
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderMemberItem = ({ item }: { item: any }) => {
        const getStatusColor = (status: string) => {
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

        const isCurrentUser = item.user_id === user?.id;
        const canRemove = item.status === 'confirmed' && !isCurrentUser;
        const balance = groupBalances[item.user_id] || 0;
        const isPositive = balance > 0;
        const isZero = Math.abs(balance) < 0.01;

        return (
            <ListItem
                title={item.username || 'Unknown User'}
                description={`Member since ${formatDate(item.created_at)}`}
                accessoryLeft={() => (
                    <Layout style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                )}
                accessoryRight={() => (
                    <Layout style={styles.memberAccessory}>
                        <Layout style={styles.memberInfo}>
                            <Layout style={styles.memberStatus}>
                                <Text category='c1' style={[styles.memberStatusText, { color: getStatusColor(item.status) }]}>
                                    {item.status}
                                </Text>
                                {isCurrentUser && (
                                    <Text category='c1' style={styles.currentUserText}>
                                        (You)
                                    </Text>
                                )}
                            </Layout>
                            {item.status === 'confirmed' && (
                                <Layout style={styles.balanceInfo}>
                                    <Text
                                        category='s1'
                                        style={[
                                            styles.balanceAmount,
                                            { color: isZero ? '#666' : isPositive ? '#4CAF50' : '#F44336' }
                                        ]}
                                    >
                                        {isPositive ? '+' : ''}{formatCurrency(balance, group?.data?.currency)}
                                    </Text>
                                    <Text category='c1' appearance='hint' style={styles.balanceStatus}>
                                        {isZero ? 'Settled' : isPositive ? 'Is owed' : 'Owes'}
                                    </Text>
                                </Layout>
                            )}
                        </Layout>
                        {canRemove && (
                            <TouchableOpacity
                                onPress={() => handleRemoveUser(item.user_id, item.username)}
                                style={styles.removeButton}
                            >
                                <Ionicons name="person-remove-outline" size={20} color="#F44336" />
                            </TouchableOpacity>
                        )}
                    </Layout>
                )}
            />
        );
    };

    const renderBalancesTab = () => {
        const confirmedMembers = group?.members?.filter(m => m.status === 'confirmed') || [];
        const sortedBalances = confirmedMembers
            .map(member => ({
                ...member,
                balance: groupBalances[member.user_id] || 0
            }))
            .sort((a, b) => b.balance - a.balance);

        return (
            <Layout style={styles.tabContent}>
                <Layout style={styles.balancesHeader}>
                    <Text category='h6' style={styles.balancesTitle}>Group Balances</Text>
                    <Text category='c1' appearance='hint' style={styles.balancesSubtitle}>
                        Who owes what in this group
                    </Text>
                </Layout>

                {sortedBalances.length > 0 ? (
                    <List
                        style={styles.balancesList}
                        data={sortedBalances}
                        renderItem={({ item }) => {
                            const isCurrentUser = item.user_id === user?.id;
                            const isPositive = item.balance > 0;
                            const isZero = Math.abs(item.balance) < 0.01;

                            return (
                                <ListItem
                                    title={item.username + (isCurrentUser ? ' (You)' : '')}
                                    accessoryRight={() => (
                                        <Layout style={styles.balanceItemRight}>
                                            <Text
                                                category='h6'
                                                style={[
                                                    styles.balanceAmountLarge,
                                                    { color: isZero ? '#666' : isPositive ? '#4CAF50' : '#F44336' }
                                                ]}
                                            >
                                                {isPositive ? '+' : ''}{formatCurrency(item.balance, group?.data?.currency)}
                                            </Text>
                                            <Text category='c1' appearance='hint' style={styles.balanceStatusLarge}>
                                                {isZero ? 'Settled up' : isPositive ? 'gets back' : 'owes'}
                                            </Text>
                                        </Layout>
                                    )}
                                />
                            );
                        }}
                        ItemSeparatorComponent={Divider}
                    />
                ) : (
                    <Layout style={styles.emptyBalances}>
                        <Ionicons name="calculator-outline" size={48} color="#8F9BB3" style={styles.emptyIcon} />
                        <Text category='s1' appearance='hint' style={styles.emptyText}>
                            No balances to show
                        </Text>
                    </Layout>
                )}
            </Layout>
        );
    };

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>
    );

    const renderRightAction = () => (
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={colors.icon} />
        </TouchableOpacity>
    );

    if (!group) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <TopNavigation
                        title='Group Details'
                        alignment='center'
                        accessoryLeft={renderBackAction}
                        style={{ backgroundColor: colors.background }}
                    />
                    <Layout style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color={colors.error} style={styles.errorIcon} />
                        <Text category='h6' style={[styles.errorTitle, { color: colors.text }]}>Group not found</Text>
                        <Text category='s1' appearance='hint' style={[styles.errorDescription, { color: colors.icon }]}>
                            The requested group could not be found.
                        </Text>
                        <Button onPress={navigateBack}>Go Back</Button>
                    </Layout>
                </SafeAreaView>
            </ThemedView>
        );
    }

    const totalAmount = group.expenses?.reduce((sum, expense) => {
        try {
            return sum + (expense.data?.amount || 0);
        } catch {
            return sum;
        }
    }, 0) || 0;

    const userTotalShare = group.expenses?.reduce((sum, expense) => {
        try {
            return sum + calculateUserShare(expense, user?.id || '');
        } catch {
            return sum;
        }
    }, 0) || 0;

    const isPending = group.membership_status === 'pending';

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <TopNavigation
                    title={group.data?.name || 'Group Details'}
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    accessoryRight={renderRightAction}
                    style={{ backgroundColor: colors.background }}
                />

            {isPending ? (
                <Layout style={styles.pendingContainer}>
                    <Card style={styles.pendingCard}>
                        <Layout style={styles.pendingHeader}>
                            <Ionicons name="mail-outline" size={48} color="#FF9800" style={styles.pendingIcon} />
                            <Text category='h6' style={styles.pendingTitle}>Invitation Pending</Text>
                            <Text category='s1' appearance='hint' style={styles.pendingDescription}>
                                You've been invited to join "{group.data?.name}". Would you like to accept this invitation?
                            </Text>
                        </Layout>
                        <Layout style={styles.pendingActions}>
                            <Button
                                style={[styles.actionButton, styles.declineButton]}
                                status='danger'
                                onPress={() => handleInvitation(false)}
                            >
                                Decline
                            </Button>
                            <Button
                                style={styles.actionButton}
                                status='success'
                                onPress={() => handleInvitation(true)}
                            >
                                Accept
                            </Button>
                        </Layout>
                    </Card>
                </Layout>
            ) : (
                <>
                    <View style={styles.header}>
                        <View style={[styles.summaryCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                            <Text style={[styles.groupName, { color: colors.text }]}>{group.data?.name}</Text>
                            {group.data?.description && (
                                <Text style={[styles.groupDescription, { color: colors.icon }]}>
                                    {group.data.description}
                                </Text>
                            )}
                            <View style={styles.currencyInfo}>
                                <Ionicons name="card-outline" size={16} color={colors.icon} />
                                <Text style={[styles.currencyText, { color: colors.icon }]}>
                                    Default Currency: {group.data?.currency || 'USD'}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryNumber, { color: colors.primary }]}>
                                        {formatCurrency(userTotalShare, group.data?.currency)}
                                    </Text>
                                    <Text style={[styles.summaryLabel, { color: colors.icon }]}>Your Share</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryNumber, { color: colors.primary }]}>
                                        {group.expenses?.length || 0}
                                    </Text>
                                    <Text style={[styles.summaryLabel, { color: colors.icon }]}>Expenses</Text>
                                </View>
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryNumber, { color: colors.primary }]}>
                                        {group.members?.filter(m => m.status === 'confirmed').length || 0}
                                    </Text>
                                    <Text style={[styles.summaryLabel, { color: colors.icon }]}>Members</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <TabView
                        style={styles.tabView}
                        selectedIndex={selectedIndex}
                        onSelect={index => setSelectedIndex(index)}
                    >
                        <Tab title='Expenses'>
                            <View style={styles.tabContent}>
                                {group.expenses && group.expenses.length > 0 ? (
                                    <ScrollView style={styles.expensesList} showsVerticalScrollIndicator={false}>
                                        <View style={styles.expensesContainer}>
                                            {group.expenses.map((item) => (
                                                <View key={item.id}>
                                                    {renderExpenseItem({ item })}
                                                </View>
                                            ))}
                                        </View>
                                        <View style={{ height: 100 }} />
                                    </ScrollView>
                                ) : (
                                    <Layout style={styles.emptyState}>
                                        <Ionicons name="document-text-outline" size={64} color={colors.icon} style={styles.emptyIcon} />
                                        <Text category='h6' style={[styles.emptyTitle, { color: colors.text }]}>No expenses yet</Text>
                                        <Text category='s1' appearance='hint' style={[styles.emptyDescription, { color: colors.icon }]}>
                                            Start tracking expenses for this group
                                        </Text>
                                        <Button
                                            style={styles.addButton}
                                            accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                                            onPress={handleAddExpense}
                                        >
                                            Add Expense
                                        </Button>
                                    </Layout>
                                )}
                            </View>
                        </Tab>
                        <Tab title='Balances'>
                            {renderBalancesTab()}
                        </Tab>
                        <Tab title='Members'>
                            <Layout style={styles.tabContent}>
                                <Layout style={styles.membersHeader}>
                                    <Text category='h6' style={styles.membersTitle}>Group Members</Text>
                                    <Button
                                        style={styles.inviteButton}
                                        size='small'
                                        accessoryLeft={(props) => <Ionicons name="person-add-outline" size={16} color={props?.tintColor || '#FFFFFF'} />}
                                        onPress={() => setInviteModalVisible(true)}
                                    >
                                        Invite
                                    </Button>
                                </Layout>
                                {group.members && group.members.length > 0 ? (
                                    <List
                                        style={styles.membersList}
                                        data={group.members}
                                        renderItem={renderMemberItem}
                                        ItemSeparatorComponent={Divider}
                                    />
                                ) : (
                                    <Layout style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
                                        <Text category='h6' style={styles.emptyTitle}>No members</Text>
                                        <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                                            Invite others to join this group
                                        </Text>
                                        <Button
                                            style={styles.addButton}
                                            accessoryLeft={(props) => <Ionicons name="person-add-outline" size={20} color={props?.tintColor || '#FFFFFF'} />}
                                            onPress={() => setInviteModalVisible(true)}
                                        >
                                            Invite Member
                                        </Button>
                                    </Layout>
                                )}
                            </Layout>
                        </Tab>
                    </TabView>

                    <Button
                        style={styles.fab}
                        accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.tintColor || '#FFFFFF'} />}
                        onPress={handleAddExpense}
                        size='large'
                        status='primary'
                    />
                </>
            )}

                <Modal
                    visible={inviteModalVisible}
                    backdropStyle={styles.backdrop}
                    onBackdropPress={() => setInviteModalVisible(false)}
                >
                    <Card disabled={true}>
                        <Text category='h6' style={styles.modalTitle}>Invite Member</Text>
                        <Text category='s1' appearance='hint' style={styles.modalDescription}>
                            Enter the username of the person you want to invite to this group.
                        </Text>

                        <Input
                            style={styles.modalInput}
                            placeholder='Enter username'
                            value={inviteUsername}
                            onChangeText={setInviteUsername}
                            autoCapitalize='none'
                        />

                        <Layout style={styles.modalActions}>
                            <Button
                                style={styles.modalButton}
                                appearance='outline'
                                onPress={() => {
                                    setInviteModalVisible(false);
                                    setInviteUsername('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                style={styles.modalButton}
                                onPress={handleInviteUser}
                                disabled={inviteLoading}
                                accessoryLeft={inviteLoading ? () => <Spinner size='small' status='control' /> : undefined}
                            >
                                {inviteLoading ? 'Inviting...' : 'Send Invite'}
                            </Button>
                        </Layout>
                    </Card>
                </Modal>
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
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    summaryCard: {
        padding: 24,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    groupName: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    groupDescription: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    currencyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    currencyText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: '500',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryNumber: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    pendingContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    pendingCard: {
        padding: 24,
    },
    pendingHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    pendingIcon: {
        marginBottom: 16,
    },
    pendingTitle: {
        marginBottom: 8,
        textAlign: 'center',
    },
    pendingDescription: {
        textAlign: 'center',
        lineHeight: 20,
    },
    pendingActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        flex: 1,
    },
    declineButton: {
        marginRight: 8,
    },
    tabView: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
    },
    expensesList: {
        flex: 1,
    },
    expensesContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
        gap: 12,
    },
    expenseCard: {
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 12,
    },
    expenseCardContent: {
        padding: 16,
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    expenseMainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    categoryDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    expenseDetails: {
        flex: 1,
    },
    expenseTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    expenseSubtitle: {
        fontSize: 14,
    },
    expenseAmount: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    totalAmountText: {
        fontSize: 12,
    },
    expenseFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 12,
    },
    expenseCategory: {
        flex: 1,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    payerBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    payerText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    memberAccessory: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberInfo: {
        alignItems: 'flex-end',
        marginRight: 8,
    },
    memberStatus: {
        alignItems: 'flex-end',
    },
    memberStatusText: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    currentUserText: {
        fontSize: 10,
        fontStyle: 'italic',
    },
    balanceInfo: {
        alignItems: 'flex-end',
        marginTop: 4,
    },
    balanceAmount: {
        fontSize: 14,
        fontWeight: '600',
    },
    balanceStatus: {
        fontSize: 10,
        marginTop: 1,
    },
    removeButton: {
        padding: 4,
    },
    balancesHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    balancesTitle: {
        marginBottom: 4,
    },
    balancesSubtitle: {
        lineHeight: 18,
    },
    balancesList: {
        flex: 1,
    },
    balanceItemRight: {
        alignItems: 'flex-end',
    },
    balanceAmountLarge: {
        fontWeight: '700',
        fontSize: 18,
    },
    balanceStatusLarge: {
        marginTop: 2,
        fontSize: 12,
    },
    emptyBalances: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 16,
    },
    membersHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    membersTitle: {
        flex: 1,
    },
    inviteButton: {
        paddingHorizontal: 16,
    },
    membersList: {
        flex: 1,
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
    backButton: {
        padding: 8,
    },
    refreshButton: {
        padding: 8,
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalTitle: {
        marginBottom: 8,
    },
    modalDescription: {
        marginBottom: 16,
        lineHeight: 20,
    },
    modalInput: {
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    modalButton: {
        marginLeft: 8,
    },
});
