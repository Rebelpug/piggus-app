import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { getSystemLanguage } from '@/lib/i18n';

interface LocalizationContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  availableLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;
}

const LocalizationContext = createContext<LocalizationContextType | null>(null);

const STORAGE_KEY = '@piggus_language';

const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
];

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    i18n.locale = 'en';
    setCurrentLanguage('en');
    return;
    // try {
    //   const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
    //   if (savedLanguage) {
    //     setCurrentLanguage(savedLanguage);
    //     i18n.locale = savedLanguage;
    //   } else {
    //     // If no saved language, detect system language
    //     const systemLanguage = getSystemLanguage();
    //     setCurrentLanguage(systemLanguage);
    //     i18n.locale = systemLanguage;
    //   }
    // } catch (error) {
    //   console.error('Error loading saved language:', error);
    //   // Fallback to English
    //   setCurrentLanguage('en');
    //   i18n.locale = 'en';
    // }
  };

  const changeLanguage = async (language: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, language);
      setCurrentLanguage(language);
      i18n.locale = language;
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string, options?: any) => {
    return i18n.t(key, options);
  };

  const value: LocalizationContextType = {
    currentLanguage,
    changeLanguage,
    t,
    availableLanguages: AVAILABLE_LANGUAGES,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};
