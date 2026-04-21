import { CharismaEntry, UserProfile } from '@/constants/theme';
import { supabase } from './supabase';

// Profile Services
export const createProfile = async (profile: Partial<UserProfile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      name: profile.name,
      username: profile.username,
      email: profile.email,
      city: profile.location?.city || 'Unknown',
      country: profile.location?.country || 'Unknown',
      join_date: Date.now(),
      total_entries: 0,
      streak: 0,
      top_charisma: 'confidence',
      preferred_emotions: [],
      interests: [],
      notifications_email: true,
      notifications_push: true,
      notifications_daily_reminders: true,
      notifications_weekly_reports: false,
      privacy_profile_visibility: 'public',
      privacy_show_email: false,
      privacy_show_phone: false,
      privacy_show_location: true,
      privacy_show_birth_date: false,
      preferences_language: 'en',
      preferences_theme: 'auto',
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // maybeSingle() returns null if no rows found, doesn't throw error
  if (error) throw error;
  return data;
};

export const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
  // First check if profile exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existingProfile) {
    // Profile doesn't exist, skip update (user may not have a profile yet)
    console.log('No profile found for user, skipping update');
    return null;
  }

  // Only update columns that exist in the profiles table
  const updateData: Record<string, any> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;

  if (Object.keys(updateData).length === 0) {
    console.log('No updatable profile fields provided, skipping');
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Charisma Entry Services
export const createEntry = async (entry: CharismaEntry, userId: string) => {
  const { data, error } = await supabase
    .from('charisma_entries')
    .insert([{
      user_id: userId,
      major_charisma: entry.majorCharisma,
      sub_charisma: entry.subCharisma,
      notes: entry.notes,
      timestamp: entry.timestamp,
      date: entry.date,
      time: entry.time,
      charisma_emoji: entry.charismaEmoji,
      emotion_emojis: entry.emotionEmojis,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getEntries = async (userId: string) => {
  // Cap at 500 most recent entries — reasonable offline cache size.
  // If a user needs older entries, they can be loaded on-demand with pagination.
  const { data, error } = await supabase
    .from('charisma_entries')
    .select('id, major_charisma, sub_charisma, notes, timestamp, date, time, charisma_emoji, emotion_emojis')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(500);

  if (error) throw error;
  return data;
};

export const deleteEntry = async (entryId: string) => {
  const { error } = await supabase
    .from('charisma_entries')
    .delete()
    .eq('id', entryId);

  if (error) throw error;
};

// Message Services
export const sendMessage = async (
  senderId: string,
  receiverId: string,
  content: string
) => {
  const now = new Date();
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      timestamp: Date.now(),
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      is_read: false,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getMessages = async (userId: string, otherUserId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data;
};

export const markMessagesAsRead = async (messageIds: string[]) => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .in('id', messageIds);

  if (error) throw error;
};

// Get all users
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, username, is_online, last_seen')
    .order('name');

  if (error) throw error;
  return data;
};