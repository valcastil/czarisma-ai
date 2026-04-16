import { UserProfile } from '@/constants/theme';
import { logoutRevenueCatUser } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';
import { getEntries as getSupabaseEntries, getProfile as getSupabaseProfile } from '@/lib/supabase-service';
import { trackAuth, trackError } from '@/lib/vexo-analytics';
import { saveProfile } from '@/utils/profile-utils';
import { SecureStorage } from '@/utils/secure-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Handle user sign out with complete cleanup
 * Syncs data to Supabase, clears local cache, and navigates to sign-in screen
 */
export const handleSignOut = async (): Promise<{ success: boolean; error?: any }> => {
  try {
    console.log('Starting sign out process...');

    trackAuth('sign_out', 'manual');

    const secureKeys = [
      '@charisma_profile',
      '@charisma_entries',
      '@pro_status',
      '@trial_start_date',
      '@charisma_shared_links',
    ];
    const asyncKeys = [
      '@pro_email',
      '@user_preferences',
      '@cached_messages',
      '@cached_conversations',
      '@auth_token',
      '@refresh_token',
      '@user_settings',
      '@last_sync_time',
    ];

    // Run critical cleanup in parallel with timeouts on network calls
    await Promise.allSettled([
      Promise.race([supabase.auth.signOut(), new Promise(r => setTimeout(r, 3000))]),
      Promise.race([logoutRevenueCatUser(), new Promise(r => setTimeout(r, 2000))]),
      ...secureKeys.map(key => SecureStorage.removeItem(key)),
      AsyncStorage.multiRemove(asyncKeys),
    ]);

    console.log('User signed out successfully');
    return { success: true };

  } catch (error: any) {
    console.error('Error during sign out:', error);
    trackError('sign_out_error', error?.message || 'Unknown error', 'auth');
    return { success: false, error };
  }
};

/**
 * Restore user data from Supabase after sign in
 * Fetches profile and entries from Supabase and saves to AsyncStorage
 */
