import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import {
    deriveKeyFromPassword,
    generateKeyPair,
    encryptPrivateKey,
    decryptPrivateKey,
    encryptData,
    decryptData,
    encryptForRecipient,
    decryptFromSender,
    signData,
    verifySignature,
} from '@/lib/encryption';

// Types
interface EncryptionContextType {
    // State getters
    getPublicKey: () => string | null;
    isEncryptionInitialized: () => boolean;

    // Core functions
    initializeFromPassword: (password: string) => Promise<{
        publicKey: string;
        privateKey: string;
        encryptionKey: Uint8Array<ArrayBufferLike>;
        salt: string;
    }>;
    importExistingKeys: (
        publicKey: string,
        encryptedPrivateKey: string,
        password: string
    ) => Promise<{
        publicKey: string;
        privateKey: string;
        encryptionKey: Uint8Array<ArrayBufferLike>;
        salt: string;
    } | null>;
    resetEncryption: () => void;

    // Data encryption
    encrypt: (data: any) => Promise<string | null>;
    decrypt: (encryptedData: string) => Promise<any>;

    // Recipient-specific encryption
    encryptForRecipient: (recipientPublicKey: string, data: any) => Promise<string | null>;
    decryptFromSender: (encryptedPackage: string) => Promise<any>;

    // Key export
    exportEncryptedPrivateKey: (
        privateKey: string,
        encryptionKey: Uint8Array,
        salt: string
    ) => Promise<string | null>;

    // Digital signatures
    sign: (data: string) => Promise<string | null>;
    verify: (signerPublicKey: string, data: string, signature: string) => Promise<boolean>;
}

// Create the context
const EncryptionContext = createContext<EncryptionContextType | null>(null);

