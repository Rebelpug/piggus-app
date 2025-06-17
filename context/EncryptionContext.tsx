import React, {createContext, useState, useContext, useCallback, ReactNode, useMemo} from 'react';
import {
    deriveKeyFromPassword,
    generateKeyPair,
    encryptPrivateKey,
    decryptPrivateKey,
    encryptData,
    decryptData,
    decryptFromSender,
    encryptWithPublicKey,
    signData,
    verifySignature, decryptWithRSA, base64ToArrayBuffer, generateEncryptionKey,
} from '@/lib/encryption';
import {SecureKeyManager} from "@/lib/secureKeyManager";

// Types
interface EncryptionContextType {
    // State getters
    getPublicKey: () => string | null;
    isEncryptionInitialized: boolean;

    // Core functions
    initializeFromSecureStorage: () => Promise<boolean>;
    initializeFromPassword: (password: string, progress?: (progress: any) => void) => Promise<{
        publicKey: string;
        privateKey: string;
        encryptionKey: Uint8Array<ArrayBufferLike>;
        salt: string;
    }>;
    importExistingKeys: (
        publicKey: string,
        encryptedPrivateKey: string,
        password: string,
        progress?: (progress: any) => void,
    ) => Promise<{
        publicKey: string;
        privateKey: string;
        encryptionKey: Uint8Array<ArrayBufferLike>;
        salt: string;
    } | null>;
    resetEncryption: () => void;

    // Data encryption
    createEncryptionKey: () => Promise<Uint8Array<ArrayBufferLike>>;
    encrypt: (data: any) => Promise<string>;
    decryptWithEncryptionKey: (encryptedData: string) => Promise<any>;
    decryptWithExternalEncryptionKey: (encryptionKey: string, encryptedData: string) => Promise<any>;
    decryptWithPrivateKey: (encryptedData: string) => Promise<any>;

    // Recipient-specific encryption
    encryptWithExternalEncryptionKey: (encryptionKey: string, data: any) => Promise<string>;
    encryptWithExternalPublicKey: (recipientPublicKey: string, data: any) => Promise<string>;
    decryptFromSender: (encryptedKey: string, encryptedData: string) => Promise<any>;

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
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    const initializeFromSecureStorage = useCallback(async (): Promise<boolean> => {
        try {
            console.log('Attempting to initialize from secure storage...');

            // Check if we have stored keys
            const hasKeys = await SecureKeyManager.hasStoredKeys();
            if (!hasKeys) {
                console.log('No keys found in secure storage');
                return false;
            }

            // Retrieve encryption key from secure storage
            const storedEncryptionKey = await SecureKeyManager.getEncryptionKey();
            if (!storedEncryptionKey) {
                console.log('Failed to retrieve encryption key from secure storage');
                return false;
            }

            // Retrieve encrypted private key from AsyncStorage
            const storedPrivateKey = await SecureKeyManager.getPrivateKey(storedEncryptionKey);
            if (!storedPrivateKey) {
                console.log('Failed to retrieve private key from AsyncStorage');
                return false;
            }

            // Get public key from user metadata (this doesn't need to be stored securely)
            // You'll need to pass the user object here or get it from context
            // For now, we'll assume you have access to it

            // Update state with the retrieved keys
            setEncryptionKey(storedEncryptionKey);
            setPrivateKey(storedPrivateKey);
            // setPublicKey(publicKeyFromMetadata); // You'll need to get this
            setIsInitialized(true);

            console.log('Successfully initialized from secure storage');
            return true;
        } catch (error) {
            console.error('Failed to initialize from secure storage:', error);
            return false;
        }
    }, []);

    const initializeFromPassword = useCallback(async (
        password: string,
        onProgress?: (progress: number) => void,
    ) => {
        try {
            console.log('Initializing encryption from password...');
            onProgress?.(0.1);

            // 1. Derive encryption key from password for encrypting the private key
            console.log('Deriving encryption key from password...');
            const { key, salt: newSalt } = await deriveKeyFromPassword(password, undefined, (pbkdfProgress) => {
                // Map PBKDF2 progress to overall progress (10% to 60%)
                const overallProgress = 0.1 + (pbkdfProgress * 0.5);
                onProgress?.(overallProgress);
            });

            console.log('PBKDF2 completed, generating RSA key pair...');
            onProgress?.(0.65);

            // 2. Generate a new RSA key pair
            const { publicKey: newPublicKey, privateKey: newPrivateKey } = await generateKeyPair();
            onProgress?.(0.8);

            console.log('RSA keys generated, updating state...');
            onProgress?.(0.9);

            // 3. Update the state
            setEncryptionKey(key);
            setPublicKey(newPublicKey);
            setPrivateKey(newPrivateKey);
            setIsInitialized(true);

            console.log('Storing keys in secure storage...');
            await SecureKeyManager.storeEncryptionKey(key);
            await SecureKeyManager.storePrivateKey(newPrivateKey, key);

            onProgress?.(1.0);
            console.log('Encryption initialization completed successfully');

            return {
                publicKey: newPublicKey,
                privateKey: newPrivateKey,
                encryptionKey: key,
                salt: newSalt
            };
        } catch (error) {
            console.error('Failed to initialize encryption:', error);
            onProgress?.(0);
            throw error;
        }
    }, []);

