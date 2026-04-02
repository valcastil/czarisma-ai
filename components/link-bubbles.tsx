import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { getPlatformColor, getPlatformEmoji, LinkPlatform, SharedLink } from '@/utils/link-storage';
import * as Linking from 'expo-linking';
import React, { useMemo } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface LinkFeedProps {
  links: SharedLink[];
  onDelete: (linkId: string) => void;
}

export function LinkFeed({ links, onDelete }: LinkFeedProps) {
  const { colors } = useTheme();

  // Reverse for inverted FlatList (newest at bottom)
  const reversedLinks = useMemo(() => [...links].reverse(), [links]);

  const handlePress = (link: SharedLink) => {
    Linking.openURL(link.url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  const handleLongPress = (link: SharedLink) => {
    Alert.alert(
      'Delete Link',
      `Remove this ${link.label} link?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(link.id) },
      ]
    );
  };

  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateSeparatorLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.dateSeparatorText, { color: colors.textSecondary }]}>{date}</Text>
      <View style={[styles.dateSeparatorLine, { backgroundColor: colors.border }]} />
    </View>
  );

  const getTitleFallback = (url: string, platform: LinkPlatform, label: string): string => {
    try {
      const u = new URL(url);
      const path = u.pathname.replace(/^\//, '').replace(/\/$/, '');
      if (platform === 'youtube') {
        const id = path.replace('shorts/', '').replace('watch', '').slice(0, 20);
        return `YouTube Video ${id ? '• ' + id : ''}`;
      }
      if (platform === 'tiktok') {
        const parts = path.split('/');
        const videoId = parts.find(p => /^\d+$/.test(p));
        return `TikTok Video${videoId ? ' • ' + videoId.slice(-8) : ''}`;
      }
      if (platform === 'reels' || platform === 'instagram') {
        return `${label} Video`;
      }
      return path.split('/').pop() || 'Untitled';
    } catch {
      return 'Untitled Video';
    }
  };

  const renderItem = ({ item, index }: { item: SharedLink; index: number }) => {
    const platformColor = getPlatformColor(item.platform);
    const emoji = getPlatformEmoji(item.platform);
    const displayTitle = item.title || getTitleFallback(item.url, item.platform, item.label);

    // Date separator logic for inverted list
    const nextItem = reversedLinks[index + 1];
    const showDateSeparator = !nextItem || nextItem.date !== item.date;

    return (
      <>
        {showDateSeparator && renderDateSeparator(item.date)}
        <TouchableOpacity
          style={[styles.bubble, { backgroundColor: colors.card }]}
          onPress={() => handlePress(item)}
          onLongPress={() => handleLongPress(item)}
          activeOpacity={0.7}>

          {/* Thumbnail */}
          {item.thumbnail ? (
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: platformColor + '15' }]}>
              <Text style={styles.placeholderEmoji}>{emoji}</Text>
              <Text style={[styles.placeholderLabel, { color: platformColor }]}>{item.label}</Text>
            </View>
          )}

          {/* Platform Tag */}
          <View style={styles.bubbleBody}>
            <View style={[styles.platformTag, { backgroundColor: platformColor + '20' }]}>
              <Text style={styles.platformEmoji}>{emoji}</Text>
              <Text style={[styles.platformLabel, { color: platformColor }]}>{item.label}</Text>
            </View>

            {/* Title — always visible below platform name */}
            <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={2}>
              {displayTitle}
            </Text>

            {/* URL */}
            <Text style={[styles.urlText, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.url}
            </Text>

            {/* Time + open icon */}
            <View style={styles.bubbleFooter}>
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>{item.time}</Text>
              <IconSymbol size={14} name="arrow.up.right" color={colors.gold} />
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  if (links.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyEmoji]}>🔗</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No links yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          Tap + to paste social media links
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={reversedLinks}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      inverted
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorText: {
    paddingHorizontal: 14,
    fontSize: 12,
    fontWeight: '500',
  },
  bubble: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 2,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  placeholderLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  bubbleBody: {
    padding: 12,
    gap: 6,
  },
  platformTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  platformEmoji: {
    fontSize: 12,
  },
  platformLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  urlText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
  },
});