export const restoreUserDataFromSupabase = async (): Promise<{ success: boolean; error?: any }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user, skipping data restore');
      return { success: false, error: 'No authenticated user' };
    }

    console.log('Restoring user data from Supabase...');

    // Fetch profile from Supabase
    const supabaseProfile = await getSupabaseProfile(user.id);
    
    if (supabaseProfile) {
      console.log('Supabase profile fetched:', {
        id: supabaseProfile.id,
        name: supabaseProfile.name,
        username: supabaseProfile.username,
        hasName: !!supabaseProfile.name
      });
      
      // Get name from Supabase profile, or fallback to user metadata, or default
      const profileName = supabaseProfile.name || 
                         user.user_metadata?.name || 
                         user.email?.split('@')[0] || 
                         'Charisma User';
      
      console.log('Profile name resolved to:', profileName);
      
      // Convert Supabase profile format to local UserProfile format
      const localProfile: UserProfile = {
        id: supabaseProfile.id,
        name: profileName,
        username: supabaseProfile.username || `user_${user.id.slice(0, 7)}`,
        email: supabaseProfile.email || user.email || '',
        password: '', // Don't store password locally for authenticated users
        phone: supabaseProfile.phone || undefined,
        avatar: supabaseProfile.avatar || undefined,
        dateOfBirth: supabaseProfile.date_of_birth || undefined,
        gender: supabaseProfile.gender || undefined,
        location: {
          city: supabaseProfile.city || 'Unknown',
          country: supabaseProfile.country || 'Unknown',
        },
        isVerified: supabaseProfile.is_verified || false,
        twoFactorEnabled: supabaseProfile.two_factor_enabled || false,
        bio: supabaseProfile.bio || undefined,
        interests: supabaseProfile.interests || [],
        occupation: supabaseProfile.occupation || undefined,
        website: supabaseProfile.website || undefined,
        socialLinks: {
          facebook: supabaseProfile.facebook || undefined,
          instagram: supabaseProfile.instagram || undefined,
          whatsapp: supabaseProfile.whatsapp || undefined,
          tiktok: supabaseProfile.tiktok || undefined,
        },
        joinDate: supabaseProfile.join_date || Date.now(),
        totalEntries: supabaseProfile.total_entries || 0,
        streak: supabaseProfile.streak || 0,
        topCharisma: supabaseProfile.top_charisma || 'confidence',
        preferredEmotions: supabaseProfile.preferred_emotions || [],
        notifications: {
          email: supabaseProfile.notifications_email ?? true,
          push: supabaseProfile.notifications_push ?? true,
          dailyReminders: supabaseProfile.notifications_daily_reminders ?? true,
          weeklyReports: supabaseProfile.notifications_weekly_reports ?? false,
        },
        privacy: {
          profileVisibility: supabaseProfile.privacy_profile_visibility || 'public',
          showEmail: supabaseProfile.privacy_show_email ?? false,
          showPhone: supabaseProfile.privacy_show_phone ?? false,
          showLocation: supabaseProfile.privacy_show_location ?? true,
          showBirthDate: supabaseProfile.privacy_show_birth_date ?? false,
        },
        preferences: {
          language: supabaseProfile.preferences_language || 'en',
          theme: supabaseProfile.preferences_theme || 'auto',
        },
      };

      // Save to AsyncStorage
      await saveProfile(localProfile);
      console.log('Profile restored from Supabase:', {
        totalEntries: localProfile.totalEntries,
        streak: localProfile.streak,
        topCharisma: localProfile.topCharisma,
      });
    }

    // Fetch entries from Supabase
    console.log('Fetching entries from Supabase for user:', user.id);
    const supabaseEntries = await getSupabaseEntries(user.id);
    console.log('Supabase entries fetched:', supabaseEntries?.length || 0);
    
    if (supabaseEntries && supabaseEntries.length > 0) {
      console.log('Sample Supabase entry:', supabaseEntries[0]);
    }
    
    if (supabaseEntries && supabaseEntries.length > 0) {
      // Convert Supabase entries to local format
      const localEntries = supabaseEntries.map((entry: any) => ({
        id: entry.id,
        majorCharisma: entry.major_charisma,
        subCharisma: entry.sub_charisma,
        notes: entry.notes,
        timestamp: entry.timestamp,
        date: entry.date,
        time: entry.time,
        charismaEmoji: entry.charisma_emoji,
        emotionEmojis: entry.emotion_emojis || [],
      }));

      // Save to AsyncStorage
      await AsyncStorage.setItem('@charisma_entries', JSON.stringify(localEntries));
      console.log(`Restored ${localEntries.length} entries from Supabase`);
      
      // Verify the entries were saved
      const savedEntries = await AsyncStorage.getItem('@charisma_entries');
      console.log('Verified saved entries count:', savedEntries ? JSON.parse(savedEntries).length : 0);
    } else {
      console.log('No entries found in Supabase to restore');
      
      // Check if there are any entries in the local storage that might be stale
      const existingEntries = await AsyncStorage.getItem('@charisma_entries');
      if (existingEntries) {
        console.log('Found existing entries in local storage (will be cleared):', JSON.parse(existingEntries).length);
        await AsyncStorage.removeItem('@charisma_entries');
        console.log('Cleared stale entries from local storage');
      }
    }

    console.log('User data restored successfully from Supabase');
    return { success: true };

  } catch (error: any) {
    console.error('Error restoring user data from Supabase:', error);
    trackError('restore_data_error', error?.message || 'Unknown error', 'auth');
    return { success: false, error };
  }
};

/**
 * Clear all cached user images and temporary files
 */
export const clearUserCache = async (): Promise<void> => {
  try {
    // Clear any cached user-specific data
    const cacheKeys = [
      '@cached_profile_images',
      '@cached_entry_images',
      '@temp_files',
    ];

    await AsyncStorage.multiRemove(cacheKeys);
    console.log('User cache cleared');
  } catch (error) {
    console.error('Error clearing user cache:', error);
  }
};

/**
 * Get list of all AsyncStorage keys (for debugging)
 */
export const getAllStorageKeys = async (): Promise<readonly string[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys;
  } catch (error) {
    console.error('Error getting storage keys:', error);
    return [];
  }
};

/**
 * Clear only user-specific data, keep app preferences
 */
export const clearUserDataOnly = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter out app-level preferences that should be kept
    const appPreferences = [
      '@theme_preference',
      '@language_preference',
      '@onboarding_completed',
      '@tutorial_completed',
      '@app_version',
    ];

    const keysToRemove = allKeys.filter(key => !appPreferences.includes(key));
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`Cleared ${keysToRemove.length} user data keys`);
    }
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};

/**
 * Check if user is authenticated
 */
export const isUserAuthenticated = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Get current user ID
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};
