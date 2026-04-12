import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IntelligentCzar } from '@/components/intelligent-czar';
import { TrialExpiredModal } from '@/components/trial-expired-modal';
import { Colors } from '@/constants/theme';
import { CzarProvider, useCzar } from '@/contexts/czar-context';
import { ThemeProvider, useColorScheme } from '@/hooks/use-theme';
import { initializeGemini } from '@/lib/gemini';
import { initializeRevenueCat } from '@/lib/revenuecat';
import { initializeSupabase, supabase } from '@/lib/supabase';
import { initializeVexo } from '@/lib/vexo-analytics';
import { checkTrialExpirationAndRedirect, getLocalTrialStatus, shouldShowTrialExpiredPopup } from '@/utils/subscription-utils';

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
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | undefined>(undefined);

  // Track screen changes for Czar context
  useEffect(() => {
    if (pathname) {
      // Extract screen name from pathname (remove leading slash)
      const screenName = pathname.replace(/^\//, '').split('/')[0] || 'index';
      setCurrentScreen(screenName);
    }
  }, [pathname, setCurrentScreen]);

  // Check auth state and trial status after navigation is ready
  // NEW FLOW: 7-day trial → sign up → 3-month free → PRO subscription
  useEffect(() => {
    const checkAuthAndTrial = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not signed in — check if 7-day trial expired
        const trial = await getLocalTrialStatus();
        const shouldShowPopup = await shouldShowTrialExpiredPopup();
        
        if (shouldShowPopup) {
          // Show persistent trial expired modal
          setTrialDaysRemaining(trial.daysRemaining ?? undefined);
          setShowTrialModal(true);
        } else if (trial.daysRemaining !== null && trial.daysRemaining <= 2) {
          // Show warning popup when 2 or fewer days remaining
          setTrialDaysRemaining(trial.daysRemaining);
          setShowTrialModal(true);
        }
        
        // Also redirect to sign-in if fully expired
        if (trial.isExpired) {
          await checkTrialExpirationAndRedirect(router);
        }
      } else {
        // Signed in — check if 3-month trial expired and needs PRO
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
        <Stack.Screen name="subscriptions-info" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
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
      
      {/* Trial Expired Modal - shows after 7 days or when expiring soon */}
      <TrialExpiredModal 
        visible={showTrialModal} 
        daysRemaining={trialDaysRemaining}
        onClose={() => setShowTrialModal(false)}
      />
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
