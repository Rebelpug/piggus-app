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
import PasswordPrompt from "@/components/auth/PasswordPrompt";

// Define the AuthContext type
type AuthContextType = {
  user: User | null;
  authInitialized: boolean;
  encryptionInitialized: boolean;
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
  isBiometricAvailable: boolean;
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
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);

  const authCheckComplete = useRef(false);
  const authListenerSetup = useRef(false);
  const signupPassword = useRef<string | null>(null);

  // Get the encryption context
  const encryption = useEncryption();

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await SecureKeyManager.isBiometricAvailable();
      setIsBiometricAvailable(available);
    };
    checkBiometric();
  }, []);

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
      ): Promise<void> => {
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
                user.id
            );

            if (!data) {
              throw new Error('Failed to decrypt keys with provided password.');
            }

            console.log('Successfully imported existing keys');
            setEncryptionInitialized(true);
            onProgress?.(1.0);
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
                user.id
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
          }
        } catch (error) {
          console.error('Error initializing encryption key:', error);
          onProgress?.(0);
          throw error;
        }
      },
      [encryption]
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

  // Try biometric login
  const tryBiometricLogin = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Attempting biometric login...');

      // Check if biometric is available
      if (!isBiometricAvailable) {
        console.log('Biometric not available');
        return false;
      }

      // Get session from secure storage first (to get user ID)
      const { data } = await supabase.auth.getSession();
      let userId = data.session?.user?.id;

      if (!userId) {
        // Try to get stored user IDs
        console.log('No active session, checking stored user IDs...');
        const storedUserIds = await SecureKeyManager.getBiometricUserIds();

        if (storedUserIds.length === 0) {
          console.log('No stored user IDs found');
          return false;
        }

        // For now, use the first stored user ID
        // In a real app, you might want to present a list of users to choose from
        userId = storedUserIds[0];
        console.log('Using stored user ID:', userId);
      }

      // Check if user has biometric enabled
      const biometricEnabled = await SecureKeyManager.isBiometricEnabledForUser(userId);
      if (!biometricEnabled) {
        console.log('Biometric not enabled for user');
        return false;
      }

      // Authenticate with biometrics
      const authenticated = await SecureKeyManager.authenticateWithBiometrics('Use biometrics to sign in');
      if (!authenticated) {
        console.log('Biometric authentication failed');
        return false;
      }

      // Get stored session
      const storedSession = await SecureKeyManager.getSupabaseSession(userId);
      if (!storedSession) {
        console.log('No stored session found');
        return false;
      }

      // Restore session in Supabase
      const { error } = await supabase.auth.setSession({
        access_token: storedSession.access_token,
        refresh_token: storedSession.refresh_token,
      });

      if (error) {
        console.error('Failed to restore session:', error);
        return false;
      }

      console.log('Biometric login successful');
      return true;
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    }
  }, [isBiometricAvailable]);

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

          // First, try to initialize from secure storage (this includes biometric auth if enabled)
          const initFromStorage = await encryption.initializeFromSecureStorage(currentUser.id);

          if (initFromStorage) {
            console.log('Successfully initialized encryption from secure storage');
            setEncryptionInitialized(true);
            setNeedsPasswordPrompt(false);
            return;
          }

          console.log('No keys in secure storage, checking user metadata...');

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
          // Check if we have any stored user IDs before attempting biometric login
          const storedUserIds = await SecureKeyManager.getBiometricUserIds();
          
          if (isBiometricAvailable && storedUserIds.length > 0) {
            console.log('Attempting biometric login for stored session...');
            const biometricSuccess = await tryBiometricLogin();
            if (biometricSuccess) {
              console.log('Biometric login successful, session should be restored');
              // The auth state change listener will handle the rest
              return;
            }
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
  }, [initializeEncryptionKey, retrieveKeysFromUserMetadata, encryption, isBiometricAvailable, tryBiometricLogin]);

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
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
        } else if (event === 'TOKEN_REFRESHED' && session?.user && session) {
          // Update stored session when token is refreshed (without requiring biometric)
          try {
            await SecureKeyManager.storeSupabaseSession(session.user.id, session, false);
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

      console.log('Supabase auth response:', {
        hasError: !!error,
        hasUser: !!data?.user,
        errorMessage: error?.message
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
          await initializeEncryptionKey(data.user, password, (encryptionProgress) => {
            // Map encryption progress to overall progress (20% to 85%)
            const overallProgress = 0.2 + (encryptionProgress * 0.65);
            const step = encryptionProgress < 0.5
                ? 'Deriving encryption keys...'
                : 'Finalizing setup...';
            onProgress?.(overallProgress, step);
          });

          // Store Supabase session securely (without requiring biometric during login)
          onProgress?.(0.9, 'Securing session...');
          const biometricAvailable = await SecureKeyManager.isBiometricAvailable();
          await SecureKeyManager.storeSupabaseSession(data.user.id, data.session, false); // Don't require biometric during login
          
          // Enable biometric for future logins if available
          if (biometricAvailable) {
            await SecureKeyManager.storeUserIdForBiometric(data.user.id);
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

      // If the user is already authenticated (auto-confirm), set the user
      if (data.user && data.session) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setIsGeneratingKeys(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const currentUser = user;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear all stored data
      if (currentUser) {
        await SecureKeyManager.clearAllUserData(currentUser.id);
      }

      setUser(null);
      encryption.resetEncryption();
      setEncryptionInitialized(false);
      signupPassword.current = null;
      setNeedsPasswordPrompt(false);
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

    // If user is not logged in, render the children (sign-in/sign-up pages)
    if (!user) {
      return children;
    }

    // If user is logged in but needs to enter password for encryption
    if (user && needsPasswordPrompt && !encryptionInitialized) {
      return (
          <PasswordPrompt
            onSuccess={() => {
              setNeedsPasswordPrompt(false);
            }}
            onCancel={() => {
              setNeedsPasswordPrompt(false);
            }}
          />
      );
    }

    // Check if we have a valid session with Supabase
    // Only render children when both user and encryption are fully initialized
    if (!user || !encryptionInitialized || !encryption.isEncryptionInitialized || !encryption.getPublicKey()) {
      return (
          <AuthSetupLoader />
      );
    }

    // All checks passed, render the children
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
            isBiometricAvailable
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
