import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getSubscriptionInfo } from '@/utils/subscription-utils';

export function SubscriptionStatusBanner() {
  const router = useRouter();
  const { colors } = useTheme();
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    isPro: boolean;
    isTrialActive: boolean;
    daysRemaining: number | null;
    statusMessage: string;
    userEmail: string | null;
  } | null>(null);

  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  const loadSubscriptionInfo = async () => {
    try {
      const info = await getSubscriptionInfo();
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Error loading subscription info:', error);
    }
  };

  if (!subscriptionInfo) {
    return null;
  }

  // Don't show banner for active Pro users
  if (subscriptionInfo.isPro) {
    return null;
  }

  // Don't show banner if no trial is active
  if (!subscriptionInfo.isTrialActive) {
    return null;
  }

  const handlePress = () => {
    if (subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining <= 3) {
      Alert.alert(
        'Trial Ending Soon',
        `Your free trial ends in ${subscriptionInfo.daysRemaining} day${subscriptionInfo.daysRemaining === 1 ? '' : 's'}. Upgrade now to continue enjoying all Pro features!`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => router.push('/subscription') },
        ]
      );
    } else {
      router.push('/subscription');
    }
  };

  const getUrgencyColor = () => {
    if (subscriptionInfo.daysRemaining !== null) {
      if (subscriptionInfo.daysRemaining <= 1) return '#FF3B30'; // Hardcoded red since theme doesn't have error color
      if (subscriptionInfo.daysRemaining <= 3) return colors.gold;
      if (subscriptionInfo.daysRemaining <= 7) return colors.text;
    }
    return colors.textSecondary;
  };

  const getBannerMessage = () => {
    if (subscriptionInfo.daysRemaining !== null) {
      if (subscriptionInfo.daysRemaining <= 1) {
        return '⚠️ Trial ends tomorrow! Upgrade now to keep Pro features.';
      }
      if (subscriptionInfo.daysRemaining <= 3) {
        return `⏰ Only ${subscriptionInfo.daysRemaining} days left in trial. Upgrade soon!`;
      }
      if (subscriptionInfo.daysRemaining <= 7) {
        return `${subscriptionInfo.daysRemaining} days left in free trial`;
      }
      return `${subscriptionInfo.daysRemaining} days left in trial`;
    }
    return 'Free trial active';
  };

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        {
          backgroundColor: subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining <= 3 
            ? `${colors.gold}20` 
            : colors.card,
          borderColor: getUrgencyColor(),
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}>
      <View style={styles.content}>
        <IconSymbol
          name={subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining <= 3 ? 'exclamationmark.triangle.fill' : 'clock.fill'}
          size={16}
          color={getUrgencyColor()}
        />
        <Text
          style={[
            styles.message,
            { color: getUrgencyColor() },
          ]}>
          {getBannerMessage()}
        </Text>
        <IconSymbol
          name="chevron.right"
          size={14}
          color={getUrgencyColor()}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
});
