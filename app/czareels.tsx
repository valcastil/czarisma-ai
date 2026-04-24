import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Czareel {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  charisma_tag: string | null;
  charisma_emoji: string | null;
  mood_emojis: string[] | null;
  duration_sec: number | null;
  views: number;
  created_at: string;
  profiles: {
    name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface ReelItemProps {
  item: Czareel;
  isVisible: boolean;
  colors: any;
  insets: any;
  onCreatePress: () => void;
}

function ReelItem({ item, colors, insets }: ReelItemProps) {
  const avatar = item.profiles?.avatar_url;
  const name = item.profiles?.name || 'Czar User';
  const username = item.profiles?.username || 'czaruser';

  const handleTap = () => {
    if (item.video_url) Linking.openURL(item.video_url);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handleTap}
      style={[styles.reelContainer, { height: SCREEN_HEIGHT }]}
    >
      {/* Thumbnail / first-frame still */}
      <Image
        source={{ uri: item.video_url }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {/* Play button overlay */}
      <View style={styles.playOverlay} pointerEvents="none">
        <View style={styles.playCircle}>
          <IconSymbol size={40} name="play.fill" color="rgba(255,255,255,0.9)" />
        </View>
      </View>

      {/* Dark gradient overlay at bottom */}
      <View style={styles.gradientOverlay} />

      {/* Bottom info overlay */}
      <View style={[styles.infoOverlay, { paddingBottom: insets.bottom + 80 }]}>
        {/* User info */}
        <View style={styles.userRow}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.gold }]}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userHandle}>@{username} · {timeAgo(item.created_at)}</Text>
          </View>
        </View>

        {/* Caption */}
        {item.caption ? (
          <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
        ) : null}

        {/* Tags row */}
        <View style={styles.tagsRow}>
          {item.charisma_emoji && item.charisma_tag ? (
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{item.charisma_emoji} {item.charisma_tag}</Text>
            </View>
          ) : null}
          {item.mood_emojis && item.mood_emojis.length > 0 ? (
            <View style={styles.moodBadge}>
              <Text style={styles.moodBadgeText}>{item.mood_emojis.join('  ')}</Text>
            </View>
          ) : null}
          {item.duration_sec ? (
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>{Math.round(item.duration_sec)}s</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CzareelsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [reels, setReels] = useState<Czareel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const loadReels = useCallback(async (reset = false) => {
    try {
      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('czareels')
        .select(`
          id, user_id, video_url, thumbnail_url, caption,
          charisma_tag, charisma_emoji, mood_emojis,
          duration_sec, views, created_at,
          profiles ( name, username, avatar_url )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (reset) {
        setReels(data as unknown as Czareel[]);
        setPage(1);
      } else {
        setReels(prev => [...prev, ...(data as unknown as Czareel[])]);
        setPage(p => p + 1);
      }
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading czareels:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    loadReels(true);
  }, []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setVisibleIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    loadReels(true);
  };

  const renderItem = useCallback(({ item, index }: { item: Czareel; index: number }) => (
    <ReelItem
      item={item}
      isVisible={index === visibleIndex}
      colors={colors}
      insets={insets}
      onCreatePress={() => router.push('/create-czareel' as any)}
    />
  ), [visibleIndex, colors, insets]);

  const keyExtractor = useCallback((item: Czareel) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: '#000' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.7}>
          <IconSymbol size={26} name="chevron.left" color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Czareels</Text>
        <View style={{ width: 40 }} />
      </View>

      {reels.length === 0 ? (
        <View style={styles.centered}>
          <IconSymbol size={64} name="video.slash" color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyTitle}>No Czareels yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to share yours!</Text>
          <TouchableOpacity
            style={[styles.createEmptyBtn, { backgroundColor: colors.gold }]}
            onPress={() => router.push('/create-czareel' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.createEmptyBtnText}>Create Czareel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={reels}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={() => hasMore && loadReels()}
          onEndReachedThreshold={0.5}
          removeClippedSubviews
          maxToRenderPerBatch={3}
          windowSize={5}
          getItemLayout={(_, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
        />
      )}

      {/* Floating create button */}
      <TouchableOpacity
        style={[styles.createFab, { backgroundColor: colors.gold, bottom: insets.bottom + 90 }]}
        onPress={() => router.push('/create-czareel' as any)}
        activeOpacity={0.85}
      >
        <IconSymbol size={22} name="plus" color="#000" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: { padding: 4 },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  reelContainer: {
    width: SCREEN_WIDTH,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  infoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    gap: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarInitial: { color: '#000', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userHandle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  moodBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  moodBadgeText: { fontSize: 14 },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  durationBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptySubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  createEmptyBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createEmptyBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },

  createFab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
