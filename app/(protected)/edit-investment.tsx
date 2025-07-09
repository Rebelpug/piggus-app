import React, { useState, useEffect } from 'react';
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
    Card
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInvestment } from '@/context/InvestmentContext';
import { useProfile } from '@/context/ProfileContext';
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

export default function EditInvestmentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { portfolios, updateInvestment, deleteInvestment } = useInvestment();
    const { userProfile } = useProfile();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [investment, setInvestment] = useState<any>(null);
    const [portfolio, setPortfolio] = useState<any>(null);

    // Get user's default currency and find its index
    const userDefaultCurrency = userProfile?.profile?.defaultCurrency || 'EUR';
    const defaultCurrencyIndex = currencies.findIndex(c => c === userDefaultCurrency);
    const initialCurrencyIndex = defaultCurrencyIndex >= 0 ? defaultCurrencyIndex : 0;

    // Form state
    const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<IndexPath>(new IndexPath(0));
    const [selectedTypeIndex, setSelectedTypeIndex] = useState<IndexPath>(new IndexPath(0));
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(initialCurrencyIndex));

    const [formData, setFormData] = useState({
        name: '',
        isin: '',
        exchange_market: '',
        symbol: '',
        quantity: '',
        purchase_price: '',
        current_price: '',
        purchase_date: new Date(),
        notes: '',
        interest_rate: '',
        maturity_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years from now
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Load investment data from params
    useEffect(() => {
        if (params.investmentId && params.portfolioId && portfolios.length > 0 && !investment) {
            const foundPortfolio = portfolios.find(p => p.id === params.portfolioId);
            if (foundPortfolio) {
                const foundInvestment = foundPortfolio.investments?.find(i => i.id === params.investmentId);
                if (foundInvestment) {
                    setInvestment(foundInvestment);
                    setPortfolio(foundPortfolio);

                    // Pre-fill form data
                    setFormData({
                        name: foundInvestment.data.name || '',
                        isin: foundInvestment.data.isin || '',
                        exchange_market: foundInvestment.data.exchange_market || '',
                        symbol: foundInvestment.data.symbol || '',
                        quantity: foundInvestment.data.quantity?.toString() || '',
                        purchase_price: foundInvestment.data.purchase_price?.toString() || '',
                        current_price: foundInvestment.data.current_price?.toString() || '',
                        purchase_date: foundInvestment.data.purchase_date
                            ? new Date(foundInvestment.data.purchase_date)
                            : new Date(),
                        notes: foundInvestment.data.notes || '',
                        interest_rate: foundInvestment.data.interest_rate?.toString() || '',
                        maturity_date: foundInvestment.data.maturity_date
                            ? new Date(foundInvestment.data.maturity_date)
                            : new Date(),
                    });

                    // Set selected indices
                    const portfolioIndex = portfolios.findIndex(p => p.id === params.portfolioId);
                    if (portfolioIndex >= 0) {
                        setSelectedPortfolioIndex(new IndexPath(portfolioIndex));
                    }

                    const typeIndex = investmentTypes.findIndex(t => t.id === foundInvestment.data.type);
                    if (typeIndex >= 0) {
                        setSelectedTypeIndex(new IndexPath(typeIndex));
                    }

                    const currencyIndex = currencies.findIndex(c => c === foundInvestment.data.currency);
                    if (currencyIndex >= 0) {
                        setSelectedCurrencyIndex(new IndexPath(currencyIndex));
                    }
                }
            }
        }
    }, [params.investmentId, params.portfolioId, portfolios.length, investment]);

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

        if (selectedType.id === 'bond' && formData.interest_rate && (isNaN(Number(formData.interest_rate)) || Number(formData.interest_rate) <= 0)) {
            newErrors.interest_rate = 'Interest rate must be a positive number';
        }

        if (selectedType.id === 'bond' && formData.maturity_date && formData.maturity_date <= formData.purchase_date) {
            newErrors.maturity_date = 'Maturity date must be after purchase date';
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
                isin: formData.isin.trim(),
                exchange_market: formData.exchange_market.trim(),
                symbol: formData.symbol.trim() || null,
                type: selectedType.id,
                quantity: Number(formData.quantity),
                purchase_price: Number(formData.purchase_price),
                current_price: formData.current_price ? Number(formData.current_price) : Number(formData.purchase_price),
                purchase_date: formData.purchase_date.toISOString(),
                currency: selectedCurrency,
                last_updated: new Date().toISOString(),
                notes: formData.notes.trim() || null,
                interest_rate: selectedType.id === 'bond' && formData.interest_rate ? Number(formData.interest_rate) : null,
                maturity_date: selectedType.id === 'bond' && formData.maturity_date ? formData.maturity_date.toISOString() : null,
            };

            const updatedInvestment = {
                ...investment,
                data: investmentData
            };

            const result = await updateInvestment(selectedPortfolio.id, updatedInvestment);

            if (result) {
                router.back();
            } else {
                Alert.alert('Error', 'Failed to update investment. Please try again.');
            }
        } catch (error) {
            console.error('Error updating investment:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Investment',
            'Are you sure you want to delete this investment? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: confirmDelete
                }
            ]
        );
    };

    const confirmDelete = async () => {
        setIsDeleting(true);

        try {
            await deleteInvestment(selectedPortfolio.id, params.investmentId as string);
            router.back();
        } catch (error) {
            console.error('Error deleting investment:', error);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    const navigateBack = () => {
        router.back();
    };

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
    );

    const calculateCurrentValue = () => {
        const quantity = Number(formData.quantity) || 0;
        const currentPrice = Number(formData.current_price) || Number(formData.purchase_price) || 0;
        const marketValue = quantity * currentPrice;
        
        // For bonds, add accrued interest to the current value
        if (selectedType.id === 'bond') {
            const interestReturn = calculateBondInterestReturn();
            return marketValue + interestReturn;
        }
        
        return marketValue;
    };

    const calculateGainLoss = () => {
        const quantity = Number(formData.quantity) || 0;
        const purchasePrice = Number(formData.purchase_price) || 0;
        const currentPrice = Number(formData.current_price) || purchasePrice;
        const initialValue = quantity * purchasePrice;
        const currentMarketValue = quantity * currentPrice;
        
        // For bonds, the gain/loss should include both market value change AND interest earned
        if (selectedType.id === 'bond') {
            const interestReturn = calculateBondInterestReturn();
            const totalCurrentValue = currentMarketValue + interestReturn;
            return totalCurrentValue - initialValue;
        }
        
        return currentMarketValue - initialValue;
    };

    const calculateBondInterestReturn = () => {
        console.log('=== calculateBondInterestReturn DEBUG ===');
        console.log('selectedType:', selectedType);
        console.log('selectedType.id:', selectedType?.id);
        console.log('formData.interest_rate:', formData.interest_rate);
        console.log('formData:', formData);
        
        if (selectedType?.id !== 'bond') {
            console.log('Not a bond, returning 0');
            return 0;
        }
        
        if (!formData.interest_rate || formData.interest_rate === '') {
            console.log('No interest rate, returning 0');
            return 0;
        }
        
        const quantity = Number(formData.quantity) || 0;
        const purchasePrice = Number(formData.purchase_price) || 0;
        const interestRate = Number(formData.interest_rate) || 0;
        
        console.log('Parsed values:', { quantity, purchasePrice, interestRate });
        
        if (quantity === 0 || purchasePrice === 0 || interestRate === 0) {
            console.log('One of the values is 0, returning 0');
            return 0;
        }
        
        const initialValue = quantity * purchasePrice;
        
        // Calculate time periods
        const currentDate = new Date();
        const purchaseDate = formData.purchase_date;
        const maturityDate = formData.maturity_date;
        
        console.log('Dates:', { currentDate, purchaseDate, maturityDate });
        
        // Determine the end date for interest calculation (current date or maturity date, whichever is earlier)
        const endDate = maturityDate && currentDate > maturityDate ? maturityDate : currentDate;
        
        // Calculate days since purchase until end date
        const daysSincePurchase = Math.floor((endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const yearsSincePurchase = Math.max(0, daysSincePurchase / 365.25);
        
        // For demonstration purposes, if purchase date is today, use 1 year as example
        const yearsForCalculation = yearsSincePurchase === 0 ? 1 : yearsSincePurchase;
        
        // Calculate annual interest return
        const annualInterestReturn = initialValue * (interestRate / 100) * yearsForCalculation;
        
        console.log('Final calculation:', {
            initialValue,
            interestRate,
            daysSincePurchase,
            yearsSincePurchase,
            yearsForCalculation,
            annualInterestReturn
        });
        
        return annualInterestReturn;
    };

    const getBondStatus = () => {
        if (selectedType.id !== 'bond' || !formData.maturity_date) return 'active';
        
        const currentDate = new Date();
        const maturityDate = formData.maturity_date;
        
        if (currentDate >= maturityDate) {
            return 'matured';
        } else {
            return 'active';
        }
    };

    const getDaysToMaturity = () => {
        if (selectedType.id !== 'bond' || !formData.maturity_date) return null;
        
        const currentDate = new Date();
        const maturityDate = formData.maturity_date;
        
        if (currentDate >= maturityDate) {
            return 0;
        }
        
        const daysToMaturity = Math.floor((maturityDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysToMaturity;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: selectedCurrency,
        }).format(amount);
    };

    if (!investment || portfolios.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <TopNavigation
                    title='Edit Investment'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    style={{ backgroundColor: colors.background }}
                />
                <Layout style={styles.loadingContainer}>
                    <Text category='h6'>Investment not found</Text>
                </Layout>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            <TopNavigation
                title='Edit Investment'
                alignment='center'
                accessoryLeft={renderBackAction}
                accessoryRight={() => (
                    <TouchableOpacity onPress={handleSubmit} style={styles.saveButton} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <Text style={[styles.saveButtonText, { color: colors.primary }]}>Saving...</Text>
                        ) : (
                            <Text style={[styles.saveButtonText, { color: colors.primary }]}>Save</Text>
                        )}
                    </TouchableOpacity>
                )}
                style={{ backgroundColor: colors.background }}
            />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <ThemedView style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                    {/* Basic Information */}
                    <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

                        <Select
                            label='Portfolio *'
                            selectedIndex={selectedPortfolioIndex}
                            onSelect={(index) => setSelectedPortfolioIndex(index as IndexPath)}
                            value={selectedPortfolio?.data?.name || 'Select Portfolio'}
                            style={[styles.input, errors.portfolio && styles.inputError]}
                        >
                            {portfolios.map((portfolio, index) => (
                                <SelectItem key={index} title={portfolio.data?.name || `Portfolio ${index + 1}`} />
                            ))}
                        </Select>
                        {errors.portfolio && <Text style={styles.errorText}>{errors.portfolio}</Text>}

                        <Input
                            label='Investment Name *'
                            placeholder='e.g., Apple Inc.'
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            style={[styles.input, errors.name && styles.inputError]}
                            status={errors.name ? 'danger' : 'basic'}
                        />
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                        <Input
                            label='ISIN (Optional)'
                            placeholder='e.g., IT9282990139'
                            value={formData.isin}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, isin: text.toUpperCase() }))}
                            style={styles.input}
                        />

                        <Input
                            label='Exchange Market (Optional)'
                            placeholder='e.g., MX'
                            value={formData.exchange_market}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, exchange_market: text.toUpperCase() }))}
                            style={styles.input}
                        />

                        <Input
                            label='Symbol (Optional)'
                            placeholder='e.g., AAPL'
                            value={formData.symbol}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, symbol: text.toUpperCase() }))}
                            style={styles.input}
                        />

                        <Select
                            label='Investment Type *'
                            selectedIndex={selectedTypeIndex}
                            onSelect={(index) => setSelectedTypeIndex(index as IndexPath)}
                            value={selectedType?.name}
                            style={styles.input}
                        >
                            {investmentTypes.map((type, index) => (
                                <SelectItem key={index} title={type.name} />
                            ))}
                        </Select>

                        <Select
                            label='Currency'
                            selectedIndex={selectedCurrencyIndex}
                            onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
                            value={selectedCurrency}
                            style={styles.input}
                        >
                            {currencies.map((currency, index) => (
                                <SelectItem key={index} title={currency} />
                            ))}
                        </Select>
                    </Card>

                    {/* Investment Details */}
                    <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Investment Details</Text>

                        <Input
                            label='Quantity *'
                            placeholder='Number of shares/units'
                            value={formData.quantity}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                            keyboardType='numeric'
                            style={[styles.input, errors.quantity && styles.inputError]}
                            status={errors.quantity ? 'danger' : 'basic'}
                        />
                        {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}

                        <Input
                            label='Purchase Price per Unit *'
                            placeholder='0.00'
                            value={formData.purchase_price}
                            onChangeText={(text) => {
                                setFormData(prev => ({
                                    ...prev,
                                    purchase_price: text,
                                }));
                            }}
                            keyboardType='numeric'
                            style={[styles.input, errors.purchase_price && styles.inputError]}
                            status={errors.purchase_price ? 'danger' : 'basic'}
                        />
                        {errors.purchase_price && <Text style={styles.errorText}>{errors.purchase_price}</Text>}

                        <Input
                            label='Current Price per Unit (Optional)'
                            placeholder='Leave empty to use purchase price'
                            value={formData.current_price}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, current_price: text }))}
                            keyboardType='numeric'
                            style={[styles.input, errors.current_price && styles.inputError]}
                            status={errors.current_price ? 'danger' : 'basic'}
                        />
                        {errors.current_price && <Text style={styles.errorText}>{errors.current_price}</Text>}
                        <Text style={[styles.premiumNote, { color: colors.icon }]}>
                            Coming soon premium feature: In the future, current prices will be updated automatically
                        </Text>

                        {selectedType.id === 'bond' && (
                            <>
                                <Input
                                    label='Interest Rate (% per year)'
                                    placeholder='e.g., 3.5'
                                    value={formData.interest_rate}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, interest_rate: text }))}
                                    keyboardType='numeric'
                                    style={[styles.input, errors.interest_rate && styles.inputError]}
                                    status={errors.interest_rate ? 'danger' : 'basic'}
                                />
                                {errors.interest_rate && <Text style={styles.errorText}>{errors.interest_rate}</Text>}
                                
                                <Datepicker
                                    label='Maturity Date'
                                    date={formData.maturity_date}
                                    onSelect={(date) => setFormData(prev => ({ ...prev, maturity_date: date }))}
                                    style={[styles.input, errors.maturity_date && styles.inputError]}
                                    status={errors.maturity_date ? 'danger' : 'basic'}
                                    min={new Date(formData.purchase_date.getTime() + 24 * 60 * 60 * 1000)}
                                    max={new Date(2050, 11, 31)}
                                />
                                {errors.maturity_date && <Text style={styles.errorText}>{errors.maturity_date}</Text>}
                            </>
                        )}

                        <Datepicker
                            label='Purchase Date *'
                            date={formData.purchase_date}
                            onSelect={(date) => setFormData(prev => ({ ...prev, purchase_date: date }))}
                            style={styles.input}
                        />

                        <Input
                            label='Notes (Optional)'
                            placeholder='Any additional notes...'
                            value={formData.notes}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                            multiline={true}
                            textStyle={{ minHeight: 64 }}
                            style={styles.input}
                        />
                    </Card>

                    {/* Summary Card */}
                    {formData.quantity && formData.purchase_price && (
                        <Card style={[styles.formCard, { backgroundColor: colors.card }]}>
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
                                    {selectedType.id === 'bond' && formData.interest_rate ? (
                                        <>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    Market Value:
                                                </Text>
                                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                                    {formatCurrency(Number(formData.quantity) * Number(formData.current_price))}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    Interest Earned:
                                                </Text>
                                                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                                                    {formatCurrency(calculateBondInterestReturn())}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    Total Current Value:
                                                </Text>
                                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                                    {formatCurrency(calculateCurrentValue())}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    Total Gain/Loss:
                                                </Text>
                                                <Text style={[
                                                    styles.summaryValue,
                                                    { color: calculateGainLoss() >= 0 ? '#4CAF50' : '#F44336' }
                                                ]}>
                                                    {formatCurrency(calculateGainLoss())}
                                                </Text>
                                            </View>
                                            
                                            {getDaysToMaturity() !== null && (
                                                <View style={styles.summaryRow}>
                                                    <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                        Days to Maturity:
                                                    </Text>
                                                    <Text style={[
                                                        styles.summaryValue, 
                                                        { color: getBondStatus() === 'matured' ? '#FF9800' : colors.text }
                                                    ]}>
                                                        {getBondStatus() === 'matured' ? 'Matured' : `${getDaysToMaturity()} days`}
                                                    </Text>
                                                </View>
                                            )}
                                        </>
                                    ) : (
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
                                </>
                            )}
                        </Card>
                    )}

                    {/* Delete Button */}
                    <View style={styles.deleteButtonContainer}>
                        <Button
                            style={styles.deleteButton}
                            appearance='outline'
                            status='danger'
                            accessoryLeft={() => <Ionicons name="trash-outline" size={20} color={colors.error} />}
                            onPress={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Investment'}
                        </Button>
                    </View>

                    <View style={styles.bottomPadding} />
                </ThemedView>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButton: {
        padding: 8,
    },
    saveButton: {
        padding: 8,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    formCard: {
        marginBottom: 16,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
    },
    inputError: {
        borderColor: '#FF6B6B',
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 12,
        marginTop: 4,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButtonContainer: {
        marginTop: 16,
    },
    deleteButton: {
        borderRadius: 12,
    },
    bottomPadding: {
        height: 32,
    },
    premiumNote: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: -12,
        marginBottom: 16,
    },
});
