import { CharismaLogo, CharismaLogoRef } from '@/components/charisma-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calculateUserStats, updateProfile } from '@/utils/profile-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    DeviceEventEmitter,
    FlatList,
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
  const { colors } = useTheme();
  const [entries, setEntries] = useState<CharismaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pendingScrollToEntries = useRef(false);
  const logoRef = useRef<CharismaLogoRef>(null);
  const lastLoadRef = useRef(0);
  const prevEntryCountRef = useRef(-1);

  const params = useLocalSearchParams<{ scrollToEntries?: string }>();

  // Flag scroll when navigated with scrollToEntries param (after adding entry)
  useEffect(() => {
    if (params.scrollToEntries === 'true') {
      pendingScrollToEntries.current = true;
    }
  }, [params.scrollToEntries]);

  // Single data loading point — useFocusEffect fires on mount AND every tab focus
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const isFirstLoad = lastLoadRef.current === 0;
      const isStale = now - lastLoadRef.current > 30000; // 30s staleness

      if (isFirstLoad || isStale) {
        lastLoadRef.current = now;
        loadData();
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

Forwarded from Czarisma AI
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
          <Text style={[styles.title, { color: colors.text }]}>Czarisma AI</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.hamburgerButton}
            onPress={() => setShowHamburgerMenu(true)}
            activeOpacity={0.7}>
            <IconSymbol size={26} name="line.3.horizontal" color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content — FlatList for virtualized rendering */}
      <HomeList
        ref={flatListRef}
        entries={entries}
        colors={colors}
        router={router}
        onShareEntry={handleShareEntry}
        pendingScrollToEntries={pendingScrollToEntries}
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
                router.push('/onboarding-charisma');
              }}>
              <Text style={styles.menuIcon}>✨</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Add Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowHamburgerMenu(false);
                router.push('/search');
              }}>
              <Text style={styles.menuIcon}>�</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowHamburgerMenu(false);
                router.push('/settings');
              }}>
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Settings</Text>
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
  | { type: 'entries-header'; id: string }
  | { type: 'entry'; id: string; data: CharismaEntry }
  | { type: 'empty'; id: string };

interface HomeListProps {
  entries: CharismaEntry[];
  colors: any;
  router: any;
  onShareEntry: (entry: CharismaEntry, e: any) => void;
  pendingScrollToEntries: React.MutableRefObject<boolean>;
}

const HomeList = React.forwardRef<FlatList, HomeListProps>(({
  entries, colors, router,
  onShareEntry,
  pendingScrollToEntries,
}, ref) => {
  // Build unified flat data array
  const data = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    if (entries.length > 0) {
      items.push({ type: 'entries-header', id: '_eh' });
      entries.forEach(e => items.push({ type: 'entry', id: e.id, data: e }));
    }
    if (entries.length === 0) {
      items.push({ type: 'empty', id: '_empty' });
    }
    return items;
  }, [entries]);

  // Handle pending scroll after data loads
  useEffect(() => {
    if (pendingScrollToEntries.current && data.length > 0) {
      pendingScrollToEntries.current = false;
      setTimeout(() => {
        if (ref && 'current' in ref && ref.current) {
          ref.current.scrollToOffset({ offset: 0, animated: true });
        }
      }, 150);
    }
  }, [data]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'entries-header':
        return (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Charisma Entries</Text>
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
  }, [colors, onShareEntry, router]);

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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
