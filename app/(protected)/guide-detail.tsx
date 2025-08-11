import React from "react";
import { StyleSheet, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TopNavigation, TopNavigationAction } from "@ui-kitten/components";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/constants/Colors";
import { useLocalization } from "@/context/LocalizationContext";
import { GuideFormatter } from "@/utils/guideFormatter";

export default function GuideDetailScreen() {
  const router = useRouter();
  const { title, content } = useLocalSearchParams<{
    title: string;
    content: string;
  }>();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { t } = useLocalization();

  const renderBackAction = () => (
    <TopNavigationAction
      icon={(props) => (
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      )}
      onPress={() => router.back()}
    />
  );

  // Enhanced guide content formatter
  const formatter = new GuideFormatter({
    text: colors.text,
    primary: colors.primary,
    muted: colors.text + "80", // 50% opacity
    background: colors.background,
  });

  const renderContent = (text: string) => {
    return formatter.renderContent(text);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TopNavigation
        title={title || t("guideDetail.title")}
        alignment="center"
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {content && renderContent(content)}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
});
