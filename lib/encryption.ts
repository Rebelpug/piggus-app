/**
 * React Native encryption utilities
 * Using expo-crypto, aes-js, and react-native-rsa-native
 */
import 'react-native-get-random-values';
import * as Crypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { randomBytes, utf8ToBytes, bytesToUtf8 } from '@noble/hashes/utils'; // 👈 correct imports
import { RSA } from 'react-native-rsa-native';
import { Buffer } from 'buffer';
import {InteractionManager} from "react-native";

// =====================================================================
// Constants and Utility Functions
// =====================================================================

const PBKDF2_ITERATIONS = 50000; // Balance should be between 10k and 100k, higher is better but slow down app
const AES_KEY_LENGTH = 32; // 256 bits
const RSA_KEY_SIZE = 2048;
const AES_IV_LENGTH = 12;

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
    InteractionManager.runAfterInteractions(async () => {
      try {
        console.info('🔑 Starting PBKDF2 derivation...');
        const startTime = Date.now();

        const salt = saltInput
            ? base64ToArrayBuffer(saltInput)
            : randomBytes(16);

        const passwordBytes = utf8ToBytes(password);

        // This is the full async-safe PBKDF2 operation
        const key = await pbkdf2Async(sha256, passwordBytes, salt, {
          c: PBKDF2_ITERATIONS,
          dkLen: AES_KEY_LENGTH,
        });

        const endTime = Date.now();
        console.info(`✅ Key derived in ${endTime - startTime}ms`);

        onProgress?.(1); // mark 100% progress

        resolve({
          key,
          salt: arrayBufferToBase64(salt),
        });
      } catch (error) {
        console.error('❌ Error in PBKDF2:', error);
        reject(new Error(`Key derivation failed: ${(error as Error)?.message}`));
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
export function encryptWithAES(data: string | object, key: Uint8Array): string {
  const iv = generateRandomBytes(AES_IV_LENGTH);
  const aesInstance = gcm(key, iv);

  const plaintext = typeof data === 'object' ? JSON.stringify(data) : String(data);
  const ciphertext = aesInstance.encrypt(utf8ToBytes(plaintext));

  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv);
  combined.set(ciphertext, iv.length);

  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt data using AES-CTR
 */
export function decryptWithAES(encryptedData: string, key: Uint8Array): any {
  const combined = Buffer.from(encryptedData, 'base64');
  const iv = combined.subarray(0, AES_IV_LENGTH);
  const ciphertext = combined.subarray(AES_IV_LENGTH);

  const aesInstance = gcm(key, iv);
  const decryptedBytes = aesInstance.decrypt(ciphertext);

  if (!decryptedBytes) {
    throw new Error('AES-GCM decryption failed (authentication tag mismatch)');
  }

  const decryptedText = bytesToUtf8(decryptedBytes);
  try {
    return JSON.parse(decryptedText);
  } catch {
    return decryptedText;
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
