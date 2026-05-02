import { CharismaLogo } from '@/components/charisma-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { deleteAIQuote, getSavedAIQuotes } from '@/utils/ai-quote-storage';
import { syncEntryToSupabase } from '@/utils/entry-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const ENTRIES_KEY = '@charisma_entries';

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
  // Short, punchy charisma lines
  '"Charisma is a sparkle in people that money can\'t buy. It\'s an invisible energy with visible effects." — Marianne Williamson',
  '"Charisma is the transference of enthusiasm." — Ralph Archbold',
  '"Charisma is the knack of giving people your full attention." — Robert Brault',
  '"Charisma without character is postponed calamity." — Peter Ajisafe',
  '"Charisma gets the attention of man and character gets the attention of God." — Rich Wilkerson Jr.',
  // On real charisma vs. personality
  '"You can be revered for all sorts of qualities, but to be truly charismatic is rare." — Francesca Annis',
  '"Charisma is not just saying hello. It is dropping what you\'re doing to say hello." — Robert Brault',
  '"I think that natural beauty is very charismatic." — Elle Macpherson',
  '"Charisma knows only inner determination and inner restraint." — Max Weber',
  // Charisma in leadership
  '"Charisma is the result of effective leadership, not the other way around." — Warren G. Bennis',
  '"Effective leadership is about earning respect, and it\'s about personality and charisma." — Alan Sugar',
  '"Charismatic leaders don\'t say what people want to hear, but they say what people want to say." — C. L. Gammon',
  '"Charisma can inspire." — Simon Sinek',
  // On presence and energy
  '"People who love life have charisma because they fill the room with positive energy." — John C. Maxwell',
  '"Lack of charisma can be fatal." — Jenny Holzer',
  '"You either have the charisma, the knowledge, the passion, the intelligence or you don\'t." — Jon Gruden',
  '"Stand tall and be proud. Realize confidence is charismatic and something money can\'t buy; it radiates from within you." — Cindy Ann Peterson',
  // Critical / warning quotes about charisma
  '"The most dangerous people are always clever, compelling, and charismatic." — Malcolm McDowell',
  '"Just because someone is very charismatic, it doesn\'t mean that they\'re genuinely qualified." — Tenzin Palmo',
  '"Beware of the charismatic wolf in sheep\'s clothing. There is evil in the world. You can be tricked." — Terry Tempest Williams',
];

