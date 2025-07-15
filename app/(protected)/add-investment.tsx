import React, {useState} from 'react';
import {Alert, ScrollView, StatusBar, StyleSheet, TouchableOpacity, View} from 'react-native';
import {
    Button,
    Datepicker,
    IndexPath,
    Input,
    Select,
    SelectItem,
    Spinner,
    Text,
    TopNavigation
} from '@ui-kitten/components';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useInvestment} from '@/context/InvestmentContext';
import {useProfile} from '@/context/ProfileContext';
import {InvestmentData} from '@/types/investment';
import {Ionicons} from '@expo/vector-icons';
import {useColorScheme} from '@/hooks/useColorScheme';
import {Colors} from '@/constants/Colors';
import {ThemedView} from '@/components/ThemedView';
import {useLocalization} from '@/context/LocalizationContext';

// Investment types with localized names
const investmentTypes = [
    { id: 'stock', icon: 'trending-up' },
    { id: 'bond', icon: 'shield-checkmark' },
    { id: 'cryptocurrency', icon: 'flash' },
    { id: 'etf', icon: 'bar-chart' },
    { id: 'mutualFund', icon: 'pie-chart' },
    { id: 'realEstate', icon: 'home' },
    { id: 'commodity', icon: 'diamond' },
    { id: 'other', icon: 'ellipsis-horizontal' },
];

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'];



