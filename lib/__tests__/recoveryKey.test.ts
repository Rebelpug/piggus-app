/**
 * Test file for BIP39 recovery key functionality
 */
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import {
  generateRecoveryPhrase,
  validateRecoveryPhrase,
  mnemonicToRecoveryKey,
  recoveryPhraseToKey,
  generateRecoveryKeyPackage,
  recoverPrivateKeyFromMnemonic,
} from '../recoveryKey';

describe('Recovery Key BIP39 Implementation', () => {
  it('should generate a valid 12-word BIP39 mnemonic', () => {
    const phrase = generateRecoveryPhrase();
    
    // Should be 12 words
    expect(phrase).toHaveLength(12);
    
    // Should be valid BIP39
    const mnemonicString = phrase.join(' ');
    expect(validateMnemonic(mnemonicString, wordlist)).toBe(true);
    
    // Should validate with our function too
    expect(validateRecoveryPhrase(phrase)).toBe(true);
  });

  it('should convert mnemonic to consistent recovery key', async () => {
    const testMnemonic = ['abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'];
    
    // Same mnemonic should always generate same key
    const key1 = await mnemonicToRecoveryKey(testMnemonic);
    const key2 = await mnemonicToRecoveryKey(testMnemonic);
    
    expect(key1).toBe(key2);
    expect(typeof key1).toBe('string');
    expect(key1.length).toBeGreaterThan(0);
  });

  it('should reject invalid mnemonics', () => {
    // Wrong length
    expect(validateRecoveryPhrase(['word1', 'word2'])).toBe(false);
    
    // Invalid words
    expect(validateRecoveryPhrase(['invalid', 'words', 'that', 'are', 'not', 'in', 'bip39', 'wordlist', 'and', 'should', 'fail', 'validation'])).toBe(false);
    
    // Wrong checksum
    expect(validateRecoveryPhrase(['abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon'])).toBe(false);
  });

  it('should generate complete recovery package', async () => {
    const testPrivateKey = 'test-private-key-base64';
    
    const package = await generateRecoveryKeyPackage(testPrivateKey);
    
    expect(package.recoveryPhrase).toHaveLength(12);
    expect(validateRecoveryPhrase(package.recoveryPhrase)).toBe(true);
    expect(typeof package.recoveryKey).toBe('string');
    expect(typeof package.encryptedPrivateKey).toBe('string');
  });

  it('should be able to recover private key from mnemonic', async () => {
    const testPrivateKey = 'test-private-key-base64';
    
    // Generate recovery package
    const package = await generateRecoveryKeyPackage(testPrivateKey);
    
    // Recover private key using mnemonic
    const recoveredKey = await recoverPrivateKeyFromMnemonic(
      package.recoveryPhrase,
      package.encryptedPrivateKey
    );
    
    expect(recoveredKey).toBe(testPrivateKey);
  });

  it('should fail recovery with wrong mnemonic', async () => {
    const testPrivateKey = 'test-private-key-base64';
    
    // Generate recovery package
    const package = await generateRecoveryKeyPackage(testPrivateKey);
    
    // Try to recover with different mnemonic
    const wrongMnemonic = generateRecoveryPhrase();
    
    await expect(
      recoverPrivateKeyFromMnemonic(wrongMnemonic, package.encryptedPrivateKey)
    ).rejects.toThrow();
  });
});