// Map charisma IDs to readable names
const charismaNames: { [key: string]: string } = {
  commanding: 'Commanding Presence',
  confidence: 'Confidence',
  expertise: 'Expertise',
  decisiveness: 'Decisiveness',
  leadership: 'Leadership Aura',
  competence: 'Recognized Competence',
  influence: 'Influence Through Power',
  respect: 'Respect from Others',
  bold_ideas: 'Bold Ideas',
  inspiring_vision: 'Inspiring Vision',
  creativity: 'Creativity',
  passionate_future: 'Passionate About Future',
  rally_others: 'Ability to Rally Others',
  persistence: 'Persistence in Goals',
  transformational: 'Transformational Thinking',
  confidence_innovation: 'Confidence in Innovation',
  empathy: 'Empathy',
  warmth: 'Warmth',
  compassion: 'Compassion',
  approachability: 'Approachability',
  generosity: 'Generosity',
  altruism: 'Altruism',
  selflessness: 'Selflessness',
  encouragement: 'Encouragement',
  deep_listening: 'Deep Listening',
  present_attention: 'Present Moment Attention',
  eye_contact: 'Eye Contact',
  engaged_conversation: 'Engaged in Conversation',
  genuine_interest: 'Genuine Interest',
  reflective_responses: 'Reflective Responses',
  makes_valued: 'Makes Others Feel Valued',
  mindfulness: 'Mindfulness',
  unique_personality: 'Unique Personality',
  life_story: 'Interesting Life Story',
  charismatic_voice: 'Charismatic Voice/Tone',
  humor: 'Humor',
  style: 'Style or Fashion Sense',
  storytelling: 'Storytelling Ability',
  passion_expression: 'Passion Expression',
  humble_confidence: 'Confidence Without Arrogance',
  immediate_impact: 'Immediate Impact',
  calm_confidence: 'Calm Confidence',
  friendly_demeanor: 'Friendly Demeanor',
  positive_energy: 'Positive Energy',
  composure: 'Composure Under Pressure',
  body_language: 'Body Language',
  smile_warmth: 'Smile and Warmth',
  first_impression: 'Strong First Impression',
  risk_taking: 'Social Risk-Taking',
  wit: 'Wit and Humor',
  bold_opinions: 'Bold Opinions',
  confident_criticism: 'Self-Confidence Despite Criticism',
  non_conformity: 'Non-Conformity',
  resilience: 'Resilience',
  authenticity: 'Authenticity',
  courage: 'Courage',
  humility: 'Humility',
  self_deprecating: 'Self-Deprecating Humor',
  modesty: 'Modesty',
  counter_approachability: 'Approachability',
  understated_confidence: 'Understated Confidence',
  relatability: 'Relatability',
  disarming: 'Disarming Others',
  plays_down_status: 'Plays Down Status',
  assertiveness: 'Assertiveness',
  strength_likability: 'Strength with Likability',
  toughness: 'Toughness',
  fearlessness: 'Fearlessness',
  strategic_dominance: 'Strategic Dominance',
  confrontation_confidence: 'Confidence in Confrontation',
  strong_will: 'Strong Will',
  crisis_leadership: 'Charismatic Crisis Leadership',
  idolization: 'Idolization',
  media_amplification: 'Media Amplification',
  symbolism: 'Symbolism',
  emotional_appeal: 'Emotional Appeal',
  worship_admiration: 'Worship-Like Admiration',
  charismatic_storytelling: 'Charismatic Storytelling',
  image_crafting: 'Public Image Crafting',
  mobilization: 'Mobilization of Followers',
  motivational_speaking: 'Motivational Speaking',
  emotional_connection: 'Emotional Connection',
  optimism: 'Optimism',
  inspire_encouragement: 'Encouragement',
  uplifting_stories: 'Uplifting Stories',
  passion_goals: 'Passion for Goals',
  teaching_mentoring: 'Teaching and Mentoring',
  collective_action: 'Rallying Collective Action',
  humble_leadership: 'Humble Leadership',
  serving_others: 'Serving Others First',
  facilitating_growth: 'Facilitating Growth',
  listening_speaking: 'Listening More Than Speaking',
  building_community: 'Building Community',
  authentic_care: 'Authentic Care',
  supportive_attitude: 'Supportive Attitude',
  leading_example: 'Leading by Example',
  // Inspirational Charisma
  inspirational_speaking: 'Speaking Head',
  raising_hands: 'Raising Hands',
  party_popper: 'Party Popper',
  inspirational_fire: 'Fire',
  inspirational_idea: 'Light Bulb',
  megaphone: 'Megaphone',
  // Transformational Charisma
  transformational_repeat: 'Repeat Button',
  transformational_rocket: 'Rocket',
  seedling: 'Seedling',
  wrench: 'Wrench',
  glowing_star: 'Glowing Star',
  gear: 'Gear',
  // Ethical Charisma
  balance_scale: 'Balance Scale',
  compass: 'Compass',
  ethical_handshake: 'Handshake',
  dove: 'Dove',
  lotus_position: 'Person in Lotus Position',
  ethical_idea: 'Light Bulb',
  // Socialized Charisma
  socialized_handshake: 'Handshake',
  globe: 'Globe Showing Americas',
  silhouette: 'Busts in Silhouette',
  open_hands: 'Open Hands',
  speech_balloon: 'Speech Balloon',
  hugging_face: 'Hugging Face',
  // Personalized Charisma
  money_mouth: 'Money-Mouth Face',
  performing_arts: 'Performing Arts',
  smiling_horns: 'Smiling Face with Horns',
  gem_stone: 'Gem Stone',
  sunglasses: 'Smiling Face with Sunglasses',
  briefcase: 'Briefcase',
  // Neo-Charismatic Leadership
  mechanical_arm: 'Mechanical Arm',
  neo_wrench: 'Wrench',
  neo_repeat: 'Repeat Button',
  hammer_wrench: 'Hammer and Wrench',
  neo_gear: 'Gear',
  chart_increasing: 'Chart Increasing',
  // Divine Charisma
  place_worship: 'Place of Worship',
  baby_angel: 'Baby Angel',
  sparkles: 'Sparkles',
  folded_hands: 'Folded Hands',
  divine_star: 'Glowing Star',
  candle: 'Candle',
  // Office-holder Charisma
  classical_building: 'Classical Building',
  military_medal: 'Military Medal',
  necktie: 'Necktie',
  scroll: 'Scroll',
  office_briefcase: 'Briefcase',
  receipt: 'Receipt',
  // Star Power Charisma
  star_power_star: 'Glowing Star',
  clapper_board: 'Clapper Board',
  microphone: 'Microphone',
  shooting_star: 'Shooting Star',
  star: 'Star',
  camera_flash: 'Camera With Flash',
  // Difficult/Disliked Charisma
  angry_face: 'Angry Face',
  firecracker: 'Firecracker',
  steam_nose: 'Face with Steam From Nose',
  bomb: 'Bomb',
  high_voltage: 'High Voltage',
  difficult_fire: 'Fire',
};

