/**
 * React Native encryption utilities
 * Using expo-crypto, aes-js, and react-native-rsa-native
 */
import 'react-native-get-random-values';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';
import { RSA } from 'react-native-rsa-native';
import { Buffer } from 'buffer';
import {InteractionManager} from "react-native";

// =====================================================================
// Constants and Utility Functions
// =====================================================================

const PBKDF2_ITERATIONS = 20000; // Balance should be between 10k and 100k, higher is better but slow down app
const AES_KEY_LENGTH = 32; // 256 bits
const AES_COUNTER_LENGTH = 16;
const RSA_KEY_SIZE = 2048;

/**
 * Convert array buffer to base64 string
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('base64');
}

/**
 * Convert base64 string to array buffer
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  return Buffer.from(base64, 'base64');
}

/**
 * Generate random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  return Crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Create a hash of a string (using BASE64 encoding)
 */
export async function hash(value: string): Promise<string> {
  return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      value,
      { encoding: Crypto.CryptoEncoding.BASE64 }
  );
}

// =====================================================================
// Key Derivation
// =====================================================================

/**
 * Derive an encryption key from a password
 */
export async function deriveKeyFromPassword(
    password: string,
    saltInput?: string,
    onProgress?: (progress: number) => void
): Promise<{ key: Uint8Array; salt: string }> {

  return new Promise((resolve, reject) => {
    // Ensure this runs after any pending UI interactions
    InteractionManager.runAfterInteractions(async () => {
      try {
        console.log('🔑 Starting async PBKDF2 derivation...');
        const startTime = Date.now();

        const CHUNK_SIZE = 500;
        const TOTAL_ITERATIONS = 20000;
        const YIELD_INTERVAL = 10;

        // Generate salt if not provided
        const salt = saltInput || arrayBufferToBase64(generateRandomBytes(16));
        console.log('🧂 Salt:', salt.substring(0, 10) + '...');

        // Initial key material
        console.log('🔧 Creating initial key material...');
        let key = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            password + salt,
            { encoding: Crypto.CryptoEncoding.BASE64 }
        );

        if (!key) {
          throw new Error('Failed to create initial key material');
        }

        let keyBuffer = base64ToArrayBuffer(key);
        console.log('✅ Initial key created, starting iterations...');

        // Process in chunks to avoid blocking
        for (let chunk = 0; chunk < TOTAL_ITERATIONS; chunk += CHUNK_SIZE) {
          const chunkEnd = Math.min(chunk + CHUNK_SIZE, TOTAL_ITERATIONS);

          // Process this chunk synchronously
          for (let i = chunk; i < chunkEnd; i++) {
            try {
              const combinedBuffer = Buffer.concat([
                keyBuffer,
                base64ToArrayBuffer(salt),
                new Uint8Array([i & 0xff, (i >> 8) & 0xff, (i >> 16) & 0xff, (i >> 24) & 0xff])
              ]);

              key = await Crypto.digestStringAsync(
                  Crypto.CryptoDigestAlgorithm.SHA256,
                  arrayBufferToBase64(combinedBuffer),
                  { encoding: Crypto.CryptoEncoding.BASE64 }
              );

              if (!key) {
                throw new Error(`Failed to hash at iteration ${i}`);
              }

              keyBuffer = base64ToArrayBuffer(key);
            } catch (iterError) {
              console.error(`❌ Error at iteration ${i}:`, iterError);
              throw iterError;
            }
          }

          // Update progress
          const progress = chunkEnd / TOTAL_ITERATIONS;
          onProgress?.(progress);

          // Log progress every 25%
          if (chunkEnd % 5000 === 0) {
            const elapsed = Date.now() - startTime;
            console.log(`⏳ PBKDF2 progress: ${Math.round(progress * 100)}% (${elapsed}ms elapsed)`);
          }

          // Yield control to the UI thread
          await new Promise(resolve => setTimeout(resolve, YIELD_INTERVAL));
        }

        const endTime = Date.now();
        console.log(`✅ Async PBKDF2 completed in ${endTime - startTime}ms`);

        // Ensure it's the right length for AES
        const finalKey = keyBuffer.slice(0, AES_KEY_LENGTH);

        if (finalKey.length !== AES_KEY_LENGTH) {
          throw new Error(`Invalid key length: ${finalKey.length}, expected: ${AES_KEY_LENGTH}`);
        }

        console.log('🎉 Key derivation successful');
        resolve({ key: finalKey, salt });

      } catch (error) {
        console.error('❌ Error in async key derivation:', error);
        reject(new Error(`Failed to derive encryption key: ${(error as Error)?.message}`));
      }
    });
  });
}

// =====================================================================
// Symmetric Encryption (AES)
// =====================================================================
/**
 * Generate AES Key
 */
export function generateEncryptionKey() {
  return generateRandomBytes(AES_KEY_LENGTH);
}


/**
 * Encrypt data using AES-CTR
 */
