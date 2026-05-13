import { CharismaEntry, UserProfile, UserStats } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { SecureStorage } from '@/utils/secure-storage';

const PROFILE_KEY = '@charisma_profile';
const ENTRIES_KEY = '@charisma_entries';

// Add a constant for user counter
const USER_COUNTER_KEY = '@charisma_user_counter';

// Generate serial username based on user count
const generateSerialUsername = async (): Promise<string> => {
  try {
    const counterData = await SecureStorage.getItem(USER_COUNTER_KEY);
    let userCount = counterData ? parseInt(counterData, 10) : 0;
    userCount += 1; // Increment for new user

    // Save the updated count
    await SecureStorage.setItem(USER_COUNTER_KEY, userCount.toString());

    // Generate username with 7-digit padding (e.g., user_0000001)
    const username = `user_${userCount.toString().padStart(7, '0')}`;
    console.log('Generated serial username:', username, 'for user count:', userCount);

    return username;
  } catch (error) {
    console.error('Error generating serial username:', error);
    // Fallback to timestamp-based username if there's an error
    return `user_${Date.now().toString().slice(-7)}`;
  }
};

export const createDefaultProfile = async (): Promise<UserProfile> => {
  const username = await generateSerialUsername();

  return {
    id: Date.now().toString(),
    name: 'Charisma User',
    username: username,
    email: 'user@charismachat.com',
    password: 'charisma123', // Default password
    phone: undefined,
    avatar: undefined,
    dateOfBirth: undefined,
    gender: undefined,
    location: { city: 'Unknown', country: 'Unknown' },
    isVerified: false,
    twoFactorEnabled: false,
    bio: '',
    interests: [],
    occupation: undefined,
    website: undefined,
    socialLinks: {},
    joinDate: Date.now(),
    totalEntries: 0,
    streak: 0,
    topCharisma: 'confidence',
    preferredEmotions: [],
    notifications: {
      email: true,
      push: true,
      dailyReminders: true,
      weeklyReports: false,
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      showLocation: true,
      showBirthDate: false,
    },
    preferences: {
      language: 'en',
      theme: 'auto',
    },
  };
};

export const getProfile = async (): Promise<UserProfile> => {
  try {
    const profileData = await SecureStorage.getItem(PROFILE_KEY);
    if (profileData) {
      const parsedProfile = JSON.parse(profileData);

      // Check if profile needs migration (old structure vs new structure)
      if (!parsedProfile.notifications || typeof parsedProfile.notifications === 'boolean' || !parsedProfile.privacy || !parsedProfile.preferences) {
        console.log('Migrating profile to new structure...');

        // Generate username if needed
        const username = parsedProfile.username || await generateSerialUsername();
        const defaultProfile = await createDefaultProfile();

        // Migrate old profile to new structure
        const migratedProfile: UserProfile = {
          ...defaultProfile,
          id: parsedProfile.id || Date.now().toString(),
          username: username,
          name: parsedProfile.name || 'Czarisma AI',
          email: parsedProfile.email || 'user@example.com',
          password: parsedProfile.password || 'charisma123', // Use existing password or default
          phone: parsedProfile.phone,
          avatar: parsedProfile.avatar,
          dateOfBirth: parsedProfile.dateOfBirth,
          gender: parsedProfile.gender,
          location: parsedProfile.location || { city: 'Unknown', country: 'Unknown' },
          isVerified: parsedProfile.isVerified || false,
          twoFactorEnabled: parsedProfile.twoFactorEnabled || false,
          bio: parsedProfile.bio || '',
          interests: parsedProfile.interests || [],
          occupation: parsedProfile.occupation,
          website: parsedProfile.website,
          socialLinks: parsedProfile.socialLinks || {},
          joinDate: parsedProfile.joinDate || Date.now(),
          totalEntries: parsedProfile.totalEntries || 0,
          streak: parsedProfile.streak || 0,
          topCharisma: parsedProfile.topCharisma || 'confidence',
          preferredEmotions: parsedProfile.preferredEmotions || [],
        };

        console.log('Profile migrated successfully');
        await saveProfile(migratedProfile);
        return migratedProfile;
      }

      return parsedProfile;
    }
    const defaultProfile = await createDefaultProfile();
    await saveProfile(defaultProfile);
    return defaultProfile;
  } catch (error) {
    console.error('Error getting profile:', error);
    const defaultProfile = await createDefaultProfile();
    await saveProfile(defaultProfile);
    return defaultProfile;
  }
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await SecureStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving profile:', error);
  }
};

