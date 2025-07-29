import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity, View, Image, Switch, Linking } from 'react-native';
import {
    Text,
    Input,
    Select,
    SelectItem,
    IndexPath,
    TopNavigation,
    Modal,
    Spinner
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useTheme } from '@/context/ThemeContext';
import { useLocalization } from '@/context/LocalizationContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { CURRENCIES } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { apiDeleteProfile } from "@/services/profileService";

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { colorScheme: currentTheme, toggleColorScheme, isSystemTheme, setIsSystemTheme } = useTheme();
    const { user, signOut } = useAuth();
    const { userProfile, updateProfile } = useProfile();
    const { currentLanguage, changeLanguage, t, availableLanguages } = useLocalization();
    const [loading, setLoading] = useState(false);
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [languageModalVisible, setLanguageModalVisible] = useState(false);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const [roadmapModalVisible, setRoadmapModalVisible] = useState(false);
    const [supportModalVisible, setSupportModalVisible] = useState(false);
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(() => {
        const currentCurrency = userProfile?.profile?.defaultCurrency || 'EUR';
        const index = CURRENCIES.findIndex(c => c.value === currentCurrency);
        return new IndexPath(index >= 0 ? index : 0);
    });
    const [selectedLanguageIndex, setSelectedLanguageIndex] = useState<IndexPath>(new IndexPath(0));

    // Update selected language index when context is ready
    useEffect(() => {
        if (availableLanguages && currentLanguage) {
            const index = availableLanguages.findIndex(l => l.code === currentLanguage);
            setSelectedLanguageIndex(new IndexPath(index >= 0 ? index : 0));
        }
    }, [availableLanguages, currentLanguage]);

    const navigateBack = () => {
        router.back();
    };

    const handleSignOut = async () => {
        Alert.alert(
            t('alerts.signOutTitle'),
            t('alerts.signOutMessage'),
            [
                { text: t('modals.cancel'), style: 'cancel' },
                {
                    text: t('profile.signOut'),
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await signOut();
                            router.replace('/login');
                        } catch (error) {
                            Alert.alert(t('alerts.error'), t('alerts.signOutError'));
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone.',
            [
                {text: 'Cancel', style: 'cancel'},
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await apiDeleteProfile();
                            router.replace('/login');
                            await signOut();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete account');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateCurrency = async () => {
        setLoading(true);
        try {
            const selectedCurrency = CURRENCIES[selectedCurrencyIndex.row];
            await updateProfile({
                defaultCurrency: selectedCurrency.value
            });
            setCurrencyModalVisible(false);
        } catch (error) {
            Alert.alert(t('alerts.error'), t('alerts.currencyUpdateError'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLanguage = async () => {
        setLoading(true);
        try {
            const selectedLanguage = availableLanguages?.[selectedLanguageIndex.row];
            if (!selectedLanguage) return;
            await changeLanguage(selectedLanguage.code);
            setLanguageModalVisible(false);
        } catch (error) {
            Alert.alert(t('alerts.error'), t('alerts.languageUpdateError'));
        } finally {
            setLoading(false);
        }
    };

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) {
            Alert.alert(t('alerts.validationError'), t('alerts.feedbackRequired'));
            return;
        }

        setSendingFeedback(true);
        try {
            Sentry.captureFeedback({
                message: feedbackText,
                email: 'anonymous',
                name: userProfile?.username || t('common.unknownUser'),
                source: 'user_feedback',
            });

            setFeedbackModalVisible(false);
            setFeedbackText('');
            Alert.alert(t('alerts.thankYou'), t('alerts.feedbackSent'));
        } catch (error) {
            Alert.alert(t('alerts.error'), t('alerts.feedbackError'));
        } finally {
            setSendingFeedback(false);
        }
    };

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.icon} />
        </TouchableOpacity>
    );

    const ProfileAvatar = () => (
        <View style={styles.avatarContainer}>
            <View style={[styles.avatarBorder, { borderColor: colors.primary }]}>
                <Image
                    source={{ uri: (userProfile?.profile?.avatar_url || '') }}
                    style={styles.avatar}
                />
            </View>
            {/*<TouchableOpacity style={[styles.avatarEditButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera-outline" size={20} color="white" />
            </TouchableOpacity>*/}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title={t('profile.title')}
                alignment='center'
                accessoryLeft={renderBackAction}
                style={{ backgroundColor: colors.background }}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={[styles.header, { backgroundColor: colors.card }]}>
                    <ProfileAvatar />
                    <Text style={[styles.username, { color: colors.text }]}>
                        {userProfile?.username || t('common.unknownUser')}
                    </Text>
                    <Text style={[styles.email, { color: colors.icon }]}>
                        {user?.email || ''}
                    </Text>
                </View>

                {/* Account Information */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.accountInformation')}</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="person-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>{t('profile.username')}</Text>
                        </View>
                        <Text style={[styles.valueText, { color: colors.icon }]}>{userProfile?.username}</Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.secondary} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>{t('profile.email')}</Text>
                        </View>
                        <Text style={[styles.valueText, { color: colors.icon }]}>{user?.email}</Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>{t('profile.memberSince')}</Text>
                        </View>
                        <Text style={[styles.valueText, { color: colors.icon }]}>
                            {userProfile?.created_at
                                ? new Date(userProfile.created_at).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })
                                : t('common.unknown')}
                        </Text>
                    </View>
                </View>

                {/* Appearance */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.appearance')}</Text>

                    <View style={styles.preferenceRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
                                <Ionicons name={currentTheme === 'dark' ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.warning} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>{t('profile.theme')}</Text>
                        </View>
                        <View style={styles.themeControls}>
                            <Text style={[styles.currentValue, { color: colors.icon }]}>
                                {isSystemTheme ? t('profile.auto') : currentTheme === 'dark' ? t('profile.dark') : t('profile.light')}
                            </Text>
                            <TouchableOpacity
                                style={[styles.themeButton, { backgroundColor: colors.primary }]}
                                onPress={toggleColorScheme}
                            >
                                <Ionicons
                                    name={currentTheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                                    size={20}
                                    color="white"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.preferenceRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
                                <Ionicons name="phone-portrait-outline" size={20} color={colors.success} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>{t('profile.followSystem')}</Text>
                        </View>
                        <Switch
                            value={isSystemTheme}
                            onValueChange={setIsSystemTheme}
                            trackColor={{ false: colors.border, true: colors.primary + '40' }}
                            thumbColor={isSystemTheme ? colors.primary : colors.icon}
                        />
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => setLanguageModalVisible(true)}
                        disabled={true}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                                <Ionicons name="language-outline" size={20} color={colors.accent} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>{t('profile.language')} (Coming soon)</Text>
                        </View>
                        <View style={styles.preferenceValue}>
                            <Text style={[styles.currentValue, { color: colors.icon }]}>
                                {availableLanguages?.find(l => l.code === currentLanguage)?.nativeName || 'English'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Preferences */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.expensePreferences')}</Text>

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => setCurrencyModalVisible(true)}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
                                <Ionicons name="card-outline" size={20} color={colors.success} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>{t('profile.preferredCurrency')}</Text>
                        </View>
                        <View style={styles.preferenceValue}>
                            <Text style={[styles.currentValue, { color: colors.icon }]}>
                                {CURRENCIES.find(c => c.value === userProfile?.profile?.defaultCurrency)?.label || 'EUR (€)'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                        </View>
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => router.push('/(protected)/budgeting-categories')}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                                <Ionicons name="grid-outline" size={20} color={colors.accent} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>{t('profile.categories')}</Text>
                        </View>
                        <View style={styles.preferenceValue}>
                            <Text style={[styles.currentValue, { color: colors.icon }]}>
                                {t('profile.customize')}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Security */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        disabled={true}
                        onPress={() => {}}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.error} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Change Password (Coming soon)</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                    </TouchableOpacity>
                </View>

                {/* Subscription */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('subscription.title')}</Text>

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => router.push('/(protected)/subscription')}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="star-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>
                                {userProfile?.subscription?.subscription_tier === 'premium' 
                                    ? t('subscription.managePlan') 
                                    : t('subscription.upgrade')
                                }
                            </Text>
                        </View>
                        <View style={styles.preferenceValue}>
                            <Text style={[styles.currentValue, { color: colors.icon }]}>
                                {userProfile?.subscription?.subscription_tier === 'premium' 
                                    ? t('subscription.premium.title')
                                    : t('subscription.free.title')
                                }
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* About */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => setSupportModalVisible(true)}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                                <Ionicons name="heart-outline" size={20} color={colors.accent} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Support us</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => setRoadmapModalVisible(true)}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
                                <Ionicons name="map-outline" size={20} color={colors.secondary} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Roadmap</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => setFeedbackModalVisible(true)}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Feedback</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.icon} />
                    </TouchableOpacity>

                    <View style={[styles.divider, {backgroundColor: colors.border}]}/>

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={handleDeleteAccount}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, {backgroundColor: colors.error + '20'}]}>
                                <Ionicons name="trash-outline" size={20} color={colors.error}/>
                            </View>
                            <Text style={[styles.labelText, {color: colors.error}]}>Delete Account</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.error}/>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.signOutButton, { backgroundColor: colors.error }]}
                    onPress={handleSignOut}
                    disabled={loading}
                >
                    <View style={styles.signOutContent}>
                        {loading ? (
                            <Spinner size='small' status='control' />
                        ) : (
                            <Ionicons name="log-out-outline" size={20} color="white" />
                        )}
                        <Text style={styles.signOutText}>
                            {loading ? t('profile.signingOut') : t('profile.signOut')}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Legal Links */}
                <View style={styles.legalLinks}>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://piggus.finance/toc-app')}
                    >
                        <Text style={[styles.legalLinkText, { color: colors.primary }]}>{t('profile.termsAndConditions')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://piggus.finance/privacy-app')}
                    >
                        <Text style={[styles.legalLinkText, { color: colors.primary }]}>{t('profile.privacyPolicy')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.version, { color: colors.icon }]}>
                        {t('profile.version')} 1.0.0
                    </Text>
                </View>
            </ScrollView>

            {/* Currency Selection Modal */}
            <Modal
                visible={currencyModalVisible}
                backdropStyle={styles.backdrop}
                onBackdropPress={() => setCurrencyModalVisible(false)}
            >
                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{t('modals.selectDefaultCurrency')}</Text>
                    <Text style={[styles.modalDescription, { color: colors.icon }]}>
                        {t('modals.currencyDescription')}
                    </Text>

                    <Select
                        style={styles.modalSelect}
                        placeholder={t('modals.selectDefaultCurrency')}
                        value={selectedCurrencyIndex ? CURRENCIES[selectedCurrencyIndex.row]?.label : ''}
                        selectedIndex={selectedCurrencyIndex}
                        onSelect={(index) => setSelectedCurrencyIndex(index as IndexPath)}
                    >
                        {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} title={currency.label} />
                        ))}
                    </Select>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalCancelButton, { borderColor: colors.border }]}
                            onPress={() => setCurrencyModalVisible(false)}
                        >
                            <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('modals.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                            onPress={handleUpdateCurrency}
                            disabled={loading}
                        >
                            <View style={styles.modalButtonContent}>
                                {loading && <Spinner size='small' status='control' />}
                                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                                    {loading ? t('modals.updating') : t('modals.update')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Language Selection Modal */}
            <Modal
                visible={languageModalVisible}
                backdropStyle={styles.backdrop}
                onBackdropPress={() => setLanguageModalVisible(false)}
            >
                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{t('modals.selectLanguage')}</Text>
                    <Text style={[styles.modalDescription, { color: colors.icon }]}>
                        {t('modals.languageDescription')}
                    </Text>

                    <Select
                        style={styles.modalSelect}
                        placeholder={t('modals.selectLanguage')}
                        value={selectedLanguageIndex && availableLanguages ? availableLanguages[selectedLanguageIndex.row]?.nativeName : ''}
                        selectedIndex={selectedLanguageIndex}
                        onSelect={(index) => setSelectedLanguageIndex(index as IndexPath)}
                    >
                        {availableLanguages?.map((language) => (
                            <SelectItem key={language.code} title={language.nativeName} />
                        )) || []}
                    </Select>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalCancelButton, { borderColor: colors.border }]}
                            onPress={() => setLanguageModalVisible(false)}
                        >
                            <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('modals.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                            onPress={handleUpdateLanguage}
                            disabled={loading}
                        >
                            <View style={styles.modalButtonContent}>
                                {loading && <Spinner size='small' status='control' />}
                                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                                    {loading ? t('modals.updating') : t('modals.update')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Feedback Modal */}
            <Modal
                visible={feedbackModalVisible}
                backdropStyle={styles.backdrop}
                onBackdropPress={() => setFeedbackModalVisible(false)}
            >
                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>{t('modals.sendFeedback')}</Text>
                    <Text style={[styles.modalDescription, { color: colors.icon }]}>
                        {t('modals.feedbackDescription')}
                    </Text>

                    <Input
                        style={styles.feedbackInput}
                        placeholder={t('modals.tellUsWhatYouThink')}
                        value={feedbackText}
                        onChangeText={setFeedbackText}
                        multiline={true}
                        numberOfLines={4}
                        textStyle={styles.feedbackTextInput}
                    />

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalCancelButton, { borderColor: colors.border }]}
                            onPress={() => {
                                setFeedbackModalVisible(false);
                                setFeedbackText('');
                            }}
                        >
                            <Text style={[styles.modalButtonText, { color: colors.text }]}>{t('modals.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                            onPress={handleSendFeedback}
                            disabled={sendingFeedback}
                        >
                            <View style={styles.modalButtonContent}>
                                {sendingFeedback && <Spinner size='small' status='control' />}
                                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                                    {sendingFeedback ? t('modals.sending') : t('modals.sendFeedbackButton')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Roadmap Modal */}
            <Modal
                visible={roadmapModalVisible}
                backdropStyle={styles.backdrop}
                onBackdropPress={() => setRoadmapModalVisible(false)}
            >
                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{t('modals.roadmapTitle')}</Text>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: colors.border }]}
                            onPress={() => setRoadmapModalVisible(false)}
                        >
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.modalDescription, { color: colors.icon }]}>
                        {t('modals.roadmapDescription')}
                    </Text>

                    <View style={styles.roadmapList}>
                        <View style={styles.roadmapItem}>
                            <View style={[styles.roadmapBullet, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.roadmapItemText, { color: colors.text }]}>
                                {t('roadmapItems.automaticInvestmentTracking')}
                            </Text>
                        </View>
                        <View style={styles.roadmapItem}>
                            <View style={[styles.roadmapBullet, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.roadmapItemText, { color: colors.text }]}>
                                {t('roadmapItems.bankAccountImports')}
                            </Text>
                        </View>
                        <View style={styles.roadmapItem}>
                            <View style={[styles.roadmapBullet, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.roadmapItemText, { color: colors.text }]}>
                                {t('roadmapItems.interactiveGuides')}
                            </Text>
                        </View>
                        <View style={styles.roadmapItem}>
                            <View style={[styles.roadmapBullet, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.roadmapItemText, { color: colors.text }]}>
                                {t('roadmapItems.aiAssistant')}
                            </Text>
                        </View>
                        <View style={styles.roadmapItem}>
                            <View style={[styles.roadmapBullet, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.roadmapItemText, { color: colors.text }]}>
                                {t('roadmapItems.andMuchMore')}
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Support Modal */}
            <Modal
                visible={supportModalVisible}
                backdropStyle={styles.backdrop}
                onBackdropPress={() => setSupportModalVisible(false)}
            >
                <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{t('modals.supportUsTitle')}</Text>
                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: colors.border }]}
                            onPress={() => setSupportModalVisible(false)}
                        >
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.supportMessage, { color: colors.text }]}>
                        {t('modals.supportUsMessage')}
                    </Text>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 32,
        marginBottom: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    avatarBorder: {
        width: 104,
        height: 104,
        borderRadius: 52,
        borderWidth: 3,
        padding: 2,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        backgroundColor: '#F0F0F0',
    },
    avatarEditButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    username: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
    },
    email: {
        fontSize: 16,
        marginBottom: 8,
    },
    card: {
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
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
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    infoLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    labelText: {
        fontSize: 16,
        fontWeight: '500',
    },
    valueText: {
        fontSize: 14,
        textAlign: 'right',
        flex: 1,
    },
    divider: {
        height: 1,
        marginVertical: 8,
    },
    preferenceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    preferenceValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentValue: {
        marginRight: 12,
        fontSize: 14,
    },
    themeControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    themeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    encryptionStatus: {
        fontWeight: '600',
        fontSize: 14,
    },
    signOutButton: {
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    signOutContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    signOutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    legalLinks: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginHorizontal: 20,
        marginBottom: 0,
        paddingVertical: 2,
    },
    legalLink: {
        padding: 8,
    },
    legalLinkText: {
        fontSize: 14,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    version: {
        fontSize: 12,
    },
    backButton: {
        padding: 8,
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalCard: {
        minWidth: 320,
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    modalDescription: {
        marginBottom: 20,
        lineHeight: 22,
        fontSize: 14,
    },
    modalSelect: {
        marginBottom: 20,
        borderRadius: 12,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelButton: {
        borderWidth: 1,
    },
    modalPrimaryButton: {
        // backgroundColor set dynamically
    },
    modalButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    feedbackInput: {
        marginBottom: 20,
        borderRadius: 12,
        minHeight: 100,
    },
    feedbackTextInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roadmapList: {
        marginTop: 10,
    },
    roadmapItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    roadmapBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    roadmapItemText: {
        fontSize: 16,
        lineHeight: 24,
        flex: 1,
    },
    supportMessage: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'left',
    },
});
