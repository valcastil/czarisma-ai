import { useTheme } from '@/hooks/use-theme';
import React, { memo } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SocialLinksDisplayProps {
  socialLinks: Record<string, string | undefined>;
}

const SOCIAL_CONFIG: Record<string, { label: string; emoji: string; color: string; urlPrefix?: string }> = {
  instagram: { label: 'Instagram', emoji: '📸', color: '#E1306C', urlPrefix: 'https://instagram.com/' },
  tiktok: { label: 'TikTok', emoji: '🎵', color: '#000000', urlPrefix: 'https://tiktok.com/@' },
  youtube: { label: 'YouTube', emoji: '▶️', color: '#FF0000', urlPrefix: 'https://youtube.com/' },
  twitter: { label: 'X / Twitter', emoji: '🐦', color: '#1DA1F2', urlPrefix: 'https://x.com/' },
  facebook: { label: 'Facebook', emoji: '👤', color: '#1877F2', urlPrefix: 'https://facebook.com/' },
  linkedin: { label: 'LinkedIn', emoji: '💼', color: '#0A66C2', urlPrefix: 'https://linkedin.com/in/' },
  snapchat: { label: 'Snapchat', emoji: '👻', color: '#FFFC00', urlPrefix: 'https://snapchat.com/add/' },
  threads: { label: 'Threads', emoji: '🧵', color: '#000000', urlPrefix: 'https://threads.net/@' },
  telegram: { label: 'Telegram', emoji: '✈️', color: '#0088CC', urlPrefix: 'https://t.me/' },
  whatsapp: { label: 'WhatsApp', emoji: '💬', color: '#25D366' },
};

export const SocialLinksDisplay = memo(function SocialLinksDisplay({ socialLinks }: SocialLinksDisplayProps) {
  const { colors } = useTheme();

  const activeLinks = Object.entries(socialLinks).filter(
    ([, value]) => value && value.trim().length > 0
  );

  if (activeLinks.length === 0) return null;

  const openLink = (key: string, value: string) => {
    let url = value.trim();
    // If value is a handle (no http), prepend the platform URL prefix
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const config = SOCIAL_CONFIG[key];
      if (config?.urlPrefix) {
        url = config.urlPrefix + url.replace(/^@/, '');
      } else {
        url = 'https://' + url;
      }
    }
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {activeLinks.map(([key, value]) => {
        const config = SOCIAL_CONFIG[key];
        if (!config || !value) return null;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.linkItem, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => openLink(key, value)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{config.emoji}</Text>
            <View style={styles.linkInfo}>
              <Text style={[styles.linkLabel, { color: colors.text }]}>{config.label}</Text>
              <Text style={[styles.linkValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {value}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  emoji: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  linkInfo: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkValue: {
    fontSize: 13,
  },
});
