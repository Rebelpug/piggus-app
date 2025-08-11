/**
 * LoginScreen.tsx
 * A complete login screen with username/password authentication
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  StatusBar,
  Image,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useLocalization } from "@/context/LocalizationContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import PasswordPrompt from "@/components/auth/PasswordPrompt";

const LoginScreen = () => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    signIn,
    user,
    encryptionInitialized,
    needsPasswordPrompt,
    isAuthenticated,
  } = useAuth();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [showRegistrationMessage, setShowRegistrationMessage] = useState(
    from === "registration",
  );

  // Redirect to main app when user becomes fully authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is fully authenticated, redirecting to main app");
      router.replace("/(protected)");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async () => {
    // Validate inputs
    if (!email || !password) {
      Alert.alert(t("auth.error"), t("auth.emailPasswordRequired"));
      return;
    }

    if (!email.includes("@")) {
      Alert.alert(t("auth.error"), t("auth.validEmailRequired"));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t("auth.error"), t("auth.passwordMinLength"));
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password, (progress, step) => {});
      router.push("/");
    } catch (error: any) {
      setLoading(false);
      console.error("Login failed:", error);
      let errorMessage = t("auth.signInFailed");

      if (error?.message?.includes("Invalid login credentials")) {
        errorMessage = t("auth.invalidCredentials");
      } else if (error?.message?.includes("Too many requests")) {
        errorMessage = t("auth.tooManyAttempts");
      } else if (error?.message?.includes("Network")) {
        errorMessage = t("auth.networkError");
      } else if (error?.message?.includes("encryption")) {
        errorMessage = t("auth.encryptionError");
      } else if (error?.message?.includes("Email not confirmed")) {
        errorMessage = t("auth.emailNotConfirmed");
      }

      Alert.alert(t("auth.signInError"), errorMessage);
    } finally {
      setTimeout(() => {}, 1500);
    }
  };

  // If user is logged in but needs to enter password for encryption
  if (user && needsPasswordPrompt && !encryptionInitialized) {
    return (
      <PasswordPrompt
        onSuccess={() => {
          console.log(
            "Password prompt success, authentication should be complete",
          );
        }}
      />
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require("@/assets/images/transparent-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.titleLogo, { color: colors.text }]}>
              Piggus
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("auth.welcomeBack")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              {t("auth.signInToAccount")}
            </Text>
          </View>

          {/* Registration Success Message */}
          {showRegistrationMessage && (
            <View
              style={[
                styles.successMessage,
                {
                  backgroundColor: colors.success + "20",
                  borderColor: colors.success,
                },
              ]}
            >
              <View style={styles.successMessageContent}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                />
                <View style={styles.successMessageText}>
                  <Text
                    style={[
                      styles.successMessageTitle,
                      { color: colors.success },
                    ]}
                  >
                    {t("auth.registrationSuccessful")}
                  </Text>
                  <Text
                    style={[
                      styles.successMessageSubtitle,
                      { color: colors.text },
                    ]}
                  >
                    {t("auth.checkEmailConfirm")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowRegistrationMessage(false)}
                style={styles.successMessageClose}
              >
                <Ionicons name="close" size={18} color={colors.success} />
              </TouchableOpacity>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t("auth.email")}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t("auth.enterEmail")}
                  placeholderTextColor={colors.icon}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                {t("auth.password")}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.icon}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.enterPassword")}
                  placeholderTextColor={colors.icon}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: loading ? colors.icon : colors.primary },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.buttonText}>{t("auth.signingIn")}</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>{t("auth.signIn")}</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.icon }]}>
              {t("auth.noAccount")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/register")}
              disabled={loading}
            >
              <Text
                style={[
                  styles.link,
                  { color: colors.primary },
                  loading && { opacity: 0.5 },
                ]}
              >
                {t("auth.signUp")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/**
 * Shared styles for both screens
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  logo: {
    width: 80,
    height: 80,
  },
  titleLogo: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  button: {
    borderRadius: 16,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    fontSize: 16,
  },
  link: {
    fontWeight: "600",
    fontSize: 16,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  progressText: {
    color: "#FFF",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  progressPercentage: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  successMessage: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  successMessageContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  successMessageText: {
    marginLeft: 12,
    flex: 1,
  },
  successMessageTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  successMessageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  successMessageClose: {
    padding: 4,
    marginLeft: 12,
  },
});

export default LoginScreen;
