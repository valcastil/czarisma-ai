import { CharismaLogo } from '@/components/charisma-logo';
import { SubscriptionStatusBanner } from '@/components/subscription-status-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calculateUserStats, updateProfile } from '@/utils/profile-utils';
import { getSubscriptionInfo } from '@/utils/subscription-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const ENTRIES_KEY = '@charisma_entries';
const ONBOARDING_KEY = '@charisma_onboarding';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [entries, setEntries] = useState<CharismaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    isPro: boolean;
    isTrialActive: boolean;
    daysRemaining: number | null;
    statusMessage: string;
    userEmail: string | null;
  } | null>(null);
  // Shared links feature - temporarily disabled until rebuild
  // const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  // const [selectedLink, setSelectedLink] = useState<SharedLink | null>(null);
  // const [showLinkDetail, setShowLinkDetail] = useState(false);

  useEffect(() => {
    loadData();
    // loadSharedLinks(); // Disabled until rebuild
  }, []);

  // Load subscription info
  useEffect(() => {
    loadSubscriptionInfo();
  }, []);

  // Handle onboarding navigation in useEffect instead of during render
  useEffect(() => {
    if (!loading && !onboardingComplete) {
      router.replace('/modal');
    }
  }, [loading, onboardingComplete]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadSubscriptionInfo();
      // loadSharedLinks(); // Disabled until rebuild
    }, [])
  );

  const loadSubscriptionInfo = async () => {
    try {
      const info = await getSubscriptionInfo();
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Error loading subscription info:', error);
    }
  };

  // Shared links feature - disabled until rebuild
  // const loadSharedLinks = async () => {
  //   try {
  //     const links = await LinkStorageService.getSharedLinks('unread');
  //     setSharedLinks(links);
  //   } catch (error) {
  //     console.error('Error loading shared links:', error);
  //   }
  // };

  const loadData = async () => {
    try {
      // Initialize trial if needed for new users - with error handling
      try {
        const { initializeTrialIfNeeded } = await import('@/utils/subscription-utils');
        await initializeTrialIfNeeded();
      } catch (trialError) {
        console.error('Error initializing trial:', trialError);
        // Don't let trial initialization crash the app
      }

      const [entriesData, onboardingData] = await Promise.all([
        AsyncStorage.getItem(ENTRIES_KEY).catch(() => null),
        AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null),
      ]);

      let parsedEntries: CharismaEntry[] = [];
      if (entriesData) {
        try {
          parsedEntries = JSON.parse(entriesData);
        } catch (parseError) {
          console.error('Error parsing entries:', parseError);
          parsedEntries = [];
        }
        setEntries(parsedEntries);
      }
      if (onboardingData) {
        try {
          const onboarding = JSON.parse(onboardingData);
          setOnboardingComplete(onboarding.completed);
        } catch (parseError) {
          console.error('Error parsing onboarding data:', parseError);
        }
      }

      // Update profile with latest stats - with error handling
      if (parsedEntries.length > 0) {
        try {
          const userStats = await calculateUserStats(parsedEntries);
          await updateProfile({
            totalEntries: userStats.totalEntries,
            streak: userStats.currentStreak,
            topCharisma: userStats.topCharisma.type,
          });
        } catch (profileError) {
          console.error('Error updating profile:', profileError);
          // Don't let profile update crash the app
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      // Set default values to prevent crashes
      setEntries([]);
      setOnboardingComplete(false);
    } finally {
      setLoading(false);
    }
  };

  const handleShareEntry = async (entry: CharismaEntry, event: any) => {
    event.stopPropagation();
    try {
      const emotions = entry.emotionEmojis?.join(' ') || '';
      const message = `
🌟 Charisma Entry - ${entry.date}

${entry.charismaEmoji || ''} ${entry.majorCharisma}
${entry.subCharisma ? `Sub: ${entry.subCharisma}` : ''}

${emotions ? `Emotions: ${emotions}` : ''}

${entry.notes ? `Notes: ${entry.notes}` : ''}
      `.trim();

      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error('Error sharing entry:', error);
      Alert.alert('Error', 'Failed to share entry');
    }
  };

  // Shared links handlers - disabled until rebuild
  // const handleLinkPress = (link: SharedLink) => {
  //   setSelectedLink(link);
  //   setShowLinkDetail(true);
  // };

  // const handleLinkDelete = async (linkId: string) => {
  //   try {
  //     await LinkStorageService.deleteLink(linkId);
  //     await loadSharedLinks();
  //     Alert.alert('Success', 'Link deleted');
  //   } catch (error) {
  //     console.error('Error deleting link:', error);
  //     Alert.alert('Error', 'Failed to delete link');
  //   }
  // };

  // const handleLinkDetailDelete = async () => {
  //   if (!selectedLink) return;
  //   
  //   try {
  //     await LinkStorageService.deleteLink(selectedLink.id);
  //     setShowLinkDetail(false);
  //     setSelectedLink(null);
  //     await loadSharedLinks();
  //     Alert.alert('Success', 'Link deleted');
  //   } catch (error) {
  //     console.error('Error deleting link:', error);
  //     Alert.alert('Error', 'Failed to delete link');
  //   }
  // };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  // Don't render anything if onboarding is not complete (navigation handled in useEffect)
  if (!onboardingComplete) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <CharismaLogo size={50} />
          <Text style={[styles.title, { color: colors.text }]}>Charisma Chat</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.subscriptionBadge,
            {
              backgroundColor: colors.gold,
              borderColor: colors.gold,
            },
          ]}
          onPress={() => router.push('/ai-chat')}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.subscriptionText,
              {
                color: '#000000',
                fontWeight: '700',
              },
            ]}>
            Talk to AI
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subscription Status Banner */}
      <SubscriptionStatusBanner />

      {/* Shared Links Queue - Disabled until rebuild */}
      {/* <LinkQueue
        links={sharedLinks}
        onLinkPress={handleLinkPress}
        onLinkDelete={handleLinkDelete}
      /> */}

      {/* Entries List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No charisma entries yet.
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Tap the + button to add your first entry!
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={[styles.entryCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/entry/${entry.id}`)}>
              {/* Header with Date and Time */}
              <View style={styles.entryHeader}>
                <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                  {entry.date}
                </Text>
                {entry.time && (
                  <Text style={[styles.entryTime, { color: colors.textSecondary }]}>
                    {entry.time}
                  </Text>
                )}
              </View>

              {/* Charisma Section with Large Emoji */}
              <View style={styles.charismaSection}>
                {entry.charismaEmoji && (
                  <Text style={styles.charismaEmoji}>{entry.charismaEmoji}</Text>
                )}
                <View style={styles.charismaTextContainer}>
                  <Text style={[styles.entryTitle, { color: colors.text }]}>
                    {entry.majorCharisma}
                  </Text>
                  {entry.subCharisma && (
                    <Text style={[styles.entrySubtitle, { color: colors.textSecondary }]}>
                      {entry.subCharisma}
                    </Text>
                  )}
                </View>
              </View>

              {/* Emotion Emojis */}
              {entry.emotionEmojis && entry.emotionEmojis.length > 0 && (
                <View style={styles.emotionsContainer}>
                  {entry.emotionEmojis.map((emoji, index) => (
                    <Text key={index} style={styles.emotionEmoji}>
                      {emoji}
                    </Text>
                  ))}
                </View>
              )}

              {/* Notes */}
              {entry.notes && (
                <Text
                  style={[styles.entryNotes, { color: colors.textSecondary }]}>
                  {entry.notes}
                </Text>
              )}

              {/* Share Button */}
              <TouchableOpacity
                style={styles.shareButton}
                onPress={(e) => handleShareEntry(entry, e)}
                activeOpacity={0.7}>
                <IconSymbol size={20} name="paperplane.fill" color={colors.gold} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Link Detail Modal - Disabled until rebuild */}
      {/* <LinkDetailModal
        visible={showLinkDetail}
        link={selectedLink}
        onClose={() => setShowLinkDetail(false)}
        onDelete={handleLinkDetailDelete}
      /> */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  subscriptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  entryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 12,
  },
  entryTime: {
    fontSize: 12,
  },
  charismaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  charismaEmoji: {
    fontSize: 48,
  },
  charismaTextContainer: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  entrySubtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  emotionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  emotionEmoji: {
    fontSize: 24,
  },
  entryNotes: {
    fontSize: 14,
    lineHeight: 22,
    paddingRight: 50,
    marginBottom: 8,
  },
  shareButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