export const updateProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
  try {
    const currentProfile = await getProfile();
    const updatedProfile = { ...currentProfile, ...updates };
    
    // Save to local storage first
    await saveProfile(updatedProfile);
    
    // Sync to Supabase if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        logger.info('Syncing profile updates to Supabase...', {
          name: updates.name,
          bio: updates.bio,
          hasAvatar: !!updates.avatar
        });
        
        const supabaseUpdates: any = {};
        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.bio !== undefined) supabaseUpdates.bio = updates.bio;
        if (updates.socialLinks !== undefined) supabaseUpdates.social_links = updates.socialLinks;
        if (updates.privacy !== undefined) {
          const p = updates.privacy;
          if (p.showEmail !== undefined) supabaseUpdates.privacy_show_email = p.showEmail;
          if (p.showPhone !== undefined) supabaseUpdates.privacy_show_phone = p.showPhone;
          if (p.showLocation !== undefined) supabaseUpdates.privacy_show_location = p.showLocation;
          if (p.showBirthDate !== undefined) supabaseUpdates.privacy_show_birth_date = p.showBirthDate;
          if (p.profileVisibility !== undefined) supabaseUpdates.privacy_profile_visibility = p.profileVisibility;
        }
        
        // Handle avatar upload if changed
        if (updates.avatar !== undefined && updates.avatar !== currentProfile.avatar) {
          console.log('Avatar changed, processing update...');
          console.log('New avatar:', updates.avatar ? 'Present' : 'Null');
          console.log('Current avatar:', currentProfile.avatar ? 'Present' : 'Null');
          
          if (updates.avatar) {
            // Upload new avatar to Supabase storage
            try {
              console.log('Starting avatar upload...');
              const { MediaUploadService } = await import('../lib/media-upload-service');
              const avatarUrl = await MediaUploadService.uploadAvatar(
                updates.avatar,
                session.user.id
              );
              supabaseUpdates.avatar_url = avatarUrl;
              console.log('Avatar uploaded successfully to Supabase storage:', avatarUrl);
              logger.info('Avatar uploaded to Supabase storage:', avatarUrl);
              
              // Update local profile with the public URL so it works across devices
              updatedProfile.avatar = avatarUrl;
              await saveProfile(updatedProfile);
              console.log('Local profile updated with Supabase avatar URL');
            } catch (uploadError) {
              console.error('Failed to upload avatar to Supabase storage:', uploadError);
              logger.error('Failed to upload avatar to Supabase storage:', uploadError);
              // Don't throw - still update other fields
            }
          } else {
            // Remove avatar
            try {
              console.log('Removing avatar from Supabase storage...');
              const { MediaUploadService } = await import('../lib/media-upload-service');
              await MediaUploadService.deleteAvatar(session.user.id);
              supabaseUpdates.avatar_url = null;
              console.log('Avatar removed from Supabase storage');
              logger.info('Avatar removed from Supabase storage');
            } catch (deleteError) {
              console.error('Failed to remove avatar from Supabase storage:', deleteError);
              logger.error('Failed to remove avatar from Supabase storage:', deleteError);
              // Don't throw - still update other fields
            }
          }
        } else {
          console.log('Avatar not changed, skipping upload');
        }
        
        if (Object.keys(supabaseUpdates).length > 0) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update(supabaseUpdates)
            .eq('id', session.user.id);
          
          if (updateError) {
            logger.error('Failed to sync profile to Supabase:', updateError);
            // Don't throw - local update succeeded, just log the sync failure
          } else {
            logger.info('Profile successfully synced to Supabase');
          }
        }
      } else {
        logger.warn('No active session - profile not synced to Supabase');
      }
    } catch (syncError) {
      logger.error('Error syncing profile to Supabase:', syncError);
      // Don't throw - local update succeeded
    }
    
    return updatedProfile;
  } catch (error) {
    logger.error('Error updating profile:', error);
    throw error;
  }
};

