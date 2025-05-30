import React, { useState, useMemo } from 'react';
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
    Divider,
    Input,
    Modal,
    Tab,
    TabView
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { ExpenseWithDecryptedData } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';

export default function GroupDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { expensesGroups, inviteUserToGroup, handleGroupInvitation } = useExpense();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);

    const group = useMemo(() => {
        return expensesGroups.find(g => g.id === id);
    }, [expensesGroups, id]);

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
                Alert.alert('Success', 'User invited successfully!');
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

    const handleInvitation = async (accept: boolean) => {
        if (!group) return;

        try {
            const result = await handleGroupInvitation(group.id, accept);

            if (result.success) {
                Alert.alert(
                    'Success',
                    accept ? 'Invitation accepted!' : 'Invitation declined',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
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
            return `$${amount.toFixed(2)}`;
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

        return (
            <ListItem
                title={item.data.name || 'Unnamed Expense'}
                description={formatDate(item.data.date)}
                accessoryLeft={() => (
                    <Layout style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(item.data.category) }]} />
                )}
                accessoryRight={() => (
                    <Layout style={styles.amountContainer}>
                        <Text category='s1' style={styles.amount}>
                            {formatCurrency(item.data.amount || 0, item.data.currency)}
                        </Text>
                        <Text category='c1' appearance='hint' style={styles.category}>
                            {item.data.category || 'other'}
                        </Text>
                    </Layout>
                )}
                onPress={() => {
                    Alert.alert(
                        'Expense Details',
                        `${item.data.name || 'Unnamed'}\n${item.data.description || 'No description'}`
                    );
                }}
            />
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

        return (
            <ListItem
                title={item.username || 'Unknown User'}
                description={`Member since ${formatDate(item.created_at)}`}
                accessoryLeft={() => (
                    <Layout style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                )}
                accessoryRight={() => (
                    <Text category='c1' style={[styles.memberStatus, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                )}
            />
        );
    };

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
    );

    const renderRightAction = () => (
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#8F9BB3" />
        </TouchableOpacity>
    );

    if (!group) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title='Group Details'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                />
                <Layout style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" style={styles.errorIcon} />
                    <Text category='h6' style={styles.errorTitle}>Group not found</Text>
                    <Text category='s1' appearance='hint' style={styles.errorDescription}>
                        The requested group could not be found.
                    </Text>
                    <Button onPress={navigateBack}>Go Back</Button>
                </Layout>
            </SafeAreaView>
        );
    }

    const totalAmount = group.expenses?.reduce((sum, expense) => {
        try {
            return sum + (expense.data?.amount || 0);
        } catch {
            return sum;
        }
    }, 0) || 0;

    const isPending = group.membership_status === 'pending';

    return (
        <SafeAreaView style={styles.container}>
            <TopNavigation
                title={group.data?.name || 'Group Details'}
                alignment='center'
                accessoryLeft={renderBackAction}
                accessoryRight={renderRightAction}
            />

            {isPending ? (
                <Layout style={styles.pendingContainer}>
                    <Card style={styles.pendingCard}>
                        <Layout style={styles.pendingHeader}>
                            <Ionicons name="mail-outline" size={48} color="#FF9800" style={styles.pendingIcon} />
                            <Text category='h6' style={styles.pendingTitle}>Invitation Pending</Text>
                            <Text category='s1' appearance='hint' style={styles.pendingDescription}>
                                You&apos;ve been invited to join &#34;{group.data?.name}&#34;. Would you like to accept this invitation?
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
                    <Layout style={styles.header}>
                        <Card style={styles.summaryCard}>
                            <Text category='h6' style={styles.groupName}>{group.data?.name}</Text>
                            {group.data?.description && (
                                <Text category='s1' appearance='hint' style={styles.groupDescription}>
                                    {group.data.description}
                                </Text>
                            )}
                            <Layout style={styles.summaryRow}>
                                <Layout style={styles.summaryItem}>
                                    <Text category='h5' style={styles.summaryNumber}>
                                        {formatCurrency(totalAmount)}
                                    </Text>
                                    <Text category='c1' appearance='hint'>Total Expenses</Text>
                                </Layout>
                                <Layout style={styles.summaryItem}>
                                    <Text category='h5' style={styles.summaryNumber}>
                                        {group.expenses?.length || 0}
                                    </Text>
                                    <Text category='c1' appearance='hint'>Expenses</Text>
                                </Layout>
                                <Layout style={styles.summaryItem}>
                                    <Text category='h5' style={styles.summaryNumber}>
                                        {group.members?.length || 0}
                                    </Text>
                                    <Text category='c1' appearance='hint'>Members</Text>
                                </Layout>
                            </Layout>
                        </Card>
                    </Layout>

                    <TabView
                        style={styles.tabView}
                        selectedIndex={selectedIndex}
                        onSelect={index => setSelectedIndex(index)}
                    >
                        <Tab title='Expenses'>
                            <Layout style={styles.tabContent}>
                                {group.expenses && group.expenses.length > 0 ? (
                                    <List
                                        style={styles.list}
                                        data={group.expenses}
                                        renderItem={renderExpenseItem}
                                        ItemSeparatorComponent={Divider}
                                    />
                                ) : (
                                    <Layout style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
                                        <Text category='h6' style={styles.emptyTitle}>No members</Text>
                                        <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                                            Invite others to join this group
                                        </Text>
                                    </Layout>
                                )}
                            </Layout>
                        </Tab>
                    </TabView>

                    <Button
                        style={styles.fab}
                        accessoryLeft={(props) => <Ionicons name="add" size={20} color={props?.style?.tintColor || '#FFFFFF'} />}
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
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
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
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    summaryCard: {
        padding: 16,
    },
    groupName: {
        textAlign: 'center',
        marginBottom: 8,
    },
    groupDescription: {
        textAlign: 'center',
        marginBottom: 16,
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
    list: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    categoryIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    amountContainer: {
        alignItems: 'flex-end',
    },
    amount: {
        fontWeight: '600',
        color: '#2E7D32',
    },
    category: {
        textTransform: 'capitalize',
        marginTop: 2,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    memberStatus: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    membersHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    inviteButton: {
        alignSelf: 'flex-end',
    },
    membersList: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
