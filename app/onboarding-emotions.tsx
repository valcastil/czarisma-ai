import { CharismaLogo } from '@/components/charisma-logo';
import { useTheme } from '@/hooks/use-theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ONBOARDING_KEY = '@charisma_onboarding';

interface EmotionOption {
  emoji: string;
  label: string;
  id: string;
}

interface EmotionCategory {
  title: string;
  options: EmotionOption[];
}

const emotionCategories: EmotionCategory[] = [
  {
    title: 'Confidence & Power',
    options: [
      { emoji: '💪', label: 'Flexed\nBiceps', id: 'flexed_biceps' },
      { emoji: '👑', label: 'Crown', id: 'crown' },
      { emoji: '🦁', label: 'Lion', id: 'lion' },
      { emoji: '🏆', label: 'Trophy', id: 'trophy' },
      { emoji: '⚡', label: 'High\nVoltage', id: 'high_voltage' },
      { emoji: '😎', label: 'Sunglasses', id: 'sunglasses' },
      { emoji: '🕴️', label: 'Man in\nSuit', id: 'man_suit' },
      { emoji: '🧠', label: 'Brain', id: 'brain' },
    ],
  },
  {
    title: 'Warmth & Kindness',
    options: [
      { emoji: '🤗', label: 'Hugging\nFace', id: 'hugging_face_warmth' },
      { emoji: '☀️', label: 'Sun', id: 'sun' },
      { emoji: '🌻', label: 'Sunflower', id: 'sunflower' },
      { emoji: '💖', label: 'Sparkling\nHeart', id: 'sparkling_heart' },
      { emoji: '🌈', label: 'Rainbow', id: 'rainbow' },
      { emoji: '🤝', label: 'Handshake', id: 'handshake_warmth' },
      { emoji: '🕊️', label: 'Dove', id: 'dove' },
      { emoji: '👐', label: 'Open\nHands', id: 'open_hands' },
    ],
  },
  {
    title: 'Inspiration & Motivation',
    options: [
      { emoji: '🚀', label: 'Rocket', id: 'rocket' },
      { emoji: '🌟', label: 'Glowing\nStar', id: 'glowing_star' },
      { emoji: '🔥', label: 'Fire', id: 'fire' },
      { emoji: '✨', label: 'Sparkles', id: 'sparkles' },
      { emoji: '🌞', label: 'Sun with\nFace', id: 'sun_face' },
      { emoji: '🎉', label: 'Party\nPopper', id: 'party_popper' },
      { emoji: '🗣️', label: 'Speaking\nHead', id: 'speaking_head' },
      { emoji: '🎯', label: 'Direct Hit', id: 'direct_hit' },
    ],
  },
  {
    title: 'Focus & Presence',
    options: [
      { emoji: '👀', label: 'Eyes', id: 'eyes' },
      { emoji: '👂', label: 'Ear', id: 'ear' },
      { emoji: '🧘', label: 'Lotus\nPosition', id: 'lotus_position' },
      { emoji: '🧠', label: 'Brain', id: 'brain_2' },
      { emoji: '🗨️', label: 'Speech\nBubble', id: 'speech_bubble' },
      { emoji: '🙌', label: 'Raising\nHands', id: 'raising_hands' },
      { emoji: '🤔', label: 'Thinking\nFace', id: 'thinking_face' },
      { emoji: '💬', label: 'Speech\nBalloon', id: 'speech_balloon' },
    ],
  },
  {
    title: 'Humor & Playfulness',
    options: [
      { emoji: '😂', label: 'Tears of\nJoy', id: 'tears_joy' },
      { emoji: '😜', label: 'Winking\nTongue', id: 'winking_tongue' },
      { emoji: '🤡', label: 'Clown\nFace', id: 'clown_face' },
      { emoji: '🤣', label: 'Rolling\nLaughing', id: 'rolling_laughing' },
      { emoji: '😆', label: 'Grinning\nSquinting', id: 'grinning_squinting' },
      { emoji: '🎭', label: 'Performing\nArts', id: 'performing_arts' },
      { emoji: '😏', label: 'Smirking\nFace', id: 'smirking_face' },
      { emoji: '🙃', label: 'Upside-Down\nFace', id: 'upside_down' },
    ],
  },
  {
    title: 'Humility & Relatability',
    options: [
      { emoji: '🙏', label: 'Folded\nHands', id: 'folded_hands' },
      { emoji: '🧑‍🤝‍🧑', label: 'People\nHolding Hands', id: 'people_holding' },
      { emoji: '🤝', label: 'Handshake', id: 'handshake_2' },
      { emoji: '🥺', label: 'Pleading\nFace', id: 'pleading_face' },
      { emoji: '🤲', label: 'Palms Up', id: 'palms_up' },
      { emoji: '😊', label: 'Smiling\nFace', id: 'smiling_face' },
      { emoji: '🤗', label: 'Hugging\nFace', id: 'hugging_face_2' },
      { emoji: '🤫', label: 'Shushing\nFace', id: 'shushing_face' },
    ],
  },
  {
    title: 'Courage & Boldness',
    options: [
      { emoji: '🦅', label: 'Eagle', id: 'eagle' },
      { emoji: '🦸', label: 'Superhero', id: 'superhero' },
      { emoji: '🛡️', label: 'Shield', id: 'shield' },
      { emoji: '🗡️', label: 'Dagger', id: 'dagger' },
      { emoji: '🦾', label: 'Mechanical\nArm', id: 'mechanical_arm' },
      { emoji: '🎯', label: 'Target', id: 'target' },
      { emoji: '🔥', label: 'Fire', id: 'fire_2' },
      { emoji: '💥', label: 'Collision', id: 'collision' },
    ],
  },
  {
    title: 'Empathy & Understanding',
    options: [
      { emoji: '🤝', label: 'Handshake', id: 'handshake_empathy' },
      { emoji: '🧠', label: 'Brain', id: 'brain_empathy' },
      { emoji: '💞', label: 'Revolving\nHearts', id: 'revolving_hearts' },
      { emoji: '🫂', label: 'People\nHugging', id: 'people_hugging' },
      { emoji: '🧐', label: 'Face with\nMonocle', id: 'face_monocle' },
      { emoji: '👂', label: 'Ear', id: 'ear_empathy' },
    ],
  },
  {
    title: 'Enthusiasm & Energy',
    options: [
      { emoji: '⚡', label: 'High\nVoltage', id: 'high_voltage_energy' },
      { emoji: '🔥', label: 'Fire', id: 'fire_energy' },
      { emoji: '🎊', label: 'Confetti\nBall', id: 'confetti_ball' },
      { emoji: '🚀', label: 'Rocket', id: 'rocket_energy' },
      { emoji: '🎆', label: 'Fireworks', id: 'fireworks' },
      { emoji: '😁', label: 'Beaming\nFace', id: 'beaming_face' },
    ],
  },
  {
    title: 'Trust & Reliability',
    options: [
      { emoji: '🔒', label: 'Locked', id: 'locked' },
      { emoji: '🛡️', label: 'Shield', id: 'shield_trust' },
      { emoji: '🤝', label: 'Handshake', id: 'handshake_trust' },
      { emoji: '🦉', label: 'Owl', id: 'owl' },
      { emoji: '📜', label: 'Scroll', id: 'scroll_trust' },
      { emoji: '⏳', label: 'Hourglass', id: 'hourglass' },
    ],
  },
  {
    title: 'Passion & Drive',
    options: [
      { emoji: '🔥', label: 'Fire', id: 'fire_passion' },
      { emoji: '❤️‍🔥', label: 'Heart on\nFire', id: 'heart_fire' },
      { emoji: '🎯', label: 'Target', id: 'target_passion' },
      { emoji: '💥', label: 'Collision', id: 'collision_passion' },
      { emoji: '🌟', label: 'Glowing\nStar', id: 'glowing_star_passion' },
      { emoji: '⏩', label: 'Fast\nForward', id: 'fast_forward' },
    ],
  },
  {
    title: 'Calm & Composure',
    options: [
      { emoji: '🧘‍♀️', label: 'Person in\nLotus Position', id: 'lotus_calm' },
      { emoji: '🌿', label: 'Herb', id: 'herb' },
      { emoji: '🕊️', label: 'Dove', id: 'dove_calm' },
      { emoji: '😌', label: 'Relieved\nFace', id: 'relieved_face' },
      { emoji: '🌊', label: 'Water\nWave', id: 'water_wave' },
      { emoji: '🛀', label: 'Person\nTaking Bath', id: 'person_bath' },
    ],
  },
  {
    title: 'Warmth & Approachability',
    options: [
      { emoji: '😊', label: 'Smiling\nFace', id: 'smiling_face_warmth' },
      { emoji: '🌞', label: 'Sun with\nFace', id: 'sun_face_warmth' },
      { emoji: '💛', label: 'Yellow\nHeart', id: 'yellow_heart' },
      { emoji: '🌻', label: 'Sunflower', id: 'sunflower_warmth' },
      { emoji: '🧸', label: 'Teddy\nBear', id: 'teddy_bear' },
      { emoji: '🎈', label: 'Balloon', id: 'balloon' },
    ],
  },
];

