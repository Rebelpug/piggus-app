/**
 * AuthContext.tsx
 * Authentication and encryption management for React Native
 */
import React, {createContext, useContext, useEffect, useState, useCallback, useRef, useMemo} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { StyleSheet } from 'react-native';

// Import the encryption context and provider
import {
  useEncryption,
  EncryptionProvider
} from '@/context/EncryptionContext';
import { SecureKeyManager } from '@/lib/secureKeyManager';
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";
import { resetHttpClient } from "@/client/http";

// Define the AuthContext type
type AuthContextType = {
  user: User | null;
  authInitialized: boolean;
  encryptionInitialized: boolean;
  needsPasswordPrompt: boolean;
  publicKey: string | null;
  signIn: (email: string, password: string, progress: (progress: any, step: string) => void) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  encryptData: (data: any) => Promise<string | null>;
  decryptData: (encryptedData: string) => Promise<any>;
  newEncryptionKeyGenerated: boolean;
  initializeEncryptionWithPassword: (password: string) => Promise<void>;
  isAuthenticated: boolean;
  tryBiometricLogin: () => Promise<boolean>;
};

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the inner provider component that uses the EncryptionContext
function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [newEncryptionKeyGenerated, setNewEncryptionKeyGenerated] = useState<boolean>(false);
  const [needsPasswordPrompt, setNeedsPasswordPrompt] = useState<boolean>(false);
  const [encryptionInitialized, setEncryptionInitialized] = useState<boolean>(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);

  const authCheckComplete = useRef(false);
  const authListenerSetup = useRef(false);
  const signupPassword = useRef<string | null>(null);

  // Get the encryption context
  const encryption = useEncryption();

  // Helper function to encrypt data using the encryption context
  const encryptData = useCallback(
      async (data: any): Promise<string | null> => {
        if (!encryption.isEncryptionInitialized) {
          console.error('Encryption not initialized when trying to encrypt data');
          throw new Error('Encryption not initialized. Please sign in again.');
        }

        return await encryption.encrypt(data);
      },
      [encryption]
  );

  // Helper function to decrypt data using the encryption context
  const decryptData = useCallback(
      async (encryptedData: string): Promise<any> => {
        if (!encryption.isEncryptionInitialized) {
          console.error('Encryption not initialized when trying to decrypt data');
          throw new Error('Encryption not initialized. Please sign in again.');
        }

        return await encryption.decryptWithEncryptionKey(encryptedData);
      },
      [encryption]
  );

  // Store keys in user metadata
  const storeKeysInUserMetadata = async (
      encryptedPrivateKeyData: string,
      publicKey: string
  ): Promise<boolean> => {
    try {
      // Update user metadata with the keys
      const { error } = await supabase.auth.updateUser({
        data: {
          public_key: publicKey,
          encrypted_private_key: encryptedPrivateKeyData
        },
      });

      if (error) {
        console.error('Error storing keys in user metadata:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in storeKeysInUserMetadata:', error);
      return false;
    }
  };

  // Retrieve keys from user metadata
  const retrieveKeysFromUserMetadata = useCallback(async (
      user: User
  ): Promise<{ publicKey: string | null; encryptedPrivateKey: string | null }> => {
    try {
      // Check if public and private keys exist in user metadata
      const publicKey = user.user_metadata?.public_key;
      const encryptedPrivateKey = user.user_metadata?.encrypted_private_key;

      if (publicKey && encryptedPrivateKey) {
        console.log('Retrieved public and private keys from user metadata');
        return { publicKey, encryptedPrivateKey };
      }

      console.log('No keys found in user metadata');
    } catch (error) {
      console.error('Error retrieving keys from user metadata:', error);
    }
    return { publicKey: null, encryptedPrivateKey: null };
  }, []);

  // Initialize encryption key from password
  const initializeEncryptionKey = useCallback(
      async (
          user: User,
          password: string,
          onProgress?: (progress: number) => void
      ): Promise<{
        publicKey: string;
        privateKey: string;
        encryptionKey: Uint8Array<ArrayBufferLike>;
        salt: string;
      }> => {
        try {
          console.log('=== STARTING ENCRYPTION INITIALIZATION ===');
          onProgress?.(0.05);

          // Retrieve keys from user metadata
          const { publicKey, encryptedPrivateKey } = await retrieveKeysFromUserMetadata(user);
          console.log('Keys from metadata:', { hasPublic: !!publicKey, hasPrivate: !!encryptedPrivateKey });
          onProgress?.(0.1);

          if (publicKey && encryptedPrivateKey) {
            console.log('Found existing keys, importing with async PBKDF2...');

            const data = await encryption.importExistingKeys(
                publicKey,
                encryptedPrivateKey,
                password,
                (importProgress) => {
                  // Map import progress to overall progress
                  const overallProgress = 0.1 + (importProgress * 0.8);
                  onProgress?.(overallProgress);
                },
            );

            if (!data) {
              throw new Error('Failed to decrypt keys with provided password.');
            }

            console.log('Successfully imported existing keys');
            setEncryptionInitialized(true);
            onProgress?.(1.0);
            return data;
          } else {
            console.log('No existing keys, generating new ones...');

            // For new key generation, show progress differently
            onProgress?.(0.3);
            setIsGeneratingKeys(true);

            const encryptionData = await encryption.initializeFromPassword(
                password,
                (genProgress) => {
                  const overallProgress = 0.3 + (genProgress * 0.6);
                  onProgress?.(overallProgress);
                },
            );
            setIsGeneratingKeys(false);
            onProgress?.(0.95);

            // Export and store keys
            const encryptedPrivateKey = await encryption.exportEncryptedPrivateKey(
                encryptionData.privateKey,
                encryptionData.encryptionKey,
                encryptionData.salt
            );

            if (!encryptedPrivateKey) {
              throw new Error('Failed to export encrypted private key');
            }

            const success = await storeKeysInUserMetadata(
                encryptedPrivateKey,
                encryptionData.publicKey
            );

            if (!success) {
              console.warn('Failed to store keys in user metadata');
            }

            setNewEncryptionKeyGenerated(true);
            setEncryptionInitialized(true);
            onProgress?.(1.0);
            console.log('Created new encryption keys for user:', user.id);
            return encryptionData;
          }
        } catch (error) {
          console.error('Error initializing encryption key:', error);
          onProgress?.(0);
          throw error;
        }
      },
      [encryption, retrieveKeysFromUserMetadata]
  );

  // Public method to initialize encryption with password
  const initializeEncryptionWithPassword = useCallback(
      async (password: string) => {
        if (!user) {
          throw new Error('Cannot initialize encryption: No user is logged in');
        }

        try {
          await initializeEncryptionKey(user, password);
          setNeedsPasswordPrompt(false);
        } catch (error) {
          console.error('Failed to initialize encryption with password:', error);
          throw error;
        }
      },
      [user, initializeEncryptionKey]
  );

  // Try biometric login (simplified for single user)
  const tryBiometricLogin = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Attempting biometric login...');

      // First get the stored session to extract user data
      const encryptionKey = await SecureKeyManager.getEncryptionKey();
      if (!encryptionKey) {
        console.log('No encryption key found in secure storage');
        return false;
      }

      const storedSession = await SecureKeyManager.getSupabaseSession(encryptionKey);
      if (!storedSession) {
        console.log('No stored session found for biometric login');
        return false;
      }

      // Initialize encryption from secure storage using the public key
      const result = await encryption.initializeFromSecureStorage();
      if (!result) {
        console.log('Failed to initialize encryption from secure storage');
        return false;
      }

      // Restore session in Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: storedSession.access_token,
        refresh_token: storedSession.refresh_token,
      });

      if (error) {
        console.error('Failed to restore session:', error);
        encryption.resetEncryption(); // Reset encryption state on failure
        return false;
      }

      if (!data?.session) {
        console.error('No session data returned from restore session');
        return false;
      }
      await SecureKeyManager.storeSupabaseSession(data.session, encryptionKey);

      setNeedsPasswordPrompt(false);
      setEncryptionInitialized(true);
      console.log('Biometric login successful');
      return true;
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    }
  }, [encryption]);

  // Check for active session on mount
  useEffect(() => {
    if (authCheckComplete.current) return;

    const checkSession = async () => {
      try {
        console.log('Starting session check...');
        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user || null;

        if (currentUser) {
          setUser(currentUser);
          console.log('User session found:', currentUser.email);
          // If secure storage fails, check if we have a saved password from signup
          if (signupPassword.current) {
            console.log('Using saved signup password');
            try {
              await initializeEncryptionKey(currentUser, signupPassword.current);
              signupPassword.current = null;
              setNeedsPasswordPrompt(false);
            } catch (error) {
              console.error('Failed to initialize encryption key from signup password:', error);
              setNeedsPasswordPrompt(true);
            }
            return;
          }

          // Check for keys in user metadata and prompt for password if needed
          const { publicKey, encryptedPrivateKey } = await retrieveKeysFromUserMetadata(currentUser);

          if (publicKey && encryptedPrivateKey) {
            console.log('Found keys in metadata, need password');
            setNeedsPasswordPrompt(true);
            // Don't sign out - keep the user signed in but require password for encryption
          } else {
            console.log('No keys found anywhere, signing out');
            await supabase.auth.signOut();
          }
        } else {
          console.log('No active session found, checking for stored sessions...');
          // Check if we have any stored session data and biometric is available
          const hasStoredData = await SecureKeyManager.hasAnyStoredSessionData();
          if (hasStoredData) {
            console.log('Found stored session data, showing auto biometric prompt...');
            return; // Don't complete auth initialization yet
          } else {
            console.log('No biometric login available - no stored sessions or biometric not available');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        authCheckComplete.current = true;
        setAuthInitialized(true);
      }
    };

    checkSession();
  }, [initializeEncryptionKey, retrieveKeysFromUserMetadata, encryption, tryBiometricLogin]);

  // Set up auth state change listener
  useEffect(() => {
    if (authListenerSetup.current) return;

    const setupAuthListener = () => {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);

          // If we have a saved password from signup, use it to initialize encryption
          if (signupPassword.current) {
            initializeEncryptionKey(session.user, signupPassword.current)
                .then(() => {
                  // Clear the password
                  signupPassword.current = null;
                  setNeedsPasswordPrompt(false);
                })
                .catch(error => {
                  console.error('Failed to initialize encryption key from auth state change:', error);
                  // If we can't initialize with the saved password, prompt the user
                  setNeedsPasswordPrompt(true);
                });
          } else {
            // No saved password, check if we have keys in metadata first
            const { publicKey, encryptedPrivateKey } = await retrieveKeysFromUserMetadata(session.user);

            if (publicKey && encryptedPrivateKey) {
              console.log('No saved password after sign in, but found keys in metadata - need password prompt');
              setNeedsPasswordPrompt(true);
            } else {
              console.log('No saved password and no keys found, user needs to go through setup again');
              await supabase.auth.signOut();
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          encryption.resetEncryption();
          setEncryptionInitialized(false);
          signupPassword.current = null;
          setNeedsPasswordPrompt(false);
          resetHttpClient();
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
        } else if (event === 'TOKEN_REFRESHED' && session?.user && session) {
          // Update stored session when token is refreshed (without requiring biometric)
          try {
            // Get encryption key for storing session
            if (encryption.encryptionKey) {
              console.log("Token refresh, session: ", session);
              await SecureKeyManager.storeSupabaseSession(session, encryption.encryptionKey);
            } else {
              console.error('Encryption key not found when trying to store session after token refresh');
            }
          } catch (error) {
            console.error('Failed to update stored session after token refresh:', error);
          }
        }
      });

      authListenerSetup.current = true;

      return () => {
        authListener.subscription.unsubscribe();
      };
    };

    const cleanup = setupAuthListener();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initializeEncryptionKey, encryption, retrieveKeysFromUserMetadata]);

  const signIn = async (
      email: string,
      password: string,
      onProgress?: (progress: number, step: string) => void
  ) => {
    try {
      console.log('Starting sign in process...');
      onProgress?.(0.1, 'Authenticating...');

      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      // User is now authenticated, initialize encryption
      if (data.user && data.session) {
        console.log('User authenticated, initializing encryption...');
        onProgress?.(0.2, 'Setting up encryption...');

        try {
          // Save the password temporarily for auth listener to use
          signupPassword.current = password;

          // Initialize encryption with progress tracking
          const encryptionData = await initializeEncryptionKey(data.user, password, (encryptionProgress) => {
            // Map encryption progress to overall progress (20% to 85%)
            const overallProgress = 0.2 + (encryptionProgress * 0.65);
            const step = encryptionProgress < 0.5
                ? 'Deriving encryption keys...'
                : 'Finalizing setup...';
            onProgress?.(overallProgress, step);
          });

          // Store Supabase session securely (without requiring biometric during login)
          onProgress?.(0.9, 'Securing session...');
          if (encryptionData.encryptionKey) {
            console.log("Storing session: ", data.session);
            await SecureKeyManager.storeSupabaseSession(data.session, encryptionData.encryptionKey);
          } else {
            console.error('Encryption key not found when trying to store session after sign in');
          }

          setUser(data.user);
          setNeedsPasswordPrompt(false);
          onProgress?.(1.0, 'Complete!');
          console.log('Encryption initialized and session stored successfully');

        } catch (encryptionError) {
          console.error('Failed to initialize encryption key after sign in:', encryptionError);
          setNeedsPasswordPrompt(true);
          throw new Error('Failed to initialize encryption. Please try again.');
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      signupPassword.current = null;
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // First, initialize encryption with the password
      setIsGeneratingKeys(true);
      const encryptionData = await encryption.initializeFromPassword(password);
      setIsGeneratingKeys(false);

      // Export the encrypted private key
      const encryptedPrivateKey = await encryption.exportEncryptedPrivateKey(encryptionData.privateKey, encryptionData.encryptionKey, encryptionData.salt);

      if (!encryptedPrivateKey) {
        throw new Error('Failed to export encrypted private key');
      }

      // Include the keys in the user metadata during sign-up
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            public_key: encryptionData.publicKey,
            encrypted_private_key: encryptedPrivateKey
          },
        },
      });

      if (error) throw error;

      // Save the password temporarily so we can use it to initialize encryption after sign-in
      signupPassword.current = password;
      setEncryptionInitialized(true);
      setNeedsPasswordPrompt(false);
    } catch (error) {
      console.error('Sign up error:', error);
      setIsGeneratingKeys(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await SecureKeyManager.clearAllData();
      setUser(null);
      encryption.resetEncryption();
      setEncryptionInitialized(false);
      signupPassword.current = null;
      setNeedsPasswordPrompt(false);
      resetHttpClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  // Determine what to render based on auth state
  const renderContent = () => {
    // If auth check is not complete, show loading
    if (!authInitialized) {
      return (
        <AuthSetupLoader />
      );
    }

    if (isGeneratingKeys) {
      return (
          <AuthSetupLoader />
      );
    }

    return children;
  };

  const isAuthenticated = useMemo(() => {
    return !!(user && authInitialized && encryptionInitialized && encryption.isEncryptionInitialized && encryption.getPublicKey() && !isGeneratingKeys);
  }, [authInitialized, encryption, encryptionInitialized, isGeneratingKeys, user])

  return (
      <AuthContext.Provider
          value={{
            user,
            authInitialized,
            encryptionInitialized,
            needsPasswordPrompt,
            publicKey: encryption.getPublicKey(),
            signIn,
            signUp,
            signOut,
            encryptData,
            decryptData,
            newEncryptionKeyGenerated,
            initializeEncryptionWithPassword,
            isAuthenticated,
            tryBiometricLogin,
          }}
      >
        {renderContent()}
      </AuthContext.Provider>
  );
}

// Export the combined provider that includes both EncryptionProvider and AuthProvider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
      <EncryptionProvider>
        <AuthProviderInner>
          {children}
        </AuthProviderInner>
      </EncryptionProvider>
  );
}

// Export the hook to use the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Styles for loading screens
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
});
