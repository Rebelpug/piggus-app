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
    const [isLookingUp, setIsLookingUp] = useState(false);
    //const [isinResults, setIsinResults] = useState<ISINResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState<IndexPath | undefined>(undefined);

    // Form state
    const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<IndexPath>(new IndexPath(0));
    const [selectedTypeIndex, setSelectedTypeIndex] = useState<IndexPath>(new IndexPath(0));
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(0));

    const [formData, setFormData] = useState({
        isin: '',
        name: '',
        symbol: '',
        exchange_market: '',
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
    //const selectedResult = selectedResultIndex ? isinResults[selectedResultIndex.row] : null;

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

    // const handleISINLookup = async () => {
    //     if (!formData.isin.trim()) {
    //         Alert.alert('Error', 'Please enter an ISIN code');
    //         return;
    //     }
    //
    //     setIsLookingUp(true);
    //     setIsinResults([]);
    //     setShowResults(false);
    //     setSelectedResultIndex(undefined);
    //
    //     try {
    //         const response = await lookupISIN(formData.isin);
    //
    //         if (response.success && response.data) {
    //             setIsinResults(response.data);
    //
    //             if (response.data.length === 1) {
    //                 // Single result - prefill form
    //                 const result = response.data[0];
    //                 setFormData(prev => ({
    //                     ...prev,
    //                     name: result.Name,
    //                     symbol: result.Code,
    //                     exchange_market: result.Exchange,
    //                     current_price: result.previousClose.toString(),
    //                 }));
    //
    //                 // Set currency based on result
    //                 const currencyIndex = currencies.findIndex(c => c === result.Currency);
    //                 if (currencyIndex !== -1) {
    //                     setSelectedCurrencyIndex(new IndexPath(currencyIndex));
    //                 }
    //
    //                 // Set type based on result
    //                 const typeIndex = investmentTypes.findIndex(t => t.id === result.Type.toLowerCase());
    //                 if (typeIndex !== -1) {
    //                     setSelectedTypeIndex(new IndexPath(typeIndex));
    //                 }
    //             } else if (response.data.length > 1) {
    //                 // Multiple results - show selection
    //                 setShowResults(true);
    //             } else {
    //                 Alert.alert('No Results', 'No investment data found for this ISIN.');
    //             }
    //         } else {
    //             Alert.alert('Error', response.error || 'Failed to lookup ISIN');
    //         }
    //     } catch (error) {
    //         console.error('ISIN lookup error:', error);
    //         Alert.alert('Error', 'An unexpected error occurred during ISIN lookup.');
    //     } finally {
    //         setIsLookingUp(false);
    //     }
    // };
    //
    // const handleConfirmSelection = () => {
    //     if (!selectedResult) {
    //         Alert.alert('Error', 'Please select an investment option');
    //         return;
    //     }
    //
    //     // Prefill form with selected result
    //     setFormData(prev => ({
    //         ...prev,
    //         name: selectedResult.Name,
    //         symbol: selectedResult.Code,
    //         exchange_market: selectedResult.Exchange,
    //         current_price: selectedResult.previousClose.toString(),
    //     }));
    //
    //     // Set currency based on result
    //     const currencyIndex = currencies.findIndex(c => c === selectedResult.Currency);
    //     if (currencyIndex !== -1) {
    //         setSelectedCurrencyIndex(new IndexPath(currencyIndex));
    //     }
    //
    //     // Set type based on result
    //     const typeIndex = investmentTypes.findIndex(t => t.id === selectedResult.Type.toLowerCase());
    //     if (typeIndex !== -1) {
    //         setSelectedTypeIndex(new IndexPath(typeIndex));
    //     }
    //
    //     setShowResults(false);
    //     setSelectedResultIndex(undefined);
    //     Alert.alert('Success', 'Investment details have been prefilled.');
    // };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const investmentData: InvestmentData = {
                name: formData.name.trim(),
                symbol: formData.symbol.trim() || null,
                type: selectedType.id,
                isin: formData.isin,
                exchange_market: formData.exchange_market.trim() || undefined,
                quantity: Number(formData.quantity),
                purchase_price: Number(formData.purchase_price),
                current_price: formData.current_price ? Number(formData.current_price) : null,
                purchase_date: formData.purchase_date.toISOString(),
                currency: selectedCurrency,
                notes: formData.notes.trim() || null,
                last_updated: new Date().toISOString(),
            };

            const result = await addInvestment(selectedPortfolio.id, investmentData);

            if (result) {
                router.back();
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

                        <Input
                            style={styles.input}
                            label='ISIN Code'
                            placeholder='Enter ISIN code (e.g., IE00B5BMR087)'
                            value={formData.isin}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, isin: text.toUpperCase() }))}
                        />

                        <Button
                            style={[styles.input, styles.findButton]}
                            size='medium'
                            appearance='outline'
                            onPress={() => {}}
                            //disabled={isLookingUp || !formData.isin.trim()}
                            disabled={true}
                            accessoryLeft={isLookingUp ? () => <Spinner size='small' /> : () => <Ionicons name="search" size={20} color={colors.primary} />}
                        >
                            {isLookingUp ? 'Searching...' : 'Find (Coming soon)'}
                        </Button>

                        {/*{showResults && isinResults.length > 1 && (
                            <>
                                <Select
                                    style={styles.input}
                                    label='Select Investment Option'
                                    placeholder='Choose from available options'
                                    value={selectedResult ? `${selectedResult.Name} (${selectedResult.Exchange})` : ''}
                                    selectedIndex={selectedResultIndex}
                                    onSelect={(index) => setSelectedResultIndex(index as IndexPath)}
                                >
                                    {isinResults.map((result, index) => (
                                        <SelectItem
                                            key={index}
                                            title={`${result.Name} - ${result.Exchange} (${result.Currency})`}
                                        />
                                    ))}
                                </Select>

                                <Button
                                    style={[styles.input, styles.confirmButton]}
                                    size='medium'
                                    onPress={handleConfirmSelection}
                                    disabled={!selectedResult}
                                    accessoryLeft={() => <Ionicons name="checkmark" size={20} color="white" />}
                                >
                                    Confirm Selection
                                </Button>
                            </>
                        )}*/}
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
                            label='Exchange Market (Optional)'
                            placeholder='e.g., NASDAQ, LSE, XETRA'
                            value={formData.exchange_market}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, exchange_market: text.toUpperCase() }))}
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
    findButton: {
        marginBottom: 16,
    },
    confirmButton: {
        marginBottom: 16,
    },
});
