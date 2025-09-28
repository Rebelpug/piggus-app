import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useProfile } from "@/context/ProfileContext";
import { useLocalization } from "@/context/LocalizationContext";
import { formatCurrency } from "@/utils/currencyUtils";

interface OnboardingFormProps {
  onComplete: () => void;
  currency: string;
  onCreateCheckingAccount?: (amount: number) => Promise<void>;
}

export default function OnboardingForm({
  onComplete,
  currency,
  onCreateCheckingAccount,
}: OnboardingFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { updateProfile, userProfile } = useProfile();
  const { t } = useLocalization();

  const [salary, setSalary] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async (goToTutorial: boolean) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const salaryNumber = parseFloat(salary) || 0;
      const bankAmountNumber = parseFloat(bankAmount) || 0;

      if (userProfile) {
        await updateProfile({
          ...userProfile.profile,
          budgeting: {
            budget: {
              amount: salaryNumber,
              period: "monthly",
            },
          },
        });
      }

      // Create checking account investment if bank amount > 0
      if (bankAmountNumber > 0 && onCreateCheckingAccount) {
        await onCreateCheckingAccount(bankAmountNumber);
      }

      // Navigate based on user choice
      if (goToTutorial) {
        router.push("/guides" as any);
      } else {
        router.push("/" as any);
      }

      onComplete();
    } catch (err) {
      setError(
        t("onboarding.anErrorOccurred", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
      console.error("Onboarding error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContainer,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, shadowColor: colors.text },
        ]}
      >
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("onboarding.letsGetYouStarted")}
          </Text>
          <Text style={[styles.cardDescription, { color: colors.icon }]}>
            {t("onboarding.personalizeJourneyDescription")}
          </Text>
        </View>

        <View style={styles.cardContent}>
          {error && (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: colors.error + "20",
                  borderColor: colors.error,
                },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("onboarding.monthlyBudgetQuestion")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.icon}
              value={salary}
              onChangeText={setSalary}
              keyboardType="numeric"
            />
            <Text style={[styles.helperText, { color: colors.icon }]}>
              {t("onboarding.monthlyBudgetHelper")}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("onboarding.bankAmountQuestion")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.icon}
              value={bankAmount}
              onChangeText={setBankAmount}
              keyboardType="numeric"
            />
            <Text style={[styles.helperText, { color: colors.icon }]}>
              {t("onboarding.bankAmountHelper")}
            </Text>
          </View>

          {(salary || bankAmount) && (
            <View
              style={[
                styles.summaryContainer,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.text }]}>
                {t("onboarding.summary")}
              </Text>
              {salary && (
                <Text style={[styles.summaryItem, { color: colors.icon }]}>
                  {t("onboarding.monthlyBudget")}:{" "}
                  {formatCurrency(Number(salary), currency)}
                </Text>
              )}
              {bankAmount && (
                <Text style={[styles.summaryItem, { color: colors.icon }]}>
                  {t("onboarding.initialCash")}:{" "}
                  {formatCurrency(Number(bankAmount), currency)}
                </Text>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.tutorialButton,
                { backgroundColor: colors.primary },
                isSubmitting && [
                  styles.buttonDisabled,
                  { backgroundColor: colors.icon },
                ],
              ]}
              onPress={() => handleContinue(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator
                    size="small"
                    color="white"
                    style={styles.spinner}
                  />
                  <Text style={styles.buttonText}>
                    {t("onboarding.settingUp")}
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>
                  {t("onboarding.lookIntoTutorial")}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.skipButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
                isSubmitting && [
                  styles.buttonDisabled,
                  { backgroundColor: colors.icon },
                ],
              ]}
              onPress={() => handleContinue(false)}
              disabled={isSubmitting}
            >
              <Text style={[styles.skipButtonText, { color: colors.text }]}>
                {t("onboarding.skipAndManage")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
  },
  cardContent: {
    padding: 16,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 4,
  },
  errorText: {},
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  summaryContainer: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 4,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialButton: {},
  skipButton: {
    borderWidth: 1,
  },
  buttonDisabled: {},
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 16,
  },
  skipButtonText: {
    fontWeight: "500",
    fontSize: 16,
  },
  spinner: {
    marginRight: 8,
  },
});
