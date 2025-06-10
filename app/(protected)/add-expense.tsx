import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity, View } from 'react-native';
import {
    Layout,
    Text,
    Input,
    Button,
    Select,
    SelectItem,
    IndexPath,
    Datepicker,
    Toggle,
    TopNavigation,
    Card,
    Spinner,
    CheckBox
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import {
    ExpenseData,
    EXPENSE_CATEGORIES,
    PAYMENT_METHODS,
    CURRENCIES,
    SPLIT_METHODS,
    ExpenseParticipant,
    calculateEqualSplit
} from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';

export default function AddExpenseScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { expensesGroups, addExpense } = useExpense();
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<IndexPath | undefined>();
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(0));
    const [selectedGroupIndex, setSelectedGroupIndex] = useState<IndexPath | undefined>();
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringInterval, setRecurringInterval] = useState('');
    // Sharing state
    const [selectedPayerIndex, setSelectedPayerIndex] = useState<IndexPath | undefined>();
    const [selectedSplitMethodIndex, setSelectedSplitMethodIndex] = useState<IndexPath>(new IndexPath(0)); // Default to equal split
    const [participants, setParticipants] = useState<ExpenseParticipant[]>([]);
    const [customAmounts, setCustomAmounts] = useState<{ [userId: string]: string }>({});

    // Filter out groups that are confirmed
    const availableGroups = React.useMemo(() => {
        try {
            if (!expensesGroups || !Array.isArray(expensesGroups)) {
                return [];
            }
            return expensesGroups.filter(group =>
                group && group.membership_status === 'confirmed'
            );
        } catch (error) {
            console.error('Error filtering groups:', error);
            return [];
        }
    }, [expensesGroups]);

    // Set default group to private group
    useEffect(() => {
        if (availableGroups.length > 0) {
            console.log('Available groups:', availableGroups);
            const privateGroupIndex = availableGroups.findIndex(group => group.data.private === true);
            if (privateGroupIndex !== -1) {
                setSelectedGroupIndex(new IndexPath(privateGroupIndex));
            }
        }
    }, [availableGroups]);

    // Get current group members
    const currentGroupMembers = React.useMemo(() => {
        if (!selectedGroupIndex || !availableGroups.length) return [];
        const selectedGroup = availableGroups[selectedGroupIndex.row];
        return selectedGroup?.members || [];
    }, [selectedGroupIndex, availableGroups]);

    // Update currency when group is selected
    useEffect(() => {
        if (selectedGroupIndex && availableGroups.length > 0) {
            const selectedGroup = availableGroups[selectedGroupIndex.row];
            if (selectedGroup && selectedGroup.data.currency) {
                const currencyIndex = CURRENCIES.findIndex(currency =>
                    currency.value === selectedGroup.data.currency
                );
                if (currencyIndex !== -1) {
                    setSelectedCurrencyIndex(new IndexPath(currencyIndex));
                }
            }
        }
    }, [selectedGroupIndex, availableGroups]);

    // Initialize participants when group is selected
    useEffect(() => {
        if (currentGroupMembers.length > 0) {
            // Set default payer to current user
            const currentUserMember = currentGroupMembers.find(member => member.user_id === user?.id);
            if (currentUserMember) {
                const payerIndex = currentGroupMembers.findIndex(member => member.user_id === user?.id);
                setSelectedPayerIndex(new IndexPath(payerIndex));
            }

            // Initialize all members as participants for multi-member groups
            if (currentGroupMembers.length > 1) {
                const initialParticipants: ExpenseParticipant[] = currentGroupMembers.map(member => ({
                    user_id: member.user_id,
                    username: member.username,
                    share_amount: 0
                }));
                setParticipants(initialParticipants);
            } else {
                // For single-member groups, only include that member
                const singleParticipant: ExpenseParticipant[] = [{
                    user_id: currentGroupMembers[0].user_id,
                    username: currentGroupMembers[0].username,
                    share_amount: 0
                }];
                setParticipants(singleParticipant);
            }
        }
    }, [currentGroupMembers, user?.id]);

    // Recalculate shares when amount or split method changes
    useEffect(() => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

        const totalAmount = Number(amount);
        const splitMethod = SPLIT_METHODS[selectedSplitMethodIndex.row]?.value || 'equal';

        if (splitMethod === 'equal') {
            const activeParticipants = participants.filter(p => p.share_amount >= 0 || participants.length === 1);
            if (activeParticipants.length > 0) {
                const sharePerPerson = calculateEqualSplit(totalAmount, activeParticipants.length);
                setParticipants(prev =>
                    prev.map(p => {
                        if (activeParticipants.find(ap => ap.user_id === p.user_id)) {
                            return { ...p, share_amount: sharePerPerson };
                        }
                        return { ...p, share_amount: 0 };
                    })
                );
            }
        }
    }, [amount, selectedSplitMethodIndex, participants.length]);

    const navigateBack = () => {
        router.back();
    };

    const validateForm = (): boolean => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Please enter an expense name');
            return false;
        }
        if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid amount');
            return false;
        }
        if (!selectedCategoryIndex) {
            Alert.alert('Validation Error', 'Please select a category');
            return false;
        }
        if (!selectedGroupIndex) {
            Alert.alert('Validation Error', 'Please select an expense group');
            return false;
        }
        if (!selectedPayerIndex) {
            Alert.alert('Validation Error', 'Please select who paid for this expense');
            return false;
        }

        // Validate participants and shares
        const activeParticipants = participants.filter(p => p.share_amount > 0);
        if (activeParticipants.length === 0) {
            Alert.alert('Validation Error', 'Please select at least one participant');
            return false;
        }

        const totalShares = activeParticipants.reduce((sum, p) => sum + p.share_amount, 0);
        const totalAmount = Number(amount);
        if (Math.abs(totalShares - totalAmount) > 0.01) {
            Alert.alert('Validation Error', `Total shares (${totalShares.toFixed(2)}) must equal the expense amount (${totalAmount.toFixed(2)})`);
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const selectedGroup = availableGroups[selectedGroupIndex!.row];
            const selectedCategory = EXPENSE_CATEGORIES[selectedCategoryIndex!.row];
            const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
            const selectedPayer = currentGroupMembers[selectedPayerIndex!.row];
            const selectedSplitMethod = SPLIT_METHODS[selectedSplitMethodIndex.row];

            const activeParticipants = participants.filter(p => p.share_amount > 0);

            const expenseData: ExpenseData = {
                name: name.trim(),
                description: description.trim(),
                amount: Number(amount),
                date: date.toISOString().split('T')[0],
                category: selectedCategory.value,
                is_recurring: isRecurring,
                recurring_interval: isRecurring ? recurringInterval : undefined,
                currency: selectedCurrency.value,
                status: 'completed',
                payer_user_id: selectedPayer.user_id,
                payer_username: selectedPayer.username,
                participants: activeParticipants,
                split_method: selectedSplitMethod.value as 'equal' | 'custom' | 'percentage',
            };

            const result = await addExpense(selectedGroup.id, expenseData);

            if (result) {
                Alert.alert(
                    'Success',
                    'Expense added successfully!',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Error', 'Failed to add expense. Please try again.');
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleParticipant = (userId: string) => {
        const splitMethod = SPLIT_METHODS[selectedSplitMethodIndex.row]?.value || 'equal';

        setParticipants(prev => {
            const updated = prev.map(p => {
                if (p.user_id === userId) {
                    const isCurrentlyActive = p.share_amount > 0;
                    if (isCurrentlyActive) {
                        return { ...p, share_amount: 0 };
                    } else {
                        // When activating, calculate share based on split method
                        if (splitMethod === 'equal') {
                            const totalAmount = Number(amount) || 0;
                            const activeCount = prev.filter(participant =>
                                participant.share_amount > 0 || participant.user_id === userId
                            ).length;
                            return { ...p, share_amount: calculateEqualSplit(totalAmount, activeCount) };
                        }
                        return { ...p, share_amount: 0 };
                    }
                }
                return p;
            });

            // Recalculate equal split for all active participants
            if (splitMethod === 'equal' && amount) {
                const totalAmount = Number(amount);
                const activeParticipants = updated.filter(p => p.share_amount > 0);
                if (activeParticipants.length > 0) {
                    const sharePerPerson = calculateEqualSplit(totalAmount, activeParticipants.length);
                    return updated.map(p =>
                        p.share_amount > 0 ? { ...p, share_amount: sharePerPerson } : p
                    );
                }
            }

            return updated;
        });
    };

    const updateCustomAmount = (userId: string, amountStr: string) => {
        const newAmount = parseFloat(amountStr) || 0;
        setParticipants(prev =>
            prev.map(p =>
                p.user_id === userId ? { ...p, share_amount: newAmount } : p
            )
        );
        setCustomAmounts(prev => ({ ...prev, [userId]: amountStr }));
    };

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
    );

    const CalendarIcon = (props: any) => (
        <Ionicons name="calendar-outline" size={20} color="#8F9BB3" />
    );

    const renderSharingSection = () => {
        if (currentGroupMembers.length <= 1) return null;

        const splitMethod = SPLIT_METHODS[selectedSplitMethodIndex.row]?.value || 'equal';
        const totalShares = participants.reduce((sum, p) => sum + p.share_amount, 0);
        const totalAmount = Number(amount) || 0;
        const isBalanced = Math.abs(totalShares - totalAmount) < 0.01;

        return (
            <Card style={styles.card}>
                <Text category='h6' style={styles.sectionTitle}>Expense Sharing</Text>

                <Select
                    style={styles.input}
                    label='Who Paid?'
                    placeholder='Select who paid for this expense'
                    value={selectedPayerIndex ? currentGroupMembers[selectedPayerIndex.row]?.username : ''}
                    selectedIndex={selectedPayerIndex}
                    onSelect={(index) => setSelectedPayerIndex(index as IndexPath)}
                    status={selectedPayerIndex ? 'basic' : 'danger'}
                >
                    {currentGroupMembers.map((member) => (
                        <SelectItem key={member.user_id} title={member.username} />
                    ))}
                </Select>

                <Select
                    style={styles.input}
                    label='Split Method'
                    placeholder='How to split this expense'
                    value={selectedSplitMethodIndex ? SPLIT_METHODS[selectedSplitMethodIndex.row]?.label : ''}
                    selectedIndex={selectedSplitMethodIndex}
                    onSelect={(index) => setSelectedSplitMethodIndex(index as IndexPath)}
                >
                    {SPLIT_METHODS.map((method) => (
                        <SelectItem key={method.value} title={method.label} />
                    ))}
                </Select>

                <Layout style={styles.participantsContainer}>
                    <Text category='s1' style={styles.participantsTitle}>
                        Share with ({participants.filter(p => p.share_amount > 0).length} of {currentGroupMembers.length})
                    </Text>

                    {currentGroupMembers.map((member) => {
                        const participant = participants.find(p => p.user_id === member.user_id);
                        const isActive = participant && participant.share_amount > 0;
                        const shareAmount = participant?.share_amount || 0;

                        return (
                            <Layout key={member.user_id} style={styles.participantRow}>
                                <CheckBox
                                    checked={!!isActive}
                                    onChange={() => toggleParticipant(member.user_id)}
                                    style={styles.participantCheckbox}
                                />
                                <Layout style={styles.participantInfo}>
                                    <Text category='s1'>{member.username}</Text>
                                    {member.user_id === user?.id && (
                                        <Text category='c1' appearance='hint'>(You)</Text>
                                    )}
                                </Layout>
                                {splitMethod === 'custom' && isActive && (
                                    <Input
                                        style={styles.customAmountInput}
                                        placeholder='0.00'
                                        value={customAmounts[member.user_id] || shareAmount.toString()}
                                        onChangeText={(text) => updateCustomAmount(member.user_id, text)}
                                        keyboardType='decimal-pad'
                                        size='small'
                                    />
                                )}
                                {splitMethod !== 'custom' && isActive && (
                                    <Text category='s1' style={styles.shareAmount}>
                                        {shareAmount.toFixed(2)}
                                    </Text>
                                )}
                            </Layout>
                        );
                    })}

                    <Layout style={styles.totalRow}>
                        <Text category='s1' style={[styles.totalText, !isBalanced && styles.errorText]}>
                            Total: {totalShares.toFixed(2)} / {totalAmount.toFixed(2)}
                        </Text>
                        {!isBalanced && (
                            <Text category='c1' style={styles.errorText}>
                                Shares don't match expense amount
                            </Text>
                        )}
                    </Layout>
                </Layout>
            </Card>
        );
    };

    if (availableGroups.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <TopNavigation
                    title='Add Expense'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                />
                <Layout style={styles.emptyContainer}>
                    <Ionicons name="folder-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
                    <Text category='h6' style={styles.emptyTitle}>No expense groups available</Text>
                    <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                        You need to create or join an expense group before adding expenses.
                    </Text>
                    <Button
                        style={styles.goBackButton}
                        onPress={navigateBack}
                    >
                        Go Back
                    </Button>
                </Layout>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <TopNavigation
                title='Add Expense'
                alignment='center'
                accessoryLeft={renderBackAction}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Card style={styles.card}>
                    <Text category='h6' style={styles.sectionTitle}>Expense Details</Text>

                    <Input
                        style={styles.input}
                        label='Name'
                        placeholder='Enter expense name'
                        value={name}
                        onChangeText={setName}
                        status={name.trim() ? 'basic' : 'danger'}
                    />

                    <Input
                        style={styles.input}
                        label='Description (Optional)'
                        placeholder='Enter description'
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textStyle={{ minHeight: 64 }}
                    />

                    <Input
                        style={styles.input}
                        label='Amount'
                        placeholder='0.00'
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType='decimal-pad'
                        status={amount.trim() && !isNaN(Number(amount)) && Number(amount) > 0 ? 'basic' : 'danger'}
                    />

                    <Select
                        style={styles.input}
                        label='Expense Group'
                        placeholder='Select expense group'
                        value={selectedGroupIndex ? availableGroups[selectedGroupIndex.row]?.data?.name : ''}
                        selectedIndex={selectedGroupIndex}
                        onSelect={(index) => setSelectedGroupIndex(index as IndexPath)}
                        status={selectedGroupIndex ? 'basic' : 'danger'}
                        caption='Selecting a group will set its default currency'
                    >
                        {availableGroups.map((group) => (
                            <SelectItem
                                key={group.id}
                                title={`${group.data?.name || 'Unnamed Group'} (${group.data?.currency || 'USD'})`}
                            />
                        ))}
                    </Select>

                    <Select
                        style={styles.input}
                        label='Currency'
                        placeholder='Select currency'
                        value={selectedCurrencyIndex ? CURRENCIES[selectedCurrencyIndex.row]?.label : ''}
                        selectedIndex={selectedCurrencyIndex}
                        onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
                        caption={selectedGroupIndex ?
                            `Default: ${availableGroups[selectedGroupIndex.row]?.data?.currency || 'USD'}` :
                            'Select a group first to use its default currency'
                        }
                    >
                        {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} title={currency.label} />
                        ))}
                    </Select>

                    <Datepicker
                        style={styles.input}
                        label='Date'
                        date={date}
                        onSelect={setDate}
                        accessoryRight={CalendarIcon}
                    />

                    <Select
                        style={styles.input}
                        label='Category'
                        placeholder='Select category'
                        value={selectedCategoryIndex ? EXPENSE_CATEGORIES[selectedCategoryIndex.row]?.label : ''}
                        selectedIndex={selectedCategoryIndex}
                        onSelect={(index) => setSelectedCategoryIndex(index as IndexPath)}
                        status={selectedCategoryIndex ? 'basic' : 'danger'}
                    >
                        {EXPENSE_CATEGORIES.map((category) => (
                            <SelectItem key={category.value} title={category.label} />
                        ))}
                    </Select>
                </Card>

                {renderSharingSection()}

                <Card style={styles.card}>
                    <Text category='h6' style={styles.sectionTitle}>Additional Options</Text>

                    <Layout style={styles.toggleContainer}>
                        <Layout style={styles.toggleLabelContainer}>
                            <Text category='s1'>Recurring Expense</Text>
                            <Text category='c1' appearance='hint'>This expense repeats regularly</Text>
                        </Layout>
                        <Toggle
                            checked={isRecurring}
                            onChange={setIsRecurring}
                        />
                    </Layout>

                    {isRecurring && (
                        <Select
                            style={styles.input}
                            label='Recurring Interval'
                            placeholder='Select interval'
                            value={recurringInterval}
                            onSelect={(index) => {
                                const intervals = ['daily', 'weekly', 'monthly', 'yearly'];
                                setRecurringInterval(intervals[(index as IndexPath).row]);
                            }}
                        >
                            <SelectItem title='Daily' />
                            <SelectItem title='Weekly' />
                            <SelectItem title='Monthly' />
                            <SelectItem title='Yearly' />
                        </Select>
                    )}
                </Card>

                <Button
                    style={styles.submitButton}
                    size='large'
                    onPress={handleSubmit}
                    disabled={loading}
                    accessoryLeft={loading ? () => <Spinner size='small' status='control' /> : undefined}
                >
                    {loading ? 'Adding Expense...' : 'Add Expense'}
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        marginBottom: 16,
        padding: 16,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    toggleLabelContainer: {
        flex: 1,
        marginRight: 16,
    },
    submitButton: {
        marginBottom: 32,
    },
    emptyContainer: {
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
    goBackButton: {
        paddingHorizontal: 24,
    },
    backButton: {
        padding: 8,
    },
    participantsContainer: {
        marginTop: 8,
    },
    participantsTitle: {
        marginBottom: 12,
        fontWeight: '500',
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    participantCheckbox: {
        marginRight: 12,
    },
    participantInfo: {
        flex: 1,
    },
    customAmountInput: {
        width: 80,
        marginLeft: 8,
    },
    shareAmount: {
        marginLeft: 8,
        minWidth: 60,
        textAlign: 'right',
        color: '#2E7D32',
        fontWeight: '500',
    },
    totalRow: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        alignItems: 'center',
    },
    totalText: {
        fontWeight: '600',
        fontSize: 16,
    },
    errorText: {
        color: '#F44336',
    },
});
