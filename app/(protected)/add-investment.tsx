import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert, View, KeyboardAvoidingView, Platform } from 'react-native';
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
import { InvestmentData } from '@/types/investment';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

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
        <TopNavigationAction
            icon={(props) => <Ionicons name="arrow-back" size={24} color={props?.tintColor} />}
            onPress={() => router.back()}
        />
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
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <TopNavigation
                    title='Add Investment'
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    style={{ backgroundColor: colors.background }}
                />
                <Layout style={styles.emptyState}>
                    <Ionicons name="briefcase-outline" size={64} color="#8F9BB3" style={styles.emptyIcon} />
                    <Text category='h6' style={styles.emptyTitle}>No portfolios available</Text>
                    <Text category='s1' appearance='hint' style={styles.emptyDescription}>
                        You need to create a portfolio first before adding investments
                    </Text>
                    <Button
                        style={styles.createPortfolioButton}
                        onPress={() => router.push('/(protected)/create-portfolio')}
                    >
                        Create Portfolio
                    </Button>
                </Layout>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title='Add Investment'
                alignment='center'
                accessoryLeft={renderBackAction}
                style={{ backgroundColor: colors.background }}
            />

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Layout style={styles.form}>
                        {/* Portfolio Selection */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Portfolio *
                            </Text>
                            <Select
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
                        </View>

                        {/* Investment Type */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Investment Type *
                            </Text>
                            <Select
                                selectedIndex={selectedTypeIndex}
                                onSelect={(index) => setSelectedTypeIndex(index as IndexPath)}
                                value={selectedType?.name}
                                style={styles.input}
                            >
                                {investmentTypes.map((type, index) => (
                                    <SelectItem key={index} title={type.name} />
                                ))}
                            </Select>
                        </View>

                        {/* Investment Name */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Investment Name *
                            </Text>
                            <Input
                                value={formData.name}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                                placeholder="e.g., Apple Inc."
                                style={[styles.input, errors.name && styles.inputError]}
                                status={errors.name ? 'danger' : 'basic'}
                            />
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        {/* Symbol */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Symbol (Optional)
                            </Text>
                            <Input
                                value={formData.symbol}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, symbol: text.toUpperCase() }))}
                                placeholder="e.g., AAPL"
                                style={styles.input}
                            />
                        </View>

                        {/* Quantity */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Quantity *
                            </Text>
                            <Input
                                value={formData.quantity}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                                placeholder="Number of shares/units"
                                keyboardType="numeric"
                                style={[styles.input, errors.quantity && styles.inputError]}
                                status={errors.quantity ? 'danger' : 'basic'}
                            />
                            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
                        </View>

                        {/* Currency */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Currency
                            </Text>
                            <Select
                                selectedIndex={selectedCurrencyIndex}
                                onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
                                value={selectedCurrency}
                                style={styles.input}
                            >
                                {currencies.map((currency, index) => (
                                    <SelectItem key={index} title={currency} />
                                ))}
                            </Select>
                        </View>

                        {/* Purchase Price */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Purchase Price per Unit *
                            </Text>
                            <Input
                                value={formData.purchase_price}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, purchase_price: text }))}
                                placeholder="0.00"
                                keyboardType="numeric"
                                style={[styles.input, errors.purchase_price && styles.inputError]}
                                status={errors.purchase_price ? 'danger' : 'basic'}
                            />
                            {errors.purchase_price && <Text style={styles.errorText}>{errors.purchase_price}</Text>}
                        </View>

                        {/* Current Price */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Current Price per Unit (Optional)
                            </Text>
                            <Input
                                value={formData.current_price}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, current_price: text }))}
                                placeholder="Leave empty to use purchase price"
                                keyboardType="numeric"
                                style={[styles.input, errors.current_price && styles.inputError]}
                                status={errors.current_price ? 'danger' : 'basic'}
                            />
                            {errors.current_price && <Text style={styles.errorText}>{errors.current_price}</Text>}
                        </View>

                        {/* Purchase Date */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Purchase Date *
                            </Text>
                            <Datepicker
                                date={formData.purchase_date}
                                onSelect={(date) => setFormData(prev => ({ ...prev, purchase_date: date }))}
                                style={styles.input}
                            />
                        </View>

                        {/* Notes */}
                        <View style={styles.formGroup}>
                            <Text category='label' style={[styles.label, { color: colors.text }]}>
                                Notes (Optional)
                            </Text>
                            <Input
                                value={formData.notes}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                                placeholder="Any additional notes..."
                                multiline
                                textStyle={{ minHeight: 80 }}
                                style={styles.input}
                            />
                        </View>

                        {/* Summary Card */}
                        {formData.quantity && formData.purchase_price && (
                            <Card style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                                <Text category='h6' style={[styles.summaryTitle, { color: colors.text }]}>
                                    Investment Summary
                                </Text>
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
                            </Card>
                        )}

                        <Button
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            accessoryLeft={isSubmitting ? undefined : (props) => 
                                <Ionicons name="add" size={20} color={props?.tintColor} />
                            }
                        >
                            {isSubmitting ? 'Adding Investment...' : 'Add Investment'}
                        </Button>
                    </Layout>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    form: {
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
    },
    inputError: {
        borderColor: '#FF6B6B',
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 12,
        marginTop: 4,
    },
    summaryCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    summaryTitle: {
        marginBottom: 12,
        textAlign: 'center',
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
    submitButton: {
        borderRadius: 12,
        paddingVertical: 16,
        marginTop: 20,
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
    createPortfolioButton: {
        paddingHorizontal: 24,
        borderRadius: 12,
    },
});