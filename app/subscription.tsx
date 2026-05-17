import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { getSignedUpTrialStatus, needsProSubscription } from '@/utils/subscription-utils';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  interval: string;
  features: string[];
}

const PLAN: SubscriptionPlan = {
  id: 'monthly',
  name: 'Pro Monthly',
  price: '$1.99',
  interval: 'month',
  features: [
    'Unlock all premium charisma types',
    'Divine, Star Power & more',
    'Unlimited charisma entries',
    'Unlimited Czar AI chat',
    'Advanced analytics & insights',
    'Ad-free experience',
  ],
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [requiresPro, setRequiresPro] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    checkTrialStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
        checkAuthStatus();
      });
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

  const handleSubscribe = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        Alert.alert(
          'Sign In Required',
          'Please sign in or create an account to subscribe.',
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

      // TODO: Integrate payment provider (RevenueCat, Stripe, etc.)
      Alert.alert(
        'Coming Soon',
        'In-app purchases will be available soon. Stay tuned!',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Purchases',
      'If you previously subscribed, your purchase will be restored automatically when in-app purchases are enabled.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + 10 }]}>
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
          <Text style={styles.heroEmoji}>{requiresPro ? '🎉' : '✨'}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {requiresPro ? 'Your Free Trial Has Ended' : 'Unlock Your Full Potential'}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {requiresPro
              ? 'Thanks for using Czarisma! Subscribe to PRO to continue accessing all premium features.'
              : 'Get unlimited access to all premium features and take your charisma journey to the next level'}
          </Text>
        </View>

        {/* Trial Status Banner */}
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

        {/* Plan Card */}
        <View style={styles.plansContainer}>
          <View
            style={[
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.gold,
                borderWidth: 2,
              },
            ]}>
            <View style={[styles.popularBadge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.popularText, { color: '#000000' }]}>BEST VALUE</Text>
            </View>

            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: colors.text }]}>
                {PLAN.name}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={[styles.planPrice, { color: colors.gold }]}>
                  {PLAN.price}
                </Text>
                <Text style={[styles.planInterval, { color: colors.textSecondary }]}>
                  /{PLAN.interval}
                </Text>
              </View>
            </View>

            <View style={styles.featuresContainer}>
              {PLAN.features.map((feature, index) => (
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
          </View>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[
            styles.subscribeButton,
            { backgroundColor: colors.gold },
            loading && styles.subscribeButtonDisabled,
          ]}
          onPress={handleSubscribe}
          disabled={loading}
          activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <>
              <Text style={[styles.subscribeButtonText, { color: '#000000' }]}>
                Subscribe Now — {PLAN.price}/{PLAN.interval}
              </Text>
              <Text style={[styles.subscribeButtonSubtext, { color: '#000000' }]}>
                Cancel anytime
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          activeOpacity={0.7}>
          <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          Cancel anytime. By subscribing, you agree to our Terms of Service and Privacy Policy. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
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
    paddingBottom: 16,
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
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  trialBannerText: {
    fontSize: 15,
    fontWeight: '500',
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
    fontSize: 36,
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
  subscribeButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
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
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
});