// Map charisma IDs to emojis
const charismaEmojis: { [key: string]: string } = {
  commanding: '👑',
  confidence: '💪',
  expertise: '📚',
  decisiveness: '🕴️',
  leadership: '🧑‍💼',
  competence: '🏆',
  influence: '🗣️',
  respect: '🙇‍♂️',
  bold_ideas: '🌟',
  inspiring_vision: '🔮',
  creativity: '🎨',
  passionate_future: '❤️',
  rally_others: '👥',
  persistence: '🔁',
  transformational: '🚀',
  confidence_innovation: '🦾',
  empathy: '🤗',
  warmth: '☀️',
  compassion: '💖',
  approachability: '👋',
  generosity: '🎁',
  altruism: '🤝',
  selflessness: '👐',
  encouragement: '🌻',
  deep_listening: '👂',
  present_attention: '🧘',
  eye_contact: '👀',
  engaged_conversation: '🗨️',
  genuine_interest: '💬',
  reflective_responses: '🤔',
  makes_valued: '🙌',
  mindfulness: '🧠',
  unique_personality: '🌈',
  life_story: '📖',
  charismatic_voice: '🎙️',
  humor: '😂',
  style: '👗',
  storytelling: '📚',
  passion_expression: '🔥',
  humble_confidence: '💫',
  immediate_impact: '⚡',
  calm_confidence: '😌',
  friendly_demeanor: '🙂',
  positive_energy: '✨',
  composure: '🧊',
  body_language: '💃',
  smile_warmth: '😊',
  first_impression: '👀',
  risk_taking: '🎭',
  wit: '😜',
  bold_opinions: '🗣️',
  confident_criticism: '😤',
  non_conformity: '❌',
  resilience: '🛡️',
  authenticity: '🧬',
  courage: '🦁',
  humility: '🙇‍♀️',
  self_deprecating: '🤡',
  modesty: '🙏',
  counter_approachability: '🤝',
  understated_confidence: '🏷️',
  relatability: '🧑‍🤝‍🧑',
  disarming: '💬',
  plays_down_status: '🧘',
  assertiveness: '🦾',
  strength_likability: '🛡️',
  toughness: '🐅',
  fearlessness: '🦅',
  strategic_dominance: '🎯',
  confrontation_confidence: '😎',
  strong_will: '🦸',
  crisis_leadership: '🧯',
  idolization: '👑',
  media_amplification: '📺',
  symbolism: '🕯️',
  emotional_appeal: '❤️',
  worship_admiration: '🙏',
  charismatic_storytelling: '📖',
  image_crafting: '📰',
  mobilization: '🧑‍🤝‍🧑',
  motivational_speaking: '🗣️',
  emotional_connection: '🤝',
  optimism: '🌞',
  inspire_encouragement: '✊',
  uplifting_stories: '📜',
  passion_goals: '💥',
  teaching_mentoring: '👩‍🏫',
  collective_action: '🎉',
  humble_leadership: '🙌',
  serving_others: '🤲',
  facilitating_growth: '🌱',
  listening_speaking: '👂',
  building_community: '🫂',
  authentic_care: '❤️',
  supportive_attitude: '🤗',
  leading_example: '🌟',
  // Inspirational Charisma
  inspirational_speaking: '🗣️',
  raising_hands: '🙌',
  party_popper: '🎉',
  inspirational_fire: '🔥',
  inspirational_idea: '💡',
  megaphone: '📣',
  // Transformational Charisma
  transformational_repeat: '🔄',
  transformational_rocket: '🚀',
  seedling: '🌱',
  wrench: '🔧',
  glowing_star: '🌟',
  gear: '⚙️',
  // Ethical Charisma
  balance_scale: '⚖️',
  compass: '🧭',
  ethical_handshake: '🤝',
  dove: '🕊️',
  lotus_position: '🧘',
  ethical_idea: '💡',
  // Socialized Charisma
  socialized_handshake: '🤝',
  globe: '🌍',
  silhouette: '👥',
  open_hands: '👐',
  speech_balloon: '💬',
  hugging_face: '🤗',
  // Personalized Charisma
  money_mouth: '🤑',
  performing_arts: '🎭',
  smiling_horns: '😈',
  gem_stone: '💎',
  sunglasses: '😎',
  briefcase: '💼',
  // Neo-Charismatic Leadership
  mechanical_arm: '🦾',
  neo_wrench: '🔧',
  neo_repeat: '🔄',
  hammer_wrench: '🛠️',
  neo_gear: '⚙️',
  chart_increasing: '📈',
  // Divine Charisma
  place_worship: '🛐',
  baby_angel: '👼',
  sparkles: '✨',
  folded_hands: '🙏',
  divine_star: '🌟',
  candle: '🕯️',
  // Office-holder Charisma
  classical_building: '🏛️',
  military_medal: '🎖️',
  necktie: '👔',
  scroll: '📜',
  office_briefcase: '💼',
  receipt: '🧾',
  // Star Power Charisma
  star_power_star: '🌟',
  clapper_board: '🎬',
  microphone: '🎤',
  shooting_star: '🌠',
  star: '⭐',
  camera_flash: '📸',
  // Difficult/Disliked Charisma
  angry_face: '😠',
  firecracker: '🧨',
  steam_nose: '😤',
  bomb: '💣',
  high_voltage: '⚡',
  difficult_fire: '🔥',
};

