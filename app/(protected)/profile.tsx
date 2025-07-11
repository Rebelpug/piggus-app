import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity, View, Image, Switch, Linking } from 'react-native';
import {
    Layout,
    Text,
    Card,
    Button,
    Input,
    Select,
    SelectItem,
    IndexPath,
    TopNavigation,
    Divider,
    Modal,
    Spinner
} from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { useTheme } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { CURRENCIES } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/ProfileHeader';
import * as Sentry from '@sentry/react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { colorScheme: currentTheme, toggleColorScheme, isSystemTheme, setIsSystemTheme } = useTheme();
    const { user, signOut } = useAuth();
    const { userProfile, updateProfile } = useProfile();
    const [loading, setLoading] = useState(false);
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState<IndexPath>(() => {
        const currentCurrency = userProfile?.profile?.defaultCurrency || 'EUR';
        const index = CURRENCIES.findIndex(c => c.value === currentCurrency);
        return new IndexPath(index >= 0 ? index : 0);
    });

    const navigateBack = () => {
        router.back();
    };

    const handleSignOut = async () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await signOut();
                            router.replace('/login');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
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
            Alert.alert('Error', 'Failed to update currency. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) {
            Alert.alert('Validation Error', 'Please enter your feedback');
            return;
        }

        setSendingFeedback(true);
        try {
            Sentry.captureFeedback({
                message: feedbackText,
                email: 'anonymous',
                name: userProfile?.username || 'Anonymous User',
                source: 'user_feedback',
            });

            setFeedbackModalVisible(false);
            setFeedbackText('');
            Alert.alert('Thank you!', 'Your feedback has been sent successfully.');
        } catch (error) {
            Alert.alert('Error', 'Failed to send feedback. Please try again.');
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
            <TouchableOpacity style={[styles.avatarEditButton, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera-outline" size={20} color="white" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <TopNavigation
                title='Profile'
                alignment='center'
                accessoryLeft={renderBackAction}
                style={{ backgroundColor: colors.background }}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={[styles.header, { backgroundColor: colors.card }]}>
                    <ProfileAvatar />
                    <Text style={[styles.username, { color: colors.text }]}>
                        {userProfile?.username || 'Unknown User'}
                    </Text>
                    <Text style={[styles.email, { color: colors.icon }]}>
                        {user?.email || ''}
                    </Text>
                </View>

                {/* Account Information */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Information</Text>

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="person-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Username</Text>
                        </View>
                        <Text style={[styles.valueText, { color: colors.icon }]}>{userProfile?.username}</Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '20' }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.secondary} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Email</Text>
                        </View>
                        <Text style={[styles.valueText, { color: colors.icon }]}>{user?.email}</Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <View style={styles.infoRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
                                <Ionicons name="calendar-outline" size={20} color={colors.accent} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Member Since</Text>
                        </View>
                        <Text style={[styles.valueText, { color: colors.icon }]}>
                            {userProfile?.created_at
                                ? new Date(userProfile.created_at).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })
                                : 'Unknown'}
                        </Text>
                    </View>
                </View>

                {/* Appearance */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>

                    <View style={styles.preferenceRow}>
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
                                <Ionicons name={currentTheme === 'dark' ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.warning} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Theme</Text>
                        </View>
                        <View style={styles.themeControls}>
                            <Text style={[styles.currentValue, { color: colors.icon }]}>
                                {isSystemTheme ? 'Auto' : currentTheme === 'dark' ? 'Dark' : 'Light'}
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
                            <Text style={[styles.labelText, { color: colors.text }]}>Follow System</Text>
                        </View>
                        <Switch
                            value={isSystemTheme}
                            onValueChange={setIsSystemTheme}
                            trackColor={{ false: colors.border, true: colors.primary + '40' }}
                            thumbColor={isSystemTheme ? colors.primary : colors.icon}
                        />
                    </View>
                </View>

                {/* Preferences */}
                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.text }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses Preferences</Text>

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => setCurrencyModalVisible(true)}
                    >
                        <View style={styles.infoLabel}>
                            <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
                                <Ionicons name="card-outline" size={20} color={colors.success} />
                            </View>
                            <Text style={[styles.labelText, { color: colors.text }]}>Preferred Currency</Text>
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
                            <Text style={[styles.labelText, { color: colors.text }]}>Categories</Text>
                        </View>
                        <View style={styles.preferenceValue}>
                            <Text style={[styles.currentValue, { color: colors.icon }]}>
                                Customize
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

                {/* Actions */}
                <TouchableOpacity
                    style={[styles.feedbackButton, { backgroundColor: colors.primary }]}
                    onPress={() => setFeedbackModalVisible(true)}
                >
                    <View style={styles.feedbackContent}>
                        <Ionicons name="chatbubble-outline" size={20} color="white" />
                        <Text style={styles.feedbackText}>Feedback</Text>
                    </View>
                </TouchableOpacity>

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
                            {loading ? 'Signing Out...' : 'Sign Out'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Legal Links */}
                <View style={styles.legalLinks}>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://piggus.finance/toc-app')}
                    >
                        <Text style={[styles.legalLinkText, { color: colors.primary }]}>Terms and Conditions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => Linking.openURL('https://piggus.finance/privacy-app')}
                    >
                        <Text style={[styles.legalLinkText, { color: colors.primary }]}>Privacy Policy</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.version, { color: colors.icon }]}>
                        Version 1.0.0
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
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Select Default Currency</Text>
                    <Text style={[styles.modalDescription, { color: colors.icon }]}>
                        This will be your default currency for new expenses and budgets.
                    </Text>

                    <Select
                        style={styles.modalSelect}
                        placeholder='Select currency'
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
                            <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                            onPress={handleUpdateCurrency}
                            disabled={loading}
                        >
                            <View style={styles.modalButtonContent}>
                                {loading && <Spinner size='small' status='control' />}
                                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                                    {loading ? 'Updating...' : 'Update'}
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
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Send a feedback</Text>
                    <Text style={[styles.modalDescription, { color: colors.icon }]}>
                        We are a small team and we would love your input on Piggus, we really appreciate it!
                    </Text>

                    <Input
                        style={styles.feedbackInput}
                        placeholder='Tell us what you think...'
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
                            <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.primary }]}
                            onPress={handleSendFeedback}
                            disabled={sendingFeedback}
                        >
                            <View style={styles.modalButtonContent}>
                                {sendingFeedback && <Spinner size='small' status='control' />}
                                <Text style={[styles.modalButtonText, { color: 'white' }]}>
                                    {sendingFeedback ? 'Sending...' : 'Send Feedback'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
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
    feedbackButton: {
        marginHorizontal: 20,
        marginTop: 10,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    feedbackContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    feedbackText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
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
});