export const calculateUserStats = async (entries: CharismaEntry[]): Promise<UserStats> => {
  // Ensure entries is an array
  if (!entries || !Array.isArray(entries)) {
    entries = [];
  }

  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

  // Map to convert display names back to keys for consistent counting
  const displayNameToKey: { [key: string]: string } = {
    'Commanding Presence': 'commanding',
    'Confidence': 'confidence',
    'Expertise': 'expertise',
    'Decisiveness': 'decisiveness',
    'Leadership Aura': 'leadership',
    'Recognized Competence': 'competence',
    'Influence Through Power': 'influence',
    'Respect from Others': 'respect',
    'Bold Ideas': 'bold_ideas',
    'Inspiring Vision': 'inspiring_vision',
    'Creativity': 'creativity',
    'Passionate About Future': 'passionate_future',
    'Ability to Rally Others': 'rally_others',
    'Persistence in Goals': 'persistence',
    'Transformational Thinking': 'transformational',
    'Confidence in Innovation': 'confidence_innovation',
    'Empathy': 'empathy',
    'Warmth': 'warmth',
    'Compassion': 'compassion',
    'Approachability': 'approachability',
    'Generosity': 'generosity',
    'Altruism': 'altruism',
    'Selflessness': 'selflessness',
    'Encouragement': 'encouragement',
    'Deep Listening': 'deep_listening',
    'Present Moment Attention': 'present_attention',
    'Eye Contact': 'eye_contact',
    'Engaged in Conversation': 'engaged_conversation',
    'Genuine Interest': 'genuine_interest',
    'Reflective Responses': 'reflective_responses',
    // Inspirational Charisma
    'Speaking Head': 'inspirational_speaking',
    'Raising Hands': 'raising_hands',
    'Party Popper': 'party_popper',
    'Fire': 'inspirational_fire',
    'Light Bulb': 'inspirational_idea',
    'Megaphone': 'megaphone',
    // Transformational Charisma
    'Repeat Button': 'transformational_repeat',
    'Rocket': 'transformational_rocket',
    'Seedling': 'seedling',
    'Wrench': 'wrench',
    'Glowing Star': 'glowing_star',
    'Gear': 'gear',
    // Ethical Charisma
    'Balance Scale': 'balance_scale',
    'Compass': 'compass',
    'Handshake': 'ethical_handshake',
    'Dove': 'dove',
    'Person in Lotus Position': 'lotus_position',
    // Socialized Charisma
    'Globe Showing Americas': 'globe',
    'Busts in Silhouette': 'silhouette',
    'Open Hands': 'open_hands',
    'Speech Balloon': 'speech_balloon',
    'Hugging Face': 'hugging_face',
    // Personalized Charisma
    'Money-Mouth Face': 'money_mouth',
    'Performing Arts': 'performing_arts',
    'Smiling Face with Horns': 'smiling_horns',
    'Gem Stone': 'gem_stone',
    'Smiling Face with Sunglasses': 'sunglasses',
    // Neo-Charismatic Leadership
    'Mechanical Arm': 'mechanical_arm',
    'Hammer and Wrench': 'hammer_wrench',
    'Chart Increasing': 'chart_increasing',
    // Divine Charisma
    'Place of Worship': 'place_worship',
    'Baby Angel': 'baby_angel',
    'Sparkles': 'sparkles',
    'Folded Hands': 'folded_hands',
    'Candle': 'candle',
    // Office-holder Charisma
    'Classical Building': 'classical_building',
    'Military Medal': 'military_medal',
    'Necktie': 'necktie',
    'Scroll': 'scroll',
    'Receipt': 'receipt',
    // Star Power Charisma
    'Clapper Board': 'clapper_board',
    'Microphone': 'microphone',
    'Shooting Star': 'shooting_star',
    'Star': 'star',
    'Camera With Flash': 'camera_flash',
    // Difficult/Disliked Charisma
    'Angry Face': 'angry_face',
    'Firecracker': 'firecracker',
    'Face with Steam From Nose': 'steam_nose',
    'Bomb': 'bomb',
    'High Voltage': 'high_voltage',
  };

  // Count charisma types (handle both keys and display names)
  const charismaCounts: { [key: string]: number } = {};
  entries.forEach(entry => {
    if (entry && entry.majorCharisma) {
      // Convert display name to key if needed, otherwise use as-is
      const charismaKey = displayNameToKey[entry.majorCharisma] || entry.majorCharisma;
      charismaCounts[charismaKey] = (charismaCounts[charismaKey] || 0) + 1;
    }
  });

  const topCharisma = Object.entries(charismaCounts).reduce((a, b) =>
    charismaCounts[a[0]] > charismaCounts[b[0]] ? a : b, ['', 0]);

  // Count emotions
  const emotionCounts: { [key: string]: number } = {};
  entries.forEach(entry => {
    if (entry && entry.emotionEmojis && Array.isArray(entry.emotionEmojis)) {
      entry.emotionEmojis.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    }
  });

  const topEmotion = Object.entries(emotionCounts).reduce((a, b) =>
    emotionCounts[a[0]] > emotionCounts[b[0]] ? a : b, ['', 0])[0];

  // Calculate streak
  const streak = calculateStreak(entries);

  // Calculate averages
  const weeklyEntries = entries.filter(entry => entry && entry.timestamp >= oneWeekAgo);
  const monthlyEntries = entries.filter(entry => entry && entry.timestamp >= oneMonthAgo);

  return {
    totalEntries: entries.length,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    topCharisma: { type: topCharisma[0], count: topCharisma[1] },
    topEmotion,
    weeklyAverage: weeklyEntries.length / 7,
    monthlyAverage: monthlyEntries.length / 30,
    czareelsCount: 0, // Will be populated separately from Supabase
  };
};

