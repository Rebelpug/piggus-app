import 'react-native-reanimated';
import {useAuth} from "@/context/AuthContext";
import {ProfileProvider} from "@/context/ProfileContext";
import {ExpenseProvider} from "@/context/ExpenseContext";
import {InvestmentProvider} from "@/context/InvestmentContext";
import {Redirect, Stack} from "expo-router";
import { useIntro } from "@/hooks/useIntro";
import IntroScreen from "@/components/intro/IntroScreen";
import { Layout, Spinner } from '@ui-kitten/components';
import { StyleSheet } from 'react-native';

export default function ProtectedLayout() {

    const { isAuthenticated } = useAuth();
    const { introCompleted, loading, markIntroCompleted } = useIntro();

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    // Show loading while checking intro status
    if (loading) {
        return (
            <Layout style={styles.loadingContainer}>
                <Spinner size='large' />
            </Layout>
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