// Map emotion IDs to emojis
const emotionEmojis: { [key: string]: string } = {
  // Confidence & Power
  flexed_biceps: '💪',
  crown: '👑',
  lion: '🦁',
  trophy: '🏆',
  high_voltage: '⚡',
  sunglasses: '😎',
  man_suit: '🕴️',
  brain: '🧠',
  // Warmth & Kindness
  hugging_face: '🤗',
  sun: '☀️',
  sunflower: '🌻',
  sparkling_heart: '💖',
  rainbow: '🌈',
  handshake: '🤝',
  dove: '🕊️',
  open_hands: '👐',
  // Inspiration & Motivation
  rocket: '🚀',
  glowing_star: '🌟',
  fire: '🔥',
  sparkles: '✨',
  sun_face: '🌞',
  party_popper: '🎉',
  speaking_head: '🗣️',
  direct_hit: '🎯',
  // Focus & Presence
  eyes: '👀',
  ear: '👂',
  lotus_position: '🧘',
  brain_focus: '🧠',
  speech_bubble: '🗨️',
  raising_hands: '🙌',
  thinking_face: '🤔',
  speech_balloon: '💬',
  // Humor & Playfulness
  tears_joy: '😂',
  winking_tongue: '😜',
  clown_face: '🤡',
  rolling_laughing: '🤣',
  grinning_squinting: '😆',
  performing_arts: '🎭',
  smirking_face: '😏',
  upside_down: '🙃',
  // Humility & Relatability
  folded_hands: '🙏',
  people_holding: '🧑‍🤝‍🧑',
  handshake_humble: '🤝',
  pleading_face: '🥺',
  palms_up: '🤲',
  smiling_face: '😊',
  hugging_humble: '🤗',
  shushing_face: '🤫',
  // Courage & Boldness
  eagle: '🦅',
  superhero: '🦸',
  shield: '🛡️',
  dagger: '🗡️',
  mechanical_arm: '🦾',
  target: '🎯',
  fire_bold: '🔥',
  collision: '💥',
  // Empathy & Understanding
  handshake_empathy: '🤝',
  brain_empathy: '🧠',
  revolving_hearts: '💞',
  people_hugging: '🫂',
  face_monocle: '🧐',
  ear_empathy: '👂',
  // Enthusiasm & Energy
  high_voltage_energy: '⚡',
  fire_energy: '🔥',
  confetti_ball: '🎊',
  rocket_energy: '🚀',
  fireworks: '🎆',
  beaming_face: '😁',
  // Trust & Reliability
  locked: '🔒',
  shield_trust: '🛡️',
  handshake_trust: '🤝',
  owl: '🦉',
  scroll_trust: '📜',
  hourglass: '⏳',
  // Passion & Drive
  fire_passion: '🔥',
  heart_fire: '❤️‍🔥',
  target_passion: '🎯',
  collision_passion: '💥',
  glowing_star_passion: '🌟',
  fast_forward: '⏩',
  // Calm & Composure
  lotus_calm: '🧘‍♀️',
  herb: '🌿',
  dove_calm: '🕊️',
  relieved_face: '😌',
  water_wave: '🌊',
  person_bath: '🛀',
  // Warmth & Approachability
  smiling_face_warmth: '😊',
  sun_face_warmth: '🌞',
  yellow_heart: '💛',
  sunflower_warmth: '🌻',
  teddy_bear: '🧸',
  balloon: '🎈',
};