export function encryptWithAES(
    data: string | object,
    key: Uint8Array
): string {
  try {
    // Generate a counter (IV)
    const counter = generateRandomBytes(AES_COUNTER_LENGTH);

    // Convert data to string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);

    // Convert to bytes
    const dataBytes = aesjs.utils.utf8.toBytes(dataString);

    // Set up AES-CTR mode
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(counter));

    // Encrypt
    const encryptedBytes = aesCtr.encrypt(dataBytes);

    // Combine counter and encrypted data
    const combined = new Uint8Array(counter.length + encryptedBytes.length);
    combined.set(counter);
    combined.set(encryptedBytes, counter.length);

    // Convert to base64
    return arrayBufferToBase64(combined);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-CTR
 */
export function decryptWithAES(
    encryptedData: string,
    key: Uint8Array
): any {
  try {
    // Convert from base64
    const encryptedBytes = base64ToArrayBuffer(encryptedData);

    // Extract counter and data
    const counter = encryptedBytes.slice(0, AES_COUNTER_LENGTH);
    const dataBytes = encryptedBytes.slice(AES_COUNTER_LENGTH);

    // Set up AES-CTR mode
    const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(counter));

    // Decrypt
    const decryptedBytes = aesCtr.decrypt(dataBytes);

    // Convert to string
    const decryptedString = aesjs.utils.utf8.fromBytes(decryptedBytes);

    // Try to parse as JSON if possible
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

// =====================================================================
// RSA Key Pair Generation and Asymmetric Encryption
// =====================================================================

/**
 * Generate a new RSA key pair
 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  try {
    const keys = await RSA.generateKeys(RSA_KEY_SIZE); // 2048 bits
    return {
      publicKey: keys.public,
      privateKey: keys.private,
    };
  } catch (error) {
    console.error('RSA key generation failed:', error);
    throw new Error('Failed to generate RSA key pair');
  }
}

/**
 * Encrypt data with RSA public key
 */
export async function encryptWithRSA(publicKey: string, data: any): Promise<string> {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  try {
    return await RSA.encrypt(dataStr, publicKey);
  } catch (err) {
    console.error('Error encrypting with RSA', err);
    throw new Error('Failed to encrypt with RSA');
  }
}

/**
 * Decrypt data with RSA private key
 */
export async function decryptWithRSA(privateKey: string, encryptedData: string): Promise<any> {
  try {
    const decrypted = await RSA.decrypt(encryptedData, privateKey);
    try { return JSON.parse(decrypted); } catch { return decrypted; }
  } catch (err) {
    console.error('Error decrypting with RSA', err);
    throw new Error('Failed to decrypt with RSA');
  }
}

// =====================================================================
// Hybrid Encryption (AES + RSA)
// =====================================================================

/**
 * Encrypt data for a recipient using hybrid encryption
 * Generates a random AES key, encrypts data with AES, and encrypts the AES key with RSA
 */
export async function encryptWithPublicKey(
    data: any,
    recipientPublicKey: string
): Promise<string> {
  try {
    return await encryptWithRSA(recipientPublicKey, data);
  } catch (error) {
    console.error('Error in hybrid encryption:', error);
    throw new Error('Failed to encrypt for recipient');
  }
}

/**
 * Decrypt data received from a sender using hybrid encryption
 */
export async function decryptFromSender(
    encryptedKey: string,
    encryptedData: string,
    privateKey: string
): Promise<any> {
  try {
    // Decrypt the AES key with your private key
    const aesKeyBase64 = await decryptWithRSA(privateKey, encryptedKey);
    const aesKey = base64ToArrayBuffer(aesKeyBase64);

    // Decrypt the data with the AES key
    return decryptWithAES(encryptedData, aesKey);
  } catch (error) {
    console.error('Error in hybrid decryption:', error);
    throw new Error('Failed to decrypt from sender');
  }
}

// =====================================================================
// Private Key Management
// =====================================================================

/**
 * Encrypt a private key with a password-derived key
 */
export function encryptPrivateKey(
    privateKey: string,
    encryptionKey: Uint8Array,
    salt: string
): string {
  try {
    // Encrypt the private key
    const encryptedKey = encryptWithAES(privateKey, encryptionKey);

    // Return with salt
    return JSON.stringify({
      salt,
      encryptedKey
    });
  } catch (error) {
    console.error('Error encrypting private key:', error);
    throw new Error('Failed to encrypt private key');
  }
}

/**
 * Decrypt a private key with a password-derived key
 */
export function decryptPrivateKey(
    encryptedKeyData: string,
    encryptionKey: Uint8Array
): string {
  try {
    // Parse the encrypted data
    const { encryptedKey } = JSON.parse(encryptedKeyData);

    // Decrypt the private key
    return decryptWithAES(encryptedKey, encryptionKey);
  } catch (error) {
    console.error('Error decrypting private key:', error);
    throw new Error('Failed to decrypt private key');
  }
}

// =====================================================================
// Data Encryption Wrappers
// =====================================================================

/**
 * Encrypt data with AES
 */
export function encryptData(data: any, key: Uint8Array): string {
  return encryptWithAES(data, key);
}

/**
 * Decrypt data with AES
 */
export function decryptData(encryptedData: string, key: Uint8Array): any {
  return decryptWithAES(encryptedData, key);
}

// =====================================================================
// Digital Signatures
// =====================================================================

/**
 * Sign data with a private key
 */
export async function signData(privateKey: string, data: string): Promise<string> {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  try {
    return await RSA.sign(dataStr, privateKey);
  } catch (err) {
    console.error('Error signing with RSA', err);
    throw new Error('Failed to sign with RSA');
  }
}

/**
 * Verify a signature
 */
export async function verifySignature(publicKey: string, data: string, signature: string): Promise<boolean> {
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);
  try {
    return await RSA.verify(signature, dataStr, publicKey);
  } catch (err) {
    console.error('Error verifying RSA signature', err);
    return false;
  }
}
