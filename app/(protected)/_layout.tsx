import 'react-native-reanimated';
import {useAuth} from "@/context/AuthContext";
import {ProfileProvider} from "@/context/ProfileContext";
import {ExpenseProvider} from "@/context/ExpenseContext";
import {Redirect, Stack} from "expo-router";

export default function ProtectedLayout() {

    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    return (
        <ProfileProvider>
            <ExpenseProvider>
                <Stack screenOptions={{
                    headerShown: false,
                }} />;
            </ExpenseProvider>
        </ProfileProvider>
    );
}
