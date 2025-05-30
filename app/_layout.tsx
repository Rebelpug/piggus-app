import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import {AuthProvider} from "@/context/AuthContext";
import {Stack} from "expo-router";

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
      <AuthProvider>
        <Stack screenOptions={{
          headerShown: false,
        }} />;
      </AuthProvider>
  );
/*
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
            <ProfileProvider>
                <ExpenseProvider>
                    <StatusBar backgroundColor="#F5F5F5" />
                    <AppNavigation />
                </ExpenseProvider>
            </ProfileProvider>
        </AuthProvider>
    </ThemeProvider>
  );*/
}
