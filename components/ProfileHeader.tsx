import React from "react";
import { TouchableOpacity, Image, StyleSheet, View } from "react-native";
import { Text } from "@ui-kitten/components";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";

interface ProfileHeaderProps {
  style?: any;
}

export default function ProfileHeader({ style }: ProfileHeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { userProfile } = useProfile();

  const getGravatarUrl = (email: string, size: number = 32) => {
    // Using a placeholder hash calculation for now
    // In production, you'd compute the proper MD5 hash
    const placeholderHash = email
      .split("")
      .reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0)
      .toString(16);

    return `https://www.gravatar.com/avatar/${placeholderHash}?s=${size}&d=identicon`;
  };

  const handlePress = () => {
    router.push("/(protected)/profile");
  };

  if (!user || !userProfile) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarContainer, { borderColor: colors.border }]}>
        <Image
          source={{ uri: getGravatarUrl(user.email || "") }}
          style={styles.avatar}
        />
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.greeting, { color: colors.icon }]}>Hello,</Text>
        <Text style={[styles.username, { color: colors.text }]}>
          {userProfile.username}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    padding: 2,
    marginRight: 12,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
  },
  userInfo: {
    justifyContent: "center",
  },
  greeting: {
    fontSize: 12,
    fontWeight: "400",
    marginBottom: 2,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
  },
});
