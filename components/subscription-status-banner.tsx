import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { getSubscriptionInfo } from '@/utils/subscription-utils';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface SubscriptionStatusBannerProps {
  info?: {
    isPro: boolean;
    isTrialActive: boolean;
    daysRemaining: number | null;
    statusMessage: string;
    userEmail: string | null;
  } | null;
}

export function SubscriptionStatusBanner({ info: externalInfo }: SubscriptionStatusBannerProps = {}) {
  const router = useRouter();
  const { colors } = useTheme();
  const [localInfo, setLocalInfo] = useState<{
    isPro: boolean;
    isTrialActive: boolean;
    daysRemaining: number | null;
    statusMessage: string;
    userEmail: string | null;
  } | null>(null);

  // Only fetch if parent didn't provide info
  useEffect(() => {
    if (!externalInfo) {
      loadSubscriptionInfo();
    }
  }, [externalInfo]);

  const loadSubscriptionInfo = async () => {
    try {
      const info = await getSubscriptionInfo();
      setLocalInfo(info);
    } catch (error) {
      console.error('Error loading subscription info:', error);
    }
  };

  const subscriptionInfo = externalInfo ?? localInfo;

  if (!subscriptionInfo) {
    return null;
  }

  // Don't show banner for signed-in users with free access (no trial message needed)
  if (subscriptionInfo.isPro && !subscriptionInfo.isTrialActive) {
    return null;
  }

  const handlePress = () => {
    if (subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining <= 3) {
      Alert.alert(
        'Trial Ending Soon',
        `Your free trial ends in ${subscriptionInfo.daysRemaining} day${subscriptionInfo.daysRemaining === 1 ? '' : 's'}. Sign up now to keep free access to all features!`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Sign Up Free', onPress: () => router.push('/auth-sign-in') },
        ]
      );
    } else {
      router.push('/auth-sign-in');
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
    if (!subscriptionInfo.isPro && subscriptionInfo.daysRemaining === 0) {
      return '⚠️ Trial expired! Sign up free to continue.';
    }
    if (subscriptionInfo.daysRemaining !== null) {
      if (subscriptionInfo.daysRemaining <= 1) {
        return '⚠️ Trial ends tomorrow! Sign up free to keep access.';
      }
      if (subscriptionInfo.daysRemaining <= 3) {
        return `⏰ Only ${subscriptionInfo.daysRemaining} days left. Sign up free!`;
      }
      if (subscriptionInfo.daysRemaining <= 7) {
        return `${subscriptionInfo.daysRemaining} days left — Sign up for free access`;
      }
      return `${subscriptionInfo.daysRemaining} days left in trial — Sign up free`;
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
