import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { UserStats } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/theme';

interface StatsCardProps {
  stats: UserStats;
}

export function StatsCard({ stats }: StatsCardProps) {
  const { colors } = useTheme();

  const formatAverage = (average: number): string => {
    return average.toFixed(1);
  };

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

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Your Statistics</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>
                {stats.totalEntries}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Entries
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>
                {stats.currentStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Current Streak
              </Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>
                {stats.czareelsCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Czareels
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>
                {stats.longestStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Longest Streak
              </Text>
            </View>
          </View>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>
                {formatAverage(stats.weeklyAverage)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Weekly Average
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>
                {formatAverage(stats.monthlyAverage)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Monthly Average
              </Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.topSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Top Charisma
            </Text>
            <View style={styles.topItem}>
              <Text style={[styles.topValue, { color: colors.gold }]}>
                {getCharismaDisplayName(stats.topCharisma.type)}
              </Text>
              <Text style={[styles.topSubtext, { color: colors.textSecondary }]}>
                Used {stats.topCharisma.count} times
              </Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.topSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Top Emotion
            </Text>
            <View style={styles.topItem}>
              <Text style={[styles.topValue, { color: colors.gold }]}>
                {stats.topEmotion || 'N/A'}
              </Text>
              <Text style={[styles.topSubtext, { color: colors.textSecondary }]}>
                Most frequently used
              </Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>
                {Math.round((stats.currentStreak / 30) * 100)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Monthly Progress
              </Text>
            </View>
          </View>
        </View>
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
    minHeight: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 15,
  },
  topSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  topItem: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
  },
  topValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  topSubtext: {
    fontSize: 12,
    fontWeight: '500',
  },
});
