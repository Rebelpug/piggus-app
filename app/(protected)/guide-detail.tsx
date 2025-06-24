import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TopNavigation, TopNavigationAction, Text } from '@ui-kitten/components';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function GuideDetailScreen() {
  const router = useRouter();
  const { title, content } = useLocalSearchParams<{
    title: string;
    content: string;
  }>();
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderBackAction = () => (
    <TopNavigationAction
      icon={(props) => <Ionicons name="arrow-back" size={24} color={colors.text} />}
      onPress={() => router.back()}
    />
  );

  // Simple markdown-like rendering for the content
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        // Main heading
        elements.push(
          <Text key={index} style={[styles.heading1, { color: colors.text }]}>
            {line.substring(2)}
          </Text>
        );
      } else if (line.startsWith('## ')) {
        // Secondary heading
        elements.push(
          <Text key={index} style={[styles.heading2, { color: colors.text }]}>
            {line.substring(3)}
          </Text>
        );
      } else if (line.startsWith('### ')) {
        // Tertiary heading
        elements.push(
          <Text key={index} style={[styles.heading3, { color: colors.text }]}>
            {line.substring(4)}
          </Text>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        // Bold text
        elements.push(
          <Text key={index} style={[styles.boldText, { color: colors.text }]}>
            {line.substring(2, line.length - 2)}
          </Text>
        );
      } else if (line.startsWith('- ')) {
        // Bullet point
        elements.push(
          <View key={index} style={styles.bulletContainer}>
            <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
            <Text style={[styles.bulletText, { color: colors.text }]}>
              {line.substring(2)}
            </Text>
          </View>
        );
      } else if (line.trim() === '') {
        // Empty line for spacing
        elements.push(<View key={index} style={styles.spacing} />);
      } else if (line.trim() !== '') {
        // Regular paragraph
        elements.push(
          <Text key={index} style={[styles.paragraph, { color: colors.text }]}>
            {line}
          </Text>
        );
      }
    });
    
    return elements;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavigation
        title={title || 'Guide'}
        alignment='center'
        accessoryLeft={renderBackAction}
        style={{ backgroundColor: colors.background }}
      />
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
  heading1: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 8,
  },
  heading2: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 24,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  boldText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 16,
  },
  bullet: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    width: 16,
  },
  bulletText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  spacing: {
    height: 8,
  },
});