export default function AddEntryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [availableQuotes, setAvailableQuotes] = useState<string[]>(CHARISMA_QUOTES);
  const [savedAIQuotes, setSavedAIQuotes] = useState<string[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [selectedCharismaId, setSelectedCharismaId] = useState<string | null>(null);
  const [subCharisma, setSubCharisma] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
    loadSavedAIQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email || null);

      // All users get all quotes (no subscription paywall)
      const shuffledFreeQuotes = CHARISMA_QUOTES.sort(() => Math.random() - 0.5);
      const allQuotes = [...shuffledFreeQuotes, ...PRO_CHARISMA_QUOTES];
      setAvailableQuotes(allQuotes);
    } catch (error) {
      console.error('Error loading quotes:', error);
      // On error, show only free quotes (safer default)
      const shuffled = CHARISMA_QUOTES.sort(() => Math.random() - 0.5);
      setAvailableQuotes(shuffled);
    }
  };

  const loadSavedAIQuotes = async () => {
    try {
      const quotes = await getSavedAIQuotes();
      setSavedAIQuotes(quotes);
    } catch (error) {
      console.error('Error loading saved AI quotes:', error);
    }
  };

  const handleDeleteAIQuote = async (quote: string) => {
    try {
      await deleteAIQuote(quote);
      setSavedAIQuotes(prev => prev.filter(q => q !== quote));
    } catch (error) {
      console.error('Error deleting AI quote:', error);
    }
  };


  // For testing: Show all quotes including Pro ones
  const showAllQuotesForTesting = () => {
    console.log('Showing all quotes for testing (including Pro quotes)');
    const shuffledFreeQuotes = CHARISMA_QUOTES.sort(() => Math.random() - 0.5);
    const allQuotes = [...shuffledFreeQuotes, ...PRO_CHARISMA_QUOTES];
    setAvailableQuotes(allQuotes);
  };

  // Handle triple-tap on title for testing Pro quotes
  const handleTitlePress = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;

    if (timeSinceLastTap < 500) { // 500ms window for multiple taps
      setTapCount(tapCount + 1);
      if (tapCount + 1 >= 3) {
        showAllQuotesForTesting();
        setTapCount(0);
      }
    } else {
      setTapCount(1);
    }
  };

  const handleContinue = async () => {
    if (!subCharisma || !emotion) {
      Alert.alert('Almost There!', 'Please select a Sub-Charisma and an Emotion to continue.');
      return;
    }

    try {
      setSaving(true);

      // Get emoji for selected charisma
      const charismaEmoji = selectedCharismaId
        ? (charismaEmojis[selectedCharismaId] ||
           charismaEmojis[selectedCharismaId.replace('_', '')] ||
           charismaEmojis[selectedCharismaId.split('_')[0]] ||
           '✨')
        : '✨';

      // Load selected emotions
      const selectedEmotionsData = await AsyncStorage.getItem('@temp_selected_emotions');
      const selectedEmotionIds: string[] = selectedEmotionsData
        ? JSON.parse(selectedEmotionsData)
        : [];
      const selectedEmotionEmojis = selectedEmotionIds.map(id => emotionEmojis[id] || '');

      // Load existing entries
      const entriesData = await AsyncStorage.getItem(ENTRIES_KEY);
      const entries: CharismaEntry[] = entriesData ? JSON.parse(entriesData) : [];

      // Get current time
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Create new entry with the message as notes
      const newEntry: CharismaEntry = {
        id: Date.now().toString(),
        majorCharisma: selectedCharismaId || 'confidence',
        subCharisma: '',
        notes: message.trim(),
        timestamp: Date.now(),
        date: now.toLocaleDateString(),
        time: timeString,
        charismaEmoji: charismaEmoji,
        emotionEmojis: selectedEmotionEmojis,
      };

      // Add to beginning of array
      const updatedEntries = [newEntry, ...entries];

      // Save to storage
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));

      // Also sync to Supabase so followers can see it on the profile modal.
      // Best-effort; failures are logged but don't block the local save.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          await syncEntryToSupabase(newEntry, session.user.id);
        }
      } catch (syncErr) {
        console.error('Failed to sync new entry to Supabase:', syncErr);
      }

      // Clear temporary selections
      await AsyncStorage.removeItem('@temp_selected_charisma');
      await AsyncStorage.removeItem('@temp_selected_emotions');

      // Navigate back to home and scroll to entries
      router.push({ pathname: '/(tabs)', params: { scrollToEntries: 'true' } });
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectQuote = (quote: string) => {
    setSelectedQuote(quote);
    setShowQuotesModal(false);

    // Create new available quotes array with shuffled free quotes
    const shuffledFreeQuotes = CHARISMA_QUOTES.sort(() => Math.random() - 0.5);
    const newAvailableQuotes = [...shuffledFreeQuotes, ...PRO_CHARISMA_QUOTES];
    setAvailableQuotes(newAvailableQuotes);
  };

  const handleShuffleFreeQuotes = () => {
    const shuffled = CHARISMA_QUOTES.sort(() => Math.random() - 0.5);
    setAvailableQuotes([...shuffled, ...PRO_CHARISMA_QUOTES]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header with Logo and Title */}
      <View style={styles.header}>
        <CharismaLogo size={60} />
        <View style={styles.titleContainer}>
          <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
            <Text style={[styles.appTitle, { color: colors.text }]}>Czar AI</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Question and Subtitle */}
      <View style={styles.questionSection}>
        <Text style={[styles.question, { color: colors.text }]}>Anything you wanna share?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Write down below</Text>
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="enter the situation here"
          placeholderTextColor={colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          autoFocus
        />
        {/* Add Quote Button */}
        <TouchableOpacity
          style={[styles.addQuoteButton, { backgroundColor: colors.gold, shadowColor: colors.gold }]}
          onPress={() => setShowQuotesModal(true)}
          activeOpacity={0.8}>
          <Text style={[styles.addQuoteButtonText, { color: '#000000' }]}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Continue Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.8}>
          <Text style={styles.continueButtonText}>
            {saving ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quotes Modal */}
      <Modal
        visible={showQuotesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuotesModal(false)}
        onShow={loadSavedAIQuotes}>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
          onPress={() => setShowQuotesModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.background }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>✨ Inspirational Quotes</Text>
              <TouchableOpacity
                onPress={() => setShowQuotesModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.modalCloseButton, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.quotesScrollView} showsVerticalScrollIndicator={false}>
              {/* Free Quotes Section */}
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.gold }]}>Free Quotes</Text>
                  <TouchableOpacity
                    style={[styles.shuffleButton, { backgroundColor: colors.card }]}
                    onPress={handleShuffleFreeQuotes}
                    activeOpacity={0.7}>
                    <IconSymbol size={16} name="shuffle" color={colors.gold} />
                  </TouchableOpacity>
                </View>
                {availableQuotes.filter(quote => !PRO_CHARISMA_QUOTES.includes(quote)).map((quote, index) => (
                  <TouchableOpacity
                    key={`free-${index}`}
                    style={[styles.quoteItem, { backgroundColor: colors.card, borderLeftColor: colors.gold }]}
                    onPress={() => handleSelectQuote(quote)}
                    activeOpacity={0.7}>
                    <Text style={[styles.quoteText, { color: colors.text }]}>{quote}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Czar AI Saved Quotes Section */}
              {savedAIQuotes.length > 0 && (
                <View style={styles.proSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.gold }]}>🤖 Czar AI Quotes</Text>
                    <View style={[styles.aiQuoteCountBadge, { backgroundColor: colors.gold }]}>
                      <Text style={styles.aiQuoteCountText}>{savedAIQuotes.length}</Text>
                    </View>
                  </View>
                  {savedAIQuotes.map((quote, index) => (
                    <View key={`ai-${index}`} style={styles.aiQuoteRow}>
                      <TouchableOpacity
                        style={[styles.quoteItem, styles.aiQuoteItem, { backgroundColor: colors.card, borderLeftColor: colors.gold, flex: 1 }]}
                        onPress={() => handleSelectQuote(quote)}
                        activeOpacity={0.7}>
                        <Text style={[styles.quoteText, { color: colors.text }]}>{quote}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.aiQuoteDeleteButton}
                        onPress={() => handleDeleteAIQuote(quote)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}>
                        <Text style={[styles.aiQuoteDeleteText, { color: colors.textSecondary }]}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Pro Quotes Section */}
              <View style={styles.proSection}>
                <View style={styles.proSectionHeader}>
                  <Text style={[styles.proSectionTitle, { color: colors.gold }]}>✨ Pro Quotes</Text>
                </View>
                {PRO_CHARISMA_QUOTES.map((quote, index) => (
                  <TouchableOpacity
                    key={`pro-${index}`}
                    style={[
                      styles.quoteItem,
                      styles.proQuoteItem,
                      { backgroundColor: colors.card, borderLeftColor: colors.gold }
                    ]}
                    onPress={() => handleSelectQuote(quote)}
                    activeOpacity={0.7}>
                    <Text style={[styles.quoteText, { color: colors.text }]}>{quote}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Inspirational Quotes Section */}
              <View style={styles.proSection}>
                <View style={styles.proSectionHeader}>
                  <Text style={[styles.proSectionTitle, { color: colors.gold }]}>💬 Inspirational Quotes</Text>
                </View>
                {INSPIRATIONAL_CHARISMA_QUOTES.map((quote, index) => (
                  <TouchableOpacity
                    key={`insp-${index}`}
                    style={[
                      styles.quoteItem,
                      styles.proQuoteItem,
                      { backgroundColor: colors.card, borderLeftColor: colors.gold }
                    ]}
                    onPress={() => handleSelectQuote(quote)}
                    activeOpacity={0.7}>
                    <Text style={[styles.quoteText, { color: colors.text }]}>{quote}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  enableProButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  enableProButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  debugButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  proStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  proStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  trialStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  trialStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  questionSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    position: 'relative',
  },
  textInput: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  addQuoteButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addQuoteButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bottomSection: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    paddingTop: 20,
  },
  continueButton: {
    backgroundColor: '#F4C542',
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#F4C542',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    fontSize: 28,
    fontWeight: '300',
  },
  quotesScrollView: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  quoteItem: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  shuffleButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F4C542',
  },
  proSection: {
    marginTop: 24,
  },
  proSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  proSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  proQuoteItem: {
  },
  lockedQuoteItem: {
    opacity: 0.6,
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 32,
  },
  proBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 0.8,
    includeFontPadding: false,
    textAlign: 'center',
  },
  lockIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  lockEmoji: {
    fontSize: 16,
  },
  aiQuoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  aiQuoteItem: {
    marginBottom: 0,
  },
  aiQuoteDeleteButton: {
    padding: 8,
  },
  aiQuoteDeleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  aiQuoteCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  aiQuoteCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
});