// Provider component
export const EncryptionProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    // Internal state - all keys are kept only in memory
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
    const [salt, setSalt] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Initialize encryption from a password
    const initializeFromPassword = useCallback(async (password: string) => {
        try {
            // 1. Derive encryption key from password for encrypting the private key
            const { key, salt: newSalt } = await deriveKeyFromPassword(password);

            // 2. Generate a new RSA key pair
            const { publicKey: newPublicKey, privateKey: newPrivateKey } = await generateKeyPair();

            // 3. Update the state
            setEncryptionKey(key);
            setSalt(newSalt);
            setPublicKey(newPublicKey);
            setPrivateKey(newPrivateKey);
            setIsInitialized(true);

            console.log('Encryption initialized successfully');
            return {
                publicKey: newPublicKey,
                privateKey: newPrivateKey,
                encryptionKey: key,
                salt: newSalt
            }
        } catch (error) {
            console.error('Failed to initialize encryption:', error);
            throw error;
        }
    }, []);

    // Import existing keys with password
    const importExistingKeys = useCallback(async (
        importedPublicKey: string,
        encryptedPrivateKeyData: string,
        password: string
    ): Promise<{
        publicKey: string;
        privateKey: string;
        encryptionKey: Uint8Array<ArrayBufferLike>;
        salt: string;
    } | null> => {
        try {
            // Parse the encrypted private key data (includes salt)
            const encryptedData = JSON.parse(encryptedPrivateKeyData);
            const storedSalt = encryptedData.salt;

            if (!storedSalt) {
                console.error('No salt found in encrypted private key data');
                return null;
            }

            // Derive the key using the stored salt
            const { key } = await deriveKeyFromPassword(password, storedSalt);

            // Try to decrypt the private key
            const decryptedPrivateKey = decryptPrivateKey(encryptedPrivateKeyData, key);

            // Update state with the imported keys
            setPublicKey(importedPublicKey);
            setPrivateKey(decryptedPrivateKey);
            setEncryptionKey(key);
            setSalt(storedSalt);
            setIsInitialized(true);

            return {
                publicKey: importedPublicKey,
                privateKey: decryptedPrivateKey,
                encryptionKey: key,
                salt: storedSalt,
            };
        } catch (error) {
            console.error('Failed to import keys:', error);
            return null;
        }
    }, []);

    // Reset all encryption state
    const resetEncryption = useCallback(() => {
        setPublicKey(null);
        setPrivateKey(null);
        setEncryptionKey(null);
        setSalt(null);
        setIsInitialized(false);
    }, []);

    // Encrypt data with current encryption key
    const encrypt = useCallback(async (data: any): Promise<string | null> => {
        if (!encryptionKey) {
            console.error('Cannot encrypt: encryption not initialized');
            return null;
        }

        try {
            return encryptData(data, encryptionKey);
        } catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    }, [encryptionKey]);

    // Decrypt data with current encryption key
    const decrypt = useCallback(async (encryptedData: string): Promise<any> => {
        if (!encryptionKey) {
            console.error('Cannot decrypt: encryption not initialized');
            throw new Error('Encryption not initialized');
        }

        try {
            return decryptData(encryptedData, encryptionKey);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }, [encryptionKey]);

    // Encrypt data for a recipient using their public key
    const encryptForRecipientFn = useCallback(async (
        recipientPublicKey: string,
        data: any
    ): Promise<string | null> => {
        try {
            return await encryptForRecipient(data, recipientPublicKey);
        } catch (error) {
            console.error('Error encrypting for recipient:', error);
            return null;
        }
    }, []);

    // Decrypt data that was encrypted for you
    const decryptFromSenderFn = useCallback(async (
        encryptedPackage: string
    ): Promise<any> => {
        if (!privateKey) {
            console.error('Cannot decrypt: private key not available');
            throw new Error('Private key not available');
        }

        try {
            return await decryptFromSender(encryptedPackage, privateKey);
        } catch (error) {
            console.error('Error decrypting from sender:', error);
            throw error;
        }
    }, [privateKey]);

    // Export the encrypted private key (for storage in user metadata)
    const exportEncryptedPrivateKey = useCallback(async (privateKey: string,
                                                         encryptionKey: Uint8Array,
                                                         salt: string,): Promise<string | null> => {
        if (!privateKey || !encryptionKey || !salt) {
            console.error('Cannot export: encryption not fully initialized');
            return null;
        }

        try {
            return encryptPrivateKey(privateKey, encryptionKey, salt);
        } catch (error) {
            console.error('Error exporting encrypted private key:', error);
            return null;
        }
    }, []);

    // Sign data with private key
    const sign = useCallback(async (data: string): Promise<string | null> => {
        if (!privateKey) {
            console.error('Cannot sign: private key not available');
            return null;
        }

        try {
            return await signData(privateKey, data);
        } catch (error) {
            console.error('Error signing data:', error);
            return null;
        }
    }, [privateKey]);

    // Verify signature
    const verify = useCallback(async (
        signerPublicKey: string,
        data: string,
        signature: string
    ): Promise<boolean> => {
        try {
            return await verifySignature(signerPublicKey, data, signature);
        } catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }, []);

    // Get public key
    const getPublicKey = useCallback((): string | null => {
        return publicKey;
    }, [publicKey]);

    // Check if encryption is initialized
    const isEncryptionInitialized = useCallback((): boolean => {
        return isInitialized;
    }, [isInitialized]);

    // Context value
    const value: EncryptionContextType = {
        getPublicKey,
        isEncryptionInitialized,
        initializeFromPassword,
        importExistingKeys,
        resetEncryption,
        encrypt,
        decrypt,
        encryptForRecipient: encryptForRecipientFn,
        decryptFromSender: decryptFromSenderFn,
        exportEncryptedPrivateKey,
        sign,
        verify
    };

    return (
        <EncryptionContext.Provider value={value}>
            {children}
        </EncryptionContext.Provider>
    );
};

// Hook for using the encryption context
export const useEncryption = () => {
    const context = useContext(EncryptionContext);
    if (!context) {
        throw new Error('useEncryption must be used within an EncryptionProvider');
    }
    return context;
};

export default EncryptionContext;
