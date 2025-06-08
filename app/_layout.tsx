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
    //enableTimeToInitialDisplay: !isRunningInExpoGo(),
    enableNativeFramesTracking: true
});

Sentry.init({
    dsn: "https://0e618e20f650efdfb2b74f775991966b@o4509462178955264.ingest.de.sentry.io/4509462198091856",
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
    // We recommend adjusting this value in production.
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    sendDefaultPii: false,
    debug: true,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    integrations: [navigationIntegration],
    enableNativeFramesTracking: true
    //enableNativeFramesTracking: !isRunningInExpoGo(),
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
