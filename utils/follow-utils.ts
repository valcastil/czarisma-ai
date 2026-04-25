import { supabase } from '@/lib/supabase';

/**
 * Follow another user
 */
export const followUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) {
      // Duplicate follow — already following
      if (error.code === '23505') return true;
      console.error('Error following user:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('followUser error:', err);
    return false;
  }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('unfollowUser error:', err);
    return false;
  }
};

/**
 * Check if userA follows userB
 */
export const isFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error('isFollowing error:', err);
    return false;
  }
};

/**
 * Get follower and following counts for a user
 */
export const getFollowCounts = async (userId: string): Promise<{ followers: number; following: number }> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('follower_count, following_count')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return { followers: 0, following: 0 };
    }
    return {
      followers: data.follower_count ?? 0,
      following: data.following_count ?? 0,
    };
  } catch (err) {
    console.error('getFollowCounts error:', err);
    return { followers: 0, following: 0 };
  }
};

/**
 * Get the full profile of a user (including social links, counts, bio, entries count)
 */
export const getUserFullProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, name, avatar_url, bio, social_links, follower_count, following_count, is_online, last_seen')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching full profile:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('getUserFullProfile error:', err);
    return null;
  }
};

/**
 * Get charisma entries for a user (for profile preview)
 */
export const getUserEntries = async (userId: string, limit = 6) => {
  try {
    const { data, error } = await supabase
      .from('charisma_entries')
      .select('id, major_charisma, sub_charisma, charisma_emoji, emotion_emojis, notes, timestamp, date, time')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user entries:', error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('getUserEntries error:', err);
    return [];
  }
};

/**
 * Get the total entry count for a user
 */
export const getUserEntryCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('charisma_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching entry count:', error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error('getUserEntryCount error:', err);
    return 0;
  }
};

/**
 * Get shared links (YouTube/TikTok/Instagram etc.) for a user's profile.
 * Gated by Supabase RLS so only the owner and followers receive rows.
 */
export const getUserSharedLinks = async (userId: string, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('shared_links')
      .select('id, url, platform, title, description, thumbnail_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching shared links:', error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error('getUserSharedLinks error:', err);
    return [];
  }
};

/**
 * Update social links for the current user's Supabase profile
 */
export const updateSocialLinks = async (userId: string, socialLinks: Record<string, string>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ social_links: socialLinks })
      .eq('id', userId);

    if (error) {
      console.error('Error updating social links:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('updateSocialLinks error:', err);
    return false;
  }
};

/**
 * Get list of users who follow a specific user
 */
export const getFollowersList = async (userId: string, limit = 50): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower:profiles!follows_follower_id_fkey (
          id,
          username,
          name,
          avatar_url,
          is_online,
          last_seen
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching followers list:', error);
      return [];
    }

    return (data ?? []).map((item: any) => item.follower).filter(Boolean);
  } catch (err) {
    console.error('getFollowersList error:', err);
    return [];
  }
};

/**
 * Get list of users that a specific user follows
 */
export const getFollowingList = async (userId: string, limit = 50): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select(`
        following:profiles!follows_following_id_fkey (
          id,
          username,
          name,
          avatar_url,
          is_online,
          last_seen
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching following list:', error);
      return [];
    }

    return (data ?? []).map((item: any) => item.following).filter(Boolean);
  } catch (err) {
    console.error('getFollowingList error:', err);
    return [];
  }
};
