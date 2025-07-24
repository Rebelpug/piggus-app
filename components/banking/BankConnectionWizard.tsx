import React, { useState } from 'react';
import { StyleSheet, Modal, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
    Layout,
    Text,
    Button,
    Card,
    TopNavigation,
    TopNavigationAction,
    Select,
    SelectItem,
    IndexPath,
    Spinner,
    List,
    ListItem,
    Input,
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useLocalization } from '@/context/LocalizationContext';
import { piggusApi, Institution, BankAgreement, BankRequisition } from '@/client/piggusApi';
import { WebView } from 'react-native-webview';

interface BankConnectionWizardProps {
    visible: boolean;
    onClose: () => void;
}

const COUNTRIES = [
    { code: 'AT', name: 'Austria' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croatia' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DK', name: 'Denmark' },
    { code: 'EE', name: 'Estonia' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'GR', name: 'Greece' },
    { code: 'HU', name: 'Hungary' },
    { code: 'IS', name: 'Iceland' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italy' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MT', name: 'Malta' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'RO', name: 'Romania' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'ES', name: 'Spain' },
    { code: 'SE', name: 'Sweden' },
    { code: 'GB', name: 'United Kingdom' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function BankConnectionWizard({ visible, onClose }: BankConnectionWizardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { t } = useLocalization();
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedCountryIndex, setSelectedCountryIndex] = useState<IndexPath | undefined>();
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedInstitution, setSelectedInstitution] = useState<Institution | undefined>();
    const [agreement, setAgreement] = useState<BankAgreement | undefined>();
    const [requisition, setRequisition] = useState<BankRequisition | undefined>();
    const [authUrl, setAuthUrl] = useState<string | undefined>();
    const [searchQuery, setSearchQuery] = useState<string>('');

    const filteredInstitutions = institutions.filter(institution =>
        institution.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        institution.bic.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const fetchBankInstitutions = async (countryCode: string) => {
        setLoading(true);
        try {
            const institutionsData = await piggusApi.getBankInstitutions(countryCode);
            setInstitutions(institutionsData);
            setSearchQuery(''); // Clear search when new institutions are loaded
            setSelectedInstitution(undefined); // Clear selection
            setCurrentStep(2);
        } catch (error: any) {
            console.error('Error fetching bank institutions:', error);
            let errorMessage = 'Failed to load bank institutions. Please try again.';
            
            if (error.response?.status === 403) {
                errorMessage = 'Premium subscription required to access bank data.';
            } else if (error.response?.status === 409) {
                errorMessage = 'You already have an active bank connection. Only one connection is allowed.';
            } else if (error.response?.status === 500) {
                errorMessage = 'Bank data service is currently unavailable.';
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const createBankConnection = async () => {
        if (!selectedInstitution) return;
        
        setLoading(true);
        try {
            // Step 1: Create agreement
            const agreementData = await piggusApi.createBankAgreement(selectedInstitution.id);
            setAgreement(agreementData);
            
            // Step 2: Create requisition
            const redirectUrl = 'piggus://bank-auth-complete'; // Deep link for your app
            const requisitionData = await piggusApi.createBankRequisition(
                redirectUrl,
                selectedInstitution.id,
                agreementData.id,
                `bank-connection-${Date.now()}`
            );
            setRequisition(requisitionData);
            setAuthUrl(requisitionData.link);
            setCurrentStep(3); // Move to WebView step
            
        } catch (error: any) {
            console.error('Error creating bank connection:', error);
            let errorMessage = 'Failed to create bank connection. Please try again.';
            
            if (error.response?.status === 403) {
                errorMessage = 'Premium subscription required to access bank data.';
            } else if (error.response?.status === 409) {
                errorMessage = 'You already have an active bank connection. Only one connection is allowed.';
            } else if (error.response?.status === 500) {
                errorMessage = 'Bank data service is currently unavailable.';
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const renderBackAction = () => (
        <TopNavigationAction
            icon={(props) => (
                <Ionicons 
                    name={currentStep === 0 || currentStep === 3 ? "close" : "arrow-back"} 
                    size={24} 
                    color={props?.tintColor} 
                />
            )}
            onPress={currentStep === 0 || currentStep === 3 ? onClose : () => setCurrentStep(currentStep - 1)}
        />
    );

    const renderFirstStep = () => (
        <Layout style={styles.stepContainer}>
            <Layout style={styles.iconContainer}>
                <Ionicons 
                    name="shield-checkmark" 
                    size={64} 
                    color={colors.primary} 
                    style={styles.stepIcon} 
                />
            </Layout>
            
            <Text category='h4' style={styles.stepTitle}>
                {t('banking.connectBankTitle')}
            </Text>
            
            <Text category='s1' appearance='hint' style={styles.stepDescription}>
                {t('banking.connectBankDescription')}
            </Text>

            <Card style={[styles.restrictionCard, { backgroundColor: colors.notification, borderColor: colors.primary }]}>
                <Layout style={styles.restrictionItem}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} />
                    <Text category='s2' style={[styles.restrictionText, { color: colors.primary }]}>
                        {t('banking.oneBankRestriction')}
                    </Text>
                </Layout>
            </Card>

            <Card style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <Layout style={styles.infoItem}>
                    <Ionicons name="lock-closed" size={20} color={colors.primary} />
                    <Text category='s2' style={styles.infoText}>
                        {t('banking.securityInfo')}
                    </Text>
                </Layout>
                
                <Layout style={styles.infoItem}>
                    <Ionicons name="eye" size={20} color={colors.primary} />
                    <Text category='s2' style={styles.infoText}>
                        {t('banking.fraudProtectionInfo')}
                    </Text>
                </Layout>
                
                <Layout style={styles.infoItem}>
                    <Ionicons name="business" size={20} color={colors.primary} />
                    <Text category='s2' style={styles.infoText}>
                        {t('banking.thirdPartyInfo')}
                    </Text>
                </Layout>
            </Card>

            <Layout style={styles.buttonContainer}>
                <Button
                    style={styles.continueButton}
                    size='large'
                    onPress={() => setCurrentStep(1)}
                >
                    {t('banking.continue')}
                </Button>
            </Layout>
        </Layout>
    );

    const renderSecondStep = () => (
        <Layout style={styles.stepContainer}>
            <Layout style={styles.iconContainer}>
                <Ionicons 
                    name="flag" 
                    size={64} 
                    color={colors.primary} 
                    style={styles.stepIcon} 
                />
            </Layout>
            
            <Text category='h4' style={styles.stepTitle}>
                {t('banking.selectCountryTitle')}
            </Text>
            
            <Text category='s1' appearance='hint' style={styles.stepDescription}>
                {t('banking.selectCountryDescription')}
            </Text>

            <Select
                style={styles.countrySelect}
                placeholder={t('banking.selectCountry')}
                value={selectedCountryIndex ? COUNTRIES[selectedCountryIndex.row].name : ''}
                selectedIndex={selectedCountryIndex}
                onSelect={(index) => setSelectedCountryIndex(index as IndexPath)}
            >
                {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} title={country.name} />
                ))}
            </Select>

            <Layout style={styles.buttonContainer}>
                <Button
                    style={styles.continueButton}
                    size='large'
                    disabled={!selectedCountryIndex || loading}
                    onPress={() => {
                        if (selectedCountryIndex) {
                            const countryCode = COUNTRIES[selectedCountryIndex.row].code;
                            fetchBankInstitutions(countryCode);
                        }
                    }}
                    accessoryLeft={loading ? () => <Spinner size='small' status='control' /> : undefined}
                >
                    {loading ? 'Loading...' : t('banking.continue')}
                </Button>
            </Layout>
        </Layout>
    );

    const renderThirdStep = () => (
        <Layout style={styles.stepContainer}>
            <Layout style={styles.iconContainer}>
                <Ionicons 
                    name="business" 
                    size={64} 
                    color={colors.primary} 
                    style={styles.stepIcon} 
                />
            </Layout>
            
            <Text category='h4' style={styles.stepTitle}>
                Select Your Bank
            </Text>
            
            <Text category='s1' appearance='hint' style={styles.stepDescription}>
                Choose your bank from the list below to connect your account.
            </Text>

            <Input
                style={styles.searchInput}
                placeholder="Search banks..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessoryLeft={(props) => <Ionicons name="search" size={20} color={props?.tintColor} />}
                accessoryRight={searchQuery ? (props) => (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={props?.tintColor} />
                    </TouchableOpacity>
                ) : undefined}
            />

            <ScrollView style={styles.institutionsList} showsVerticalScrollIndicator={false}>
                {filteredInstitutions.length > 0 ? (
                    filteredInstitutions.map((institution) => (
                    <TouchableOpacity
                        key={institution.id}
                        style={[
                            styles.institutionItem,
                            { 
                                backgroundColor: selectedInstitution?.id === institution.id ? colors.primary + '20' : colors.card,
                                borderColor: selectedInstitution?.id === institution.id ? colors.primary : colors.border
                            }
                        ]}
                        onPress={() => setSelectedInstitution(institution)}
                    >
                        <Layout style={[styles.institutionContent, { backgroundColor: 'transparent' }]}>
                            {institution.logo ? (
                                <Layout style={styles.logoContainer}>
                                    <Text style={styles.logoFallback}>
                                        {institution.name.charAt(0).toUpperCase()}
                                    </Text>
                                </Layout>
                            ) : (
                                <Layout style={styles.logoContainer}>
                                    <Ionicons name="business" size={24} color={colors.text} />
                                </Layout>
                            )}
                            <Layout style={[styles.institutionInfo, { backgroundColor: 'transparent' }]}>
                                <Text category='s1' style={styles.institutionName}>
                                    {institution.name}
                                </Text>
                                <Text category='c1' appearance='hint' style={styles.institutionBic}>
                                    BIC: {institution.bic}
                                </Text>
                            </Layout>
                            {selectedInstitution?.id === institution.id && (
                                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            )}
                        </Layout>
                    </TouchableOpacity>
                    ))
                ) : (
                    <Layout style={styles.emptyState}>
                        <Ionicons name="search" size={48} color={colors.text + '40'} />
                        <Text category='s1' appearance='hint' style={styles.emptyStateText}>
                            {searchQuery ? 'No banks found matching your search' : 'No banks available'}
                        </Text>
                        {searchQuery && (
                            <Button
                                appearance='ghost'
                                size='small'
                                onPress={() => setSearchQuery('')}
                                style={styles.clearSearchButton}
                            >
                                Clear search
                            </Button>
                        )}
                    </Layout>
                )}
            </ScrollView>

            <Layout style={styles.buttonContainer}>
                <Button
                    style={styles.continueButton}
                    size='large'
                    disabled={!selectedInstitution || loading}
                    onPress={createBankConnection}
                    accessoryLeft={loading ? () => <Spinner size='small' status='control' /> : undefined}
                >
                    {loading ? 'Connecting...' : 'Connect Bank'}
                </Button>
            </Layout>
        </Layout>
    );

    const renderFourthStep = () => (
        <Layout style={styles.webViewContainer}>
            <Layout style={styles.webViewHeader}>
                <Text category='h6' style={styles.webViewTitle}>
                    Authenticate with {selectedInstitution?.name}
                </Text>
                <Text category='s2' appearance='hint' style={styles.webViewDescription}>
                    Please log in to your bank account to complete the connection.
                </Text>
            </Layout>
            
            {authUrl && (
                <WebView
                    source={{ uri: authUrl }}
                    style={styles.webView}
                    onNavigationStateChange={(navState) => {
                        // Check if we're being redirected back to our app
                        if (navState.url.startsWith('piggus://bank-auth-complete')) {
                            // Parse the URL to get any parameters
                            console.log('Bank authentication completed:', navState.url);
                            
                            // Show success and close
                            Alert.alert(
                                'Success',
                                'Your bank account has been connected successfully!',
                                [{ text: 'OK', onPress: onClose }]
                            );
                        }
                    }}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView error:', nativeEvent);
                        Alert.alert(
                            'Error',
                            'Failed to load bank authentication page. Please try again.',
                            [
                                { text: 'Retry', onPress: () => setCurrentStep(2) },
                                { text: 'Cancel', onPress: onClose }
                            ]
                        );
                    }}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <Layout style={styles.webViewLoading}>
                            <Spinner size='large' />
                            <Text category='s1' style={styles.loadingText}>
                                Loading bank authentication...
                            </Text>
                        </Layout>
                    )}
                />
            )}
        </Layout>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 0:
                return renderFirstStep();
            case 1:
                return renderSecondStep();
            case 2:
                return renderThirdStep();
            case 3:
                return renderFourthStep();
            default:
                return renderFirstStep();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <TopNavigation
                    title={t('banking.bankConnection')}
                    alignment='center'
                    accessoryLeft={renderBackAction}
                    style={{ backgroundColor: colors.background }}
                />
                
                {renderStepContent()}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stepContainer: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    stepIcon: {
        marginBottom: 8,
    },
    stepTitle: {
        textAlign: 'center',
        marginBottom: 16,
        fontWeight: '600',
    },
    stepDescription: {
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    infoCard: {
        marginBottom: 32,
        padding: 20,
        borderRadius: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        backgroundColor: 'transparent',
    },
    infoText: {
        flex: 1,
        marginLeft: 12,
        lineHeight: 20,
    },
    buttonContainer: {
        backgroundColor: 'transparent',
    },
    continueButton: {
        borderRadius: 12,
        paddingVertical: 16,
    },
    restrictionCard: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    restrictionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
    },
    restrictionText: {
        flex: 1,
        marginLeft: 12,
        lineHeight: 20,
        fontWeight: '500',
    },
    countrySelect: {
        marginBottom: 32,
        borderRadius: 12,
    },
    institutionsList: {
        flex: 1,
        marginBottom: 16,
    },
    institutionItem: {
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
    },
    institutionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logoFallback: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
    },
    institutionInfo: {
        flex: 1,
    },
    institutionName: {
        fontWeight: '600',
        marginBottom: 4,
    },
    institutionBic: {
        fontSize: 12,
    },
    searchInput: {
        marginBottom: 16,
        borderRadius: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: 'transparent',
    },
    emptyStateText: {
        marginTop: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    clearSearchButton: {
        borderRadius: 8,
    },
    webViewContainer: {
        flex: 1,
    },
    webViewHeader: {
        padding: 24,
        paddingBottom: 16,
        backgroundColor: 'transparent',
    },
    webViewTitle: {
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: '600',
    },
    webViewDescription: {
        textAlign: 'center',
        lineHeight: 20,
    },
    webView: {
        flex: 1,
    },
    webViewLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    loadingText: {
        marginTop: 16,
        textAlign: 'center',
    },
});