export default function AddInvestmentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { portfolios, addInvestment } = useInvestment();
    const { userProfile } = useProfile();
    const { t } = useLocalization();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLookingUp, setIsLookingUp] = useState(false);
    //const [isinResults, setIsinResults] = useState<ISINResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [selectedResultIndex, setSelectedResultIndex] = useState<IndexPath | undefined>(undefined);

    // Get user's default currency and find its index
    const userDefaultCurrency = userProfile?.profile?.defaultCurrency || 'EUR';
    const defaultCurrencyIndex = currencies.findIndex(c => c === userDefaultCurrency);
    const initialCurrencyIndex = defaultCurrencyIndex >= 0 ? defaultCurrencyIndex : 0;

    // Form state - Check if portfolioId is passed as parameter
    const getInitialPortfolioIndex = () => {
        const portfolioId = params.portfolioId as string;
        if (portfolioId) {
            const portfolioIndex = portfolios.findIndex(p => p.id === portfolioId);
            if (portfolioIndex >= 0) {
                return new IndexPath(portfolioIndex);
            }
        }
        return new IndexPath(0);
    };

    const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState<IndexPath>(getInitialPortfolioIndex());
    const [selectedTypeIndex, setSelectedTypeIndex] = useState<IndexPath>(new IndexPath(0));
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(new IndexPath(initialCurrencyIndex));

    const [formData, setFormData] = useState({
        isin: '',
        name: '',
        symbol: '',
        exchange_market: '',
        quantity: '',
        purchase_price: '',
        current_price: '',
        purchase_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago for testing
        notes: '',
        interest_rate: '',
        maturity_date: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000), // 5 years from now
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const selectedPortfolio = portfolios[selectedPortfolioIndex.row];
    const selectedType = investmentTypes[selectedTypeIndex.row];
    const selectedTypeName = selectedType ? t(`investmentTypes.${selectedType.id}`) : '';
    const selectedCurrency = currencies[selectedCurrencyIndex.row];
    //const selectedResult = selectedResultIndex ? isinResults[selectedResultIndex.row] : null;

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name.trim()) {
            newErrors.name = t('addInvestment.investmentNameRequired');
        }

        if (!formData.quantity.trim()) {
            newErrors.quantity = t('addInvestment.quantityRequired');
        } else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
            newErrors.quantity = t('addInvestment.quantityPositive');
        }

        if (!formData.purchase_price.trim()) {
            newErrors.purchase_price = t('addInvestment.purchasePriceRequired');
        } else if (isNaN(Number(formData.purchase_price)) || Number(formData.purchase_price) <= 0) {
            newErrors.purchase_price = t('addInvestment.purchasePricePositive');
        }

        if (formData.current_price && (isNaN(Number(formData.current_price)) || Number(formData.current_price) <= 0)) {
            newErrors.current_price = t('addInvestment.currentPricePositive');
        }

        if (selectedType.id === 'bond' && formData.interest_rate && (isNaN(Number(formData.interest_rate)) || Number(formData.interest_rate) <= 0)) {
            newErrors.interest_rate = t('addInvestment.interestRatePositive');
        }

        if (selectedType.id === 'bond' && formData.maturity_date && formData.maturity_date <= formData.purchase_date) {
            newErrors.maturity_date = t('addInvestment.maturityDateAfterPurchase');
        }

        if (!selectedPortfolio) {
            newErrors.portfolio = t('addInvestment.selectPortfolioRequired');
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
                current_price: formData.current_price ? Number(formData.current_price) : Number(formData.purchase_price),
                purchase_date: formData.purchase_date.toISOString(),
                currency: selectedCurrency,
                notes: formData.notes.trim() || null,
                last_updated: new Date().toISOString(),
                interest_rate: selectedType.id === 'bond' && formData.interest_rate ? Number(formData.interest_rate) : null,
                maturity_date: selectedType.id === 'bond' && formData.maturity_date ? formData.maturity_date.toISOString() : null,
            };

            const result = await addInvestment(selectedPortfolio.id, investmentData);

            if (result) {
                router.back();
            } else {
                Alert.alert(t('addInvestment.error'), t('addInvestment.addInvestmentFailed'));
            }
        } catch (error) {
            console.error('Error adding investment:', error);
            Alert.alert(t('addInvestment.error'), t('addInvestment.unexpectedError'));
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

        if (quantity === 0 || purchasePrice === 0 || interestRate === 0) {
            console.log('One of the values is 0, returning 0');
            return 0;
        }

        const initialValue = quantity * purchasePrice;

        // Calculate time periods
        const currentDate = new Date();
        const purchaseDate = formData.purchase_date;
        const maturityDate = formData.maturity_date;

        // Determine the end date for interest calculation (current date or maturity date, whichever is earlier)
        const endDate = maturityDate && currentDate > maturityDate ? maturityDate : currentDate;

        // Calculate days since purchase until end date
        const daysSincePurchase = Math.floor((endDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const yearsSincePurchase = Math.max(0, daysSincePurchase / 365.25);

        // For demonstration purposes, if purchase date is today, use 1 year as example
        const yearsForCalculation = yearsSincePurchase === 0 ? 1 : yearsSincePurchase;

        // Calculate annual interest return
        return initialValue * (interestRate / 100) * yearsForCalculation;
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

    if (portfolios.length === 0) {
        return (
            <ThemedView style={styles.container}>
                <SafeAreaView style={styles.safeArea}>
                    <StatusBar
                        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                        backgroundColor={colors.background}
                    />
                    <TopNavigation
                        title={t('addInvestment.title')}
                        alignment='center'
                        accessoryLeft={renderBackAction}
                        style={{ backgroundColor: colors.background }}
                    />
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: colors.error + '20' }]}>
                            <Ionicons name="briefcase-outline" size={32} color={colors.error} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('addInvestment.noPortfoliosAvailable')}</Text>
                        <Text style={[styles.emptyDescription, { color: colors.icon }]}>
                            {t('addInvestment.createPortfolioFirst')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.goBackButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/(protected)/create-portfolio')}
                        >
                            <Text style={styles.goBackButtonText}>{t('addInvestment.createPortfolio')}</Text>
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
                    title={t('addInvestment.title')}
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    style={{ backgroundColor: colors.background }}
                />

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('addInvestment.investmentDetails')}</Text>

                        <Input
                            style={styles.input}
                            label={t('addInvestment.isinCode')}
                            placeholder={t('addInvestment.enterIsinCode')}
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
                            {isLookingUp ? t('addInvestment.searching') : t('addInvestment.findComingSoon')}
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
                            label={t('addInvestment.portfolio')}
                            placeholder={t('addInvestment.selectPortfolio')}
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
                            label={t('addInvestment.investmentType')}
                            placeholder={t('addInvestment.selectType')}
                            value={selectedTypeName || ''}
                            selectedIndex={selectedTypeIndex}
                            onSelect={(index) => setSelectedTypeIndex(index as IndexPath)}
                        >
                            {investmentTypes.map((type, index) => (
                                <SelectItem key={index} title={t(`investmentTypes.${type.id}`)} />
                            ))}
                        </Select>

                        <Input
                            style={styles.input}
                            label={t('addInvestment.investmentName')}
                            placeholder={t('addInvestment.enterInvestmentName')}
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            status={formData.name.trim() ? 'basic' : 'danger'}
                        />

                        <Input
                            style={styles.input}
                            label={t('addInvestment.symbol')}
                            placeholder='e.g., AAPL'
                            value={formData.symbol}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, symbol: text.toUpperCase() }))}
                        />

                        <Input
                            style={styles.input}
                            label={t('addInvestment.exchangeMarket')}
                            placeholder='e.g., NASDAQ, LSE, XETRA'
                            value={formData.exchange_market}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, exchange_market: text.toUpperCase() }))}
                        />

                        <Input
                            style={styles.input}
                            label={t('addInvestment.quantity')}
                            placeholder={t('addInvestment.quantityDescription')}
                            value={formData.quantity}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, quantity: text }))}
                            keyboardType='decimal-pad'
                            status={formData.quantity.trim() && !isNaN(Number(formData.quantity)) && Number(formData.quantity) > 0 ? 'basic' : 'danger'}
                        />

                        <Select
                            style={styles.input}
                            label={t('addInvestment.currency')}
                            placeholder={t('addInvestment.selectCurrency')}
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
                            label={t('addInvestment.purchasePrice')}
                            placeholder='0.00'
                            value={formData.purchase_price}
                            onChangeText={(text) => {
                                setFormData(prev => ({
                                    ...prev,
                                    purchase_price: text,
                                }));
                            }}
                            keyboardType='decimal-pad'
                            status={formData.purchase_price.trim() && !isNaN(Number(formData.purchase_price)) && Number(formData.purchase_price) > 0 ? 'basic' : 'danger'}
                        />

                        <Input
                            style={styles.input}
                            label={t('addInvestment.currentPrice')}
                            placeholder='0.00'
                            value={formData.current_price}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, current_price: text }))}
                            keyboardType='decimal-pad'
                        />
                        <Text style={[styles.premiumNote, { color: colors.icon }]}>
                            {t('addInvestment.automaticPriceUpdates')}
                        </Text>

                        {selectedType.id === 'bond' && (
                            <>
                                <Input
                                    style={styles.input}
                                    label={t('addInvestment.interestRate')}
                                    placeholder='e.g., 3.5'
                                    value={formData.interest_rate}
                                    onChangeText={(text) => setFormData(prev => ({ ...prev, interest_rate: text }))}
                                    keyboardType='decimal-pad'
                                    status={errors.interest_rate ? 'danger' : 'basic'}
                                />
                                {errors.interest_rate && <Text style={styles.errorText}>{errors.interest_rate}</Text>}

                                <Datepicker
                                    style={styles.input}
                                    label={t('addInvestment.maturityDate')}
                                    date={formData.maturity_date}
                                    onSelect={(date) => setFormData(prev => ({ ...prev, maturity_date: date }))}
                                    status={errors.maturity_date ? 'danger' : 'basic'}
                                    min={new Date(formData.purchase_date.getTime() + 24 * 60 * 60 * 1000)}
                                    max={new Date(2050, 11, 31)}
                                />
                                {errors.maturity_date && <Text style={styles.errorText}>{errors.maturity_date}</Text>}
                            </>
                        )}

                        <Datepicker
                            style={styles.input}
                            label={t('addInvestment.purchaseDate')}
                            date={formData.purchase_date}
                            onSelect={(date) => setFormData(prev => ({ ...prev, purchase_date: date }))}
                            min={new Date(2000, 0, 1)} // or whatever lower bound you want
                            max={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                        />

                        <Input
                            style={styles.input}
                            label={t('addInvestment.notes')}
                            placeholder={t('addInvestment.notesPlaceholder')}
                            value={formData.notes}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                            multiline
                            textStyle={{ minHeight: 64 }}
                        />
                    </View>

                    {/* Summary Card */}
                    {formData.quantity && formData.purchase_price && (
                        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('addInvestment.investmentSummary')}</Text>

                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                    {t('addInvestment.totalInvestment')}
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
                                                    {t('addInvestment.marketValue')}
                                                </Text>
                                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                                    {formatCurrency(Number(formData.quantity) * Number(formData.current_price))}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    {t('addInvestment.interestEarned')}
                                                </Text>
                                                <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                                                    {formatCurrency(calculateBondInterestReturn())}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    {t('addInvestment.totalCurrentValue')}
                                                </Text>
                                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                                    {formatCurrency(calculateCurrentValue())}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    {t('addInvestment.totalGainLoss')}
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
                                                        {t('addInvestment.daysToMaturity')}
                                                    </Text>
                                                    <Text style={[
                                                        styles.summaryValue,
                                                        { color: getBondStatus() === 'matured' ? '#FF9800' : colors.text }
                                                    ]}>
                                                        {getBondStatus() === 'matured' ? t('addInvestment.matured') : `${getDaysToMaturity()} ${t('addInvestment.days')}`}
                                                    </Text>
                                                </View>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    {t('addInvestment.currentValue')}
                                                </Text>
                                                <Text style={[styles.summaryValue, { color: colors.text }]}>
                                                    {formatCurrency(calculateCurrentValue())}
                                                </Text>
                                            </View>
                                            <View style={styles.summaryRow}>
                                                <Text style={[styles.summaryLabel, { color: colors.icon }]}>
                                                    {t('addInvestment.gainLoss')}
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
                        </View>
                    )}

                    <Button
                        style={styles.submitButton}
                        size='large'
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        accessoryLeft={isSubmitting ? () => <Spinner size='small' status='control' /> : undefined}
                    >
                        {isSubmitting ? t('addInvestment.addingInvestment') : t('addInvestment.addInvestment')}
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
    premiumNote: {
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: -12,
        marginBottom: 16,
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 12,
        marginTop: -12,
        marginBottom: 16,
    },
});
