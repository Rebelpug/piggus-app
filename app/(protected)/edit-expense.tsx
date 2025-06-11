import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity, View, TextInput, StatusBar } from 'react-native';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import {
    ExpenseData,
    ExpenseWithDecryptedData,
    EXPENSE_CATEGORIES,
    PAYMENT_METHODS,
    CURRENCIES,
    SPLIT_METHODS,
    ExpenseParticipant,
    calculateEqualSplit,
    computeExpenseCategories,
    getCategoryDisplayInfo
} from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';

export default function EditExpenseScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user } = useAuth();
    const { expenseId, groupId } = useLocalSearchParams<{ expenseId: string, groupId: string }>();
    const { expensesGroups, updateExpense } = useExpense();
    const { userProfile } = useProfile();
    
    // Compute categories with user's customizations
    const availableCategories = computeExpenseCategories(
        userProfile?.profile?.budgeting?.categoryOverrides
    );
    const [loading, setLoading] = useState(false);
    const [expense, setExpense] = useState<ExpenseWithDecryptedData | null>(null);
    const [groupName, setGroupName] = useState<string>('');
    const [groupMembers, setGroupMembers] = useState<any[]>([]);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<IndexPath | undefined>();
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(0));
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringInterval, setRecurringInterval] = useState('');
    // Sharing state
    const [selectedPayerIndex, setSelectedPayerIndex] = useState<IndexPath | undefined>();
    const [selectedSplitMethodIndex, setSelectedSplitMethodIndex] = useState<IndexPath>(new IndexPath(0)); // Default to equal split
    const [participants, setParticipants] = useState<ExpenseParticipant[]>([]);
    const [customAmounts, setCustomAmounts] = useState<{ [userId: string]: string }>({});

    // Load expense data on mount
    useEffect(() => {
        if (!expenseId || !groupId || !expensesGroups) return;

        const group = expensesGroups.find(g => g.id === groupId);
        if (!group) return;

        setGroupName(group.data?.name || 'Unknown Group');
        setGroupMembers(group.members || []);

        const foundExpense = group.expenses.find(e => e.id === expenseId);
        if (foundExpense) {
            setExpense(foundExpense);
            
            // Populate form with existing expense data
            setName(foundExpense.data.name);
            setDescription(foundExpense.data.description || '');
            setAmount(foundExpense.data.amount.toString());
            setDate(new Date(foundExpense.data.date));
            setIsRecurring(foundExpense.data.is_recurring);
            setRecurringInterval(foundExpense.data.recurring_interval || '');
            setParticipants(foundExpense.data.participants);

            // Set category index - check both current categories and legacy value for backwards compatibility
            let categoryIndex = availableCategories.findIndex(cat => cat.id === foundExpense.data.category);
            if (categoryIndex === -1) {
                // Category might be deleted - add it temporarily to the list for this expense
                const categoryInfo = getCategoryDisplayInfo(foundExpense.data.category, userProfile?.profile?.budgeting?.categoryOverrides);
                availableCategories.push({
                    id: foundExpense.data.category,
                    name: `${categoryInfo.name}${categoryInfo.isDeleted ? ' (Deleted)' : ''}`,
                    icon: categoryInfo.icon
                });
                categoryIndex = availableCategories.length - 1;
            }
            setSelectedCategoryIndex(new IndexPath(categoryIndex));

            // Set currency index
            const currencyIndex = CURRENCIES.findIndex(curr => curr.value === foundExpense.data.currency);
            if (currencyIndex !== -1) {
                setSelectedCurrencyIndex(new IndexPath(currencyIndex));
            }

            // Set payer index
            const payerIndex = group.members.findIndex(member => member.user_id === foundExpense.data.payer_user_id);
            if (payerIndex !== -1) {
                setSelectedPayerIndex(new IndexPath(payerIndex));
            }

            // Set split method index
            const splitMethodIndex = SPLIT_METHODS.findIndex(method => method.value === foundExpense.data.split_method);
            if (splitMethodIndex !== -1) {
                setSelectedSplitMethodIndex(new IndexPath(splitMethodIndex));
            }

            // Initialize custom amounts for display
            const initialCustomAmounts: { [userId: string]: string } = {};
            foundExpense.data.participants.forEach(participant => {
                initialCustomAmounts[participant.user_id] = participant.share_amount.toString();
            });
            setCustomAmounts(initialCustomAmounts);
        }
    }, [expenseId, groupId, expensesGroups]);

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
        if (!validateForm() || !expense) return;

        setLoading(true);
        try {
            const selectedCategory = availableCategories[selectedCategoryIndex!.row];
            const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
            const selectedPayer = groupMembers[selectedPayerIndex!.row];
            const selectedSplitMethod = SPLIT_METHODS[selectedSplitMethodIndex.row];

            const activeParticipants = participants.filter(p => p.share_amount > 0);

            const updatedExpenseData: ExpenseData = {
                name: name.trim(),
                description: description.trim(),
                amount: Number(amount),
                date: date.toISOString().split('T')[0],
                category: selectedCategory.id,
                is_recurring: isRecurring,
                recurring_interval: isRecurring ? recurringInterval : undefined,
                currency: selectedCurrency.value,
                status: 'completed',
                payer_user_id: selectedPayer.user_id,
                payer_username: selectedPayer.username,
                participants: activeParticipants,
                split_method: selectedSplitMethod.value as 'equal' | 'custom' | 'percentage',
            };

            const updatedExpense: ExpenseWithDecryptedData = {
                ...expense,
                data: updatedExpenseData
            };

            const result = await updateExpense(groupId!, updatedExpense);

            if (result) {
                Alert.alert(
                    'Success',
                    'Expense updated successfully!',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Error', 'Failed to update expense. Please try again.');
            }
        } catch (error) {
            console.error('Error updating expense:', error);
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
            <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>
    );

    const CalendarIcon = (props: any) => (
        <Ionicons name="calendar-outline" size={20} color="#8F9BB3" />
    );

    const renderSharingSection = () => {
        if (groupMembers.length <= 1) return null;

        const splitMethod = SPLIT_METHODS[selectedSplitMethodIndex.row]?.value || 'equal';
        const totalShares = participants.reduce((sum, p) => sum + p.share_amount, 0);
        const totalAmount = Number(amount) || 0;
        const isBalanced = Math.abs(totalShares - totalAmount) < 0.01;

        return (
            <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Expense Sharing</Text>

                <Select
                    style={styles.input}
                    label='Who Paid?'
                    placeholder='Select who paid for this expense'
                    value={selectedPayerIndex ? groupMembers[selectedPayerIndex.row]?.username : ''}
                    selectedIndex={selectedPayerIndex}
                    onSelect={(index) => setSelectedPayerIndex(index as IndexPath)}
                    status={selectedPayerIndex ? 'basic' : 'danger'}
                >
                    {groupMembers.map((member) => (
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
                        Share with ({participants.filter(p => p.share_amount > 0).length} of {groupMembers.length})
                    </Text>

                    {groupMembers.map((member) => {
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
            </View>
        );
    };

    if (!expense) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <StatusBar
                        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                        backgroundColor={colors.background}
                    />
                    <TopNavigation
                        title='Edit Expense'
                        alignment='center'
                        accessoryLeft={renderBackAction}
                        style={{ backgroundColor: colors.background }}
                    />
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: colors.error + '20' }]}>
                            <Ionicons name="document-outline" size={32} color={colors.error} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>Expense not found</Text>
                        <Text style={[styles.emptyDescription, { color: colors.icon }]}>
                            The expense you're trying to edit could not be found.
                        </Text>
                        <TouchableOpacity
                            style={[styles.goBackButton, { backgroundColor: colors.primary }]}
                            onPress={navigateBack}
                        >
                            <Text style={styles.goBackButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar
                    barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                    backgroundColor={colors.background}
                />
                <TopNavigation
                    title='Edit Expense'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    style={{ backgroundColor: colors.background }}
                />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Expense Details</Text>

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

                    <Text style={[styles.groupInfo, { color: colors.icon }]}>
                        Group: {groupName}
                    </Text>

                    <Select
                        style={styles.input}
                        label='Currency'
                        placeholder='Select currency'
                        value={selectedCurrencyIndex ? CURRENCIES[selectedCurrencyIndex.row]?.label : ''}
                        selectedIndex={selectedCurrencyIndex}
                        onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
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
                        value={selectedCategoryIndex ? availableCategories[selectedCategoryIndex.row]?.name : ''}
                        selectedIndex={selectedCategoryIndex}
                        onSelect={(index) => setSelectedCategoryIndex(index as IndexPath)}
                        status={selectedCategoryIndex ? 'basic' : 'danger'}
                    >
                        {availableCategories.map((category) => (
                            <SelectItem 
                                key={category.id} 
                                title={`${category.icon} ${category.name}`} 
                            />
                        ))}
                    </Select>
                </View>

                {renderSharingSection()}

                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
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
                </View>

                <Button
                    style={styles.submitButton}
                    size='large'
                    onPress={handleSubmit}
                    disabled={loading}
                    accessoryLeft={loading ? () => <Spinner size='small' status='control' /> : undefined}
                >
                    {loading ? 'Updating Expense...' : 'Update Expense'}
                </Button>
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
    content: {
        flex: 1,
        padding: 20,
    },
    card: {
        marginBottom: 20,
        padding: 24,
        borderRadius: 20,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    input: {
        marginBottom: 20,
        borderRadius: 12,
    },
    groupInfo: {
        fontSize: 14,
        marginBottom: 20,
        fontStyle: 'italic',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 4,
    },
    toggleLabelContainer: {
        flex: 1,
        marginRight: 16,
    },
    submitButton: {
        marginHorizontal: 20,
        marginBottom: 32,
        borderRadius: 16,
        height: 56,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 16,
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 24,
    },
    goBackButton: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
    },
    goBackButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    backButton: {
        padding: 12,
    },
    participantsContainer: {
        marginTop: 12,
    },
    participantsTitle: {
        fontSize: 16,
        marginBottom: 16,
        fontWeight: '600',
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    participantCheckbox: {
        marginRight: 16,
    },
    participantInfo: {
        flex: 1,
    },
    customAmountInput: {
        width: 90,
        marginLeft: 12,
        borderRadius: 8,
    },
    shareAmount: {
        marginLeft: 12,
        minWidth: 70,
        textAlign: 'right',
        fontSize: 14,
        fontWeight: '600',
    },
    totalRow: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        alignItems: 'center',
    },
    totalText: {
        fontWeight: '700',
        fontSize: 18,
    },
    errorText: {
        fontSize: 14,
        fontWeight: '500',
    },
});