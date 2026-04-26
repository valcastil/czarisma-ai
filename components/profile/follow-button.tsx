import { useTheme } from '@/hooks/use-theme';
import { followUser, unfollowUser } from '@/utils/follow-utils';
import React, { memo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface FollowButtonProps {
  currentUserId: string;
  targetUserId: string;
  isFollowing: boolean;
  onFollowChange: (following: boolean) => void;
}

export const FollowButton = memo(function FollowButton({ currentUserId, targetUserId, isFollowing: initialFollowing, onFollowChange }: FollowButtonProps) {
  const { colors } = useTheme();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);

    const newState = !following;
    // Optimistic update
    setFollowing(newState);
    onFollowChange(newState);

    let success: boolean;
    if (newState) {
      success = await followUser(currentUserId, targetUserId);
    } else {
      success = await unfollowUser(currentUserId, targetUserId);
    }

    if (!success) {
      // Revert on failure
      setFollowing(!newState);
      onFollowChange(!newState);
    }
    setLoading(false);
  };

  // Sync prop changes
  React.useEffect(() => {
    setFollowing(initialFollowing);
  }, [initialFollowing]);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        following
          ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }
          : { backgroundColor: colors.gold },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? colors.text : '#000'} />
      ) : (
        <Text style={[styles.text, { color: following ? colors.text : '#000' }]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
    minHeight: 40,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
