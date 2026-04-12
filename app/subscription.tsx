import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useStripe } from '@stripe/stripe-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getSignedUpTrialStatus, needsProSubscription } from '@/utils/subscription-utils';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  interval: string;
  features: string[];
  popular?: boolean;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: '$2.99',
    interval: 'month',
    features: [
      'Unlock all premium charisma types',
      'Divine, Star Power & more',
      'Unlimited charisma entries',
      'Advanced analytics & insights',
      'Export data to CSV',
      'Ad-free experience',
    ],
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: '$28.7',
    interval: 'year',
    features: [
      'Everything in Monthly',
      'Save 20% annually',
      'Exclusive yearly insights',
      'Early access to new features',
      'Lifetime updates',
      'Premium badge',
    ],
    popular: true,
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [requiresPro, setRequiresPro] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    checkTrialStatus();
  }, []);

  // Refresh auth status when screen is focused (e.g., after sign-out)
  useFocusEffect(
    useCallback(() => {
      checkAuthStatus();
    }, [])
  );

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      setUserEmail(session.user.email);
    } else {
      setUserEmail(null);
    }
  };

  const checkTrialStatus = async () => {
    const needsPro = await needsProSubscription();
    setRequiresPro(needsPro);
    
    const trialStatus = await getSignedUpTrialStatus();
    setTrialDaysRemaining(trialStatus.daysRemaining);
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(true);

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        Alert.alert(
          'Sign In Required',
          'Please sign in or create an account to start your free trial.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign In',
              onPress: () => router.push('/auth-sign-in'),
            },
          ]
        );
        return;
      }

      // Call Supabase Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId, userId: session.user.id },
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        Alert.alert('Error', 'Failed to initialize payment. Please try again.');
        return;
      }

      const { clientSecret, ephemeralKey, customer, isSetupIntent } = data;

      // Initialize payment sheet - use setupIntent for trials, paymentIntent otherwise
      const sharedConfig = {
        merchantDisplayName: 'Czar AI',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: session.user.email || 'Charisma User',
        },
      };

      const { error: initError } = await initPaymentSheet(
        isSetupIntent
          ? { ...sharedConfig, setupIntentClientSecret: clientSecret }
          : { ...sharedConfig, paymentIntentClientSecret: clientSecret }
      );

      if (initError) {
        console.error('Error initializing payment sheet:', initError);
        Alert.alert('Error', 'Failed to initialize payment');
        return;
      }

      // Present payment sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Error', presentError.message);
        }
        return;
      }

      // Payment successful - update subscription status in Supabase
      try {
        await supabase.from('subscriptions').upsert({
          user_id: session.user.id,
          status: 'active',
          plan_type: planId,
          store: 'stripe',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + (planId === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          will_renew: true,
        });
      } catch (dbError) {
        console.error('Error updating subscription in database:', dbError);
      }

      Alert.alert(
        'Welcome to Pro! 🎉',
        'Your subscription is now active. Enjoy all premium features!',
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            }
          }}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <IconSymbol name="chevron.left" size={24} color={router.canGoBack() ? colors.gold : 'transparent'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Upgrade to Pro
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroEmoji]}>{requiresPro ? '🎉' : '✨'}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {requiresPro ? 'Your 3-Month Free Trial Ended' : 'Unlock Your Full Potential'}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {requiresPro 
              ? 'Thanks for using Czar AI! Your free trial has ended. Subscribe to PRO to continue accessing all premium features.'
              : 'Get unlimited access to all premium features and take your charisma tracking to the next level'}
          </Text>
        </View>

        {/* Trial Status Banner for signed-up users */}
        {userEmail && trialDaysRemaining !== null && trialDaysRemaining > 0 && (
          <View style={[styles.trialBanner, { backgroundColor: colors.card, borderColor: colors.gold }]}>
            <IconSymbol name="gift.fill" size={20} color={colors.gold} />
            <Text style={[styles.trialBannerText, { color: colors.text }]}>
              <Text style={{ color: colors.gold, fontWeight: 'bold' }}>{trialDaysRemaining} days</Text> left in your free trial
            </Text>
          </View>
        )}

        {/* Auth Status */}
        {userEmail ? (
          <View style={[styles.authBanner, { backgroundColor: colors.card, borderColor: colors.gold }]}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.gold} />
            <Text style={[styles.authBannerText, { color: colors.text }]}>
              Signed in as <Text style={{ color: colors.gold }}>{userEmail}</Text>
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.authBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/auth-sign-in')}
            activeOpacity={0.8}>
            <IconSymbol name="person.circle" size={20} color={colors.textSecondary} />
            <Text style={[styles.authBannerText, { color: colors.text }]}>
              Sign in to start your free trial
            </Text>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: selectedPlan === plan.id ? colors.gold : colors.border,
                  borderWidth: selectedPlan === plan.id ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.8}>
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: colors.gold }]}>
                  <Text style={[styles.popularText, { color: '#000000' }]}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.text }]}>
                  {plan.name}
                </Text>
                <View style={styles.priceContainer}>
                  <Text style={[styles.planPrice, { color: colors.gold }]}>
                    {plan.price}
                  </Text>
                  <Text style={[styles.planInterval, { color: colors.textSecondary }]}>
                    /{plan.interval}
                  </Text>
                </View>
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <IconSymbol
                      name="checkmark.circle.fill"
                      size={20}
                      color={colors.gold}
                    />
                    <Text style={[styles.featureText, { color: colors.text }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {selectedPlan === plan.id && (
                <View style={styles.selectedIndicator}>
                  <IconSymbol
                    name="checkmark.circle.fill"
                    size={24}
                    color={colors.gold}
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: colors.gold },
            loading && styles.subscribeButtonDisabled,
          ]}
          onPress={() => handleSubscribe(selectedPlan)}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color={colors.gold} />
          ) : (
            <>
              <Text style={[styles.subscribeButtonText, { color: '#000000' }]}>
                {requiresPro ? 'Subscribe to PRO' : 'Start Free Trial'}
              </Text>
              <Text style={[styles.subscribeButtonSubtext, { color: '#000000' }]}>
                {requiresPro 
                  ? 'Continue with ' + PLANS.find(p => p.id === selectedPlan)?.price + '/' + PLANS.find(p => p.id === selectedPlan)?.interval
                  : '30 days free, then ' + PLANS.find(p => p.id === selectedPlan)?.price + '/' + PLANS.find(p => p.id === selectedPlan)?.interval}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Terms */}
        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          Cancel anytime. By subscribing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  authBannerText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  plansContainer: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '700',
  },
  planInterval: {
    fontSize: 16,
    marginLeft: 4,
  },
  featuresContainer: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  subscribeButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subscribeButtonSubtext: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  trialBannerText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
