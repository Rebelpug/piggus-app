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
import AuthSetupLoader from "@/components/auth/AuthSetupLoader";

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
  const retrieveKeysFromUserMetadata = async (
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
  };

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

          // First, try to initialize from secure storage
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
            await supabase.auth.signOut();
          } else {
            console.log('No keys found anywhere, signing out');
            await supabase.auth.signOut();
          }
        } else {
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        authCheckComplete.current = true;
        setAuthInitialized(true);
      }
    };

    checkSession();
  }, [initializeEncryptionKey]);

  // Set up auth state change listener
  useEffect(() => {
    if (authListenerSetup.current) return;

    const setupAuthListener = () => {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
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
            // No saved password, prompt the user
            console.log('No saved password after sign in, need to prompt user for password');
            // We'll show the password prompt instead of immediately signing out
            setNeedsPasswordPrompt(true);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          encryption.resetEncryption();
          setEncryptionInitialized(false);
          signupPassword.current = null;
          setNeedsPasswordPrompt(false);
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
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
  }, [initializeEncryptionKey, encryption]);

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
      if (data.user) {
        console.log('User authenticated, initializing encryption...');
        onProgress?.(0.2, 'Setting up encryption...');

        try {
          // Save the password temporarily for auth listener to use
          signupPassword.current = password;

          // Initialize encryption with progress tracking
          await initializeEncryptionKey(data.user, password, (encryptionProgress) => {
            // Map encryption progress to overall progress (20% to 95%)
            const overallProgress = 0.2 + (encryptionProgress * 0.75);
            const step = encryptionProgress < 0.5
                ? 'Deriving encryption keys...'
                : 'Finalizing setup...';
            onProgress?.(overallProgress, step);
          });

          setUser(data.user);
          setNeedsPasswordPrompt(false);
          onProgress?.(1.0, 'Complete!');
          console.log('Encryption initialized successfully');

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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
          <AuthSetupLoader />
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
            isAuthenticated
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
