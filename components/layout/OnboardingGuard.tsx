import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import OnboardingWrapper from "@/components/account/OnboardingWrapper";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export default function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { userProfile, onboardingCompleted, setOnboardingCompleted } =
    useProfile();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  // If user has a profile but hasn't completed onboarding, show onboarding form
  if (userProfile && !onboardingCompleted) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.formContainer}>
          <OnboardingWrapper
            onComplete={() => setOnboardingCompleted(true)}
            currency={userProfile.profile.defaultCurrency || "EUR"}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Otherwise, render children normally
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
  },
});
