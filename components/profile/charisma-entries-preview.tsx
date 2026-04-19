import { useTheme } from '@/hooks/use-theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface EntryPreview {
  id: string;
  major_charisma: string;
  sub_charisma: string;
  charisma_emoji: string;
  date: string;
}

interface CharismaEntriesPreviewProps {
  entries: EntryPreview[];
  isFollowing: boolean;
  totalCount: number;
}

export function CharismaEntriesPreview({ entries, isFollowing, totalCount }: CharismaEntriesPreviewProps) {
  const { colors } = useTheme();

  if (!isFollowing) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
          Follow this user to see their Charisma entries
        </Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No charisma entries yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {entries.map((entry) => (
          <View
            key={entry.id}
            style={[styles.entryCard, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Text style={styles.entryEmoji}>{entry.charisma_emoji || '✨'}</Text>
            <Text style={[styles.entryTitle, { color: colors.text }]} numberOfLines={1}>
              {entry.major_charisma}
            </Text>
            <Text style={[styles.entrySub, { color: colors.textSecondary }]} numberOfLines={1}>
              {entry.sub_charisma}
            </Text>
          </View>
        ))}
      </View>
      {totalCount > entries.length && (
        <Text style={[styles.moreText, { color: colors.textSecondary }]}>
          +{totalCount - entries.length} more entries
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  entryCard: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  entryEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  entrySub: {
    fontSize: 11,
    textAlign: 'center',
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
