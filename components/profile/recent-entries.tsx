import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface RecentEntriesProps {
  entries: CharismaEntry[];
}

export function RecentEntries({ entries }: RecentEntriesProps) {
  const router = useRouter();
  const { colors } = useTheme();

  const getCharismaDisplayName = (type: string): string => {
    const names: { [key: string]: string } = {
      commanding: 'Commanding',
      confidence: 'Confidence',
      expertise: 'Expertise',
      decisiveness: 'Decisiveness',
      leadership: 'Leadership',
      competence: 'Competence',
      influence: 'Influence',
      respect: 'Respect',
      bold_ideas: 'Bold Ideas',
      inspiring_vision: 'Vision',
      creativity: 'Creativity',
      passionate_future: 'Passion',
      rally_others: 'Leadership',
      persistence: 'Persistence',
      transformational: 'Transformation',
      confidence_innovation: 'Innovation',
      empathy: 'Empathy',
      warmth: 'Warmth',
      compassion: 'Compassion',
      approachability: 'Approachable',
      generosity: 'Generosity',
      altruism: 'Altruism',
      selflessness: 'Selfless',
      encouragement: 'Encouragement',
      deep_listening: 'Listening',
      present_attention: 'Presence',
      eye_contact: 'Eye Contact',
      engaged_conversation: 'Engagement',
      genuine_interest: 'Interest',
      reflective_responses: 'Reflection',
    };
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEntryPress = (entry: CharismaEntry) => {
    router.push(`/entry/${entry.id}`);
  };

  if (entries.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Recent Activity</Text>
        <View style={styles.emptyContainer}>
          <IconSymbol size={40} name="doc.text" color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No entries yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Start tracking your charisma journey
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Recent Activity</Text>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => router.push('/')}
          activeOpacity={0.8}>
          <Text style={[styles.viewAllText, { color: colors.gold }]}>View All</Text>
          <IconSymbol size={16} name="chevron.right" color={colors.gold} />
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {entries.map((entry, index) => (
          <TouchableOpacity
            key={entry.id}
            style={[
              styles.entryItem,
              index !== entries.length - 1 && styles.entryBorder,
              { borderBottomColor: colors.border }
            ]}
            onPress={() => handleEntryPress(entry)}
            activeOpacity={0.7}>
            
            <View style={styles.entryHeader}>
              <View style={styles.entryInfo}>
                <Text style={[styles.entryCharisma, { color: colors.text }]}>
                  {getCharismaDisplayName(entry.majorCharisma)}
                </Text>
                <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                  {formatDate(entry.timestamp)}
                </Text>
              </View>
              
              <View style={styles.entryEmojis}>
                <Text style={styles.charismaEmoji}>{entry.charismaEmoji}</Text>
                <View style={styles.emotionContainer}>
                  {entry.emotionEmojis.slice(0, 3).map((emoji, emojiIndex) => (
                    <Text key={emojiIndex} style={styles.emotionEmoji}>
                      {emoji}
                    </Text>
                  ))}
                  {entry.emotionEmojis.length > 3 && (
                    <Text style={styles.moreEmojis}>+{entry.emotionEmojis.length - 3}</Text>
                  )}
                </View>
              </View>
            </View>
            
            {entry.notes && (
              <Text style={[styles.entryNotes, { color: colors.textSecondary }]} numberOfLines={2}>
                {entry.notes}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  entryItem: {
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  entryBorder: {
    borderBottomWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryInfo: {
    flex: 1,
    marginRight: 15,
  },
  entryCharisma: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryEmojis: {
    alignItems: 'flex-end',
  },
  charismaEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  emotionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emotionEmoji: {
    fontSize: 16,
    marginLeft: 2,
  },
  moreEmojis: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
    opacity: 0.7,
  },
  entryNotes: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 5,
  },
});
