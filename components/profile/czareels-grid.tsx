import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const NUM_COLS = 3;
const GAP = 2;
const CELL_SIZE = (Dimensions.get('window').width - GAP * (NUM_COLS + 1)) / NUM_COLS;

interface CzareelItem {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  views: number;
  likes: number;
  created_at: string;
}

interface CzareelsGridProps {
  userId: string;
}

function ReelCell({ item, onTap }: { item: CzareelItem; onTap: (i: CzareelItem) => void }) {
  const [imgError, setImgError] = useState(false);
  const thumbUri = !imgError && item.thumbnail_url ? item.thumbnail_url : null;

  return (
    <TouchableOpacity onPress={() => onTap(item)} activeOpacity={0.85} style={styles.cell}>
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderEmoji}>🎬</Text>
        </View>
      )}
      <View style={styles.playOverlay} pointerEvents="none">
        <IconSymbol size={18} name="play.fill" color="rgba(255,255,255,0.9)" />
      </View>
      <View style={styles.viewsBadge} pointerEvents="none">
        <IconSymbol size={10} name="eye" color="#fff" />
        <Text style={styles.viewsText}>{formatCount(item.views)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function CzareelsGrid({ userId }: CzareelsGridProps) {
  const { colors } = useTheme();
  const [reels, setReels] = useState<CzareelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);

  useEffect(() => {
    if (!userId) return;
    loadReels();
  }, [userId]);

  const loadReels = async () => {
    try {
      const { data, error } = await supabase
        .from('czareels')
        .select('id, video_url, thumbnail_url, caption, views, likes, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items = (data ?? []) as CzareelItem[];
      setReels(items);
      setTotalViews(items.reduce((s, r) => s + (r.views ?? 0), 0));
      setTotalLikes(items.reduce((s, r) => s + (r.likes ?? 0), 0));
    } catch (e) {
      console.error('CzareelsGrid load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTap = async (item: CzareelItem) => {
    if (item.video_url) await WebBrowser.openBrowserAsync(item.video_url);
  };

  if (loading) {
    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CZAREELS</Text>
        <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
      </View>
    );
  }

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      {/* Section header with aggregate stats */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CZAREELS</Text>
        <View style={styles.headerStats}>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: colors.gold }]}>{reels.length}</Text>
            <Text style={[styles.headerStatLabel, { color: colors.textSecondary }]}>posts</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: colors.gold }]}>{formatCount(totalViews)}</Text>
            <Text style={[styles.headerStatLabel, { color: colors.textSecondary }]}>views</Text>
          </View>
          <View style={styles.headerStat}>
            <Text style={[styles.headerStatNum, { color: colors.gold }]}>{formatCount(totalLikes)}</Text>
            <Text style={[styles.headerStatLabel, { color: colors.textSecondary }]}>likes</Text>
          </View>
        </View>
      </View>

      {reels.length === 0 ? (
        <View style={styles.empty}>
          <IconSymbol size={36} name="video.slash" color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No Czareels yet</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLS}
          scrollEnabled={false}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => <ReelCell item={item} onTap={handleTap} />}
        />
      )}
    </View>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
    paddingTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  headerStat: {
    alignItems: 'center',
  },
  headerStatNum: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerStatLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    gap: GAP,
  },
  row: {
    gap: GAP,
    marginHorizontal: GAP,
    marginBottom: GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE * 1.4,
    position: 'relative',
    backgroundColor: '#111',
    borderRadius: 4,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlaceholderEmoji: {
    fontSize: 28,
  },
  playOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  viewsBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  viewsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
