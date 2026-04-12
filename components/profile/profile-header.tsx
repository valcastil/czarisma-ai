import { CharismaLogo } from '@/components/charisma-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UserProfile } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditPress?: () => void;
}

export function ProfileHeader({ profile, onEditPress }: ProfileHeaderProps) {
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
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleEditProfile = () => {
    router.push('/edit-profile?tab=basic');
  };

  const joinDate = new Date(profile.joinDate);
  const formattedDate = joinDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getAge = (dateOfBirth?: number): string => {
    if (!dateOfBirth) return '';
    const age = Math.floor((Date.now() - dateOfBirth) / (365.25 * 24 * 60 * 60 * 1000));
    return `${age} years old`;
  };

  const getLocation = (): string => {
    if (profile.privacy?.showLocation) {
      return `${profile.location.city}, ${profile.location.country}`;
    }
    return 'Private';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gold, '#FFD93D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}>
        
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {profile.avatar ? (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
                  <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
                </View>
              ) : (
                <CharismaLogo size={80} />
              )}
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <IconSymbol size={12} name="checkmark" color="#FFFFFF" />
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text 
                style={styles.userName}
                allowFontScaling={false}
                numberOfLines={1}
                ellipsizeMode="tail">
                {profile.name}
              </Text>
              {profile.isVerified && (
                <IconSymbol size={16} name="checkmark.seal.fill" color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.username}>@{profile.username}</Text>
            <Text style={styles.joinDate}>Joined {formattedDate}</Text>
            
            {(profile.occupation || profile.location.city !== 'Unknown') && (
              <View style={styles.additionalInfo}>
                {profile.occupation && (
                  <Text style={styles.occupation}>{profile.occupation}</Text>
                )}
                <Text style={styles.location}>{getLocation()}</Text>
                {profile.dateOfBirth && profile.privacy?.showBirthDate && (
                  <Text style={styles.age}>{getAge(profile.dateOfBirth)}</Text>
                )}
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            activeOpacity={0.8}>
            <IconSymbol size={20} name="pencil" color="#000000" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.gold }]}>{profile.totalEntries}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entries</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.gold }]}>{profile.streak}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text 
            style={[styles.statNumber, { color: colors.gold }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {getCharismaDisplayName(profile.topCharisma)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Top Charisma</Text>
        </View>
      </View>

      {profile.bio && (
        <View style={[styles.bioContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.bioText, { color: colors.text }]}>
            {profile.bio}
          </Text>
        </View>
      )}

      {profile.socialLinks && Object.values(profile.socialLinks).some(v => v) && (
        <View style={[styles.socialContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.socialTitle, { color: colors.textSecondary }]}>SOCIAL MEDIA</Text>
          <View style={styles.socialGrid}>
            {[
              { key: 'instagram', icon: '📸', label: 'Instagram', urlPrefix: 'https://instagram.com/' },
              { key: 'facebook', icon: '👤', label: 'Facebook', urlPrefix: 'https://facebook.com/' },
              { key: 'twitter', icon: '𝕏', label: 'X', urlPrefix: 'https://x.com/' },
              { key: 'tiktok', icon: '🎵', label: 'TikTok', urlPrefix: 'https://tiktok.com/@' },
              { key: 'youtube', icon: '▶️', label: 'YouTube', urlPrefix: 'https://youtube.com/' },
              { key: 'linkedin', icon: '💼', label: 'LinkedIn', urlPrefix: 'https://linkedin.com/in/' },
              { key: 'snapchat', icon: '👻', label: 'Snapchat', urlPrefix: 'https://snapchat.com/add/' },
              { key: 'threads', icon: '🧵', label: 'Threads', urlPrefix: 'https://threads.net/@' },
              { key: 'whatsapp', icon: '💬', label: 'WhatsApp', urlPrefix: 'https://wa.me/' },
              { key: 'telegram', icon: '✈️', label: 'Telegram', urlPrefix: 'https://t.me/' },
            ]
              .filter(item => profile.socialLinks?.[item.key as keyof typeof profile.socialLinks])
              .map(item => {
                const value = profile.socialLinks?.[item.key as keyof typeof profile.socialLinks] || '';
                const isUrl = value.startsWith('http');
                const url = isUrl ? value : `${item.urlPrefix}${value.replace('@', '')}`;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.socialChip, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => Linking.openURL(url).catch(() => {})}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.socialChipIcon}>{item.icon}</Text>
                    <Text style={[styles.socialChipText, { color: colors.text }]} numberOfLines={1}>
                      {value.startsWith('http') ? item.label : value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  gradientBackground: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F4C542',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#F4C542',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 20,
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  username: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  additionalInfo: {
    marginTop: 8,
    gap: 2,
  },
  occupation: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  location: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  age: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '500',
  },
  editButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -15,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 6,
  },
  bioContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  socialContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  socialChipIcon: {
    fontSize: 14,
  },
  socialChipText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
});
