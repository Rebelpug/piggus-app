import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Buffer } from 'buffer';
import type { Session } from '@supabase/supabase-js';

const ENCRYPTION_KEY = 'encryption_key';
const PRIVATE_KEY = 'private_key';
const SUPABASE_SESSION = 'supabase_session';
const BIOMETRIC_ENABLED = 'biometric_enabled';

export class SecureKeyManager {

    /**
     * Store encryption key securely (for session persistence)
     */
    static async storeEncryptionKey(encryptionKey: Uint8Array): Promise<void> {
        try {
            const keyBase64 = Buffer.from(encryptionKey).toString('base64');

            await SecureStore.setItemAsync(ENCRYPTION_KEY, keyBase64, {
                requireAuthentication: false, // Set to true if you want biometric protection
                keychainService: 'piggus-encryption-keys',
            });

            console.log('Encryption key stored securely');
        } catch (error) {
            console.error('Failed to store encryption key:', error);
            throw error;
        }
    }

    /**
     * Retrieve encryption key from secure storage
     */
    static async getEncryptionKey(): Promise<Uint8Array | null> {
        try {
            const keyBase64 = await SecureStore.getItemAsync(ENCRYPTION_KEY);

            if (!keyBase64) {
                console.log('No encryption key found in secure storage');
                return null;
            }

            console.log('Encryption key retrieved from secure storage');
            return Buffer.from(keyBase64, 'base64');
        } catch (error) {
            console.error('Failed to retrieve encryption key:', error);
            return null;
        }
    }