    const importExistingKeys = useCallback(async (
        importedPublicKey: string,
        encryptedPrivateKeyData: string,
        password: string,
        onProgress?: (progress: number) => void,
    ): Promise<{
        publicKey: string;
        privateKey: string;
        encryptionKey: Uint8Array<ArrayBufferLike>;
        salt: string;
    } | null> => {
        try {
            console.log('Importing existing keys with progress tracking...');
            onProgress?.(0.1);

            const encryptedData = JSON.parse(encryptedPrivateKeyData);
            const storedSalt = encryptedData.salt;

            if (!storedSalt) {
                console.error('No salt found in encrypted private key data');
                return null;
            }

            console.log('Starting async PBKDF2 with progress updates...');
            onProgress?.(0.2);

            // Use async PBKDF2 with progress tracking
            const { key } = await deriveKeyFromPassword(password, storedSalt, (pbkdfProgress) => {
                // Map PBKDF2 progress to import progress (20% to 80%)
                const importProgress = 0.2 + (pbkdfProgress * 0.6);
                onProgress?.(importProgress);
            });

            console.log('PBKDF2 completed, decrypting private key...');
            onProgress?.(0.85);

            const decryptedPrivateKey = decryptPrivateKey(encryptedPrivateKeyData, key);

            console.log('Updating encryption state...');
            onProgress?.(0.9);

            // Update state with the imported keys
            setPublicKey(importedPublicKey);
            setPrivateKey(decryptedPrivateKey);
            setEncryptionKey(key);
            setIsInitialized(true);

            // Store keys securely for future fast access
            console.log('Storing keys in secure storage...');
            await SecureKeyManager.storeEncryptionKey(key);
            await SecureKeyManager.storePrivateKey(decryptedPrivateKey, key);

            onProgress?.(1.0);
            console.log('Key import completed successfully');

            return {
                publicKey: importedPublicKey,
                privateKey: decryptedPrivateKey,
                encryptionKey: key,
                salt: storedSalt,
            };
        } catch (error) {
            console.error('Failed to import keys:', error);
            onProgress?.(0);
            return null;
        }
    }, []);

    const resetEncryption = useCallback(async (userId?: string) => {
        setPublicKey(null);
        setPrivateKey(null);
        setEncryptionKey(null);
        setIsInitialized(false);
        await SecureKeyManager.clearAllData();
    }, []);

    // Check if encryption is initialized
    const isEncryptionInitialized = useMemo((): boolean => {
        return isInitialized;
    }, [isInitialized]);

    const createEncryptionKey = useCallback(async (): Promise<Uint8Array<ArrayBufferLike>> => {
        return generateEncryptionKey();
    }, []);

    // Encrypt data with current encryption key
    const encrypt = useCallback(async (data: any): Promise<string> => {
        if (!encryptionKey) {
            console.error('Cannot encrypt: encryption not initialized');
            return '';
        }

        try {
            return encryptData(data, encryptionKey);
        } catch (error) {
            console.error('Encryption failed:', error);
            return '';
        }
    }, [encryptionKey]);

    // Decrypt data with current encryption key
    const decryptWithEncryptionKey = useCallback(async (encryptedData: string): Promise<any> => {
        if (!isEncryptionInitialized || !encryptionKey) {
            console.error('Cannot decrypt: encryption not initialized');
            throw new Error('Encryption not initialized');
        }

        try {
            return decryptData(encryptedData, encryptionKey);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }, [isEncryptionInitialized, encryptionKey]);

    // Encrypt data with current encryption key
    const encryptWithExternalEncryptionKey = useCallback(async (encryptionKey: string, data: any): Promise<string> => {
        if (!encryptionKey) {
            console.error('Cannot encrypt: encryption not initialized');
            return '';
        }

        try {
            const convertedEncryptionKey = base64ToArrayBuffer(encryptionKey);
            return encryptData(data, convertedEncryptionKey);
        } catch (error) {
            console.error('Encryption failed:', error);
            return '';
        }
    }, []);

    const decryptWithExternalEncryptionKey = useCallback(async (encryptionKey: string, encryptedData: string): Promise<any> => {
        if (!encryptionKey) {
            console.error('Cannot decrypt: encryption not initialized');
            throw new Error('Encryption not initialized');
        }

        try {
            const convertedEncryptionKey = base64ToArrayBuffer(encryptionKey);
            return decryptData(encryptedData, convertedEncryptionKey);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }, []);

    // Encrypt data for a recipient using their public key
    const encryptWithExternalPublicKey = useCallback(async (
        recipientPublicKey: string,
        data: any
    ): Promise<string> => {
        try {
            return await encryptWithPublicKey(data, recipientPublicKey);
        } catch (error) {
            console.error('Error encrypting for recipient:', error);
            return '';
        }
    }, []);

    // Decrypt data that was encrypted for you
    const decryptFromSenderFn = useCallback(async (
        encryptedKey: string,
        encryptedData: string
    ): Promise<any> => {
        if (!privateKey) {
            console.error('Cannot decrypt: private key not available');
            throw new Error('Private key not available');
        }

        try {
            return await decryptFromSender(encryptedKey, encryptedData, privateKey);
        } catch (error) {
            console.error('Error decrypting from sender:', error);
            throw error;
        }
    }, [privateKey]);

    const decryptWithPrivateKey = useCallback(async (
        encryptedData: string
    ): Promise<any> => {
        if (!privateKey) {
            console.error('Cannot decrypt: private key not available');
            throw new Error('Private key not available');
        }

        try {
            return await decryptWithRSA(privateKey, encryptedData);
        } catch (error) {
            console.error('Error decrypting with private key:', error);
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

    // Context value
    const value: EncryptionContextType = {
        getPublicKey,
        isEncryptionInitialized,
        initializeFromSecureStorage,
        initializeFromPassword,
        importExistingKeys,
        resetEncryption,
        createEncryptionKey,
        encrypt,
        decryptWithEncryptionKey,
        encryptWithExternalEncryptionKey,
        decryptWithExternalEncryptionKey,
        encryptWithExternalPublicKey,
        decryptFromSender: decryptFromSenderFn,
        decryptWithPrivateKey,
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
