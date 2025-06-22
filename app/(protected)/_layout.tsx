import 'react-native-reanimated';
import {useAuth} from "@/context/AuthContext";
import {ProfileProvider} from "@/context/ProfileContext";
import {ExpenseProvider} from "@/context/ExpenseContext";
import {InvestmentProvider} from "@/context/InvestmentContext";
import {Redirect, Stack} from "expo-router";

export default function ProtectedLayout() {

    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
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
