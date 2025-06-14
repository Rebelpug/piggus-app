import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Buffer } from 'buffer';
import type { Session } from '@supabase/supabase-js';

const ENCRYPTION_KEY_PREFIX = 'encryption_key_';
const PRIVATE_KEY_PREFIX = 'private_key_';
const SUPABASE_SESSION_PREFIX = 'supabase_session_';
const BIOMETRIC_ENABLED_PREFIX = 'biometric_enabled_';

export class SecureKeyManager {
    private static getUserKeyId(userId: string): string {
        return `${ENCRYPTION_KEY_PREFIX}${userId}`;
    }

    private static getPrivateKeyId(userId: string): string {
        return `${PRIVATE_KEY_PREFIX}${userId}`;
    }

    private static getSessionId(userId: string): string {
        return `${SUPABASE_SESSION_PREFIX}${userId}`;
    }

    private static getBiometricEnabledId(userId: string): string {
        return `${BIOMETRIC_ENABLED_PREFIX}${userId}`;
    }

    /**
     * Store encryption key securely (for session persistence)
     */
    static async storeEncryptionKey(userId: string, encryptionKey: Uint8Array): Promise<void> {
        try {
            const keyId = this.getUserKeyId(userId);
            const keyBase64 = Buffer.from(encryptionKey).toString('base64');

            await SecureStore.setItemAsync(keyId, keyBase64, {
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
    static async getEncryptionKey(userId: string): Promise<Uint8Array | null> {
        try {
            const keyId = this.getUserKeyId(userId);
            const keyBase64 = await SecureStore.getItemAsync(keyId);

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
    static async storePrivateKey(userId: string, privateKey: string): Promise<void> {
        try {
            const keyId = this.getPrivateKeyId(userId);

            await SecureStore.setItemAsync(keyId, privateKey, {
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
    static async getPrivateKey(userId: string): Promise<string | null> {
        try {
            const keyId = this.getPrivateKeyId(userId);
            const privateKey = await SecureStore.getItemAsync(keyId);

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
    static async clearUserKeys(userId: string): Promise<void> {
        try {
            const encryptionKeyId = this.getUserKeyId(userId);
            const privateKeyId = this.getPrivateKeyId(userId);

            await Promise.all([
                SecureStore.deleteItemAsync(encryptionKeyId),
                SecureStore.deleteItemAsync(privateKeyId),
            ]);

            console.log('User keys cleared from secure storage');
        } catch (error) {
            console.error('Failed to clear user keys:', error);
            // Don't throw here, as this is cleanup
        }
    }

    /**
     * Check if keys exist for a user
     */
    static async hasStoredKeys(userId: string): Promise<boolean> {
        try {
            const encryptionKey = await this.getEncryptionKey(userId);
            const privateKey = await this.getPrivateKey(userId);
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
    static async storeSupabaseSession(userId: string, session: Session, requireBiometric: boolean = true): Promise<void> {
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

            const sessionId = this.getSessionId(userId);
            
            // Store access token separately
            await SecureStore.setItemAsync(`${sessionId}_access`, session.access_token, {
                requireAuthentication: requireBiometric,
                keychainService: 'piggus-supabase-sessions',
            });

            // Store refresh token separately
            await SecureStore.setItemAsync(`${sessionId}_refresh`, session.refresh_token, {
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

            await SecureStore.setItemAsync(`${sessionId}_meta`, JSON.stringify(sessionMeta), {
                requireAuthentication: requireBiometric,
                keychainService: 'piggus-supabase-sessions',
            });

            // Store biometric preference
            const biometricEnabledId = this.getBiometricEnabledId(userId);
            await SecureStore.setItemAsync(biometricEnabledId, requireBiometric.toString());

            // Store user ID for biometric login lookup
            if (requireBiometric) {
                await this.storeUserIdForBiometric(userId);
            }

            console.log('Supabase session stored securely in chunks');
        } catch (error) {
            console.error('Failed to store Supabase session:', error);
            throw error;
        }
    }

    static async getSupabaseSession(userId: string): Promise<Session | null> {
        try {
            const sessionId = this.getSessionId(userId);
            
            // Retrieve session parts
            const accessToken = await SecureStore.getItemAsync(`${sessionId}_access`);
            const refreshToken = await SecureStore.getItemAsync(`${sessionId}_refresh`);
            const metaData = await SecureStore.getItemAsync(`${sessionId}_meta`);

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

    static async isBiometricEnabledForUser(userId: string): Promise<boolean> {
        try {
            const biometricEnabledId = this.getBiometricEnabledId(userId);
            const enabled = await SecureStore.getItemAsync(biometricEnabledId);
            return enabled === 'true';
        } catch (error) {
            console.error('Failed to check biometric setting:', error);
            return false;
        }
    }

    static async hasStoredSession(userId: string): Promise<boolean> {
        try {
            const sessionId = this.getSessionId(userId);
            const accessToken = await SecureStore.getItemAsync(`${sessionId}_access`);
            const refreshToken = await SecureStore.getItemAsync(`${sessionId}_refresh`);
            const metaData = await SecureStore.getItemAsync(`${sessionId}_meta`);
            return !!(accessToken && refreshToken && metaData);
        } catch (error) {
            console.error('Failed to check for stored session:', error);
            return false;
        }
    }

    /**
     * Get all stored user IDs (for biometric login when no active session)
     */
    static async getStoredUserIds(): Promise<string[]> {
        try {
            // This is a simplified approach - in a real app you might want to
            // store a list of user IDs separately for easier retrieval
            const userIds: string[] = [];
            
            // For now, we can't easily enumerate all stored keys with expo-secure-store
            // so we'll return an empty array. In a real implementation, you'd want to
            // maintain a separate list of user IDs who have stored sessions
            
            return userIds;
        } catch (error) {
            console.error('Failed to get stored user IDs:', error);
            return [];
        }
    }

    /**
     * Store user ID for biometric login lookup - split into individual entries
     */
    static async storeUserIdForBiometric(userId: string): Promise<void> {
        try {
            const key = `biometric_user_${userId}`;
            await SecureStore.setItemAsync(key, 'true');
        } catch (error) {
            console.error('Failed to store user ID for biometric:', error);
        }
    }

    /**
     * Get user IDs that have biometric login enabled
     * Note: This is a simplified implementation that can't enumerate all keys
     * In practice, you'd maintain a separate index or use a different approach
     */
    static async getBiometricUserIds(): Promise<string[]> {
        try {
            // Since we can't enumerate SecureStore keys, we'll return empty array
            // and rely on hasStoredSession to check individual users
            // In a real implementation, you might maintain this list elsewhere
            return [];
        } catch (error) {
            console.error('Failed to get biometric user IDs:', error);
            return [];
        }
    }

    /**
     * Remove user ID from biometric login list
     */
    static async removeBiometricUserId(userId: string): Promise<void> {
        try {
            const key = `biometric_user_${userId}`;
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error('Failed to remove biometric user ID:', error);
        }
    }

    /**
     * Clear all stored data for a user (on sign out)
     */
    static async clearAllUserData(userId: string): Promise<void> {
        try {
            const encryptionKeyId = this.getUserKeyId(userId);
            const privateKeyId = this.getPrivateKeyId(userId);
            const sessionId = this.getSessionId(userId);
            const biometricEnabledId = this.getBiometricEnabledId(userId);

            await Promise.all([
                SecureStore.deleteItemAsync(encryptionKeyId),
                SecureStore.deleteItemAsync(privateKeyId),
                SecureStore.deleteItemAsync(`${sessionId}_access`),
                SecureStore.deleteItemAsync(`${sessionId}_refresh`),
                SecureStore.deleteItemAsync(`${sessionId}_meta`),
                SecureStore.deleteItemAsync(biometricEnabledId),
                SecureStore.deleteItemAsync(`biometric_user_${userId}`),
            ]);

            // Remove from biometric user IDs list
            await this.removeBiometricUserId(userId);

            console.log('All user data cleared from secure storage');
        } catch (error) {
            console.error('Failed to clear user data:', error);
        }
    }

    /**
     * Update encryption key storage to support biometric authentication
     */
    static async storeEncryptionKeyWithBiometric(userId: string, encryptionKey: Uint8Array, requireBiometric: boolean = true): Promise<void> {
        try {
            const keyId = this.getUserKeyId(userId);
            const keyBase64 = Buffer.from(encryptionKey).toString('base64');

            await SecureStore.setItemAsync(keyId, keyBase64, {
                requireAuthentication: requireBiometric,
                keychainService: 'piggus-encryption-keys',
            });

            console.log('Encryption key stored securely with biometric protection');
        } catch (error) {
            console.error('Failed to store encryption key with biometric:', error);
            throw error;
        }
    }

    static async storePrivateKeyWithBiometric(userId: string, privateKey: string, requireBiometric: boolean = true): Promise<void> {
        try {
            const keyId = this.getPrivateKeyId(userId);

            await SecureStore.setItemAsync(keyId, privateKey, {
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
