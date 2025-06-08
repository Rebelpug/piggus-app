import * as SecureStore from 'expo-secure-store';

const ENCRYPTION_KEY_PREFIX = 'encryption_key_';
const PRIVATE_KEY_PREFIX = 'private_key_';

export class SecureKeyManager {
    private static getUserKeyId(userId: string): string {
        return `${ENCRYPTION_KEY_PREFIX}${userId}`;
    }

    private static getPrivateKeyId(userId: string): string {
        return `${PRIVATE_KEY_PREFIX}${userId}`;
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
}
