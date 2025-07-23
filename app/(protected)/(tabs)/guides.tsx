import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TopNavigation, Text } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useGuides } from '@/context/GuideContext';
import { useLocalization } from '@/context/LocalizationContext';
import { Guide } from '@/client/piggusApi';
import ProfileHeader from '@/components/ProfileHeader';


export default function GuidesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { t } = useLocalization();
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

  const getDifficultyLabel = (level: number) => {
    switch (level) {
      case 0:
        return t('guides.beginner');
      case 1:
        return t('guides.intermediate');
      case 2:
        return t('guides.advanced');
      default:
        return t('guides.missing');
    }
  };

  const organizeGuidesByDifficulty = () => {
    const organized = {
      beginner: guides.filter(guide => guide.difficulty_level === 0),
      intermediate: guides.filter(guide => guide.difficulty_level === 1),
      advanced: guides.filter(guide => guide.difficulty_level === 2),
      missing: guides.filter(guide => guide.difficulty_level === -1 || guide.difficulty_level === undefined || guide.difficulty_level === null)
    };
    return organized;
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

  const renderDifficultySection = (title: string, guidesList: Guide[]) => {
    if (guidesList.length === 0) return null;
    
    return (
      <View style={styles.difficultySection}>
        <Text style={[styles.difficultyTitle, { color: colors.text }]}>
          {title}
        </Text>
        <View style={styles.guidesContainer}>
          {guidesList.map(renderGuideItem)}
        </View>
      </View>
    );
  };

  const renderLeftActions = () => (
    <ProfileHeader />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavigation
        title={t('guides.title')}
        alignment='center'
        accessoryLeft={renderLeftActions}
        style={{ backgroundColor: colors.background }}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('guides.learnAndGrow')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            {t('guides.masterYourFinances')}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              {t('guides.loadingGuides')}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text }]}>
              {error}
            </Text>
          </View>
        ) : (
          <View>
            {(() => {
              const organizedGuides = organizeGuidesByDifficulty();
              return (
                <>
                  {renderDifficultySection(t('guides.beginner'), organizedGuides.beginner)}
                  {renderDifficultySection(t('guides.intermediate'), organizedGuides.intermediate)}
                  {renderDifficultySection(t('guides.advanced'), organizedGuides.advanced)}
                  {renderDifficultySection(t('guides.missing'), organizedGuides.missing)}
                </>
              );
            })()}
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
    paddingBottom: 20,
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
  difficultySection: {
    marginBottom: 32,
  },
  difficultyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingLeft: 4,
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
