import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, ScrollView } from 'react-native';
import { Layout, Text, Button } from '@ui-kitten/components';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface IntroScreenProps {
    onComplete: () => void;
}

interface IntroSlide {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
}

const introSlides: IntroSlide[] = [
    {
        id: 1,
        title: "Manage & Share Expenses",
        subtitle: "Track your spending effortlessly",
        description: "Keep track of your personal expenses and easily share costs with friends, family, or roommates. Split bills, manage group expenses, and never forget who owes what.",
        icon: "people-outline",
        iconColor: "#4CAF50"
    },
    {
        id: 2,
        title: "Investment Tracker",
        subtitle: "Grow your wealth smartly",
        description: "Monitor your investment portfolio, track performance, and make informed financial decisions. Keep all your investments organized in one secure place.",
        icon: "trending-up-outline",
        iconColor: "#2196F3"
    },
    {
        id: 3,
        title: "Privacy & Security",
        subtitle: "Your data stays yours",
        description: "End-to-end encryption ensures your financial data remains completely private. We use zero-knowledge architecture - not even we can see your personal information.",
        icon: "shield-checkmark-outline",
        iconColor: "#FF9800"
    }
];

export default function IntroScreen({ onComplete }: IntroScreenProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < introSlides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const handleComplete = async () => {
        try {
            await AsyncStorage.setItem('INTRO_V0', 'completed');
            onComplete();
        } catch (error) {
            console.error('Failed to save intro completion:', error);
            onComplete(); // Continue anyway
        }
    };

    const renderSlide = (slide: IntroSlide) => (
        <View style={[styles.slide, { width }]}>
            <View style={styles.slideContent}>
                <View style={[styles.iconContainer, { backgroundColor: slide.iconColor + '20' }]}>
                    <Ionicons 
                        name={slide.icon} 
                        size={80} 
                        color={slide.iconColor} 
                    />
                </View>
                
                <Text style={[styles.title, { color: colors.text }]}>
                    {slide.title}
                </Text>
                
                <Text style={[styles.subtitle, { color: colors.primary }]}>
                    {slide.subtitle}
                </Text>
                
                <Text style={[styles.description, { color: colors.icon }]}>
                    {slide.description}
                </Text>
            </View>
        </View>
    );

    const renderPagination = () => (
        <View style={styles.pagination}>
            {introSlides.map((_, index) => (
                <View
                    key={index}
                    style={[
                        styles.paginationDot,
                        {
                            backgroundColor: index === currentSlide ? colors.primary : colors.border,
                            width: index === currentSlide ? 24 : 8,
                        }
                    ]}
                />
            ))}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <Layout style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        Welcome to Piggus
                    </Text>
                    <Text style={[styles.slideCounter, { color: colors.icon }]}>
                        {currentSlide + 1} of {introSlides.length}
                    </Text>
                </View>

                {/* Slides */}
                <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={false}
                    contentOffset={{ x: currentSlide * width, y: 0 }}
                    style={styles.slidesContainer}
                >
                    {introSlides.map((slide) => renderSlide(slide))}
                </ScrollView>

                {/* Pagination */}
                {renderPagination()}

                {/* Navigation Buttons */}
                <View style={styles.navigationContainer}>
                    <Button
                        appearance='ghost'
                        status='basic'
                        onPress={handlePrevious}
                        disabled={currentSlide === 0}
                        style={[
                            styles.navButton,
                            { opacity: currentSlide === 0 ? 0.3 : 1 }
                        ]}
                        accessoryLeft={(props) => (
                            <Ionicons 
                                name="chevron-back" 
                                size={20} 
                                color={props?.tintColor} 
                            />
                        )}
                    >
                        Previous
                    </Button>

                    <Button
                        status='primary'
                        onPress={handleNext}
                        style={styles.navButton}
                        accessoryRight={(props) => (
                            <Ionicons 
                                name={currentSlide === introSlides.length - 1 ? "checkmark" : "chevron-forward"} 
                                size={20} 
                                color={props?.tintColor || '#FFFFFF'} 
                            />
                        )}
                    >
                        {currentSlide === introSlides.length - 1 ? 'Get Started' : 'Next'}
                    </Button>
                </View>

                {/* Skip Button */}
                <View style={styles.skipContainer}>
                    <Button
                        appearance='ghost'
                        status='basic'
                        size='small'
                        onPress={handleComplete}
                        style={styles.skipButton}
                    >
                        Skip Introduction
                    </Button>
                </View>
            </Layout>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    slideCounter: {
        fontSize: 14,
        fontWeight: '500',
    },
    slidesContainer: {
        flex: 1,
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    slideContent: {
        alignItems: 'center',
        maxWidth: 320,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 24,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 32,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    paginationDot: {
        height: 8,
        borderRadius: 4,
        transition: 'all 0.3s ease',
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 16,
    },
    navButton: {
        flex: 1,
        borderRadius: 12,
    },
    skipContainer: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingBottom: 16,
    },
    skipButton: {
        borderRadius: 8,
    },
});