import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCharismaName } from '@/utils/charisma-share-utils';

const ENTRIES_KEY = '@charisma_entries';

interface CharismaAttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  onAttach: (entry: CharismaEntry) => void;
}

export function CharismaAttachmentModal({ visible, onClose, onAttach }: CharismaAttachmentModalProps) {
  const { colors } = useTheme();

  const [entries, setEntries] = useState<CharismaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadEntries();
    }
  }, [visible]);

  const loadEntries = async () => {
    try {
      const entriesData = await AsyncStorage.getItem(ENTRIES_KEY);
      const charismaEntries: CharismaEntry[] = entriesData ? JSON.parse(entriesData) : [];
      
      // Sort by most recent
      const sortedEntries = charismaEntries.sort((a, b) => b.timestamp - a.timestamp);
      setEntries(sortedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
      Alert.alert('Error', 'Failed to load charisma entries');
    } finally {
      setLoading(false);
    }
  };

  const handleEntryPress = (entry: CharismaEntry) => {
    onAttach(entry);
    onClose();
  };

  const formatCharismaEntry = (entry: CharismaEntry) => {
    let message = `🌟 Charisma Entry - ${entry.date}\n\n`;
    
    if (entry.charismaEmoji) {
      message += `${entry.charismaEmoji} `;
    }
    
    // Get charisma name (simplified version)
    const charismaName = getCharismaName(entry.majorCharisma);
    message += `${charismaName}\n`;
    
    if (entry.subCharisma) {
      message += `${entry.subCharisma}\n`;
    }
    
    // Add emotions
    if (entry.emotionEmojis && entry.emotionEmojis.length > 0) {
      message += `\nEmotions: ${entry.emotionEmojis.join(' ')}\n`;
    }
    
    // Add notes
    if (entry.notes) {
      message += `\n📝 ${entry.notes}`;
    }
    
    return message;
  };

  const renderEntryItem = ({ item }: { item: CharismaEntry }) => (
    <TouchableOpacity
      style={[styles.entryItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleEntryPress(item)}
      activeOpacity={0.7}>
      
      <View style={styles.entryHeader}>
        <View style={styles.entryDateContainer}>
          {item.charismaEmoji && (
            <Text style={styles.entryEmoji}>{item.charismaEmoji}</Text>
          )}
          <View>
            <Text style={[styles.entryDate, { color: colors.text }]}>
              {item.date}
            </Text>
            {item.time && (
              <Text style={[styles.entryTime, { color: colors.textSecondary }]}>
                {item.time}
              </Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => handleEntryPress(item)}
          activeOpacity={0.7}>
          <IconSymbol size={20} name="paperclip" color={colors.gold} />
        </TouchableOpacity>
      </View>

      <View style={styles.entryContent}>
        <Text style={[styles.charismaName, { color: colors.text }]}>
          {getCharismaName(item.majorCharisma)}
        </Text>
        
        {item.subCharisma && (
          <Text style={[styles.subCharisma, { color: colors.textSecondary }]}>
            {item.subCharisma}
          </Text>
        )}
        
        {item.emotionEmojis && item.emotionEmojis.length > 0 && (
          <View style={styles.emotionsContainer}>
            <Text style={[styles.emotionsLabel, { color: colors.textSecondary }]}>
              Emotions:
            </Text>
            <View style={styles.emojisRow}>
              {item.emotionEmojis.map((emoji, index) => (
                <Text key={index} style={styles.emotionEmoji}>{emoji}</Text>
              ))}
            </View>
          </View>
        )}
        
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
              Notes:
            </Text>
            <Text style={[styles.notesText, { color: colors.text }]} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}>
            <IconSymbol size={24} name="xmark" color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Share Charisma Entry</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading your charisma entries...
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            renderItem={renderEntryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.entriesList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <IconSymbol size={64} name="sparkles" color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No charisma entries yet
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Create some charisma entries to share them with others
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  entriesList: {
    padding: 20,
  },
  entryItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entryEmoji: {
    fontSize: 24,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryTime: {
    fontSize: 12,
    marginTop: 2,
  },
  attachButton: {
    padding: 8,
  },
  entryContent: {
    gap: 8,
  },
  charismaName: {
    fontSize: 16,
    fontWeight: '600',
  },
  subCharisma: {
    fontSize: 14,
  },
  emotionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emotionsLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  emojisRow: {
    flexDirection: 'row',
    gap: 4,
  },
  emotionEmoji: {
    fontSize: 16,
  },
  notesContainer: {
    gap: 4,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
