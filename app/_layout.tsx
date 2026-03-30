import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { ThemeProvider, useColorScheme } from '@/hooks/use-theme';
import { initializeGemini } from '@/lib/gemini';
import { initializeRevenueCat } from '@/lib/revenuecat';
import { initializeSupabase, supabase } from '@/lib/supabase';
import { initializeVexo } from '@/lib/vexo-analytics';

// Stripe publishable key - replace with your actual key
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();

  // Check auth state after navigation is ready
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth-sign-in');
      }
    };
    checkAuth();
  }, []);

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      primary: colors.gold,
    },
  };

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? customDarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" />
        <Stack.Screen name="onboarding-charisma" />
        <Stack.Screen name="onboarding-emotions" />
        <Stack.Screen name="add-entry" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="subscription" />
        <Stack.Screen name="auth-sign-in" />
        <Stack.Screen name="ai-chat" />
        <Stack.Screen 
          name="entry/[id]" 
          options={{ 
            headerShown: true,
            title: 'Entry Details',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.gold,
          }} 
        />
      </Stack>
      <StatusBar style="light" />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  // Initialize new services on app start
  useEffect(() => {
    const initializeServices = async () => {
      await initializeSupabase();

      // Initialize Gemini AI
      initializeGemini();
      
      // Initialize Vexo Analytics
      initializeVexo();
      
      // Initialize RevenueCat
      await initializeRevenueCat();
      
      console.log('All services initialized');
    };

    initializeServices();
  }, []);

  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <ThemeProvider>
          <RootLayoutContent />
        </ThemeProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
