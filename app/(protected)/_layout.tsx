import 'react-native-reanimated';
import {useAuth} from "@/context/AuthContext";
import {ProfileProvider} from "@/context/ProfileContext";
import {ExpenseProvider} from "@/context/ExpenseContext";
import {InvestmentProvider} from "@/context/InvestmentContext";
import {Redirect, Stack} from "expo-router";
import { useIntro } from "@/hooks/useIntro";
import IntroScreen from "@/components/intro/IntroScreen";
import { Spinner } from '@ui-kitten/components';
import { StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function ProtectedLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme || 'light'];
    const { isAuthenticated } = useAuth();
    const { introCompleted, loading, markIntroCompleted } = useIntro();

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    // Show loading while checking intro status
    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <Spinner size='large' />
            </View>
        );
    }

    // Show intro screen if not completed
    if (!introCompleted) {
        return <IntroScreen onComplete={markIntroCompleted} />;
    }

    return (
        <ProfileProvider>
            <ExpenseProvider>
                <InvestmentProvider>
                    <Stack screenOptions={{
                        headerShown: false,
                    }} />
                </InvestmentProvider>
            </ExpenseProvider>
        </ProfileProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
