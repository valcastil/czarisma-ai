import { IconSymbol } from '@/components/ui/icon-symbol';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SharedLink, getSharedLinks } from '@/utils/link-storage';
import { SecureStorage } from '@/utils/secure-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const ENTRIES_KEY = '@charisma_entries';

// Map charisma IDs to readable names (same as in add-entry.tsx)
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

// Map emotion IDs to emojis (same as in add-entry.tsx)
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

// Map emotion IDs to readable names
const emotionNames: { [key: string]: string } = {
  // Confidence & Power
  flexed_biceps: 'Flexed Biceps',
  crown: 'Crown',
  lion: 'Lion',
  trophy: 'Trophy',
  high_voltage: 'High Voltage',
  sunglasses: 'Sunglasses',
  man_suit: 'Man in Suit',
  brain: 'Brain',
  // Warmth & Kindness
  hugging_face: 'Hugging Face',
  sun: 'Sun',
  sunflower: 'Sunflower',
  sparkling_heart: 'Sparkling Heart',
  rainbow: 'Rainbow',
  handshake: 'Handshake',
  dove: 'Dove',
  open_hands: 'Open Hands',
  // Inspiration & Motivation
  rocket: 'Rocket',
  glowing_star: 'Glowing Star',
  fire: 'Fire',
  sparkles: 'Sparkles',
  sun_face: 'Sun with Face',
  party_popper: 'Party Popper',
  speaking_head: 'Speaking Head',
  direct_hit: 'Direct Hit',
  // Focus & Presence
  eyes: 'Eyes',
  ear: 'Ear',
  lotus_position: 'Lotus Position',
  brain_focus: 'Brain Focus',
  speech_bubble: 'Speech Bubble',
  raising_hands: 'Raising Hands',
  thinking_face: 'Thinking Face',
  speech_balloon: 'Speech Balloon',
  // Humor & Playfulness
  tears_joy: 'Tears of Joy',
  winking_tongue: 'Winking Tongue',
  clown_face: 'Clown Face',
  rolling_laughing: 'Rolling Laughing',
  grinning_squinting: 'Grinning Squinting',
  performing_arts: 'Performing Arts',
  smirking_face: 'Smirking Face',
  upside_down: 'Upside-Down Face',
  // Humility & Relatability
  folded_hands: 'Folded Hands',
  people_holding: 'People Holding Hands',
  handshake_humble: 'Handshake',
  pleading_face: 'Pleading Face',
  palms_up: 'Palms Up',
  smiling_face: 'Smiling Face',
  hugging_humble: 'Hugging Face',
  shushing_face: 'Shushing Face',
  // Courage & Boldness
  eagle: 'Eagle',
  superhero: 'Superhero',
  shield: 'Shield',
  dagger: 'Dagger',
  mechanical_arm: 'Mechanical Arm',
  target: 'Target',
  fire_bold: 'Fire',
  collision: 'Collision',
  // Empathy & Understanding
  handshake_empathy: 'Handshake',
  brain_empathy: 'Brain',
  revolving_hearts: 'Revolving Hearts',
  people_hugging: 'People Hugging',
  face_monocle: 'Face with Monocle',
  ear_empathy: 'Ear',
  // Enthusiasm & Energy
  high_voltage_energy: 'High Voltage',
  fire_energy: 'Fire',
  confetti_ball: 'Confetti Ball',
  rocket_energy: 'Rocket',
  fireworks: 'Fireworks',
  beaming_face: 'Beaming Face',
  // Trust & Reliability
  locked: 'Locked',
  shield_trust: 'Shield',
  handshake_trust: 'Handshake',
  owl: 'Owl',
  scroll_trust: 'Scroll',
  hourglass: 'Hourglass',
  // Passion & Drive
  fire_passion: 'Fire',
  heart_fire: 'Heart on Fire',
  target_passion: 'Target',
  collision_passion: 'Collision',
  glowing_star_passion: 'Glowing Star',
  fast_forward: 'Fast Forward',
  // Calm & Composure
  lotus_calm: 'Person in Lotus Position',
  herb: 'Herb',
  dove_calm: 'Dove',
  relieved_face: 'Relieved Face',
  water_wave: 'Water Wave',
  person_bath: 'Person Taking Bath',
  // Warmth & Approachability
  smiling_face_warmth: 'Smiling Face',
  sun_face_warmth: 'Sun with Face',
  yellow_heart: 'Yellow Heart',
  sunflower_warmth: 'Sunflower',
  teddy_bear: 'Teddy Bear',
  balloon: 'Balloon',
};

