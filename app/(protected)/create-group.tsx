import React, {useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
    Layout,
    Text,
    Input,
    Button,
    Select,
    SelectItem,
    IndexPath,
    Toggle,
    TopNavigation,
    Card,
    Spinner
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExpense } from '@/context/ExpenseContext';
import {ExpenseGroupData, CURRENCIES} from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '@/context/ProfileContext';
import { ThemedView } from '@/components/ThemedView';

export default function CreateGroupScreen() {
    const router = useRouter();
    const { userProfile } = useProfile();
    const { createExpensesGroup } = useExpense();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(0));

    useEffect(() => {
        if (userProfile) {
            console.log(userProfile);
            const currencyIndex = CURRENCIES.findIndex(currency => userProfile?.profile?.defaultCurrency === currency.value);
            setSelectedCurrencyIndex(currencyIndex >= 0 ? new IndexPath(currencyIndex) : new IndexPath(0));
        }
    }, [userProfile]);

    const navigateBack = () => {
        router.back();
    };

    const validateForm = (): boolean => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Please enter a group name');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setLoading(true);
        try {
            const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];

            const groupData: ExpenseGroupData = {
                name: name.trim(),
                description: description.trim(),
                private: false,
                currency: selectedCurrency.value,
            };

            await createExpensesGroup(groupData);

            Alert.alert(
                'Success',
                'Expense group created successfully!',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Error', 'Failed to create group. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
    );

    return (
        <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <TopNavigation
                    title='Create Group'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                />

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Card style={styles.card}>
                    <Text category='h6' style={styles.sectionTitle}>Group Details</Text>

                    <Input
                        style={styles.input}
                        label='Group Name'
                        placeholder='Enter group name'
                        value={name}
                        onChangeText={setName}
                        status={name.trim() ? 'basic' : 'danger'}
                        caption='Required field'
                    />

                    <Input
                        style={styles.input}
                        label='Description (Optional)'
                        placeholder='Enter group description'
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textStyle={{ minHeight: 64 }}
                        caption='Describe the purpose of this group'
                    />

                    <Select
                        style={styles.input}
                        label='Default Currency'
                        placeholder='Select currency'
                        value={CURRENCIES[selectedCurrencyIndex.row].label}
                        selectedIndex={selectedCurrencyIndex}
                        onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
                        caption='This will be the default currency for expenses in this group'
                    >
                        {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} title={currency.label} />
                        ))}
                    </Select>
                </Card>

                <Card style={styles.card}>
                    <Text category='h6' style={styles.sectionTitle}>Group Features</Text>

                    <Layout style={styles.featureItem}>
                        <Ionicons name="people-outline" size={20} color="#8F9BB3" style={styles.featureIcon} />
                        <Layout style={styles.featureText}>
                            <Text category='s1'>Shared Expenses</Text>
                            <Text category='c1' appearance='hint'>
                                Track and split expenses with group members
                            </Text>
                        </Layout>
                    </Layout>

                    <Layout style={styles.featureItem}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#8F9BB3" style={styles.featureIcon} />
                        <Layout style={styles.featureText}>
                            <Text category='s1'>End-to-End Encryption</Text>
                            <Text category='c1' appearance='hint'>
                                All data is encrypted and secure
                            </Text>
                        </Layout>
                    </Layout>

                    <Layout style={styles.featureItem}>
                        <Ionicons name="stats-chart-outline" size={20} color="#8F9BB3" style={styles.featureIcon} />
                        <Layout style={styles.featureText}>
                            <Text category='s1'>Expense Analytics</Text>
                            <Text category='c1' appearance='hint'>
                                View spending patterns and summaries
                            </Text>
                        </Layout>
                    </Layout>

                    <Layout style={styles.featureItem}>
                        <Ionicons name="card-outline" size={20} color="#8F9BB3" style={styles.featureIcon} />
                        <Layout style={styles.featureText}>
                            <Text category='s1'>Multi-Currency Support</Text>
                            <Text category='c1' appearance='hint'>
                                Default currency with option to change per expense
                            </Text>
                        </Layout>
                    </Layout>
                </Card>

                <Button
                    style={styles.submitButton}
                    size='large'
                    onPress={handleSubmit}
                    disabled={loading}
                    accessoryLeft={loading ? () => <Spinner size='small' status='control' /> : undefined}
                >
                    {loading ? 'Creating Group...' : 'Create Group'}
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
        marginBottom: 8,
    },
    toggleLabelContainer: {
        flex: 1,
        marginRight: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    featureIcon: {
        marginRight: 12,
    },
    featureText: {
        flex: 1,
    },
    submitButton: {
        marginBottom: 32,
    },
    backButton: {
        padding: 8,
    },
});
