import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';
import { getProfile } from '@/utils/profile-utils';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  colors: typeof Colors.light;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const nativeColorScheme = useNativeColorScheme();
  const [theme, setThemeState] = useState<Theme>('auto');
  const [profileTheme, setProfileTheme] = useState<Theme>('auto');

  useEffect(() => {
    loadThemeFromProfile();
  }, []);

  const loadThemeFromProfile = async () => {
    try {
      const profile = await getProfile();
      const userTheme = profile?.preferences?.theme || 'auto';
      setProfileTheme(userTheme);
      setThemeState(userTheme);
    } catch (error) {
      console.error('Error loading theme from profile:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    setProfileTheme(newTheme);
  };

  const actualTheme: 'light' | 'dark' = 
    theme === 'auto' 
      ? (nativeColorScheme === 'dark' ? 'dark' : 'light')
      : theme;

  const colors = Colors[actualTheme];

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, actualTheme }}>
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

// Backward compatibility hook
export function useColorScheme() {
  const { actualTheme } = useTheme();
  return actualTheme;
}
