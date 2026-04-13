import { IconSymbol } from '@/components/ui/icon-symbol';
import { CharismaEntry, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { checkPaidProStatus } from '@/utils/subscription-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const ENTRIES_KEY = '@charisma_entries';

export default function EntryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [entry, setEntry] = useState<CharismaEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMajorCharisma, setEditedMajorCharisma] = useState('');
  const [editedSubCharisma, setEditedSubCharisma] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [editedEmotionEmojis, setEditedEmotionEmojis] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEntry();
    loadProStatus();
  }, [id]);

  const loadProStatus = async () => {
    try {
      const proStatus = await checkPaidProStatus();
      setIsPro(proStatus);
    } catch (error) {
      console.error('Error checking Pro status:', error);
      setIsPro(false);
    }
  };

  useEffect(() => {
    console.log('isEditing state changed:', isEditing);
  }, [isEditing]);

  const loadEntry = async () => {
    try {
      const entriesData = await AsyncStorage.getItem(ENTRIES_KEY);
      if (entriesData) {
        const entries: CharismaEntry[] = JSON.parse(entriesData);
        const foundEntry = entries.find((e) => e.id === id);
        setEntry(foundEntry || null);
      }
    } catch (error) {
      console.error('Error loading entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const entriesData = await AsyncStorage.getItem(ENTRIES_KEY);
              if (entriesData) {
                const entries: CharismaEntry[] = JSON.parse(entriesData);
                const updatedEntries = entries.filter((e) => e.id !== id);
                await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
                router.back();
              }
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleStartEdit = () => {
    console.log('Edit button pressed');
    if (!isPro) {
      Alert.alert(
        'Pro Feature',
        'Entry editing is available for Pro subscribers only. Upgrade to Pro to edit your charisma entries.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/subscription'),
          },
        ]
      );
      return;
    }
    
    if (entry) {
      console.log('Entry found:', entry);
      setEditedMajorCharisma(entry.majorCharisma);
      setEditedSubCharisma(entry.subCharisma || '');
      setEditedNotes(entry.notes || '');
      setEditedEmotionEmojis(entry.emotionEmojis || []);
      setIsEditing(true);
      console.log('Modal should open now');
    } else {
      console.log('No entry found');
    }
  };

  const handleSaveEdit = async () => {
    if (!entry) return;
    
    setSaving(true);
    try {
      const entriesData = await AsyncStorage.getItem(ENTRIES_KEY);
      if (entriesData) {
        const entries: CharismaEntry[] = JSON.parse(entriesData);
        const updatedEntries = entries.map((e) => 
          e.id === id 
            ? {
                ...e,
                majorCharisma: editedMajorCharisma,
                subCharisma: editedSubCharisma,
                notes: editedNotes,
                emotionEmojis: editedEmotionEmojis,
              }
            : e
        );
        await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
        
        // Update local state
        setEntry({
          ...entry,
          majorCharisma: editedMajorCharisma,
          subCharisma: editedSubCharisma,
          notes: editedNotes,
          emotionEmojis: editedEmotionEmojis,
        });
        
        setIsEditing(false);
        Alert.alert('Success', 'Entry updated successfully');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleEmotionToggle = (emotion: string) => {
    setEditedEmotionEmojis(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const getCharismaEmojis = (majorCharisma: string): string[] => {
    const charismaEmojis: { [key: string]: string[] } = {
      commanding: ['👑'],
      confidence: ['💪'],
      expertise: ['📚'],
      decisiveness: ['🕴️'],
      leadership: ['🧑‍💼'],
      competence: ['🏆'],
      influence: ['🗣️'],
      respect: ['🙇‍♂️'],
      bold_ideas: ['🌟'],
      inspiring_vision: ['🔮'],
      creativity: ['🎨'],
      passionate_future: ['❤️'],
      rally_others: ['👥'],
      persistence: ['🔁'],
      transformational: ['🚀'],
      confidence_innovation: ['🦾'],
      empathy: ['🤗'],
      warmth: ['☀️'],
      compassion: ['💖'],
      approachability: ['👋'],
      generosity: ['🎁'],
      altruism: ['🤝'],
      selflessness: ['👐'],
      encouragement: ['🌻'],
      deep_listening: ['👂'],
      present_attention: ['🧘'],
      eye_contact: ['👀'],
      engaged_conversation: ['🗨️'],
      genuine_interest: ['💬'],
      reflective_responses: ['🤔'],
      makes_valued: ['🙌'],
      mindfulness: ['🧠'],
      unique_personality: ['🌈'],
      life_story: ['📖'],
      charismatic_voice: ['🎙️'],
      humor: ['😂'],
      style: ['👗'],
      storytelling: ['📚'],
      passion_expression: ['🔥'],
      humble_confidence: ['💫'],
      immediate_impact: ['⚡'],
      calm_confidence: ['😌'],
      friendly_demeanor: ['🙂'],
      positive_energy: ['✨'],
      composure: ['🧊'],
      body_language: ['💃'],
      smile_warmth: ['😊'],
      first_impression: ['👀'],
      risk_taking: ['🎭'],
      wit: ['😜'],
      bold_opinions: ['🗣️'],
      confident_criticism: ['😤'],
      non_conformity: ['❌'],
      resilience: ['🛡️'],
      authenticity: ['🧬'],
      courage: ['🦁'],
      humility: ['🙇‍♀️'],
      self_deprecating: ['🤡'],
      modesty: ['🙏'],
      counter_approachability: ['🤝'],
      understated_confidence: ['🏷️'],
      relatability: ['🧑‍🤝‍🧑'],
      disarming: ['💬'],
      plays_down_status: ['🧘'],
      assertiveness: ['🦾'],
      strength_likability: ['🛡️'],
      toughness: ['🐅'],
      fearlessness: ['🦅'],
      strategic_dominance: ['🎯'],
      confrontation_confidence: ['😎'],
      strong_will: ['🦸'],
      crisis_leadership: ['🧯'],
      idolization: ['👑'],
      media_amplification: ['📺'],
      symbolism: ['🕯️'],
      emotional_appeal: ['❤️'],
      worship_admiration: ['🙏'],
      charismatic_storytelling: ['📖'],
      image_crafting: ['📰'],
      mobilization: ['🧑‍🤝‍🧑'],
      motivational_speaking: ['🗣️'],
      emotional_connection: ['🤝'],
      optimism: ['🌞'],
      inspire_encouragement: ['✊'],
      uplifting_stories: ['📜'],
      passion_goals: ['💥'],
      teaching_mentoring: ['👩‍🏫'],
      collective_action: ['🎉'],
      humble_leadership: ['🙌'],
      serving_others: ['🤲'],
      facilitating_growth: ['🌱'],
      listening_speaking: ['👂'],
      building_community: ['🫂'],
      authentic_care: ['❤️'],
      supportive_attitude: ['🤗'],
      leading_example: ['🌟'],
      inspirational_speaking: ['🗣️'],
      raising_hands: ['🙌'],
      party_popper: ['🎉'],
      inspirational_fire: ['🔥'],
      inspirational_idea: ['💡'],
      megaphone: ['📣'],
      transformational_repeat: ['🔄'],
      transformational_rocket: ['🚀'],
      seedling: ['🌱'],
    };
    
    return charismaEmojis[majorCharisma] || [];
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Entry not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Edit Button - Top Right */}
      <View style={styles.topEditButton}>
        <TouchableOpacity
          style={[styles.roundEditButton, { backgroundColor: 'rgba(244, 197, 66, 0.2)' }]}
          onPress={handleStartEdit}
          activeOpacity={0.8}>
          <IconSymbol size={20} name="pencil" color="#F4C542" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Date */}
        <Text style={[styles.date, { color: colors.textSecondary }]}>{entry.date}</Text>

        {/* Major Charisma */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Major Charisma
          </Text>
          <Text style={[styles.sectionValue, { color: colors.text }]}>{entry.majorCharisma}</Text>
        </View>

        {/* Emotions */}
        {entry.emotionEmojis && entry.emotionEmojis.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Emotions
            </Text>
            <View style={styles.emotionsContainer}>
              {entry.emotionEmojis.map((emoji, index) => (
                <Text key={index} style={styles.emotionEmoji}>{emoji}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Sub Charisma */}
        {entry.subCharisma && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Sub-Charisma
            </Text>
            <Text style={[styles.sectionValue, { color: colors.text }]}>{entry.subCharisma}</Text>
          </View>
        )}

        {/* Notes */}
        {entry.notes && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[styles.notesValue, { color: colors.text }]}>{entry.notes}</Text>
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: '#FF3B30' }]}
          onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Entry</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditing}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEdit}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Entry</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Text style={[styles.modalCloseButton, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Major Charisma */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Major Charisma</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text, backgroundColor: colors.card }]}
                  value={editedMajorCharisma}
                  onChangeText={setEditedMajorCharisma}
                  placeholder="Enter major charisma"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Sub Charisma */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Sub-Charisma</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text, backgroundColor: colors.card }]}
                  value={editedSubCharisma}
                  onChangeText={setEditedSubCharisma}
                  placeholder="Enter sub-charisma"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Notes */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput, { color: colors.text, backgroundColor: colors.card }]}
                  value={editedNotes}
                  onChangeText={setEditedNotes}
                  placeholder="Enter notes"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Emotions */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Emotions</Text>
                
                {/* Charisma-specific emojis */}
                {getCharismaEmojis(editedMajorCharisma).length > 0 && (
                  <View style={styles.charismaEmojisSection}>
                    <Text style={[styles.charismaEmojisLabel, { color: colors.gold }]}>
                      {editedMajorCharisma} Emojis
                    </Text>
                    <View style={styles.emotionsGrid}>
                      {getCharismaEmojis(editedMajorCharisma).map((emotion) => (
                        <TouchableOpacity
                          key={`charisma-${emotion}`}
                          style={[
                            styles.emotionButton,
                            styles.charismaEmotionButton,
                            { backgroundColor: colors.card },
                            editedEmotionEmojis.includes(emotion) && styles.selectedEmotionButton
                          ]}
                          onPress={() => handleEmotionToggle(emotion)}>
                          <Text style={styles.emotionText}>{emotion}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* General emotions */}
                <View style={styles.generalEmojisSection}>
                  <Text style={[styles.generalEmojisLabel, { color: colors.textSecondary }]}>
                    General Emotions
                  </Text>
                  <View style={styles.emotionsGrid}>
                    {['😊', '😄', '😎', '🤔', '😌', '😤', '🥳', '😢', '😡', '🤗', '😱', '🥺'].map((emotion) => (
                      <TouchableOpacity
                        key={`general-${emotion}`}
                        style={[
                          styles.emotionButton,
                          { backgroundColor: colors.card },
                          editedEmotionEmojis.includes(emotion) && styles.selectedEmotionButton
                        ]}
                        onPress={() => handleEmotionToggle(emotion)}>
                        <Text style={styles.emotionText}>{emotion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleCancelEdit}>
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.gold }]}
                onPress={handleSaveEdit}
                disabled={saving}>
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topEditButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    alignItems: 'center',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  date: {
    fontSize: 14,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  emotionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emotionEmoji: {
    fontSize: 32,
  },
  notesValue: {
    fontSize: 16,
    lineHeight: 24,
  },
  deleteButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    marginTop: 24,
    marginBottom: 40,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  roundEditButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proBadge: {
    position: 'absolute',
    top: -20,
    right: -2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    flexDirection: 'row',
    minWidth: 45,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1,
    includeFontPadding: false,
    textAlign: 'center',
    width: '100%',
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    fontSize: 24,
    fontWeight: '300',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  inputSection: {
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 50,
  },
  notesInput: {
    height: 120,
    minHeight: 120,
  },
  emotionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  emotionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  charismaEmotionButton: {
    borderWidth: 2,
    borderColor: '#F4C542',
  },
  selectedEmotionButton: {
    borderColor: '#F4C542',
    backgroundColor: '#2A2A2A',
  },
  emotionText: {
    fontSize: 24,
  },
  charismaEmojisSection: {
    marginBottom: 20,
  },
  charismaEmojisLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  generalEmojisSection: {
    marginTop: 16,
  },
  generalEmojisLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
