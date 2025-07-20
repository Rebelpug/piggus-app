/**
 * Recovery Key Management for Piggus App
 * Handles generation, storage, and encryption of recovery keys using BIP39 standard
 */
import 'react-native-get-random-values';
import * as Crypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/hashes/utils';
import { generateMnemonic, mnemonicToSeed, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { arrayBufferToBase64, base64ToArrayBuffer, deriveKeyFromPassword } from './encryption';

// Constants for recovery key
const RECOVERY_PHRASE_WORDS = 12; // 12-word mnemonic (128 bits of entropy)

/**
 * Generate a cryptographically secure BIP39 recovery phrase
 */
export function generateRecoveryPhrase(): string[] {
  // Generate a 12-word BIP39 mnemonic (128 bits of entropy)
  const mnemonic = generateMnemonic(wordlist, 128);
  return mnemonic.split(' ');
}

/**
 * Generate a recovery key from a BIP39 mnemonic phrase
 */
export async function mnemonicToRecoveryKey(mnemonic: string[]): Promise<string> {
  const mnemonicString = mnemonic.join(' ');
  
  // Validate the mnemonic first
  if (!validateMnemonic(mnemonicString, wordlist)) {
    throw new Error('Invalid mnemonic phrase');
  }
  
  // Convert mnemonic to seed (512 bits / 64 bytes)
  const seed = await mnemonicToSeed(mnemonicString);
  
  // Use first 32 bytes (256 bits) as recovery key
  const recoveryKey = seed.slice(0, 32);
  
  return arrayBufferToBase64(recoveryKey);
}

/**
 * Validate a recovery phrase using BIP39 standard
 */
export function validateRecoveryPhrase(phrase: string[]): boolean {
  if (phrase.length !== RECOVERY_PHRASE_WORDS) {
    return false;
  }
  
  const mnemonicString = phrase.join(' ');
  return validateMnemonic(mnemonicString, wordlist);
}

/**
 * Convert a recovery phrase back to a recovery key
 */
export async function recoveryPhraseToKey(phrase: string[]): Promise<string | null> {
  try {
    if (!validateRecoveryPhrase(phrase)) {
      return null;
    }
    
    return await mnemonicToRecoveryKey(phrase);
  } catch (error) {
    console.error('Error converting recovery phrase to key:', error);
    return null;
  }
}

/**
 * Encrypt the user's private key with the recovery key
 */
export async function encryptPrivateKeyWithRecoveryKey(
  privateKey: string,
  recoveryKey: string
): Promise<string> {
  try {
    // Derive encryption key from recovery key
    const { key: encryptionKey } = await deriveKeyFromPassword(recoveryKey, undefined);
    
    // Generate IV for AES-GCM
    const iv = randomBytes(12);
    
    // Encrypt the private key
    const cipher = gcm(encryptionKey, iv);
    const privateKeyBytes = base64ToArrayBuffer(privateKey);
    const encrypted = cipher.encrypt(privateKeyBytes);
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.length);
    combined.set(iv, 0);
    combined.set(encrypted, iv.length);
    
    return arrayBufferToBase64(combined);
  } catch (error) {
    console.error('Error encrypting private key with recovery key:', error);
    throw new Error('Failed to encrypt private key with recovery key');
  }
}

/**
 * Decrypt the user's private key using the recovery key
 */
export async function decryptPrivateKeyWithRecoveryKey(
  encryptedPrivateKey: string,
  recoveryKey: string
): Promise<string> {
  try {
    // Derive encryption key from recovery key
    const { key: encryptionKey } = await deriveKeyFromPassword(recoveryKey, undefined);
    
    // Split IV and encrypted data
    const combined = base64ToArrayBuffer(encryptedPrivateKey);
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Decrypt the private key
    const cipher = gcm(encryptionKey, iv);
    const decrypted = cipher.decrypt(encrypted);
    
    return arrayBufferToBase64(decrypted);
  } catch (error) {
    console.error('Error decrypting private key with recovery key:', error);
    throw new Error('Failed to decrypt private key with recovery key');
  }
}

/**
 * Format recovery phrase for display
 */
export function formatRecoveryPhraseForDisplay(phrase: string[]): string {
  return phrase.map((word, index) => `${index + 1}. ${word}`).join('\n');
}

/**
 * Format recovery phrase for download/sharing
 */
export function formatRecoveryPhraseForExport(phrase: string[]): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `Piggus Recovery Phrase (BIP39) - Generated on ${timestamp}

IMPORTANT: Keep this recovery phrase safe and secure!
This is the only way to recover your account if you forget your password.

Recovery Phrase (12-word BIP39 mnemonic):
${phrase.map((word, index) => `${index + 1}. ${word}`).join('\n')}

Instructions:
1. Write down these words in exact order on paper
2. Store the paper in a safe place (fireproof safe, safety deposit box)
3. Never share this phrase with anyone
4. Never store it digitally (screenshots, cloud storage, etc.)
5. This phrase follows the BIP39 standard used by major cryptocurrency wallets
6. If you lose this phrase AND forget your password, your data cannot be recovered

WARNING: Anyone with access to this phrase can recover your account and access all your data.

For questions, visit: https://piggus.finance/support`;
}

/**
 * Recover private key using BIP39 mnemonic phrase
 */
export async function recoverPrivateKeyFromMnemonic(
  recoveryPhrase: string[],
  encryptedPrivateKey: string
): Promise<string> {
  // Convert mnemonic to recovery key
  const recoveryKey = await mnemonicToRecoveryKey(recoveryPhrase);
  
  // Decrypt private key using recovery key
  const privateKey = await decryptPrivateKeyWithRecoveryKey(encryptedPrivateKey, recoveryKey);
  
  return privateKey;
}

/**
 * Generate a complete recovery key package using BIP39
 */
export async function generateRecoveryKeyPackage(privateKey: string): Promise<{
  recoveryKey: string;
  recoveryPhrase: string[];
  encryptedPrivateKey: string;
}> {
  // Generate BIP39 mnemonic phrase
  const recoveryPhrase = generateRecoveryPhrase();
  
  // Convert mnemonic to recovery key
  const recoveryKey = await mnemonicToRecoveryKey(recoveryPhrase);
  
  // Encrypt private key with recovery key
  const encryptedPrivateKey = await encryptPrivateKeyWithRecoveryKey(privateKey, recoveryKey);
  
  return {
    recoveryKey,
    recoveryPhrase,
    encryptedPrivateKey,
  };
}