export default function OnboardingEmotionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [shuffledCategories, setShuffledCategories] = useState<EmotionCategory[]>([]);

  useEffect(() => {
    shuffleCategories();
  }, []);

  const shuffleCategories = () => {
    // Since all emotion categories are free, shuffle all of them
    const shuffled = [...emotionCategories].sort(() => Math.random() - 0.5);
    setShuffledCategories(shuffled);
  };

  const toggleEmotion = (emotionId: string) => {
    if (selectedEmotions.includes(emotionId)) {
      setSelectedEmotions(selectedEmotions.filter(id => id !== emotionId));
    } else {
      setSelectedEmotions([...selectedEmotions, emotionId]);
    }
  };

  const handleContinue = async () => {
    // Validate that at least one emotion is selected
    if (selectedEmotions.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one emotion to continue.');
      return;
    }

    // Store selected emotions and go to add-entry
    try {
      await AsyncStorage.setItem('@temp_selected_emotions', JSON.stringify(selectedEmotions));

      // Check if this is initial onboarding
      const onboardingData = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!onboardingData) {
        // Mark onboarding as complete for first-time users
        await AsyncStorage.setItem(
          ONBOARDING_KEY,
          JSON.stringify({ completed: true })
        );
      }

      router.push('/add-entry');
    } catch (error) {
      console.error('Error saving emotions:', error);
      Alert.alert('Error', 'Failed to save emotions. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Logo and Title */}
      <View style={styles.header}>
        <CharismaLogo size={60} />
        <Text style={[styles.appTitle, { color: colors.text }]}>CzarApp</Text>
      </View>

      {/* Question and Subtitle */}
      <View style={styles.questionSection}>
        <Text style={[styles.question, { color: colors.text }]}>How are you feeling?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Choose all that apply</Text>
      </View>

      {/* Emotions by Category */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {shuffledCategories.map((category, categoryIndex) => (
          <View key={categoryIndex} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: colors.gold }]}>{category.title}</Text>
            <View style={styles.grid}>
              {category.options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.emotionCard,
                    { backgroundColor: colors.card, borderColor: 'transparent' },
                    selectedEmotions.includes(option.id) && [styles.emotionCardSelected, { borderColor: colors.gold }],
                  ]}
                  onPress={() => toggleEmotion(option.id)}
                  activeOpacity={0.7}>
                  <Text style={styles.emoji}>{option.emoji}</Text>
                  <Text style={[styles.emotionLabel, { color: colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.gold }]}
          onPress={handleContinue}
          activeOpacity={0.8}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  questionSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  question: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categorySection: {
    marginBottom: 48,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'left',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emotionCard: {
    width: '30.5%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderWidth: 2,
    marginBottom: 12,
  },
  emotionCardSelected: {
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
  },
  emoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  bottomSection: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
  },
  continueButton: {
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
});
