import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TopNavigation, Text } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useGuides } from '@/context/GuideContext';
import { Guide } from '@/client/piggusApi';


export default function GuidesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { guides, loading, error } = useGuides();

  const handleGuidePress = (guide: Guide) => {
    router.push({
      pathname: '/(protected)/guide-detail',
      params: { 
        id: guide.id,
        title: guide.title,
        content: guide.content 
      }
    });
  };

  const renderGuideItem = (guide: Guide) => (
    <TouchableOpacity
      key={guide.id}
      style={[styles.guideItem, { backgroundColor: colors.card, shadowColor: colors.text }]}
      onPress={() => handleGuidePress(guide)}
    >
      <View style={[styles.guideIcon, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name={guide.icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.guideContent}>
        <View style={styles.guideHeader}>
          <Text style={[styles.guideCategory, { color: colors.primary }]}>
            {guide.category}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.icon} />
        </View>
        <Text style={[styles.guideTitle, { color: colors.text }]}>
          {guide.title}
        </Text>
        <Text style={[styles.guideSubtitle, { color: colors.icon }]}>
          {guide.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavigation
        title='Financial Guides'
        alignment='center'
        style={{ backgroundColor: colors.background }}
      />
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Learn & Grow
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            Master your finances with our comprehensive guides
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading guides...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text }]}>
              {error}
            </Text>
          </View>
        ) : (
          <View style={styles.guidesContainer}>
            {guides.map(renderGuideItem)}
          </View>
        )}

        <View style={{ height: 100 }} />
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
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  guidesContainer: {
    gap: 16,
  },
  guideItem: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  guideIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  guideContent: {
    flex: 1,
  },
  guideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  guideCategory: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  guideSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});