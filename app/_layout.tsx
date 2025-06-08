import 'react-native-gesture-handler'; // MUST be at the very top
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import { AuthProvider } from "@/context/AuthContext";
import { Stack } from "expo-router";
import React from 'react';
import * as eva from '@eva-design/eva';
import { ApplicationProvider } from '@ui-kitten/components';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as Sentry from "@sentry/react-native";
import {isRunningInExpoGo} from "expo";

const navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isRunningInExpoGo(),
    enableNativeFramesTracking: !isRunningInExpoGo()
});

Sentry.init({
    dsn: "https://0e618e20f650efdfb2b74f775991966b@o4509462178955264.ingest.de.sentry.io/4509462198091856",
    sendDefaultPii: false,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    profilesSampleRate: __DEV__ ? 1.0 : 0.1,
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
    beforeSend(event) {
        if (__DEV__) {
            console.log('Sentry event:', event);
        }
        return event;
    }
});

function RootLayout() {
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

export default Sentry.wrap(RootLayout);
