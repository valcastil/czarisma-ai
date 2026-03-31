import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { checkProSubscription, showPaywall } from '@/lib/revenuecat';
import { hasAccess } from '@/utils/subscription-utils';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SubscriptionGateProps {
  children: React.ReactNode;
  featureName?: string;
  showPaywallOnBlock?: boolean;
  customMessage?: string;
}

/**
 * SubscriptionGate Component
 * 
 * Wraps content that requires a Pro subscription.
 * Shows upgrade prompt if user is not subscribed.
 * If FREE_MODE: signed-up users pass, non-signed-up users pass during trial.
 * 
 * @example
 * <SubscriptionGate featureName="Advanced Analytics">
 *   <AdvancedAnalyticsScreen />
 * </SubscriptionGate>
 */
// FREE MODE: Uses auth + local trial check instead of RevenueCat
const FREE_MODE = true;

export function SubscriptionGate({
  children,
  featureName = 'Premium Feature',
  showPaywallOnBlock = false,
  customMessage,
}: SubscriptionGateProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (FREE_MODE) {
      checkFreeAccess();
    } else {
      checkSubscription();
    }
  }, []);

  const checkFreeAccess = async () => {
    try {
      const access = await hasAccess();
      setIsPro(access);
    } catch (error) {
      console.error('Error checking free access:', error);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const isProUser = await checkProSubscription('pro');
      setIsPro(isProUser);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (showPaywallOnBlock) {
      // Show native paywall
      await showPaywall({
        onPurchaseCompleted: () => {
          checkSubscription();
        },
      });
    } else {
      // Navigate to subscription screen
      router.push('/subscription' as any);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!isPro) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.lockCard, { backgroundColor: colors.card }]}>
          <IconSymbol size={64} name="lock.fill" color={colors.gold} />
          
          <Text style={[styles.title, { color: colors.text }]}>
            {featureName}
          </Text>
          
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {customMessage || `This ${featureName.toLowerCase()} is available for Pro members only.`}
          </Text>
          
          <View style={styles.features}>
            <View style={styles.featureRow}>
              <IconSymbol size={16} name="checkmark.circle.fill" color={colors.gold} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Unlock all premium features
              </Text>
            </View>
            <View style={styles.featureRow}>
              <IconSymbol size={16} name="checkmark.circle.fill" color={colors.gold} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Advanced analytics & insights
              </Text>
            </View>
            <View style={styles.featureRow}>
              <IconSymbol size={16} name="checkmark.circle.fill" color={colors.gold} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Ad-free experience
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.upgradeButton, { backgroundColor: colors.gold }]}
            onPress={handleUpgrade}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockCard: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    width: '100%',
    gap: 12,
    marginVertical: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  upgradeButton: {
    width: '100%',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
