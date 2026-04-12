/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// CharismaTracker brand colors
const goldColor = '#F4C542';
const darkBackground = '#1A1A1A';
const cardBackground = '#2A2A2A';
const textPrimary = '#FFFFFF';
const textSecondary = '#B0B0B0';

const tintColorLight = goldColor;
const tintColorDark = goldColor;

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#687076',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    gold: goldColor,
    card: '#f5f5f5',
    border: '#E0E0E0',
    messageBubble: 'rgba(220, 248, 198, 0.5)', // Transparent green for sent messages
    messageBubbleReceived: '#FFFFFF', // White for received messages
    messageBubbleForwarded: 'rgba(255, 235, 59, 0.3)', // Transparent yellow for forwarded messages
  },
  dark: {
    text: textPrimary,
    textSecondary: textSecondary,
    background: darkBackground,
    card: cardBackground,
    tint: tintColorDark,
    icon: textSecondary,
    tabIconDefault: textSecondary,
    tabIconSelected: tintColorDark,
    gold: goldColor,
    border: '#3A3A3A',
    messageBubble: 'rgba(0, 92, 75, 0.5)', // Transparent green for sent messages
    messageBubbleReceived: cardBackground, // Dark card for received messages
    messageBubbleForwarded: 'rgba(255, 235, 59, 0.2)', // Transparent yellow for forwarded messages
  },
};

// CharismaTracker data types
export interface CharismaEntry {
  id: string;
  majorCharisma: string;
  subCharisma: string;
  notes: string;
  timestamp: number;
  date: string;
  time: string;
  charismaEmoji: string;
  emotionEmojis: string[];
}

export interface OnboardingState {
  completed: boolean;
  selectedEmotions: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  location: {
    city: string;
    country: string;
  };
  isVerified: boolean;
  twoFactorEnabled: boolean;
  bio: string;
  interests: string[];
  occupation?: string;
  website?: string;
  socialLinks: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    tiktok?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    snapchat?: string;
    threads?: string;
    telegram?: string;
  };
  joinDate: number;
  totalEntries: number;
  streak: number;
  topCharisma: string;
  preferredEmotions: string[];
  notifications: {
    email: boolean;
    push: boolean;
    dailyReminders: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'friends' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    showBirthDate: boolean;
  };
  preferences: {
    language: string;
    theme: 'light' | 'dark' | 'auto';
  };
}

export interface UserStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  topCharisma: { type: string; count: number };
  topEmotion: string;
  weeklyAverage: number;
  monthlyAverage: number;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
