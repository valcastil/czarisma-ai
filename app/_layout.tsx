import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { StripeProvider } from '@/components/stripe-provider';
import { Stack, useRouter, usePathname } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { IntelligentCzar } from '@/components/intelligent-czar';
import { TrialExpiredModal } from '@/components/trial-expired-modal';
import { InactivityProvider } from '@/contexts/inactivity-provider';
import { Colors } from '@/constants/theme';
import { CzarProvider, useCzar } from '@/contexts/czar-context';
import { ThemeProvider, useColorScheme } from '@/hooks/use-theme';
import { initializeGemini } from '@/lib/gemini';
import { initializeRevenueCat } from '@/lib/revenuecat';
import { initializeSupabase, supabase } from '@/lib/supabase';
import '@/lib/firebase-init';
import { initializeVexo } from '@/lib/vexo-analytics';
import { checkTrialExpirationAndRedirect, getLocalTrialStatus, shouldShowTrialExpiredPopup } from '@/utils/subscription-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ TEMPORARY: Set to true to reset onboarding, then set back to false
const DEV_RESET_ONBOARDING = false;

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

  // Handle deep links for auth callbacks (email confirmation, password reset)
  useEffect(() => {
    const handleAuthDeepLink = async (url: string) => {
      if (!url || !url.includes('auth/callback')) return;

      try {
        // Handle hash fragments: charismachat://auth/callback#access_token=xxx&refresh_token=xxx&...
        // Browsers that DO follow the custom scheme redirect put tokens in the hash
        if (url.includes('#')) {
          const hashPart = url.split('#')[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');

            if (access_token && refresh_token) {
              const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
              });
              if (!error) {
                console.log('Session established from deep link hash');
                try {
                  const { refreshProStatus, createTrialIfNeeded } = await import('@/utils/subscription-utils');
                  await refreshProStatus();
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) await createTrialIfNeeded(user.id);
                } catch (e) {
                  console.error('Error setting up subscription after deep link auth:', e);
                }
                router.replace('/(tabs)');
                return;
              }
            }
          }
        }
      } catch (e) {
        console.error('Error handling auth deep link:', e);
      }
    };

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleAuthDeepLink(event.url);
    });

    // Check if app was opened via deep link (from terminated state)
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url);
    });

    return () => subscription.remove();
  }, [router]);

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

        // Force handle claim if the signed-in user hasn't set one yet.
        await enforceHandleGate();
      }
    };
    checkAuthAndTrial();

    // Re-check on every sign-in so users coming from /auth-sign-in are routed.
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        enforceHandleGate().catch((e) => console.warn('Handle gate check failed:', e));
      }
    });
    return () => { authSub.subscription.unsubscribe(); };
  }, []);

  // Gate helper: redirects signed-in users to /claim-handle when a required handle is missing.
  const enforceHandleGate = async () => {
    try {
      const { fetchCurrentHandleState, needsHandleClaim } = await import('@/utils/handle-utils');
      const handleState = await fetchCurrentHandleState();
      if (handleState && needsHandleClaim(handleState)) {
        router.replace('/claim-handle');
      }
    } catch (e) {
      console.warn('Handle gate check failed:', e);
    }
  };

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
      <InactivityProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" />
          <Stack.Screen name="onboarding-charisma" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="onboarding-emotions" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="add-entry" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="subscription" />
          <Stack.Screen name="subscriptions-info" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="auth-sign-in" options={{ gestureEnabled: false }} />
          <Stack.Screen name="ai-chat" />
          <Stack.Screen name="profile-settings" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="edit-profile" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="change-password" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="new-message" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="chat" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="search" options={{ gestureEnabled: true, animation: 'slide_from_right' }} />
          <Stack.Screen name="claim-handle" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="entry" options={{ headerShown: false }} />
          <Stack.Screen name="czareels" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="create-czareel" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        </Stack>
        <StatusBar style="light" />
        {/* Intelligent Czar - appears after 20s of inactivity */}
        <IntelligentCzar />
        {/* Trial Expired Modal */}
        <TrialExpiredModal
          visible={showTrialModal}
          daysRemaining={trialDaysRemaining}
          onClose={() => setShowTrialModal(false)}
        />
      </InactivityProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  // DEV ONLY: Reset onboarding state for fresh start
  useEffect(() => {
    if (__DEV__ && DEV_RESET_ONBOARDING) {
      AsyncStorage.multiRemove([
        '@charisma_onboarding',
        '@tutorial_completed',
        '@onboarding_completed',
      ]).then(() => console.log('DEV: Onboarding state cleared'));
    }
  }, []);

  // Initialize new services on app start
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // Initialize Supabase first (critical)
        await initializeSupabase();

        // Initialize other services with error handling
        try {
          initializeGemini();
        } catch (error) {
          console.warn('Failed to initialize Gemini AI:', error);
        }
        
        try {
          initializeVexo();
        } catch (error) {
          console.warn('Failed to initialize Vexo Analytics:', error);
        }
        
        try {
          await initializeRevenueCat();
        } catch (error) {
          console.warn('Failed to initialize RevenueCat:', error);
        }

        console.log('Core services initialized successfully');
      } catch (error) {
        console.error('Critical error during service initialization:', error);
        // Don't crash the app, continue with limited functionality
      }
    };

    initializeServices();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <ThemeProvider>
            <CzarProvider>
              <RootLayoutContent />
            </CzarProvider>
          </ThemeProvider>
        </StripeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
