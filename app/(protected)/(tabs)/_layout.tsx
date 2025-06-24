import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.tabIconDefault,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    ...Platform.select({
                        ios: {
                            position: 'absolute',
                        },
                        default: {},
                    }),
                },
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="expenses"
                options={{
                    title: 'Expenses',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={color} />,
                }}
            />
            <Tabs.Screen
                name="investments"
                options={{
                    title: 'Investments',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.line.uptrend.xyaxis" color={color} />,
                }}
            />
            <Tabs.Screen
                name="shares"
                options={{
                    title: 'Shares',
                    tabBarIcon: ({ color }) => <IconSymbol size={28} name="people-outline" color={color} />,
                }}
            />
            <Tabs.Screen
                name="guides"
                options={{
                    title: 'Guides',
                    tabBarIcon: ({ color }) => <Ionicons name="book-outline" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