const calculateStreak = (entries: CharismaEntry[]): { current: number; longest: number } => {
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Get today's date range (start and end of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayEnd = tomorrow.getTime();

  // Count entries made today
  const todayEntries = entries.filter(entry => {
    if (!entry || !entry.timestamp) return false;
    return entry.timestamp >= todayStart && entry.timestamp < todayEnd;
  });

  // For longest streak, count total unique days with entries
  const uniqueDays = new Set<string>();
  entries.forEach(entry => {
    if (entry && entry.timestamp) {
      const entryDate = new Date(entry.timestamp);
      entryDate.setHours(0, 0, 0, 0);
      uniqueDays.add(entryDate.toDateString());
    }
  });

  const totalDaysWithEntries = uniqueDays.size;

  return {
    current: todayEntries.length, // Count today's entries
    longest: totalDaysWithEntries // Count total unique days with entries
  };
};

export const getRecentEntries = (entries: CharismaEntry[], limit: number = 5): CharismaEntry[] => {
  // Ensure entries is an array and filter out invalid entries
  if (!entries || !Array.isArray(entries)) {
    return [];
  }

  return entries
    .filter(entry => entry && entry.timestamp) // Filter out invalid entries
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

export const exportUserData = async (): Promise<string> => {
  try {
    const [profile, entriesData] = await Promise.all([
      getProfile(),
      SecureStorage.getItem(ENTRIES_KEY),
    ]);

    const exportData = {
      profile,
      entries: entriesData ? JSON.parse(entriesData) : [],
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting user data:', error);
    throw error;
  }
};

// Password management functions
export const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
  try {
    const profile = await getProfile();

    // Verify current password
    if (profile.password !== currentPassword) {
      console.log('Current password verification failed');
      return false;
    }

    // Update password
    const updatedProfile = {
      ...profile,
      password: newPassword,
    };

    await saveProfile(updatedProfile);
    console.log('Password changed successfully');
    return true;
  } catch (error) {
    console.error('Error changing password:', error);
    return false;
  }
};

export const validatePassword = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }

  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one letter and one number' };
  }

  return { isValid: true, message: 'Password is valid' };
};
