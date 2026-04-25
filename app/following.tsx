import { IconSymbol } from '@/components/ui/icon-symbol';
import { followUser, getFollowersList, getFollowingList, isFollowing, unfollowUser } from '@/utils/follow-utils';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface UserListItem {
  id: string;
  username: string;
  name: string;
  avatar_url?: string;
  is_online?: boolean;
  last_seen?: number;
}

export default function FollowingScreen() {
  const router = useRouter();
  const { userId, type, name } = useLocalSearchParams<{ userId: string; type: 'followers' | 'following'; name: string }>();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [userId, type]);

  const loadData = async () => {
    if (!userId || !type) return;

    try {
      setLoading(true);

      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);

      // Fetch appropriate list
      const list = type === 'followers' 
        ? await getFollowersList(userId)
        : await getFollowingList(userId);
      
      setUsers(list);

      // Get current user's following list for follow button state
      if (session?.user?.id) {
        const following = await getFollowingList(session.user.id);
        setFollowingIds(new Set(following.map((u: any) => u.id)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const success = await followUser(currentUserId, targetUserId);
      if (success) {
        setFollowingIds(prev => new Set(prev).add(targetUserId));
      } else {
        Alert.alert('Error', 'Failed to follow user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user');
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!currentUserId) return;

    try {
      const success = await unfollowUser(currentUserId, targetUserId);
      if (success) {
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });
      } else {
        Alert.alert('Error', 'Failed to unfollow user');
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      Alert.alert('Error', 'Failed to unfollow user');
    }
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return '';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Active now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  const renderUserItem = ({ item }: { item: UserListItem }) => {
    const isCurrentUser = item.id === currentUserId;
    const isFollowing = followingIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.userItem}
        activeOpacity={0.7}>
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {item.is_online && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
          <Text style={styles.userStatus}>
            {item.is_online ? 'Active now' : formatLastSeen(item.last_seen)}
          </Text>
        </View>

        {!isCurrentUser && (
          <TouchableOpacity
            style={[styles.followButton, isFollowing ? styles.followingButton : null]}
            onPress={() => isFollowing ? handleUnfollow(item.id) : handleFollow(item.id)}
            activeOpacity={0.7}>
            <Text style={[styles.followButtonText, isFollowing ? styles.followingButtonText : null]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol size={48} name="person.3" color="#999" />
      <Text style={styles.emptyStateTitle}>
        {type === 'followers' ? 'No Followers Yet' : 'Not Following Anyone'}
      </Text>
      <Text style={styles.emptyStateText}>
        {type === 'followers' 
          ? `${name || 'This user'} doesn't have any followers yet.`
          : `${name || 'This user'} isn't following anyone yet.`}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#F4C542" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol size={24} name="chevron.left" color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'followers' ? `${name}'s Followers` : `${name}'s Following`}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={users.length === 0 ? styles.emptyList : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F4C542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 12,
    color: '#999',
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4C542',
  },
  followingButton: {
    backgroundColor: '#E5E5E5',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  followingButtonText: {
    color: '#666',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyList: {
    flex: 1,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
