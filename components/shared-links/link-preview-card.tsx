import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { SharedLink } from '@/lib/link-storage-service';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LinkPreviewCardProps {
  link: SharedLink;
  onPress: () => void;
  onDelete: () => void;
}

export function LinkPreviewCard({ link, onPress, onDelete }: LinkPreviewCardProps) {
  const { colors } = useTheme();

  const getPlatformIcon = (): any => {
    const icons: Record<string, string> = {
      youtube: 'play.rectangle.fill',
      tiktok: 'music.note',
      instagram: 'camera.fill',
      twitter: 'text.bubble',
      facebook: 'person.3.fill',
      reddit: 'bubble.left.and.bubble.right',
      linkedin: 'briefcase.fill',
      web: 'link',
    };
    return icons[link.platform || 'web'] || 'link';
  };

  const getPlatformColor = (): string => {
    const colors: Record<string, string> = {
      youtube: '#FF0000',
      tiktok: '#000000',
      instagram: '#E4405F',
      twitter: '#1DA1F2',
      facebook: '#1877F2',
      reddit: '#FF4500',
      linkedin: '#0A66C2',
      web: '#666666',
    };
    return colors[link.platform || 'web'] || '#666666';
  };

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
      onPress={onPress}
      activeOpacity={0.8}>
      
      {/* Thumbnail */}
      {link.thumbnailUrl ? (
        <Image 
          source={{ uri: link.thumbnailUrl }} 
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.background }]}>
          <IconSymbol 
            size={40} 
            name={getPlatformIcon()} 
            color={getPlatformColor()} 
          />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Platform Badge */}
        <View style={styles.header}>
          <View style={[styles.platformBadge, { backgroundColor: getPlatformColor() + '20' }]}>
            <IconSymbol 
              size={12} 
              name={getPlatformIcon()} 
              color={getPlatformColor()} 
            />
            <Text style={[styles.platformText, { color: getPlatformColor() }]}>
              {link.platform?.toUpperCase() || 'WEB'}
            </Text>
          </View>

          {/* Delete Button */}
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IconSymbol size={18} name="xmark.circle.fill" color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text 
          style={[styles.title, { color: colors.text }]} 
          numberOfLines={2}
          ellipsizeMode="tail">
          {link.title || link.url}
        </Text>

        {/* Author */}
        {link.author && (
          <Text 
            style={[styles.author, { color: colors.textSecondary }]} 
            numberOfLines={1}>
            {link.author}
          </Text>
        )}

        {/* Domain */}
        <Text 
          style={[styles.domain, { color: colors.textSecondary }]} 
          numberOfLines={1}>
          {link.domain}
        </Text>
      </View>

      {/* Unread Badge */}
      {link.status === 'unread' && (
        <View style={[styles.unreadBadge, { backgroundColor: colors.gold }]} />
      )}

      {/* Favorite Badge */}
      {link.isFavorite && (
        <View style={styles.favoriteBadge}>
          <IconSymbol size={16} name="star.fill" color={colors.gold} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 140,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  platformText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  author: {
    fontSize: 12,
    marginBottom: 4,
  },
  domain: {
    fontSize: 11,
  },
  unreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
});