    /**
     * Store private key securely
     */
    static async storePrivateKey(privateKey: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(PRIVATE_KEY, privateKey, {
                requireAuthentication: false,
                keychainService: 'piggus-private-keys',
            });

            console.log('Private key stored securely');
        } catch (error) {
            console.error('Failed to store private key:', error);
            throw error;
        }
    }

    /**
     * Retrieve private key from secure storage
     */
    static async getPrivateKey(): Promise<string | null> {
        try {
            const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY);

            if (!privateKey) {
                console.log('No private key found in secure storage');
                return null;
            }

            console.log('Private key retrieved from secure storage');
            return privateKey;
        } catch (error) {
            console.error('Failed to retrieve private key:', error);
            return null;
        }
    }

    /**
     * Clear all stored keys for a user (on sign out)
     */
    static async clearKeys(): Promise<void> {
        try {
            await Promise.all([
                SecureStore.deleteItemAsync(ENCRYPTION_KEY),
                SecureStore.deleteItemAsync(PRIVATE_KEY),
            ]);

            console.log('Keys cleared from secure storage');
        } catch (error) {
            console.error('Failed to clear keys:', error);
            // Don't throw here, as this is cleanup
        }
    }

    /**
     * Check if keys exist for a user
     */
    static async hasStoredKeys(): Promise<boolean> {
        try {
            const encryptionKey = await this.getEncryptionKey();
            const privateKey = await this.getPrivateKey();
            return !!(encryptionKey && privateKey);
        } catch (error) {
            console.error('Failed to check for stored keys:', error);
            return false;
        }
    }

    /**
     * Biometric authentication methods
     */
    static async isBiometricAvailable(): Promise<boolean> {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            return hasHardware && isEnrolled;
        } catch (error) {
            console.error('Failed to check biometric availability:', error);
            return false;
        }
    }

    static async authenticateWithBiometrics(promptMessage: string = 'Authenticate to access your account'): Promise<boolean> {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage,
                cancelLabel: 'Cancel',
                fallbackLabel: 'Use PIN',
                disableDeviceFallback: false,
            });
            return result.success;
        } catch (error) {
            console.error('Biometric authentication failed:', error);
            return false;
        }
    }

    /**
     * Supabase session management - split into smaller chunks
     */
    static async storeSupabaseSession(session: Session, requireBiometric: boolean = true): Promise<void> {
        try {
            // Split session into smaller parts to avoid 2048 byte limit
            const sessionParts = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                expires_in: session.expires_in,
                token_type: session.token_type,
                user: {
                    id: session.user.id,
                    email: session.user.email,
                    email_confirmed_at: session.user.email_confirmed_at,
                    created_at: session.user.created_at,
                    updated_at: session.user.updated_at,
                }
            };

            // Store access token separately
            await SecureStore.setItemAsync(`${SUPABASE_SESSION}_access`, session.access_token, {
                requireAuthentication: requireBiometric,
                keychainService: 'piggus-supabase-sessions',
            });

            // Store refresh token separately
            await SecureStore.setItemAsync(`${SUPABASE_SESSION}_refresh`, session.refresh_token, {
                requireAuthentication: requireBiometric,
                keychainService: 'piggus-supabase-sessions',
            });

            // Store session metadata (smaller payload)
            const sessionMeta = {
                expires_at: session.expires_at,
                expires_in: session.expires_in,
                token_type: session.token_type,
                user: sessionParts.user
            };

            await SecureStore.setItemAsync(`${SUPABASE_SESSION}_meta`, JSON.stringify(sessionMeta), {
                requireAuthentication: requireBiometric,
                keychainService: 'piggus-supabase-sessions',
            });

            // Store biometric preference
            const deviceSupportsBiometric = await this.isBiometricAvailable();
            await SecureStore.setItemAsync(BIOMETRIC_ENABLED, deviceSupportsBiometric.toString());

            console.log('Supabase session stored securely in chunks');
        } catch (error) {
            console.error('Failed to store Supabase session:', error);
            throw error;
        }
    }

    static async getSupabaseSession(): Promise<Session | null> {
        try {
            // Retrieve session parts
            const accessToken = await SecureStore.getItemAsync(`${SUPABASE_SESSION}_access`);
            const refreshToken = await SecureStore.getItemAsync(`${SUPABASE_SESSION}_refresh`);
            const metaData = await SecureStore.getItemAsync(`${SUPABASE_SESSION}_meta`);

            if (!accessToken || !refreshToken || !metaData) {
                console.log('No complete Supabase session found in secure storage');
                return null;
            }

            const sessionMeta = JSON.parse(metaData);

            // Reconstruct session
            const session: Session = {
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_at: sessionMeta.expires_at,
                expires_in: sessionMeta.expires_in,
                token_type: sessionMeta.token_type,
                user: sessionMeta.user
            };

            console.log('Supabase session retrieved from secure storage');
            return session;
        } catch (error) {
            console.error('Failed to retrieve Supabase session:', error);
            return null;
        }
    }

    static async isBiometricEnabled(): Promise<boolean> {
        try {
            const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED);
            return enabled === 'true';
        } catch (error) {
            console.error('Failed to check biometric setting:', error);
            return false;
        }
    }

    static async hasStoredSession(): Promise<boolean> {
        try {
            const accessToken = await SecureStore.getItemAsync(`${SUPABASE_SESSION}_access`);
            const refreshToken = await SecureStore.getItemAsync(`${SUPABASE_SESSION}_refresh`);
            const metaData = await SecureStore.getItemAsync(`${SUPABASE_SESSION}_meta`);
            return !!(accessToken && refreshToken && metaData);
        } catch (error) {
            console.error('Failed to check for stored session:', error);
            return false;
        }
    }

    /**
     * Get all stored user IDs (for biometric login when no active session)
     */
    static async hasAnyStoredSessionData(): Promise<boolean> {
        try {
            const accessToken = await SecureStore.getItemAsync(`${SUPABASE_SESSION}_access`);
            const hasBiometricFlag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED);

            return !!accessToken && hasBiometricFlag === 'true';
        } catch (error) {
            console.error('Failed to check for stored session data:', error);
            return false;
        }
    }

    /**
     * Clear all stored data for a user (on sign out)
     */
    static async clearAllData(): Promise<void> {
        try {
            await Promise.all([
                SecureStore.deleteItemAsync(ENCRYPTION_KEY),
                SecureStore.deleteItemAsync(PRIVATE_KEY),
                SecureStore.deleteItemAsync(`${SUPABASE_SESSION}_access`),
                SecureStore.deleteItemAsync(`${SUPABASE_SESSION}_refresh`),
                SecureStore.deleteItemAsync(`${SUPABASE_SESSION}_meta`),
                SecureStore.deleteItemAsync(BIOMETRIC_ENABLED),
            ]);

            console.log('All data cleared from secure storage');
        } catch (error) {
            console.error('Failed to clear data:', error);
        }
    }

    /**
     * Update encryption key storage to support biometric authentication
     */
    static async storeEncryptionKeyWithBiometric(encryptionKey: Uint8Array, requireBiometric: boolean = true): Promise<void> {
        try {
            const keyBase64 = Buffer.from(encryptionKey).toString('base64');

            await SecureStore.setItemAsync(ENCRYPTION_KEY, keyBase64, {
                requireAuthentication: requireBiometric,
                keychainService: 'piggus-encryption-keys',
            });

            console.log('Encryption key stored securely with biometric protection');
        } catch (error) {
            console.error('Failed to store encryption key with biometric:', error);
            throw error;
        }
    }

    static async storePrivateKeyWithBiometric(privateKey: string, requireBiometric: boolean = true): Promise<void> {
        try {
            await SecureStore.setItemAsync(PRIVATE_KEY, privateKey, {
                requireAuthentication: requireBiometric,
                keychainService: 'piggus-private-keys',
            });

            console.log('Private key stored securely with biometric protection');
        } catch (error) {
            console.error('Failed to store private key with biometric:', error);
            throw error;
        }
    }
}
