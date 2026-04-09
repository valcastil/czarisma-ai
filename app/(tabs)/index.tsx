import { CharismaLogo } from '@/components/charisma-logo';
import { CzarCompanion } from '@/components/czar-companion';
import { PasteLinkModal } from '@/components/paste-link-modal';
import { SubscriptionStatusBanner } from '@/components/subscription-status-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CharismaEntry } from '@/constants/theme';
import { useCzarScroll } from '@/hooks/use-czar-scroll';
import { useTheme } from '@/hooks/use-theme';
import { deleteSharedLink, getPlatformColor, getPlatformEmoji, getSharedLinks, refreshMissingTitles, SharedLink } from '@/utils/link-storage';
import { calculateUserStats, updateProfile } from '@/utils/profile-utils';
import { getSubscriptionInfo } from '@/utils/subscription-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const ENTRIES_KEY = '@charisma_entries';
const ONBOARDING_KEY = '@charisma_onboarding';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { czarVisible, onScroll } = useCzarScroll({ scrollThreshold: 5 });
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
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [showPasteLinkModal, setShowPasteLinkModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const pendingScrollToEntries = useRef(false);
  const entriesSectionY = useRef(0);

  const params = useLocalSearchParams<{ openPasteLink?: string; scrollToEntries?: string }>();

  // Open paste link modal when navigated with param
  useEffect(() => {
    if (params.openPasteLink === 'true') {
      setShowPasteLinkModal(true);
    }
  }, [params.openPasteLink]);

  // Flag scroll when navigated with scrollToEntries param
  useEffect(() => {
    if (params.scrollToEntries === 'true') {
      pendingScrollToEntries.current = true;
    }
  }, [params.scrollToEntries]);

  useEffect(() => {
    loadData();
    loadSharedLinks();
  }, []);

  // Refresh data when screen comes into focus (after sign-in)
  useFocusEffect(
    useCallback(() => {
      loadData();
      loadSharedLinks();
    }, [])
  );

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
      loadSharedLinks();
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

  const loadSharedLinks = async () => {
    try {
      const links = await getSharedLinks();
      setSharedLinks(links);

      // Backfill titles for old links that don't have them
      const didUpdate = await refreshMissingTitles();
      if (didUpdate) {
        const refreshed = await getSharedLinks();
        setSharedLinks(refreshed);
      }
    } catch (error) {
      console.error('Error loading shared links:', error);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    Alert.alert(
      'Delete Link',
      'Remove this link?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSharedLink(linkId);
              await loadSharedLinks();
            } catch (error) {
              console.error('Error deleting link:', error);
              Alert.alert('Error', 'Failed to delete link');
            }
          },
        },
      ]
    );
  };

  const handleShareLink = async (link: SharedLink) => {
    try {
      const message = `Check out this ${link.label}: ${link.url}\n\nForwarded from CzarApp`;
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing link:', error);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No app available to open this link');
      }
    } catch {
      Alert.alert('Error', 'Could not open link');
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

Forwarded from CzarApp
      `.trim();

      await Share.share({
        message: message,
      });
    } catch (error) {
      console.error('Error sharing entry:', error);
      Alert.alert('Error', 'Failed to share entry');
    }
  };

  const loadData = async () => {
    try {
      console.log('Home screen: Loading data...');
      
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

      console.log('Home screen: Entries data from AsyncStorage:', entriesData ? 'present' : 'null');
      console.log('Home screen: Entries data length:', entriesData ? JSON.parse(entriesData).length : 0);

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
          <Text style={[styles.title, { color: colors.text }]}>CzarApp</Text>
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

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        onScroll={onScroll}
        scrollEventThrottle={16}>
        {/* Social Links Section */}
        {sharedLinks.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Social Links</Text>
              {entries.length > 0 && (
                <TouchableOpacity
                  onPress={() => scrollViewRef.current?.scrollTo({ y: entriesSectionY.current, animated: true })}
                  style={styles.scrollToTopButton}
                  activeOpacity={0.7}>
                  <IconSymbol size={14} name="arrow.down" color={colors.gold} />
                  <Text style={[styles.scrollToTopText, { color: colors.gold }]}>Entries</Text>
                </TouchableOpacity>
              )}
            </View>
            {sharedLinks.map((link) => {
              const platformColor = getPlatformColor(link.platform);
              const emoji = getPlatformEmoji(link.platform);
              return (
                <View key={link.id} style={[styles.linkCard, { backgroundColor: colors.card }]}>
                  <TouchableOpacity
                    onPress={() => handleOpenLink(link.url)}
                    activeOpacity={0.7}>
                    {/* Thumbnail */}
                    {link.thumbnail ? (
                      <Image
                        source={{ uri: link.thumbnail }}
                        style={styles.linkThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.linkThumbnailPlaceholder, { backgroundColor: platformColor + '15' }]}>
                        <Text style={styles.linkPlaceholderEmoji}>{emoji}</Text>
                      </View>
                    )}
                    {/* Link Info */}
                    <View style={styles.linkInfo}>
                      <View style={[styles.linkPlatformTag, { backgroundColor: platformColor + '20' }]}>
                        <Text style={styles.linkPlatformEmoji}>{emoji}</Text>
                        <Text style={[styles.linkPlatformLabel, { color: platformColor }]}>{link.label}</Text>
                      </View>
                      {link.title && (
                        <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={2}>
                          {link.title}
                        </Text>
                      )}
                      {link.description && (
                        <Text style={[styles.linkDescription, { color: colors.textSecondary }]} numberOfLines={3}>
                          {link.description}
                        </Text>
                      )}
                      <Text style={[styles.linkUrl, { color: colors.textSecondary }]} numberOfLines={1}>
                        {link.url}
                      </Text>
                      <View style={styles.linkFooter}>
                        <Text style={[styles.linkTime, { color: colors.textSecondary }]}>
                          {link.date} {link.time}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {/* Share Button */}
                  <TouchableOpacity
                    style={styles.linkShareButton}
                    onPress={() => handleShareLink(link)}
                    activeOpacity={0.7}>
                    <IconSymbol size={20} name="paperplane.fill" color={colors.gold} />
                  </TouchableOpacity>
                  {/* Action Buttons */}
                  <View style={[styles.linkActions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={styles.linkActionButton}
                      onPress={() => handleShareLink(link)}
                      activeOpacity={0.7}>
                      <IconSymbol size={18} name="square.and.arrow.up" color={colors.gold} />
                      <Text style={[styles.linkActionText, { color: colors.gold }]}>Share</Text>
                    </TouchableOpacity>
                    <View style={[styles.linkActionDivider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity
                      style={styles.linkActionButton}
                      onPress={() => handleDeleteLink(link.id)}
                      activeOpacity={0.7}>
                      <IconSymbol size={18} name="trash" color="#FF3B30" />
                      <Text style={[styles.linkActionText, { color: '#FF3B30' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Charisma Entries Section */}
        <View onLayout={(e) => {
          const y = e.nativeEvent.layout.y;
          entriesSectionY.current = y;
          if (pendingScrollToEntries.current) {
            pendingScrollToEntries.current = false;
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({ y, animated: true });
            }, 100);
          }
        }}>
          {entries.length === 0 && sharedLinks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No charisma entries yet.
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Tap the + button to add your first entry!
              </Text>
            </View>
          ) : (
            entries.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Charisma Entries</Text>
                  {sharedLinks.length > 0 && (
                    <TouchableOpacity
                      onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
                      style={styles.scrollToTopButton}
                      activeOpacity={0.7}>
                      <IconSymbol size={14} name="arrow.up" color={colors.gold} />
                      <Text style={[styles.scrollToTopText, { color: colors.gold }]}>Social Links</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {entries.map((entry) => (
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
                        {entry.emotionEmojis.map((emojiItem, index) => (
                          <Text key={index} style={styles.emotionEmoji}>{emojiItem}</Text>
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
                ))}
              </View>
            )
          )}
        </View>
      </ScrollView>

      {/* Czar AI Companion - Duolingo-style floating mascot */}
      <View style={styles.czarContainer}>
        <CzarCompanion
          size="medium"
          mood="search"
          position="floating"
          message="What are we looking for today?"
          visible={czarVisible}
          autoHideDelay={5}
          appearDelay={3}
          onPress={() => {
            // Czar reacts when tapped - wiggles and talks
          }}
        />
      </View>

      {/* Paste Link Modal */}
      <PasteLinkModal
        visible={showPasteLinkModal}
        onClose={() => setShowPasteLinkModal(false)}
        onLinkAdded={() => {
          loadSharedLinks();
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }, 300);
        }}
      />

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
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scrollToTopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scrollToTopText: {
    fontSize: 12,
    fontWeight: '600',
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
  // Social Link Card Styles
  linkCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  linkThumbnail: {
    width: '100%',
    height: 180,
  },
  linkThumbnailPlaceholder: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkPlaceholderEmoji: {
    fontSize: 36,
  },
  linkInfo: {
    padding: 12,
    gap: 6,
  },
  linkPlatformTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  linkPlatformEmoji: {
    fontSize: 12,
  },
  linkPlatformLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 4,
    paddingRight: 30,
  },
  linkDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    paddingRight: 30,
  },
  linkUrl: {
    fontSize: 12,
    lineHeight: 16,
  },
  linkFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  linkTime: {
    fontSize: 11,
  },
  linkActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 8,
  },
  linkActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  linkActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  linkActionDivider: {
    width: 1,
    height: '100%',
  },
  // Charisma Entry Card Styles
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
  czarContainer: {
    position: 'absolute',
    top: 120,
    right: 20,
    zIndex: 100,
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
  linkShareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
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
