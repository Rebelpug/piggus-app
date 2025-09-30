import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface NavigationButtonProps {
  title: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}

export function NavigationButton({
  title,
  icon: Icon,
  onPress,
  disabled = false,
  badge,
}: NavigationButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={`Navigate to ${title}`}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon
            color={disabled ? colors.tabIconDefault : colors.tabIconSelected}
            size={24}
          />
        </View>
        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.title,
              {
                color: disabled ? colors.tabIconDefault : colors.text,
              },
            ]}
          >
            {title}
          </Text>
          {badge && (
            <Text
              style={[
                styles.badge,
                {
                  color: colors.icon,
                },
              ]}
            >
              {badge}
            </Text>
          )}
        </View>
        <View style={styles.chevron}>
          <Text
            style={[
              styles.chevronText,
              {
                color: disabled ? colors.tabIconDefault : colors.tabIconDefault,
              },
            ]}
          >
            ›
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 12,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginRight: 16,
    width: 24,
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  badge: {
    fontSize: 14,
    fontWeight: "400",
  },
  chevron: {
    marginLeft: 8,
  },
  chevronText: {
    fontSize: 20,
    fontWeight: "300",
  },
  disabled: {
    opacity: 0.5,
  },
});
