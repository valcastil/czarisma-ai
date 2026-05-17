import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { getSavedAIQuotes, deleteAIQuote } from '@/utils/ai-quote-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

// Inspirational Charisma Quotes (Free)
const CHARISMA_QUOTES = [
  "Charisma is the transference of enthusiasm.",
  "I'm really tall when I stand on my charisma.",
  "Charisma is the perfect blend of warmth and confidence.",
  "Awaken your charisma from within.",
  "People who love life have charisma because they fill the room with positive energy.",
  "Let your confidence shine—it's contagious.",
  "You light up the room by being boldly yourself.",
  "Energy and passion are your daily charisma boosters.",
  "Radiate positivity and watch the world respond.",
  "Stand tall, your charisma speaks volumes.",
];

// Pro-Only Charisma Quotes
const PRO_CHARISMA_QUOTES = [
  "Speak with clarity; confidence follows.",
  "Your words shape your presence.",
  "Strong posture speaks louder than words.",
  "Eye contact builds unspoken trust.",
  "Let passion color your voice.",
  "Smile sincerely; it magnetizes.",
  "Move with purpose, own the space.",
  "Listen deeply, respond thoughtfully.",
  "Brevity is the soul of eloquence.",
  "Charisma lives in the harmony of voice and gesture.",
];

// Inspirational Charisma Quotes with Attribution
const INSPIRATIONAL_CHARISMA_QUOTES = [
  '"Charisma is a sparkle in people that money can\'t buy. It\'s an invisible energy with visible effects." — Marianne Williamson',
  '"Charisma is the transference of enthusiasm." — Ralph Archbold',
  '"Charisma is the knack of giving people your full attention." — Robert Brault',
  '"Charisma without character is postponed calamity." — Peter Ajisafe',
  '"Charisma gets the attention of man and character gets the attention of God." — Rich Wilkerson Jr.',
  '"You can be revered for all sorts of qualities, but to be truly charismatic is rare." — Francesca Annis',
  '"Charisma is not just saying hello. It is dropping what you\'re doing to say hello." — Robert Brault',
  '"I think that natural beauty is very charismatic." — Elle Macpherson',
  '"Charisma knows only inner determination and inner restraint." — Max Weber',
  '"Charisma is the result of effective leadership, not the other way around." — Warren G. Bennis',
  '"Effective leadership is about earning respect, and it\'s about personality and charisma." — Alan Sugar',
  '"Charismatic leaders don\'t say what people want to hear, but they say what people want to say." — C. L. Gammon',
  '"Charisma can inspire." — Simon Sinek',
  '"People who love life have charisma because they fill the room with positive energy." — John C. Maxwell',
  '"Lack of charisma can be fatal." — Jenny Holzer',
  '"You either have the charisma, the knowledge, the passion, the intelligence or you don\'t." — Jon Gruden',
  '"Stand tall and be proud. Realize confidence is charismatic and something money can\'t buy; it radiates from within you." — Cindy Ann Peterson',
  '"The most dangerous people are always clever, compelling, and charismatic." — Malcolm McDowell',
  '"Just because someone is very charismatic, it doesn\'t mean that they\'re genuinely qualified." — Tenzin Palmo',
  '"Beware of the charismatic wolf in sheep\'s clothing. There is evil in the world. You can be tricked." — Terry Tempest Williams',
];

type Section = 'inspirational' | 'charisma' | 'ai';

export default function QuotesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeSection, setActiveSection] = useState<Section>('inspirational');
  const [savedAIQuotes, setSavedAIQuotes] = useState<string[]>([]);

  const loadSavedAIQuotes = async () => {
    try {
      const quotes = await getSavedAIQuotes();
      setSavedAIQuotes(quotes);
    } catch (error) {
      console.error('Error loading saved AI quotes:', error);
    }
  };

  // Reload AI quotes every time tab is focused
  useFocusEffect(
    useCallback(() => {
      loadSavedAIQuotes();
    }, [])
  );

  const handleShare = async (quote: string) => {
    try {
      await Share.share({ message: `${quote}\n\n— Czarisma` });
    } catch (error) {
      console.error('Error sharing quote:', error);
    }
  };

  const handleDeleteAIQuote = async (quote: string) => {
    Alert.alert('Delete Quote', 'Remove this saved AI quote?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAIQuote(quote);
          setSavedAIQuotes(prev => prev.filter(q => q !== quote));
        },
      },
    ]);
  };

  const getActiveQuotes = (): string[] => {
    switch (activeSection) {
      case 'inspirational':
        return INSPIRATIONAL_CHARISMA_QUOTES;
      case 'charisma':
        return [...CHARISMA_QUOTES, ...PRO_CHARISMA_QUOTES];
      case 'ai':
        return savedAIQuotes;
    }
  };

  const quotes = getActiveQuotes();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Inspirational Quotes</Text>
      </View>

      {/* Section Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'inspirational' && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
          onPress={() => setActiveSection('inspirational')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeSection === 'inspirational' ? colors.gold : colors.textSecondary }]}>
            💬 Inspirational
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'charisma' && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
          onPress={() => setActiveSection('charisma')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeSection === 'charisma' ? colors.gold : colors.textSecondary }]}>
            ✨ Charisma
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'ai' && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
          onPress={() => setActiveSection('ai')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeSection === 'ai' ? colors.gold : colors.textSecondary }]}>
            🤖 AI ({savedAIQuotes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quotes List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {quotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon]}>📝</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved AI quotes yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Chat with Czar AI and save quotes from the conversation!
            </Text>
          </View>
        ) : (
          quotes.map((quote, index) => (
            <View
              key={`${activeSection}-${index}`}
              style={[styles.quoteCard, { backgroundColor: colors.card, borderLeftColor: colors.gold }]}
            >
              <Text style={[styles.quoteText, { color: colors.text }]}>{quote}</Text>
              <View style={styles.quoteActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleShare(quote)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol size={16} name="square.and.arrow.up" color={colors.textSecondary} />
                </TouchableOpacity>
                {activeSection === 'ai' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteAIQuote(quote)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol size={16} name="trash" color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  quoteCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  quoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
