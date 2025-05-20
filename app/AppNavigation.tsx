import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from "@/app/(screens)/LoginScreen";
import RegisterScreen from "@/app/(screens)/RegisterScreen";
import HomeScreen from "@/app/(screens)/HomeScreen";
import {useAuth} from "@/context/AuthContext";
import PasswordPromptScreen from "@/app/(screens)/PasswordPromptScreen";

// Define the types for our navigation stacks
type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

type AppStackParamList = {
    Home: undefined;
    // Add your other app screens here
};

// Create the navigation stacks
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

// Auth navigation for unauthenticated users
const AuthNavigator = () => (
    <AuthStack.Navigator
        screenOptions={{
            headerShown: false,
        }}
    >
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
);

// App navigation for authenticated users
const AppNavigator = () => (
    <AppStack.Navigator>
        <AppStack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
        {/* Add your other app screens here */}
    </AppStack.Navigator>
);

// Main navigation container
const AppNavigation = () => {
    const { user, authInitialized, encryptionInitialized } = useAuth();

    // Show nothing while checking authentication state
    if (!authInitialized) {
        return null; // Or a splash screen
    }

    return (
        <>
            {!user ? (
                // No user signed in - show auth flow
                <AuthNavigator />
            ) : !encryptionInitialized ? (
                // User signed in but encryption not initialized - show password prompt
                <PasswordPromptScreen />
            ) : (
                // User signed in and encryption initialized - show main app
                <AppNavigator />
            )}
        </>
    );
};

export default AppNavigation;
