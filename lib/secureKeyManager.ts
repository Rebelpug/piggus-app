import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";
import type { Session } from "@supabase/supabase-js";
import { decryptWithAES, encryptWithAES } from "./encryption";

const ENCRYPTION_KEY = "encryption_key";
const ENCRYPTED_PRIVATE_KEY = "encrypted_private_key";
const ENCRYPTED_SESSION_DATA = "encrypted_session_data";
const PUBLIC_KEY = "public_key";

export class SecureKeyManager {
  /**
   * Retrieve encryption key from secure storage
   */
  static async getEncryptionKey(): Promise<Uint8Array | null> {
    try {
      const keyBase64 = await SecureStore.getItemAsync(ENCRYPTION_KEY);

      if (!keyBase64) {
        console.error("No encryption key found in secure storage");
        return null;
      }

      return Buffer.from(keyBase64, "base64");
    } catch (error) {
      console.error("Failed to retrieve encryption key:", error);
      return null;
    }
  }

  /**
   * Store private key encrypted in AsyncStorage
   */
  static async storePrivateKey(
    privateKey: string,
    encryptionKey: Uint8Array,
  ): Promise<void> {
    try {
      const encryptedPrivateKey = encryptWithAES(privateKey, encryptionKey);
      await AsyncStorage.setItem(ENCRYPTED_PRIVATE_KEY, encryptedPrivateKey);
    } catch (error) {
      console.error("Failed to store encrypted private key:", error);
      throw error;
    }
  }

  /**
   * Store public key in AsyncStorage
   */
  static async storePublicKey(publicKey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(PUBLIC_KEY, publicKey);
    } catch (error) {
      console.error("Failed to store public key:", error);
      throw error;
    }
  }

  /**
   * Retrieve public key from AsyncStorage
   */
  static async getPublicKey(): Promise<string | null> {
    try {
      const publicKey = await AsyncStorage.getItem(PUBLIC_KEY);
      if (!publicKey) {
        console.error("No public key found in AsyncStorage");
        return null;
      }
      return publicKey;
    } catch (error) {
      console.error("Failed to retrieve public key:", error);
      return null;
    }
  }

  /**
   * Retrieve and decrypt private key from AsyncStorage
   */
  static async getPrivateKey(
    encryptionKey: Uint8Array,
  ): Promise<string | null> {
    try {
      const encryptedPrivateKey = await AsyncStorage.getItem(
        ENCRYPTED_PRIVATE_KEY,
      );

      if (!encryptedPrivateKey) {
        console.error("No encrypted private key found in AsyncStorage");
        return null;
      }

      return decryptWithAES(encryptedPrivateKey, encryptionKey);
    } catch (error) {
      console.error("Failed to retrieve private key:", error);
      return null;
    }
  }

  /**
   * Check if keys exist for a user
   */
  static async hasStoredKey(): Promise<boolean> {
    try {
      const [encryptedPrivateKey, publicKey] = await Promise.all([
        AsyncStorage.getItem(ENCRYPTED_PRIVATE_KEY),
        AsyncStorage.getItem(PUBLIC_KEY),
      ]);
      return !!(encryptedPrivateKey && publicKey);
    } catch (error) {
      console.error("Failed to check for stored key:", error);
      return false;
    }
  }

  static async authenticateWithBiometrics(
    promptMessage: string = "Authenticate to access your account",
  ): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: "Cancel",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (error) {
      console.error("Biometric authentication failed:", error);
      return false;
    }
  }

  /**
   * Store Supabase session encrypted in AsyncStorage
   */
  static async storeSupabaseSession(
    session: Session,
    encryptionKey: Uint8Array,
  ): Promise<void> {
    try {
      const sessionData = {
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
        },
      };

      const encryptedSessionData = encryptWithAES(sessionData, encryptionKey);
      await AsyncStorage.setItem(ENCRYPTED_SESSION_DATA, encryptedSessionData);
    } catch (error) {
      console.error("Failed to store Supabase session:", error);
      throw error;
    }
  }

  static async getSupabaseSession(
    encryptionKey: Uint8Array,
  ): Promise<Session | null> {
    try {
      const encryptedSessionData = await AsyncStorage.getItem(
        ENCRYPTED_SESSION_DATA,
      );

      if (!encryptedSessionData) {
        console.warn("No encrypted session found in AsyncStorage");
        return null;
      }

      const sessionData = decryptWithAES(encryptedSessionData, encryptionKey);

      // Reconstruct session
      const session: Session = {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at,
        expires_in: sessionData.expires_in,
        token_type: sessionData.token_type,
        user: sessionData.user,
      };

      return session;
    } catch (error) {
      console.error("Failed to retrieve Supabase session:", error);
      return null;
    }
  }

  /**
   * Check if any stored session data exists (for biometric login when no active session)
   */
  static async hasAnyStoredSessionData(): Promise<boolean> {
    try {
      const encryptedSessionData = await AsyncStorage.getItem(
        ENCRYPTED_SESSION_DATA,
      );

      return !!encryptedSessionData;
    } catch (error) {
      console.error("Failed to check for stored session data:", error);
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
        AsyncStorage.removeItem(ENCRYPTED_PRIVATE_KEY),
        AsyncStorage.removeItem(ENCRYPTED_SESSION_DATA),
        AsyncStorage.removeItem(PUBLIC_KEY),
      ]);
    } catch (error) {
      console.error("Failed to clear data:", error);
    }
  }

  /**
   * Update encryption key storage to support biometric authentication
   */
  static async storeEncryptionKey(encryptionKey: Uint8Array): Promise<void> {
    try {
      const keyBase64 = Buffer.from(encryptionKey).toString("base64");

      await SecureStore.setItemAsync(ENCRYPTION_KEY, keyBase64, {
        requireAuthentication: false,
      });
    } catch (error) {
      console.error("Failed to store encryption key with biometric:", error);
      throw error;
    }
  }
}
