import { useTheme } from '@/hooks/use-theme';
import { SharedLink } from '@/lib/link-storage-service';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { LinkPreviewCard } from './link-preview-card';

interface LinkQueueProps {
  links: SharedLink[];
  onLinkPress: (link: SharedLink) => void;
  onLinkDelete: (linkId: string) => void;
}

export function LinkQueue({ links, onLinkPress, onLinkDelete }: LinkQueueProps) {
  const { colors } = useTheme();

  if (links.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          📎 Shared Links
        </Text>
        {links.filter(l => l.status === 'unread').length > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.gold }]}>
            <Text style={styles.badgeText}>
              {links.filter(l => l.status === 'unread').length}
            </Text>
          </View>
        )}
      </View>

      {/* Links List */}
      <FlatList
        data={links}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LinkPreviewCard
            link={item}
            onPress={() => onLinkPress(item)}
            onDelete={() => onLinkDelete(item.id)}
          />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
});
