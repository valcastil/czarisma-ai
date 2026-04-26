import { useTheme } from '@/hooks/use-theme';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface EntryPreview {
  id: string;
  major_charisma: string;
  sub_charisma: string;
  charisma_emoji: string;
  emotion_emojis?: string[] | null;
  notes?: string | null;
  date: string;
  time?: string | null;
}

interface CharismaEntriesPreviewProps {
  entries: EntryPreview[];
  isFollowing: boolean;
  totalCount: number;
}

export const CharismaEntriesPreview = memo(function CharismaEntriesPreview({ entries, isFollowing, totalCount }: CharismaEntriesPreviewProps) {
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
      {entries.map((entry) => (
        <View
          key={entry.id}
          style={[styles.entryCard, { backgroundColor: colors.card }]}
        >
          <View style={styles.entryHeader}>
            <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
              {entry.date}
            </Text>
            {entry.time ? (
              <Text style={[styles.entryTime, { color: colors.textSecondary }]}>
                {entry.time}
              </Text>
            ) : null}
          </View>

          <View style={styles.charismaSection}>
            {entry.charisma_emoji ? (
              <Text style={styles.charismaEmoji}>{entry.charisma_emoji}</Text>
            ) : null}
            <View style={styles.charismaTextContainer}>
              <Text style={[styles.entryTitle, { color: colors.text }]}>
                {entry.major_charisma}
              </Text>
              {entry.sub_charisma ? (
                <Text style={[styles.entrySubtitle, { color: colors.textSecondary }]}>
                  {entry.sub_charisma}
                </Text>
              ) : null}
            </View>
          </View>

          {entry.emotion_emojis && entry.emotion_emojis.length > 0 ? (
            <View style={styles.emotionsContainer}>
              {entry.emotion_emojis.map((emojiItem, index) => (
                <Text key={index} style={styles.emotionEmoji}>
                  {emojiItem}
                </Text>
              ))}
            </View>
          ) : null}

          {entry.notes ? (
            <Text style={[styles.entryNotes, { color: colors.textSecondary }]}>
              {entry.notes}
            </Text>
          ) : null}
        </View>
      ))}

      {totalCount > entries.length && (
        <Text style={[styles.moreText, { color: colors.textSecondary }]}>
          +{totalCount - entries.length} more entries
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  entryCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  entryDate: {
    fontSize: 13,
  },
  entryTime: {
    fontSize: 13,
  },
  charismaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  charismaEmoji: {
    fontSize: 32,
  },
  charismaTextContainer: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  entrySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  emotionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  emotionEmoji: {
    fontSize: 22,
  },
  entryNotes: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
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
