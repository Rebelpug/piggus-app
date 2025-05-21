/**
 * AuthContext.tsx
 * Authentication and encryption management for React Native
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";

// Import the encryption context and provider
import {
  useEncryption,
  EncryptionProvider
} from '@/context/EncryptionContext';

// Define the AuthContext type
type AuthContextType = {
  user: User | null;
  authInitialized: boolean;
  encryptionInitialized: boolean;
  publicKey: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  encryptData: (data: any) => Promise<string | null>;
  decryptData: (encryptedData: string) => Promise<any>;
  newEncryptionKeyGenerated: boolean;
  initializeEncryptionWithPassword: (password: string) => Promise<void>;
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
        if (!encryption.isEncryptionInitialized()) {
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
        if (!encryption.isEncryptionInitialized()) {
          console.error('Encryption not initialized when trying to decrypt data');
          throw new Error('Encryption not initialized. Please sign in again.');
        }

        return await encryption.decrypt(encryptedData);
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
      async (user: User, password: string): Promise<void> => {
        try {

          // Retrieve keys from user metadata
          const { publicKey, encryptedPrivateKey } = await retrieveKeysFromUserMetadata(user);

          if (publicKey && encryptedPrivateKey) {
            // Try to import existing keys
            const data = await encryption.importExistingKeys(
                publicKey,
                encryptedPrivateKey,
                password
            );

            if (!data) {
              throw new Error('Failed to decrypt keys with provided password.');
            }

            console.log('Successfully imported existing keys');
            setEncryptionInitialized(true);
          } else {
            // First, initialize encryption with the password
            setIsGeneratingKeys(true);
            const encryptionData = await encryption.initializeFromPassword(password);
            setIsGeneratingKeys(false);

            // Export the encrypted private key
            const encryptedPrivateKey = await encryption.exportEncryptedPrivateKey(encryptionData.privateKey, encryptionData.encryptionKey, encryptionData.salt);

            if (!encryptedPrivateKey) {
              throw new Error('Failed to export encrypted private key');
            }

            // Store keys in user metadata
            const success = await storeKeysInUserMetadata(
                encryptedPrivateKey,
                encryptionData.publicKey
            );

            if (!success) {
              console.warn('Failed to store keys in user metadata');
            }

            setNewEncryptionKeyGenerated(true);
            setEncryptionInitialized(true);
            console.log('Created new encryption keys for user:', user.id);
          }
        } catch (error) {
          console.error('Error initializing encryption key:', error);
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
        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user || null;

        if (currentUser) {
          setUser(currentUser);
          console.log('User session found:', currentUser.email);

          // If we have a saved password from signup, use it to initialize encryption
          if (signupPassword.current) {
            initializeEncryptionKey(currentUser, signupPassword.current)
                .then(() => {
                  // Clear the password
                  signupPassword.current = null;
                })
                .catch(error => {
                  console.error('Failed to initialize encryption key from signup password:', error);
                  // If we can't initialize with the saved password, prompt the user
                  setNeedsPasswordPrompt(true);
                });
          } else {
            console.log("Found user but need to sign out");
            // No saved password, prompt the user
            signOut(); //TODO add password prompt
            setNeedsPasswordPrompt(true);
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

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("Signed in with password");

      if (error) throw error;

      // User is now authenticated, initialize encryption
      if (data.user) {
        try {
          // Save the password temporarily for auth listener to use
          signupPassword.current = password;
          await initializeEncryptionKey(data.user, password);
          setUser(data.user);
          setNeedsPasswordPrompt(false);
        } catch (error) {
          console.error('Failed to initialize encryption key after sign in:', error);
          // If we can't initialize with the password, prompt the user
          setNeedsPasswordPrompt(true);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
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
          <ThemedView>
            <ThemedView className="flex flex-col items-center gap-2">
              <ThemedText>Loading authentication...</ThemedText>
            </ThemedView>
          </ThemedView>
      );
    }

    if (isGeneratingKeys) {
      return (
          <ThemedView>
            <ThemedView className="flex flex-col items-center gap-2">
              <ThemedText>Doing some magic to get you setup...</ThemedText>
            </ThemedView>
          </ThemedView>
      );
    }

    // If user is not logged in, render the children (sign-in/sign-up pages)
    if (!user) {
      return children;
    }

    // If user is logged in but needs to enter password for encryption
    if (user && needsPasswordPrompt && !encryptionInitialized) {
      return (
          <ThemedView>
            <ThemedView>
              <ThemedText>Enter password to initialize encryption</ThemedText>
            </ThemedView>
          </ThemedView>
      );
    }

    // Check if we have a valid session with Supabase
    // Only render children when both user and encryption are fully initialized
    if (!user || !encryptionInitialized || !encryption.isEncryptionInitialized() || !encryption.getPublicKey()) {
      return (
          <ThemedView>
            <ThemedView className="flex flex-col items-center gap-2">
              <ThemedText>Initializing encryption</ThemedText>
            </ThemedView>
          </ThemedView>
      );
    }

    // All checks passed, render the children
    return children;
  };

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
