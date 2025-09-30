import { NavigationButton } from "@/components/navigation";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useLocalization } from "@/context/LocalizationContext";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@ui-kitten/components";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface NavigationButtonConfig {
  key: string;
  title: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  onPress: () => void;
  badge?: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();
  const { user } = useAuth();
  const { userProfile } = useProfile();

  const subscriptionTier =
    userProfile?.subscription?.subscription_tier || "free";
  const subscriptionLabel =
    subscriptionTier === "premium"
      ? t("subscription.premium.title")
      : t("subscription.free.title");

  const navigationButtons: NavigationButtonConfig[] = [
    {
      key: "guides",
      title: t("navigation.guides"),
      icon: ({ color, size }) => (
        <Ionicons name="book-outline" color={color} size={size} />
      ),
      onPress: () => {
        router.push("/(protected)/guides");
      },
    },
    {
      key: "expenses-preferences",
      title: t("profile.expensePreferences"),
      icon: ({ color, size }) => (
        <Ionicons name="card-outline" color={color} size={size} />
      ),
      onPress: () => {
        router.push("/(protected)/expenses-preferences");
      },
    },
    {
      key: "subscription",
      title: t("subscription.title"),
      badge: `(${subscriptionLabel})`,
      icon: ({ color, size }) => (
        <Ionicons name="star-outline" color={color} size={size} />
      ),
      onPress: () => {
        router.push("/(protected)/subscription");
      },
    },
    {
      key: "settings",
      title: t("navigation.settings"),
      icon: ({ color, size }) => (
        <Ionicons name="settings-outline" color={color} size={size} />
      ),
      onPress: () => {
        router.push("/(protected)/profile");
      },
    },
  ];

  const ProfileAvatar = useMemo(() => {
    const avatarBorderStyle = [
      styles.avatarBorder,
      { borderColor: colors.primary },
    ];
    const placeholderStyle = [
      styles.avatar,
      {
        backgroundColor: colors.border,
        justifyContent: "center" as const,
        alignItems: "center" as const,
      },
    ];
    const placeholderTextStyle = {
      color: colors.text,
      fontSize: 24,
      fontWeight: "bold" as const,
    };

    return (
      <View style={styles.avatarContainer}>
        <View style={avatarBorderStyle}>
          {userProfile?.profile?.avatar_url ? (
            <Image
              source={{ uri: userProfile.profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={placeholderStyle}>
              <Text style={placeholderTextStyle}>
                {userProfile?.username?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [
    userProfile?.profile?.avatar_url,
    userProfile?.username,
    colors.primary,
    colors.border,
    colors.text,
  ]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header - moved from Profile screen */}
        <TouchableOpacity
          style={[styles.header, { backgroundColor: colors.card }]}
          onPress={() => router.push("/(protected)/profile")}
          activeOpacity={0.7}
        >
          {ProfileAvatar}
          <Text style={[styles.username, { color: colors.text }]}>
            {userProfile?.username || t("common.unknownUser")}
          </Text>
          <Text style={[styles.email, { color: colors.icon }]}>
            {user?.email || ""}
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          {navigationButtons.map((button) => (
            <NavigationButton
              key={button.key}
              title={button.title}
              icon={button.icon}
              onPress={button.onPress}
              badge={button.badge}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Profile header styles (moved from Profile screen)
  header: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarBorder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    padding: 3,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 37,
  },
  username: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  email: {
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  buttonContainer: {
    paddingBottom: 40,
  },
});
