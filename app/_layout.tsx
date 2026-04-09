import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IntelligentCzar } from '@/components/intelligent-czar';
import { Colors } from '@/constants/theme';
import { CzarProvider, useCzar } from '@/contexts/czar-context';
import { ThemeProvider, useColorScheme } from '@/hooks/use-theme';
import { initializeGemini } from '@/lib/gemini';
import { initializeRevenueCat } from '@/lib/revenuecat';
import { initializeSupabase, supabase } from '@/lib/supabase';
import { initializeVexo } from '@/lib/vexo-analytics';
import { checkTrialExpirationAndRedirect } from '@/utils/subscription-utils';

// Stripe publishable key - replace with your actual key
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const router = useRouter();
  const pathname = usePathname();
  const { setCurrentScreen } = useCzar();

  // Track screen changes for Czar context
  useEffect(() => {
    if (pathname) {
      // Extract screen name from pathname (remove leading slash)
      const screenName = pathname.replace(/^\//, '').split('/')[0] || 'index';
      setCurrentScreen(screenName);
    }
  }, [pathname, setCurrentScreen]);

  // Check auth state and trial status after navigation is ready
  // Signed-in users: free access. Non-signed-in: 30-day trial, then must sign up.
  useEffect(() => {
    const checkAuthAndTrial = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not signed in — check if local trial is still active
        await checkTrialExpirationAndRedirect(router);
      }
    };
    checkAuthAndTrial();
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
        <Stack.Screen name="onboarding-charisma" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="onboarding-emotions" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
        <Stack.Screen name="add-entry" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
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
      {/* Intelligent Czar - appears after inactivity on any screen */}
      <IntelligentCzar />
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
          <CzarProvider>
            <RootLayoutContent />
          </CzarProvider>
        </ThemeProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
