import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
    colorScheme: ColorScheme;
    toggleColorScheme: () => void;
    isSystemTheme: boolean;
    setIsSystemTheme: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@piggus_theme';
const SYSTEM_THEME_STORAGE_KEY = '@piggus_system_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
    const [isSystemTheme, setIsSystemTheme] = useState(true);

    useEffect(() => {
        loadThemeSettings();
    }, []);

    useEffect(() => {
        if (isSystemTheme) {
            const systemScheme = Appearance.getColorScheme() || 'light';
            setColorScheme(systemScheme);

            const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
                if (isSystemTheme) {
                    setColorScheme(newScheme || 'light');
                }
            });

            return () => subscription?.remove();
        }
    }, [isSystemTheme]);

    const loadThemeSettings = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            const savedSystemTheme = await AsyncStorage.getItem(SYSTEM_THEME_STORAGE_KEY);
            
            const useSystemTheme = savedSystemTheme ? JSON.parse(savedSystemTheme) : true;
            setIsSystemTheme(useSystemTheme);

            if (!useSystemTheme && savedTheme) {
                setColorScheme(savedTheme as ColorScheme);
            } else {
                const systemScheme = Appearance.getColorScheme() || 'light';
                setColorScheme(systemScheme);
            }
        } catch (error) {
            console.error('Error loading theme settings:', error);
            // Fallback to system theme if storage fails
            const systemScheme = Appearance.getColorScheme() || 'light';
            setColorScheme(systemScheme);
            setIsSystemTheme(true);
        }
    };

    const toggleColorScheme = async () => {
        try {
            const newScheme = colorScheme === 'light' ? 'dark' : 'light';
            setColorScheme(newScheme);
            setIsSystemTheme(false);
            
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newScheme);
            await AsyncStorage.setItem(SYSTEM_THEME_STORAGE_KEY, JSON.stringify(false));
        } catch (error) {
            console.error('Error saving theme:', error);
            // Still apply the theme change even if storage fails
        }
    };

    const handleSetIsSystemTheme = async (value: boolean) => {
        try {
            setIsSystemTheme(value);
            await AsyncStorage.setItem(SYSTEM_THEME_STORAGE_KEY, JSON.stringify(value));
            
            if (value) {
                const systemScheme = Appearance.getColorScheme() || 'light';
                setColorScheme(systemScheme);
            }
        } catch (error) {
            console.error('Error updating system theme setting:', error);
        }
    };

    return (
        <ThemeContext.Provider 
            value={{ 
                colorScheme, 
                toggleColorScheme, 
                isSystemTheme, 
                setIsSystemTheme: handleSetIsSystemTheme 
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}