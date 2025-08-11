import "react-native-gesture-handler"; // MUST be at the very top
import { Buffer } from "buffer";
import { useFonts } from "expo-font";
import "react-native-reanimated";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LocalizationProvider } from "@/context/LocalizationContext";
import { AppVersionProvider } from "@/context/AppVersionContext";
import { VersionGuard } from "@/components/version/VersionGuard";
import { Stack } from "expo-router";
import React from "react";
import * as eva from "@eva-design/eva";
import { ApplicationProvider } from "@ui-kitten/components";
import { LogBox } from "react-native";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "",
  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Making sure it use the right Bugger
if (typeof global.Buffer === "undefined") global.Buffer = Buffer;

if (!__DEV__) {
  LogBox.ignoreAllLogs();

  // Add global error handler
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Log to Sentry or another service
    console.error("Global error:", error, isFatal);
  });
}

function ThemedApp() {
  const { colorScheme } = useTheme();
  const theme = colorScheme === "dark" ? eva.dark : eva.light;

  return (
    <ApplicationProvider {...eva} theme={theme}>
      <AppVersionProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
          <VersionGuard />
        </AuthProvider>
      </AppVersionProvider>
    </ApplicationProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <LocalizationProvider>
        <ThemedApp />
      </LocalizationProvider>
    </ThemeProvider>
  );
});
