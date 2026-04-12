import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { getLocalTrialStatus, getSignedUpTrialStatus, isUserSignedIn } from '@/utils/subscription-utils';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface TrialInfo {
  daysRemaining: number;
  isExpired: boolean;
  isSignedUp: boolean;
}

export default function SubscriptionsInfoScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrialInfo();
  }, []);

  const loadTrialInfo = async () => {
    try {
      const signedUp = await isUserSignedIn();
      
      if (signedUp) {
        const signedUpTrial = await getSignedUpTrialStatus();
        setTrialInfo({
          daysRemaining: signedUpTrial.daysRemaining || 0,
          isExpired: signedUpTrial.isExpired,
          isSignedUp: true,
        });
      } else {
        const localTrial = await getLocalTrialStatus();
        setTrialInfo({
          daysRemaining: localTrial.daysRemaining || 0,
          isExpired: localTrial.isExpired,
          isSignedUp: false,
        });
      }
    } catch (error) {
      console.error('Error loading trial info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSubscription = () => {
    router.push('/subscription');
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <IconSymbol name="chevron.left" size={24} color={colors.gold} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Subscriptions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statusEmoji]}>📋</Text>
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            Your Subscription Status
          </Text>
          {!loading && trialInfo && (
            <View style={styles.statusDetails}>
              {trialInfo.isSignedUp ? (
                <>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                    Current Plan: <Text style={{ color: colors.gold, fontWeight: 'bold' }}>3-Month Free Trial</Text>
                  </Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>
                    {trialInfo.isExpired 
                      ? 'Your free trial has ended'
                      : `${trialInfo.daysRemaining} days remaining`
                    }
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                    Current Plan: <Text style={{ color: colors.gold, fontWeight: 'bold' }}>7-Day Trial</Text>
                  </Text>
                  <Text style={[styles.statusValue, { color: colors.text }]}>
                    {trialInfo.isExpired 
                      ? 'Your trial has expired - Sign up required'
                      : `${trialInfo.daysRemaining} days remaining`
                    }
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            How It Works
          </Text>

          {/* Step 1 */}
          <View style={styles.timelineItem}>
            <View style={[styles.timelineNumber, { backgroundColor: colors.gold }]}>
              <Text style={styles.timelineNumberText}>1</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, { color: colors.text }]}>
                7-Day Free Trial
              </Text>
              <Text style={[styles.timelineDescription, { color: colors.textSecondary }]}>
                Start using Czar AI immediately with full access to all features for 7 days. No credit card required.
              </Text>
            </View>
          </View>

          {/* Connector */}
          <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />

          {/* Step 2 */}
          <View style={styles.timelineItem}>
            <View style={[styles.timelineNumber, { backgroundColor: colors.gold }]}>
              <Text style={styles.timelineNumberText}>2</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, { color: colors.text }]}>
                Sign Up Free
              </Text>
              <Text style={[styles.timelineDescription, { color: colors.textSecondary }]}>
                After 7 days, create a free account to continue. Signing up gives you instant access plus extends your free period.
              </Text>
            </View>
          </View>

          {/* Connector */}
          <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />

          {/* Step 3 */}
          <View style={styles.timelineItem}>
            <View style={[styles.timelineNumber, { backgroundColor: colors.gold }]}>
              <Text style={styles.timelineNumberText}>3</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, { color: colors.text }]}>
                3 Months Free
              </Text>
              <Text style={[styles.timelineDescription, { color: colors.textSecondary }]}>
                Enjoy 3 additional months of free access to all premium features including unlimited entries, all charisma types, and AI insights.
              </Text>
            </View>
          </View>

          {/* Connector */}
          <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />

          {/* Step 4 */}
          <View style={styles.timelineItem}>
            <View style={[styles.timelineNumber, { backgroundColor: colors.gold }]}>
              <Text style={styles.timelineNumberText}>4</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTitle, { color: colors.text }]}>
                Subscribe to PRO
              </Text>
              <Text style={[styles.timelineDescription, { color: colors.textSecondary }]}>
                After your 3-month free trial, choose a PRO plan to continue enjoying all features. Cancel anytime.
              </Text>
            </View>
          </View>
        </View>

        {/* PRO Plans Section */}
        <View style={styles.plansSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            PRO Subscription Plans
          </Text>

          <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: colors.text }]}>PRO Monthly</Text>
              <Text style={[styles.planPrice, { color: colors.gold }]}>$2.99/month</Text>
            </View>
            <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
              Perfect for getting started. Full access to all premium features.
            </Text>
          </View>

          <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.gold, borderWidth: 2 }]}>
            <View style={[styles.popularBadge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.popularBadgeText, { color: '#000' }]}>MOST POPULAR</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: colors.text }]}>PRO Yearly</Text>
              <View style={styles.priceContainer}>
                <Text style={[styles.planPrice, { color: colors.gold }]}>$28.70/year</Text>
                <Text style={[styles.planSavings, { color: colors.textSecondary }]}>Save 20%</Text>
              </View>
            </View>
            <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
              Best value! Get 12 months for the price of 9.5 months.
            </Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            What You Get with PRO
          </Text>

          {[
            'Unlimited charisma entries',
            'All premium charisma types',
            'Divine, Star Power & more',
            'Advanced AI insights',
            'Export data to CSV',
            'Ad-free experience',
            'Priority support',
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.gold} />
              <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.gold }]}
          onPress={handleGoToSubscription}
          activeOpacity={0.8}>
          <Text style={styles.ctaButtonText}>
            View Subscription Options →
          </Text>
        </TouchableOpacity>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Frequently Asked Questions
          </Text>

          <View style={[styles.faqItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              Can I cancel my subscription?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
              Yes! You can cancel anytime. You'll continue to have access until the end of your billing period.
            </Text>
          </View>

          <View style={[styles.faqItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              What happens after the 7-day trial?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
              You'll need to sign up for a free account to continue. This gives you 3 more months free!
            </Text>
          </View>

          <View style={[styles.faqItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.faqQuestion, { color: colors.text }]}>
              Do I need a credit card for the free trial?
            </Text>
            <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
              No! The 7-day trial and 3-month free period require no payment information.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
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
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
  },
  statusEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statusDetails: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 15,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  timelineSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  timelineNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  timelineNumberText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  timelineDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  timelineConnector: {
    width: 2,
    height: 24,
    marginLeft: 15,
    marginBottom: 8,
  },
  plansSection: {
    marginBottom: 32,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planSavings: {
    fontSize: 13,
  },
  planDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
  },
  ctaButton: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
  },
  ctaButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  faqSection: {
    marginBottom: 16,
  },
  faqItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});
