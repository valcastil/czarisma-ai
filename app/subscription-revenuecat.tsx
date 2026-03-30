import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import {
    checkProSubscription,
    getCustomerInfo,
    getOfferings,
    getPackageDuration,
    getPackagePrice,
    getSubscriptionStatus,
    identifyRevenueCatUser,
    initializeRevenueCat,
    isCustomerCenterAvailable,
    purchasePackage,
    restorePurchases,
    showCustomerCenter,
    showPaywall,
} from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SubscriptionRevenueCatScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [showCustomerCenterButton, setShowCustomerCenterButton] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    initializeSubscription();
  }, []);

  const syncRevenueCatStatusToDb = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const customerInfo = await getCustomerInfo();
      if (!customerInfo) return;

      const entitlement = customerInfo.entitlements.active?.pro;

      let status: 'active' | 'trialing' | 'inactive' | 'expired' | 'cancelled' | 'paused' | 'grace_period' = 'inactive';
      let store: 'app_store' | 'play_store' | 'stripe' | 'promotional' | null = null;

      if (entitlement) {
        status = entitlement.periodType === 'TRIAL' ? 'trialing' : 'active';
        if (entitlement.store === 'APP_STORE') store = 'app_store';
        if (entitlement.store === 'PLAY_STORE') store = 'play_store';
      }

      await supabase.from('subscriptions').upsert({
        user_id: session.user.id,
        revenuecat_customer_id: customerInfo.originalAppUserId,
        entitlement_id: 'pro',
        product_identifier: entitlement?.productIdentifier ?? null,
        status,
        store,
        is_sandbox: entitlement?.isSandbox ?? false,
        original_purchase_date: entitlement?.originalPurchaseDate ?? null,
        latest_purchase_date: entitlement?.latestPurchaseDate ?? null,
        current_period_start: entitlement?.latestPurchaseDate ?? null,
        current_period_end: entitlement?.expirationDate ?? null,
        expiration_date: entitlement?.expirationDate ?? null,
        will_renew: entitlement?.willRenew ?? false,
        unsubscribe_detected_at: entitlement?.unsubscribeDetectedAt ?? null,
        billing_issue_detected_at: entitlement?.billingIssueDetectedAt ?? null,
      });
    } catch (error) {
      console.error('Error syncing RevenueCat subscription to database:', error);
    }
  };

  const initializeSubscription = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      // Initialize RevenueCat
      await initializeRevenueCat(userId);

      // Identify user if logged in
      if (userId) {
        await identifyRevenueCatUser(userId);
      }

      // Check subscription status
      await checkSubscriptionStatus();

      // Keep DB in sync so app gating can rely on subscriptions table
      await syncRevenueCatStatusToDb();

      // Load offerings
      await loadOfferings();
    } catch (error) {
      console.error('Error initializing subscription:', error);
      Alert.alert('Error', 'Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const isProUser = await checkProSubscription('pro');
      setIsPro(isProUser);

      const status = await getSubscriptionStatus('pro');
      setSubscriptionStatus(status);

      const customerCenterAvailable = await isCustomerCenterAvailable();
      setShowCustomerCenterButton(customerCenterAvailable);

      await syncRevenueCatStatusToDb();
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const loadOfferings = async () => {
    try {
      const offering = await getOfferings();
      if (offering) {
        setPackages(offering.availablePackages);
        // Auto-select yearly package if available
        const yearlyPackage = offering.availablePackages.find((pkg: any) =>
          pkg.identifier.toLowerCase().includes('annual') || 
          pkg.identifier.toLowerCase().includes('yearly')
        );
        setSelectedPackage(yearlyPackage || offering.availablePackages[0] || null);
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    }
  };

  const handleShowPaywall = async () => {
    try {
      const result = await showPaywall({
        onPurchaseCompleted: async (customerInfo) => {
          console.log('Purchase completed:', customerInfo);
          await checkSubscriptionStatus();
          await syncRevenueCatStatusToDb();
          Alert.alert(
            'Welcome to Pro! 🎉',
            'You now have access to all premium features.',
            [
              {
                text: 'Get Started',
                onPress: () => router.replace('/(tabs)'),
              },
            ]
          );
        },
        onPurchaseError: (error) => {
          console.error('Purchase error:', error);
          if (!error.userCancelled) {
            Alert.alert('Purchase Failed', error.message || 'Please try again');
          }
        },
      });

      if (result.success) {
        console.log('Paywall completed successfully');
      }
    } catch (error) {
      console.error('Error showing paywall:', error);
      Alert.alert('Error', 'Failed to show subscription options');
    }
  };

  const handleManageSubscription = async () => {
    try {
      await showCustomerCenter();
    } catch (error) {
      console.error('Error showing customer center:', error);
      Alert.alert('Error', 'Failed to open subscription management');
    }
  };

  const handlePurchasePackage = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    try {
      setPurchasing(true);

      const result = await purchasePackage(selectedPackage);

      if (result.success) {
        await checkSubscriptionStatus();
        await syncRevenueCatStatusToDb();
        Alert.alert(
          'Welcome to Pro! 🎉',
          'You now have access to all premium features.',
          [
            {
              text: 'Get Started',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else if (!result.userCancelled) {
        Alert.alert('Purchase Failed', result.error || 'Please try again');
      }
    } catch (error: any) {
      console.error('Error purchasing package:', error);
      Alert.alert('Error', error.message || 'Failed to complete purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      const result = await restorePurchases();

      if (result.success) {
        await checkSubscriptionStatus();
        await syncRevenueCatStatusToDb();
        Alert.alert('Success', 'Your purchases have been restored');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account');
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading subscription options...
          </Text>
        </View>
      </View>
    );
  }

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
          style={styles.backButton}>
          <IconSymbol size={24} name="chevron.left" color={router.canGoBack() ? colors.text : 'transparent'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isPro ? 'Manage Subscription' : 'Upgrade to Pro'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        {isPro && subscriptionStatus && (
          <View style={[styles.statusCard, { backgroundColor: colors.card }]}>
            <View style={styles.statusHeader}>
              <IconSymbol size={32} name="checkmark.seal.fill" color={colors.gold} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                Pro Member
              </Text>
            </View>
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              Status: {subscriptionStatus.status}
            </Text>
            {subscriptionStatus.expirationDate && (
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {subscriptionStatus.willRenew ? 'Renews' : 'Expires'} on:{' '}
                {new Date(subscriptionStatus.expirationDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Pro Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            ✨ Pro Features
          </Text>
          {[
            { icon: 'star.fill' as const, text: 'Unlock all premium charisma types' },
            { icon: 'chart.bar.fill' as const, text: 'Advanced analytics & insights' },
            { icon: 'arrow.down.doc.fill' as const, text: 'Export data to CSV' },
            { icon: 'sparkles' as const, text: 'Ad-free experience' },
            { icon: 'bolt.fill' as const, text: 'Early access to new features' },
            { icon: 'crown.fill' as const, text: 'Premium badge & support' },
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <IconSymbol size={20} name={feature.icon} color={colors.gold} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Subscription Options */}
        {!isPro && packages.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Choose Your Plan
            </Text>
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const isYearly = pkg.identifier.toLowerCase().includes('annual') || 
                              pkg.identifier.toLowerCase().includes('yearly');
              
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.packageCard,
                    { 
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.gold : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setSelectedPackage(pkg)}
                >
                  {isYearly && (
                    <View style={[styles.popularBadge, { backgroundColor: colors.gold }]}>
                      <Text style={styles.popularText}>MOST POPULAR</Text>
                    </View>
                  )}
                  <View style={styles.packageHeader}>
                    <Text style={[styles.packageTitle, { color: colors.text }]}>
                      {pkg.product.title}
                    </Text>
                    <Text style={[styles.packagePrice, { color: colors.gold }]}>
                      {getPackagePrice(pkg)}
                    </Text>
                  </View>
                  <Text style={[styles.packageDuration, { color: colors.textSecondary }]}>
                    {getPackageDuration(pkg)}
                  </Text>
                  {isYearly && (
                    <Text style={[styles.savingsText, { color: colors.gold }]}>
                      Save 20% compared to monthly
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isPro ? (
            <>
              {showCustomerCenterButton && (
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.gold }]}
                  onPress={handleManageSubscription}
                >
                  <Text style={styles.buttonText}>Manage Subscription</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => router.replace('/(tabs)')}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Continue to App
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Use Native Paywall */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.gold }]}
                onPress={handleShowPaywall}
              >
                <Text style={styles.buttonText}>Show Subscription Options</Text>
              </TouchableOpacity>

              {/* Or Manual Purchase */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.gold, opacity: purchasing ? 0.6 : 1 }]}
                onPress={handlePurchasePackage}
                disabled={purchasing || !selectedPackage}
              >
                {purchasing ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.buttonText}>
                    Subscribe Now
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleRestorePurchases}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Restore Purchases
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Terms */}
        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          Subscriptions auto-renew unless cancelled. Cancel anytime in your device settings.
          By subscribing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 14,
  },
  section: {
    marginTop: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
  },
  packageCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
  },
  packageDuration: {
    fontSize: 14,
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 32,
    gap: 12,
  },
  button: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
    marginBottom: 40,
  },
});
