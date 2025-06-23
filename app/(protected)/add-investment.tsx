import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert, View, KeyboardAvoidingView, Platform, TouchableOpacity, StatusBar } from 'react-native';
import {
    Layout,
    Text,
    Input,
    Button,
    TopNavigation,
    TopNavigationAction,
    Select,
    SelectItem,
    IndexPath,
    Datepicker,
    Card,
    Spinner
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInvestment } from '@/context/InvestmentContext';
import { InvestmentData } from '@/types/investment';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';

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

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'];

export default function AddInvestmentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { portfolios, addInvestment } = useInvestment();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<IndexPath>(new IndexPath(0));
    const [selectedTypeIndex, setSelectedTypeIndex] = useState<IndexPath>(new IndexPath(0));
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(0));
    
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        quantity: '',
        purchase_price: '',
        current_price: '',
        purchase_date: new Date(),
        notes: '',
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const selectedPortfolio = portfolios[selectedPortfolioIndex.row];
    const selectedType = investmentTypes[selectedTypeIndex.row];
    const selectedCurrency = currencies[selectedCurrencyIndex.row];

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Investment name is required';
        }

        if (!formData.quantity.trim()) {
            newErrors.quantity = 'Quantity is required';
        } else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
            newErrors.quantity = 'Quantity must be a positive number';
        }

        if (!formData.purchase_price.trim()) {
            newErrors.purchase_price = 'Purchase price is required';
        } else if (isNaN(Number(formData.purchase_price)) || Number(formData.purchase_price) <= 0) {
            newErrors.purchase_price = 'Purchase price must be a positive number';
        }

        if (formData.current_price && (isNaN(Number(formData.current_price)) || Number(formData.current_price) <= 0)) {
            newErrors.current_price = 'Current price must be a positive number';
        }

        if (!selectedPortfolio) {
            newErrors.portfolio = 'Please select a portfolio';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const investmentData: InvestmentData = {
                name: formData.name.trim(),
                symbol: formData.symbol.trim() || undefined,
                type: selectedType.id,
                quantity: Number(formData.quantity),
                purchase_price: Number(formData.purchase_price),
                current_price: formData.current_price ? Number(formData.current_price) : undefined,
                purchase_date: formData.purchase_date.toISOString(),
                currency: selectedCurrency,
                notes: formData.notes.trim() || undefined,
            };

            const result = await addInvestment(selectedPortfolio.id, investmentData);

            if (result) {
                Alert.alert(
                    'Success',
                    'Investment added successfully!',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back()
                        }
                    ]
                );
            } else {
                Alert.alert('Error', 'Failed to add investment. Please try again.');
            }
        } catch (error) {
            console.error('Error adding investment:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderBackAction = () => (
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>
    );

    const calculateCurrentValue = () => {
        const quantity = Number(formData.quantity) || 0;
        const currentPrice = Number(formData.current_price) || Number(formData.purchase_price) || 0;
        return quantity * currentPrice;
    };

    const calculateGainLoss = () => {
        const quantity = Number(formData.quantity) || 0;
        const purchasePrice = Number(formData.purchase_price) || 0;
        const currentPrice = Number(formData.current_price) || purchasePrice;
        const initialValue = quantity * purchasePrice;
        const currentValue = quantity * currentPrice;
        return currentValue - initialValue;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: selectedCurrency,
        }).format(amount);
    };

    if (portfolios.length === 0) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <StatusBar
                        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                        backgroundColor={colors.background}
                    />
                    <TopNavigation
                        title='Add Investment'
                        alignment='center'
                        accessoryLeft={renderBackAction}
                        style={{ backgroundColor: colors.background }}
                    />
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: colors.error + '20' }]}>
                            <Ionicons name="briefcase-outline" size={32} color={colors.error} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No portfolios available</Text>
                        <Text style={[styles.emptyDescription, { color: colors.icon }]}>
                            You need to create a portfolio first before adding investments.
                        </Text>
                        <TouchableOpacity
                            style={[styles.goBackButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/(protected)/create-portfolio')}
                        >
                            <Text style={styles.goBackButtonText}>Create Portfolio</Text>
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
                    title='Add Investment'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    style={{ backgroundColor: colors.background }}
                />

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Investment Details</Text>
                        <Select
                            style={styles.input}
                            label='Portfolio'
                            placeholder='Select portfolio'
                            value={selectedPortfolio?.data?.name || ''}
                            selectedIndex={selectedPortfolioIndex}
                            onSelect={(index) => setSelectedPortfolioIndex(index as IndexPath)}
                            status={selectedPortfolio ? 'basic' : 'danger'}
                        >
                            {portfolios.map((portfolio, index) => (
                                <SelectItem key={index} title={portfolio.data?.name || `Portfolio ${index + 1}`} />
                            ))}
                        </Select>

                        <Select
                            style={styles.input}
                            label='Investment Type'
                            placeholder='Select type'
                            value={selectedType?.name || ''}
                            selectedIndex={selectedTypeIndex}
                            onSelect={(index) => setSelectedTypeIndex(index as IndexPath)}
                        >
                            {investmentTypes.map((type, index) => (
                                <SelectItem key={index} title={type.name} />
                            ))}
                        </Select>

                        <Input
                            style={styles.input}
                            label='Investment Name'
                            placeholder='Enter investment name'
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            status={formData.name.trim() ? 'basic' : 'danger'}
                        />

                        <Input
                            style={styles.input}
                            label='Symbol (Optional)'
                            placeholder='e.g., AAPL'
                            value={formData.symbol}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, symbol: text.toUpperCase() }))}
                        />

                        <Input
                            style={styles.input}
                            label='Quantity'
                            placeholder='Number of shares/units'
                            value={formData.quantity}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                            keyboardType='decimal-pad'
                            status={formData.quantity.trim() && !isNaN(Number(formData.quantity)) && Number(formData.quantity) > 0 ? 'basic' : 'danger'}
                        />

                        <Select
                            style={styles.input}
                            label='Currency'
                            placeholder='Select currency'
                            value={selectedCurrency || ''}
                            selectedIndex={selectedCurrencyIndex}
                            onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
                        >
                            {currencies.map((currency, index) => (
                                <SelectItem key={index} title={currency} />
                            ))}
                        </Select>

                        <Input
                            style={styles.input}
                            label='Purchase Price per Unit'
                            placeholder='0.00'
                            value={formData.purchase_price}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, purchase_price: text }))}
                            keyboardType='decimal-pad'
                            status={formData.purchase_price.trim() && !isNaN(Number(formData.purchase_price)) && Number(formData.purchase_price) > 0 ? 'basic' : 'danger'}
                        />

                        <Input
                            style={styles.input}
                            label='Current Price per Unit (Optional)'
                            placeholder='Leave empty to use purchase price'
                            value={formData.current_price}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, current_price: text }))}
                            keyboardType='decimal-pad'
                        />

                        <Datepicker
                            style={styles.input}
                            label='Purchase Date'
                            date={formData.purchase_date}
                            onSelect={(date) => setFormData(prev => ({ ...prev, purchase_date: date }))}
                        />

                        <Input
                            style={styles.input}
                            label='Notes (Optional)'
                            placeholder='Any additional notes...'
                            value={formData.notes}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                            multiline
                            textStyle={{ minHeight: 64 }}
                        />
                    </View>

                    {/* Summary Card */}
                    {formData.quantity && formData.purchase_price && (
                        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Investment Summary</Text>
                            
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                    Total Investment:
                                </Text>
                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                    {formatCurrency(Number(formData.quantity) * Number(formData.purchase_price))}
                                </Text>
                            </View>
                            
                            {formData.current_price && (
                                <>
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                            Current Value:
                                        </Text>
                                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                                            {formatCurrency(calculateCurrentValue())}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                            Gain/Loss:
                                        </Text>
                                        <Text style={[
                                            styles.summaryValue,
                                            { color: calculateGainLoss() >= 0 ? '#4CAF50' : '#F44336' }
                                        ]}>
                                            {formatCurrency(calculateGainLoss())}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                    <Button
                        style={styles.submitButton}
                        size='large'
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        accessoryLeft={isSubmitting ? () => <Spinner size='small' status='control' /> : undefined}
                    >
                        {isSubmitting ? 'Adding Investment...' : 'Add Investment'}
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
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
    },
});