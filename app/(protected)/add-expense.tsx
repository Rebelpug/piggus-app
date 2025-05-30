import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
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
    Spinner
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import { ExpenseData, EXPENSE_CATEGORIES, PAYMENT_METHODS, CURRENCIES } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';

export default function AddExpenseScreen() {
    const router = useRouter();
    const { expensesGroups, addExpense } = useExpense();
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<IndexPath | undefined>();
    const [selectedPaymentMethodIndex, setSelectedPaymentMethodIndex] = useState<IndexPath | undefined>();
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(0)); // Default to USD
    const [selectedGroupIndex, setSelectedGroupIndex] = useState<IndexPath | undefined>();
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringInterval, setRecurringInterval] = useState('');
    const [tags, setTags] = useState('');

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
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const selectedGroup = availableGroups[selectedGroupIndex!.row];
            const selectedCategory = EXPENSE_CATEGORIES[selectedCategoryIndex!.row];
            const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
            const selectedPaymentMethod = selectedPaymentMethodIndex ?
                PAYMENT_METHODS[selectedPaymentMethodIndex.row] : undefined;

            const expenseData: ExpenseData = {
                name: name.trim(),
                description: description.trim(),
                amount: Number(amount),
                date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
                category: selectedCategory.value,
                is_recurring: isRecurring,
                recurring_interval: isRecurring ? recurringInterval : undefined,
                payment_method: selectedPaymentMethod?.value,
                currency: selectedCurrency.value,
                tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : [],
                status: 'completed',
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

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
    );

    const CalendarIcon = (props: any) => (
        <Ionicons name="calendar-outline" size={20} color="#8F9BB3" />
    );

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

                    <Select
                        style={styles.input}
                        label='Payment Method (Optional)'
                        placeholder='Select payment method'
                        value={selectedPaymentMethodIndex ? PAYMENT_METHODS[selectedPaymentMethodIndex.row]?.label : ''}
                        selectedIndex={selectedPaymentMethodIndex}
                        onSelect={(index) => setSelectedPaymentMethodIndex(index as IndexPath)}
                    >
                        {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method.value} title={method.label} />
                        ))}
                    </Select>

                    <Input
                        style={styles.input}
                        label='Tags (Optional)'
                        placeholder='Enter tags separated by commas'
                        value={tags}
                        onChangeText={setTags}
                        caption='Example: groceries, weekly, essential'
                    />
                </Card>

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
});