interface SearchResult {
  entry: CharismaEntry;
  matchedCharisma?: string;
  matchedEmotions?: string[];
  matchedNotes?: boolean;
}

interface LinkSearchResult {
  link: SharedLink;
  matchedUrl?: boolean;
  matchedLabel?: boolean;
  matchedPlatform?: boolean;
  matchedTitle?: boolean;
  matchedDescription?: boolean;
  matchedHashtags?: string[];
}

const platformIcons: { [key: string]: string } = {
  youtube: 'play.rectangle.fill',
  instagram: 'camera.fill',
  tiktok: 'music.note',
  reels: 'film',
  unknown: 'link',
} as const;

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [allEntries, setAllEntries] = useState<CharismaEntry[]>([]);
  const [allLinks, setAllLinks] = useState<SharedLink[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [linkResults, setLinkResults] = useState<LinkSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesData, links] = await Promise.all([
        SecureStorage.getItem(ENTRIES_KEY),
        getSharedLinks(),
      ]);
      const entries: CharismaEntry[] = entriesData ? JSON.parse(entriesData) : [];
      setAllEntries(entries);
      setAllLinks(links);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const searchAll = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setLinkResults([]);
      return;
    }

    setSearching(true);
    const lowercaseQuery = query.toLowerCase().trim();

    // Extract hashtags from text (e.g. "#charisma" => "charisma")
    const extractHashtags = (text: string): string[] => {
      const matches = text.match(/#(\w+)/g);
      return matches ? matches.map(h => h.slice(1).toLowerCase()) : [];
    };

    // Search social links
    const matchedLinks: LinkSearchResult[] = allLinks
      .map(link => {
        const matches: LinkSearchResult = { link };

        if (link.url.toLowerCase().includes(lowercaseQuery)) {
          matches.matchedUrl = true;
        }
        if (link.label.toLowerCase().includes(lowercaseQuery)) {
          matches.matchedLabel = true;
        }
        if (link.platform.toLowerCase().includes(lowercaseQuery)) {
          matches.matchedPlatform = true;
        }
        if (link.title && link.title.toLowerCase().includes(lowercaseQuery)) {
          matches.matchedTitle = true;
        }
        if (link.description && link.description.toLowerCase().includes(lowercaseQuery)) {
          matches.matchedDescription = true;
        }

        // Search hashtags: strip # so "charisma" matches "#charisma"
        const combinedText = `${link.title || ''} ${link.description || ''}`;
        const allHashtags = extractHashtags(combinedText);
        // Query without leading # if user typed it
        const cleanQuery = lowercaseQuery.startsWith('#') ? lowercaseQuery.slice(1) : lowercaseQuery;
        const matchedHashtags = allHashtags.filter(tag => tag.includes(cleanQuery));
        if (matchedHashtags.length > 0) {
          matches.matchedHashtags = matchedHashtags;
        }

        if (
          matches.matchedUrl ||
          matches.matchedLabel ||
          matches.matchedPlatform ||
          matches.matchedTitle ||
          matches.matchedDescription ||
          matches.matchedHashtags
        ) {
          return matches;
        }
        return null;
      })
      .filter((r): r is LinkSearchResult => r !== null)
      .sort((a, b) => b.link.timestamp - a.link.timestamp);

    setLinkResults(matchedLinks);

    // Search charisma entries
    const results: SearchResult[] = allEntries
      .map(entry => {
        const matches: SearchResult = { entry };

        // Search in charisma name
        const charismaName = charismaNames[entry.majorCharisma] || entry.majorCharisma;
        if (charismaName.toLowerCase().includes(lowercaseQuery)) {
          matches.matchedCharisma = charismaName;
        }

        // Search in sub-charisma
        if (entry.subCharisma && entry.subCharisma.toLowerCase().includes(lowercaseQuery)) {
          matches.matchedCharisma = entry.subCharisma;
        }

        // Search in emotion names
        const matchedEmotions: string[] = [];
        if (entry.emotionEmojis && entry.emotionEmojis.length > 0) {
          entry.emotionEmojis.forEach(emoji => {
            // Find emotion ID by emoji
            const emotionId = Object.keys(emotionEmojis).find(id => {
              const emotionEmoji = emotionEmojis[id] || '';
              return emotionEmoji === emoji;
            });
            
            if (emotionId) {
              const emotionName = emotionNames[emotionId];
              if (emotionName && emotionName.toLowerCase().includes(lowercaseQuery)) {
                matchedEmotions.push(emotionName);
              }
            }
          });
        }
        
        if (matchedEmotions.length > 0) {
          matches.matchedEmotions = matchedEmotions;
        }

        // Search in notes
        if (entry.notes && entry.notes.toLowerCase().includes(lowercaseQuery)) {
          matches.matchedNotes = true;
        }

        // Only include if there's at least one match
        if (matches.matchedCharisma || matches.matchedEmotions?.length || matches.matchedNotes) {
          return matches;
        }

        return null;
      })
      .filter((result): result is SearchResult => result !== null)
      .sort((a, b) => b.entry.timestamp - a.entry.timestamp); // Sort by most recent

    setSearchResults(results);
    setSearching(false);
  }, [allEntries, allLinks]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchAll(searchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchAll]);

  const handleEntryPress = (entryId: string) => {
    router.push(`/entry/${entryId}`);
  };

  const handleLinkPress = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Could not open this link');
    }
  };

  const totalResults = searchResults.length + linkResults.length;

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <Text key={index} style={[styles.highlightText, { color: colors.gold }]}>{part}</Text> : 
        <Text key={index}>{part}</Text>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <IconSymbol size={20} name="magnifyingglass" color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search entries, links, hashtags, descriptions..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching && (
            <ActivityIndicator size="small" color={colors.gold} />
          )}
        </View>
      </View>

      {/* Search Results */}
      <ScrollView style={styles.results} contentContainerStyle={styles.resultsContainer}>
        {searchQuery.trim() === '' ? (
          <View style={styles.emptyState}>
            <IconSymbol size={48} name="magnifyingglass" color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Enter a search term to find entries and links
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Try searching for charisma types, emotions, notes, hashtags, or link descriptions
            </Text>
          </View>
        ) : totalResults === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol size={48} name="doc.text.magnifyingglass" color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No results found for "{searchQuery}"
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Try different keywords or check spelling
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
              Found {totalResults} result{totalResults !== 1 ? 's' : ''}
            </Text>

            {/* Social Link Results */}
            {linkResults.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { color: colors.gold }]}>Social Links ({linkResults.length})</Text>
                {linkResults.map((result) => (
                  <TouchableOpacity
                    key={result.link.id}
                    style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleLinkPress(result.link.url)}
                    activeOpacity={0.7}>
                    <View style={styles.resultHeader}>
                      <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
                        {result.link.date}
                      </Text>
                      <Text style={[styles.resultTime, { color: colors.textSecondary }]}>
                        {result.link.time}
                      </Text>
                    </View>
                    <View style={styles.charismaSection}>
                      <IconSymbol size={28} name={platformIcons[result.link.platform] as any || 'link'} color={colors.gold} />
                      <View style={styles.charismaTextContainer}>
                        <Text style={[styles.charismaName, { color: colors.text }]}>
                          {result.matchedLabel ? highlightMatch(result.link.label, searchQuery) : result.link.label}
                        </Text>
                        {result.link.title && (
                          <Text style={[styles.subCharisma, { color: colors.text }]} numberOfLines={2}>
                            {result.matchedTitle ? highlightMatch(result.link.title, searchQuery) : result.link.title}
                          </Text>
                        )}
                        <Text style={[styles.subCharisma, { color: colors.textSecondary }]} numberOfLines={1}>
                          {result.matchedUrl ? highlightMatch(result.link.url, searchQuery) : result.link.url}
                        </Text>
                        {result.matchedDescription && result.link.description && (
                          <Text style={[styles.subCharisma, { color: colors.textSecondary }]} numberOfLines={3}>
                            {highlightMatch(result.link.description, searchQuery)}
                          </Text>
                        )}
                        {result.matchedHashtags && result.matchedHashtags.length > 0 && (
                          <View style={[styles.emotionsContainer, { marginTop: 6 }]}>
                            {result.matchedHashtags.map((tag, i) => (
                              <Text key={i} style={[styles.emotionTag, { backgroundColor: colors.gold, color: '#000000' }]}>
                                #{highlightMatch(tag, searchQuery.startsWith('#') ? searchQuery.slice(1) : searchQuery)}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                    {result.matchedPlatform && (
                      <View style={styles.emotionsSection}>
                        <Text style={[styles.emotionTag, { backgroundColor: colors.gold, color: '#000000' }]}>
                          {result.link.platform}
                        </Text>
                      </View>
                    )}
                    <View style={styles.arrowIndicator}>
                      <IconSymbol size={16} name="arrow.up.right" color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Charisma Entry Results */}
            {searchResults.length > 0 && (
              <Text style={[styles.sectionHeader, { color: colors.gold }]}>Charisma Entries ({searchResults.length})</Text>
            )}
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.entry.id}
                style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleEntryPress(result.entry.id)}
                activeOpacity={0.7}>
                
                {/* Date and Time */}
                <View style={styles.resultHeader}>
                  <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
                    {result.entry.date}
                  </Text>
                  {result.entry.time && (
                    <Text style={[styles.resultTime, { color: colors.textSecondary }]}>
                      {result.entry.time}
                    </Text>
                  )}
                </View>

                {/* Charisma Emoji and Name */}
                <View style={styles.charismaSection}>
                  {result.entry.charismaEmoji && (
                    <Text style={styles.charismaEmoji}>{result.entry.charismaEmoji}</Text>
                  )}
                  <View style={styles.charismaTextContainer}>
                    <Text style={[styles.charismaName, { color: colors.text }]}>
                      {result.matchedCharisma ? 
                        highlightMatch(result.matchedCharisma, searchQuery) : 
                        (charismaNames[result.entry.majorCharisma] || result.entry.majorCharisma)
                      }
                    </Text>
                    {result.entry.subCharisma && (
                      <Text style={[styles.subCharisma, { color: colors.textSecondary }]}>
                        {result.entry.subCharisma}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Matched Emotions */}
                {result.matchedEmotions && result.matchedEmotions.length > 0 && (
                  <View style={styles.emotionsSection}>
                    <Text style={[styles.matchLabel, { color: colors.textSecondary }]}>
                      Matched Emotions:
                    </Text>
                    <View style={styles.emotionsContainer}>
                      {result.matchedEmotions.map((emotion, index) => (
                        <Text key={index} style={[styles.emotionTag, { backgroundColor: colors.gold, color: '#000000' }]}>
                          {highlightMatch(emotion, searchQuery)}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* All Emojis */}
                {result.entry.emotionEmojis && result.entry.emotionEmojis.length > 0 && (
                  <View style={styles.allEmojisContainer}>
                    {result.entry.emotionEmojis.map((emoji, index) => (
                      <Text key={index} style={styles.emotionEmoji}>{emoji}</Text>
                    ))}
                  </View>
                )}

                {/* Matched Notes */}
                {result.matchedNotes && result.entry.notes && (
                  <View style={styles.notesSection}>
                    <Text style={[styles.matchLabel, { color: colors.textSecondary }]}>
                      Notes:
                    </Text>
                    <Text style={[styles.notesText, { color: colors.text }]} numberOfLines={3}>
                      {highlightMatch(result.entry.notes, searchQuery)}
                    </Text>
                  </View>
                )}

                {/* Arrow Indicator */}
                <View style={styles.arrowIndicator}>
                  <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  results: {
    flex: 1,
  },
  resultsContainer: {
    padding: 20,
    paddingBottom: 20,
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
  resultsCount: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  resultCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: 'relative',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultDate: {
    fontSize: 12,
  },
  resultTime: {
    fontSize: 12,
  },
  charismaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  charismaEmoji: {
    fontSize: 32,
  },
  charismaTextContainer: {
    flex: 1,
  },
  charismaName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subCharisma: {
    fontSize: 14,
  },
  emotionsSection: {
    marginBottom: 12,
  },
  matchLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emotionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emotionTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  allEmojisContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  emotionEmoji: {
    fontSize: 20,
  },
  notesSection: {
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  arrowIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  highlightText: {
    fontWeight: '700',
  },
});
