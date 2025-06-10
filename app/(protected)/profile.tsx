import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity, View, Image } from 'react-native';
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
import { CURRENCIES } from '@/types/expense';
import { Ionicons } from '@expo/vector-icons';
import ProfileHeader from '@/components/ProfileHeader';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const { userProfile, updateProfile } = useProfile();
    const [loading, setLoading] = useState(false);
    const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
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

    const renderBackAction = () => (
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#8F9BB3" />
        </TouchableOpacity>
    );

    const ProfileAvatar = () => (
        <View style={styles.avatarContainer}>
            <Image
                source={{ uri: (userProfile?.profile?.avatar_url || '') }}
                style={styles.avatar}
            />
            <TouchableOpacity style={styles.avatarEditButton}>
                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <TopNavigation
                title='Profile'
                alignment='center'
                accessoryLeft={renderBackAction}
            />

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <Layout style={styles.header}>
                    <ProfileAvatar />
                    <Text category='h5' style={styles.username}>
                        {userProfile?.username || 'Unknown User'}
                    </Text>
                    <Text category='s1' appearance='hint' style={styles.email}>
                        {user?.email || ''}
                    </Text>
                </Layout>

                {/* Account Information */}
                <Card style={styles.card}>
                    <Text category='h6' style={styles.sectionTitle}>Account Information</Text>

                    <Layout style={styles.infoRow}>
                        <Layout style={styles.infoLabel}>
                            <Ionicons name="person-outline" size={20} color="#8F9BB3" />
                            <Text category='s1' style={styles.labelText}>Username</Text>
                        </Layout>
                        <Text category='s1'>{userProfile?.username}</Text>
                    </Layout>

                    <Divider style={styles.divider} />

                    <Layout style={styles.infoRow}>
                        <Layout style={styles.infoLabel}>
                            <Ionicons name="mail-outline" size={20} color="#8F9BB3" />
                            <Text category='s1' style={styles.labelText}>Email</Text>
                        </Layout>
                        <Text category='s1'>{user?.email}</Text>
                    </Layout>

                    <Divider style={styles.divider} />

                    <Layout style={styles.infoRow}>
                        <Layout style={styles.infoLabel}>
                            <Ionicons name="calendar-outline" size={20} color="#8F9BB3" />
                            <Text category='s1' style={styles.labelText}>Member Since</Text>
                        </Layout>
                        <Text category='s1'>
                            {userProfile?.created_at
                                ? new Date(userProfile.created_at).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })
                                : 'Unknown'}
                        </Text>
                    </Layout>
                </Card>

                {/* Preferences */}
                <Card style={styles.card}>
                    <Text category='h6' style={styles.sectionTitle}>Preferences</Text>

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => setCurrencyModalVisible(true)}
                    >
                        <Layout style={styles.infoLabel}>
                            <Ionicons name="card-outline" size={20} color="#8F9BB3" />
                            <Text category='s1' style={styles.labelText}>Default Currency</Text>
                        </Layout>
                        <Layout style={styles.preferenceValue}>
                            <Text category='s1' style={styles.currentValue}>
                                {CURRENCIES.find(c => c.value === userProfile?.profile?.defaultCurrency)?.label || 'EUR (€)'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
                        </Layout>
                    </TouchableOpacity>

                    <Divider style={styles.divider} />

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => Alert.alert('Coming Soon', 'Budget preferences will be available soon!')}
                    >
                        <Layout style={styles.infoLabel}>
                            <Ionicons name="wallet-outline" size={20} color="#8F9BB3" />
                            <Text category='s1' style={styles.labelText}>Budget Settings</Text>
                        </Layout>
                        <Layout style={styles.preferenceValue}>
                            <Text category='s1' style={styles.currentValue}>
                                {userProfile?.profile?.budget
                                    ? `${userProfile.profile.budget.amount} ${userProfile.profile.defaultCurrency}`
                                    : 'Not set'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
                        </Layout>
                    </TouchableOpacity>
                </Card>

                {/* Security */}
                <Card style={styles.card}>
                    <Text category='h6' style={styles.sectionTitle}>Security</Text>

                    <TouchableOpacity
                        style={styles.preferenceRow}
                        onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon!')}
                    >
                        <Layout style={styles.infoLabel}>
                            <Ionicons name="lock-closed-outline" size={20} color="#8F9BB3" />
                            <Text category='s1' style={styles.labelText}>Change Password</Text>
                        </Layout>
                        <Ionicons name="chevron-forward" size={20} color="#8F9BB3" />
                    </TouchableOpacity>

                    <Divider style={styles.divider} />

                    <Layout style={styles.infoRow}>
                        <Layout style={styles.infoLabel}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="#8F9BB3" />
                            <Text category='s1' style={styles.labelText}>Encryption</Text>
                        </Layout>
                        <Text category='c1' style={styles.encryptionStatus}>
                            End-to-End Encrypted
                        </Text>
                    </Layout>
                </Card>

                {/* Actions */}
                <Button
                    style={styles.signOutButton}
                    status='danger'
                    size='large'
                    onPress={handleSignOut}
                    disabled={loading}
                    accessoryLeft={loading ? () => <Spinner size='small' status='control' /> : undefined}
                >
                    {loading ? 'Signing Out...' : 'Sign Out'}
                </Button>

                <Layout style={styles.footer}>
                    <Text category='c1' appearance='hint' style={styles.version}>
                        Version 1.0.0
                    </Text>
                </Layout>
            </ScrollView>

            {/* Currency Selection Modal */}
            <Modal
                visible={currencyModalVisible}
                backdropStyle={styles.backdrop}
                onBackdropPress={() => setCurrencyModalVisible(false)}
            >
                <Card disabled={true} style={styles.modalCard}>
                    <Text category='h6' style={styles.modalTitle}>Select Default Currency</Text>
                    <Text category='s1' appearance='hint' style={styles.modalDescription}>
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

                    <Layout style={styles.modalActions}>
                        <Button
                            style={styles.modalButton}
                            appearance='outline'
                            onPress={() => setCurrencyModalVisible(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            style={styles.modalButton}
                            onPress={handleUpdateCurrency}
                            disabled={loading}
                            accessoryLeft={loading ? () => <Spinner size='small' status='control' /> : undefined}
                        >
                            {loading ? 'Updating...' : 'Update'}
                        </Button>
                    </Layout>
                </Card>
            </Modal>
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
    },
    header: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F0F0F0',
    },
    avatarEditButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3366FF',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    username: {
        marginBottom: 4,
    },
    email: {
        marginBottom: 8,
    },
    card: {
        margin: 16,
        marginBottom: 0,
        padding: 16,
    },
    sectionTitle: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    infoLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    labelText: {
        marginLeft: 12,
    },
    divider: {
        backgroundColor: '#F0F0F0',
    },
    preferenceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    preferenceValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentValue: {
        marginRight: 8,
        color: '#8F9BB3',
    },
    encryptionStatus: {
        color: '#4CAF50',
        fontWeight: '500',
    },
    signOutButton: {
        margin: 16,
        marginTop: 24,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
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
    },
    modalTitle: {
        marginBottom: 8,
    },
    modalDescription: {
        marginBottom: 16,
        lineHeight: 20,
    },
    modalSelect: {
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        flex: 1,
    },
});
