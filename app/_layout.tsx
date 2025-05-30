import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import { AuthProvider } from "@/context/AuthContext";
import { Stack } from "expo-router";
import React from 'react';
import * as eva from '@eva-design/eva';
import { ApplicationProvider } from '@ui-kitten/components';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    const colorScheme = useColorScheme();
    const theme = colorScheme === 'dark' ? eva.dark : eva.light;

    if (!loaded) {
        return null;
    }

    return (
        <ApplicationProvider {...eva} theme={theme}>
            <AuthProvider>
                <Stack screenOptions={{
                    headerShown: false,
                }} />
            </AuthProvider>
        </ApplicationProvider>
    );
}
