import { CharismaLogo, CharismaLogoRef } from '@/components/charisma-logo';
import { PasteLinkModal } from '@/components/paste-link-modal';
import { SocialPlayerModal } from '@/components/social-player/social-player-modal';
import { SubscriptionStatusBanner } from '@/components/subscription-status-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteSharedLink, getPlatformColor, getPlatformEmoji, getSharedLinks, refreshMissingTitles, SharedLink } from '@/utils/link-storage';
import { calculateUserStats, getProfile, updateProfile } from '@/utils/profile-utils';
import { getSubscriptionInfo } from '@/utils/subscription-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
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
  const navigation = useNavigation();
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
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [showPasteLinkModal, setShowPasteLinkModal] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [videoLinks, setVideoLinks] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const pendingScrollToEntries = useRef(false);
  const logoRef = useRef<CharismaLogoRef>(null);
  const didBackfillRef = useRef(false);
  const lastLoadRef = useRef(0);
  const prevEntryCountRef = useRef(-1);

  const params = useLocalSearchParams<{ openPasteLink?: string; scrollToEntries?: string }>();

  // Open paste link modal when navigated with param (uses timestamp for uniqueness)
  useEffect(() => {
    if (params.openPasteLink) {
      setShowPasteLinkModal(true);
    }
  }, [params.openPasteLink]);

  // Flag scroll when navigated with scrollToEntries param (after adding entry)
  useEffect(() => {
    if (params.scrollToEntries === 'true') {
      pendingScrollToEntries.current = true;
    }
  }, [params.scrollToEntries]);

  // Load user's social video links - reloads every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadVideoLinks = async () => {
        try {
          console.log('Home: Loading video links...');
          const profile = await getProfile();
          console.log('Home: Profile loaded:', profile?.socialLinks);
          
          if (profile?.socialLinks) {
            const videoPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook'];
            
            const links = Object.entries(profile.socialLinks)
              .filter(([key, value]) => {
                const isVideoPlatform = videoPlatforms.includes(key);
                const hasValue = value && value.trim().length > 0;
                console.log(`Home: Checking ${key}:`, { isVideoPlatform, hasValue, value });
                return isVideoPlatform && hasValue;
              })
              .map(([key, value]) => {
                if (!value) return null;
                let url = value.trim();
                // Build full URL if needed
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                  const prefixes: Record<string, string> = {
                    youtube: 'https://youtube.com/',
                    tiktok: 'https://tiktok.com/@',
                    instagram: 'https://instagram.com/',
                    facebook: 'https://facebook.com/',
                  };
                  const prefix = prefixes[key];
                  if (prefix) {
                    url = prefix + url.replace(/^@/, '');
                  }
                }
                return url;
              })
              .filter((url): url is string => url !== null);
            
            console.log('Home: Final video links:', links);
            setVideoLinks(links);
          } else {
            console.log('Home: No social links found');
            setVideoLinks([]);
          }
        } catch (error) {
          console.error('Home: Error loading video links:', error);
        }
      };
      
      loadVideoLinks();
    }, [])
  );

  // Single data loading point — useFocusEffect fires on mount AND every tab focus
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isFirstLoad = lastLoadRef.current === 0;
      const isStale = now - lastLoadRef.current > 30000; // 30s staleness

      if (isFirstLoad || isStale) {
        lastLoadRef.current = now;
        loadData();
        loadSharedLinks(isFirstLoad); // backfill only on first mount
        loadSubscriptionInfo();
      }

      // Flip logo
      setTimeout(() => {
        logoRef.current?.flip();
      }, isFirstLoad ? 300 : 100);

      // Listen for home-reselected event (user tapped Home while already on Home)
      const subscription = DeviceEventEmitter.addListener('home-reselected', () => {
        logoRef.current?.flip();
      });

      return () => {
        subscription.remove();
      };
    }, [])
  );

  // Handle onboarding navigation in useEffect instead of during render
  useEffect(() => {
    if (!loading && !onboardingComplete) {
      router.replace('/modal');
    }
  }, [loading, onboardingComplete]);

  const loadSubscriptionInfo = async () => {
    try {
      const info = await getSubscriptionInfo();
      setSubscriptionInfo(info);
    } catch (error) {
      console.error('Error loading subscription info:', error);
    }
  };

  const loadSharedLinks = async (runBackfill = false) => {
    try {
      const links = await getSharedLinks();
      setSharedLinks(links);

      // Backfill titles/thumbnails only once per session
      if (runBackfill && !didBackfillRef.current) {
        didBackfillRef.current = true;
        const didUpdate = await refreshMissingTitles();
        if (didUpdate) {
          const refreshed = await getSharedLinks();
          setSharedLinks(refreshed);
        }
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
      const message = `Check out this ${link.label}: ${link.url}\n\nForwarded from Czar AI`;
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

Forwarded from Czar AI
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

      // Only sync profile stats when entry count actually changed
      if (parsedEntries.length > 0 && parsedEntries.length !== prevEntryCountRef.current) {
        prevEntryCountRef.current = parsedEntries.length;
        try {
          const userStats = await calculateUserStats(parsedEntries);
          await updateProfile({
            totalEntries: userStats.totalEntries,
            streak: userStats.currentStreak,
            topCharisma: userStats.topCharisma.type,
          });
        } catch (profileError) {
          console.error('Error updating profile:', profileError);
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
          <CharismaLogo ref={logoRef} size={50} />
          <Text style={[styles.title, { color: colors.text }]}>Czar AI</Text>
        </View>

        {/* Yellow Play Button - shown when user has video links */}
        {videoLinks.length >= 2 && (
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.gold }]}
            onPress={() => setShowPlayer(true)}
            activeOpacity={0.8}
          >
            <IconSymbol size={22} name="play.fill" color="#000" />
            <Text style={styles.playButtonText}>{videoLinks.length}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => setShowHamburgerMenu(true)}
          activeOpacity={0.7}>
          <IconSymbol size={26} name="line.3.horizontal" color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Subscription Status Banner */}
      <SubscriptionStatusBanner info={subscriptionInfo} />

      {/* Main Content — FlatList for virtualized rendering */}
      <HomeList
        ref={flatListRef}
        sharedLinks={sharedLinks}
        entries={entries}
        colors={colors}
        router={router}
        onOpenLink={handleOpenLink}
        onShareLink={handleShareLink}
        onDeleteLink={handleDeleteLink}
        onShareEntry={handleShareEntry}
        pendingScrollToEntries={pendingScrollToEntries}
      />

      {/* Paste Link Modal */}
      <PasteLinkModal
        visible={showPasteLinkModal}
        onClose={() => setShowPasteLinkModal(false)}
        onLinkAdded={() => {
          loadSharedLinks();
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 300);
        }}
      />

      {/* Social Player Modal */}
      <SocialPlayerModal
        visible={showPlayer}
        onClose={() => setShowPlayer(false)}
        urls={videoLinks}
        title="My Social Videos"
      />

      {/* Hamburger Menu */}
      <Modal
        visible={showHamburgerMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHamburgerMenu(false)}>
        <TouchableOpacity
          style={[styles.menuBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={() => setShowHamburgerMenu(false)}>
          <View style={[styles.menuSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.menuTitle, { color: colors.text }]}>Menu</Text>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowHamburgerMenu(false);
                router.push('/czareels' as any);
              }}>
              <Text style={styles.menuIcon}>🎬</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Czareels</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowHamburgerMenu(false);
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
              }}>
              <Text style={styles.menuIcon}>🔗</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Social Links</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowHamburgerMenu(false);
                pendingScrollToEntries.current = true;
                flatListRef.current?.scrollToEnd({ animated: true });
              }}>
              <Text style={styles.menuIcon}>📝</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Czarisma Entries</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowHamburgerMenu(false);
                try {
                  if (navigation && navigation.navigate) {
                    navigation.navigate('ai-chat' as never);
                  } else {
                    router.navigate('/ai-chat');
                  }
                } catch {
                  router.push('/ai-chat');
                }
              }}>
              <Text style={styles.menuIcon}>🤖</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Talk to AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuCancel, { backgroundColor: colors.border }]}
              onPress={() => setShowHamburgerMenu(false)}>
              <Text style={[styles.menuCancelText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

// ------- Virtualized Home List -------
type ListItem =
  | { type: 'link-header'; id: string; hasEntries: boolean }
  | { type: 'link'; id: string; data: SharedLink }
  | { type: 'entries-header'; id: string; hasLinks: boolean }
  | { type: 'entry'; id: string; data: CharismaEntry }
  | { type: 'empty'; id: string };

interface HomeListProps {
  sharedLinks: SharedLink[];
  entries: CharismaEntry[];
  colors: any;
  router: any;
  onOpenLink: (url: string) => void;
  onShareLink: (link: SharedLink) => void;
  onDeleteLink: (id: string) => void;
  onShareEntry: (entry: CharismaEntry, e: any) => void;
  pendingScrollToEntries: React.MutableRefObject<boolean>;
}

const HomeList = React.forwardRef<FlatList, HomeListProps>(({
  sharedLinks, entries, colors, router,
  onOpenLink, onShareLink, onDeleteLink, onShareEntry,
  pendingScrollToEntries,
}, ref) => {
  // Build unified flat data array
  const data = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    if (sharedLinks.length > 0) {
      items.push({ type: 'link-header', id: '_lh', hasEntries: entries.length > 0 });
      sharedLinks.forEach(l => items.push({ type: 'link', id: l.id, data: l }));
    }
    if (entries.length > 0) {
      items.push({ type: 'entries-header', id: '_eh', hasLinks: sharedLinks.length > 0 });
      entries.forEach(e => items.push({ type: 'entry', id: e.id, data: e }));
    }
    if (sharedLinks.length === 0 && entries.length === 0) {
      items.push({ type: 'empty', id: '_empty' });
    }
    return items;
  }, [sharedLinks, entries]);

  // Index of entries header for scroll-to
  const entriesHeaderIndex = useMemo(() => data.findIndex(i => i.type === 'entries-header'), [data]);

  const scrollToEntries = useCallback(() => {
    if (entriesHeaderIndex >= 0 && ref && 'current' in ref && ref.current) {
      ref.current.scrollToIndex({ index: entriesHeaderIndex, animated: true });
    }
  }, [entriesHeaderIndex, ref]);

  const scrollToTop = useCallback(() => {
    if (ref && 'current' in ref && ref.current) {
      ref.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [ref]);

  // Handle pending scroll after data loads
  useEffect(() => {
    if (pendingScrollToEntries.current && entriesHeaderIndex >= 0) {
      pendingScrollToEntries.current = false;
      setTimeout(scrollToEntries, 150);
    }
  }, [data]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'link-header':
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Social Links</Text>
              {item.hasEntries && (
                <TouchableOpacity onPress={scrollToEntries} style={styles.scrollToTopButton} activeOpacity={0.7}>
                  <IconSymbol size={14} name="arrow.down" color={colors.gold} />
                  <Text style={[styles.scrollToTopText, { color: colors.gold }]}>Charisma Entries</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 'link': {
        const link = item.data;
        const platformColor = getPlatformColor(link.platform);
        const emoji = getPlatformEmoji(link.platform);
        return (
          <View style={[styles.linkCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => onOpenLink(link.url)} activeOpacity={0.7}>
              {link.thumbnail ? (
                <Image
                  source={{ uri: link.thumbnail.replace(/^http:/, 'https:') }}
                  style={styles.linkThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.linkThumbnailPlaceholder, { backgroundColor: platformColor + '15' }]}>
                  <Text style={styles.linkPlaceholderEmoji}>{emoji}</Text>
                </View>
              )}
              <View style={styles.linkInfo}>
                <View style={[styles.linkPlatformTag, { backgroundColor: platformColor + '20' }]}>
                  <Text style={styles.linkPlatformEmoji}>{emoji}</Text>
                  <Text style={[styles.linkPlatformLabel, { color: platformColor }]}>{link.label}</Text>
                </View>
                {link.title && (
                  <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={2}>{link.title}</Text>
                )}
                {link.description && (
                  <Text style={[styles.linkDescription, { color: colors.textSecondary }]} numberOfLines={3}>{link.description}</Text>
                )}
                <Text style={[styles.linkUrl, { color: colors.textSecondary }]} numberOfLines={1}>{link.url}</Text>
                <View style={styles.linkFooter}>
                  <Text style={[styles.linkTime, { color: colors.textSecondary }]}>{link.date} {link.time}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkShareButton} onPress={() => onShareLink(link)} activeOpacity={0.7}>
              <IconSymbol size={20} name="paperplane.fill" color={colors.gold} />
            </TouchableOpacity>
            <View style={[styles.linkActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={styles.linkActionButton} onPress={() => onShareLink(link)} activeOpacity={0.7}>
                <IconSymbol size={18} name="square.and.arrow.up" color={colors.gold} />
                <Text style={[styles.linkActionText, { color: colors.gold }]}>Share</Text>
              </TouchableOpacity>
              <View style={[styles.linkActionDivider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.linkActionButton} onPress={() => onDeleteLink(link.id)} activeOpacity={0.7}>
                <IconSymbol size={18} name="trash" color="#FF3B30" />
                <Text style={[styles.linkActionText, { color: '#FF3B30' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      case 'entries-header':
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Charisma Entries</Text>
              {item.hasLinks && (
                <TouchableOpacity onPress={scrollToTop} style={styles.scrollToTopButton} activeOpacity={0.7}>
                  <IconSymbol size={14} name="arrow.up" color={colors.gold} />
                  <Text style={[styles.scrollToTopText, { color: colors.gold }]}>Social Links</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 'entry': {
        const entry = item.data;
        return (
          <TouchableOpacity
            style={[styles.entryCard, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/entry/${entry.id}`)}>
            <View style={styles.entryHeader}>
              <Text style={[styles.entryDate, { color: colors.textSecondary }]}>{entry.date}</Text>
              {entry.time && (
                <Text style={[styles.entryTime, { color: colors.textSecondary }]}>{entry.time}</Text>
              )}
            </View>
            <View style={styles.charismaSection}>
              {entry.charismaEmoji && <Text style={styles.charismaEmoji}>{entry.charismaEmoji}</Text>}
              <View style={styles.charismaTextContainer}>
                <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.majorCharisma}</Text>
                {entry.subCharisma && (
                  <Text style={[styles.entrySubtitle, { color: colors.textSecondary }]}>{entry.subCharisma}</Text>
                )}
              </View>
            </View>
            {entry.emotionEmojis && entry.emotionEmojis.length > 0 && (
              <View style={styles.emotionsContainer}>
                {entry.emotionEmojis.map((emojiItem, index) => (
                  <Text key={index} style={styles.emotionEmoji}>{emojiItem}</Text>
                ))}
              </View>
            )}
            {entry.notes && (
              <Text style={[styles.entryNotes, { color: colors.textSecondary }]}>{entry.notes}</Text>
            )}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={(e) => onShareEntry(entry, e)}
              activeOpacity={0.7}>
              <IconSymbol size={20} name="paperplane.fill" color={colors.gold} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }

      case 'empty':
        return (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No charisma entries yet.</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Tap the + button to add your first entry!</Text>
          </View>
        );

      default:
        return null;
    }
  }, [colors, scrollToEntries, scrollToTop, onOpenLink, onShareLink, onDeleteLink, onShareEntry, router]);

  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  return (
    <FlatList
      ref={ref}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      removeClippedSubviews={Platform.OS === 'android'}
      maxToRenderPerBatch={10}
      windowSize={7}
      initialNumToRender={8}
      onScrollToIndexFailed={(info) => {
        // Fallback: scroll to approximate offset
        const wait = new Promise(resolve => setTimeout(resolve, 100));
        wait.then(() => {
          if (ref && 'current' in ref && ref.current) {
            ref.current.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          }
        });
      }}
    />
  );
});

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
  hamburgerButton: {
    padding: 8,
    marginRight: -8,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
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
  // Hamburger Menu Styles
  menuBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  menuSheet: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 12,
    width: 28,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
