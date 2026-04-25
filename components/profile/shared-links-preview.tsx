import { useTheme } from '@/hooks/use-theme';
import { getPlatformColor, getPlatformEmoji, LinkPlatform } from '@/utils/link-storage';
import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SharedLinkRow {
  id: string;
  url: string;
  platform: string | null;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

interface SharedLinksPreviewProps {
  links: SharedLinkRow[];
  isFollowing: boolean;
  totalCount: number;
}

const formatDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${date}  ${time}`;
  } catch {
    return '';
  }
};

const labelForPlatform = (p: string | null): string => {
  switch (p) {
    case 'youtube':
      return 'YouTube';
    case 'instagram':
      return 'Instagram';
    case 'tiktok':
      return 'TikTok';
    case 'reels':
      return 'Reels';
    default:
      return 'Link';
  }
};

export function SharedLinksPreview({ links, isFollowing, totalCount }: SharedLinksPreviewProps) {
  const { colors } = useTheme();

  if (!isFollowing) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
          Follow this user to see their shared links
        </Text>
      </View>
    );
  }

  if (links.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No shared links yet
        </Text>
      </View>
    );
  }

  // Deduplicate by URL as a safety measure
  const uniqueLinks = links.filter(
    (link, index, self) =>
      index === self.findIndex((t) => t.url === link.url)
  );

  console.log('[SharedLinksPreview] Input links:', links.length, 'Unique links:', uniqueLinks.length);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {uniqueLinks.map((link) => {
        const platform = (link.platform || 'unknown') as LinkPlatform;
        const platformColor = getPlatformColor(platform);
        const emoji = getPlatformEmoji(platform);
        const label = labelForPlatform(link.platform);
        const thumb = link.thumbnail_url
          ? link.thumbnail_url.replace(/^http:/, 'https:')
          : null;

        return (
          <TouchableOpacity
            key={link.id}
            style={[styles.linkCard, { backgroundColor: colors.card }]}
            onPress={() => openLink(link.url)}
            activeOpacity={0.8}
          >
            {thumb ? (
              <Image source={{ uri: thumb }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: platformColor + '15' }]}>
                <Text style={styles.placeholderEmoji}>{emoji}</Text>
              </View>
            )}

            <View style={styles.info}>
              <View style={[styles.platformTag, { backgroundColor: platformColor + '20' }]}>
                <Text style={styles.platformEmoji}>{emoji}</Text>
                <Text style={[styles.platformLabel, { color: platformColor }]}>{label}</Text>
              </View>

              {link.title ? (
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                  {link.title}
                </Text>
              ) : null}

              {link.description ? (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
                  {link.description}
                </Text>
              ) : null}

              <Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={1}>
                {link.url}
              </Text>

              <Text style={[styles.time, { color: colors.textSecondary }]}>
                {formatDateTime(link.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {totalCount > links.length ? (
        <Text style={[styles.moreText, { color: colors.textSecondary }]}>
          +{totalCount - links.length} more links
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  linkCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#00000022',
  },
  thumbnailPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 56,
  },
  info: {
    padding: 14,
    gap: 6,
  },
  platformTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 4,
  },
  platformEmoji: {
    fontSize: 14,
  },
  platformLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  url: {
    fontSize: 12,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
  lockedContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  lockEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
  },
  moreText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
