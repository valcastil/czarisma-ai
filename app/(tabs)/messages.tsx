import { IconSymbol } from '@/components/ui/icon-symbol';
import { Conversation, User } from '@/constants/message-types';
import { useTheme } from '@/hooks/use-theme';
import {
    deleteConversation,
    getConversations,
    getCurrentUser,
    registerCurrentUser,
    subscribeToConversations,
} from '@/utils/message-utils';
import { getProfile } from '@/utils/profile-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MessagesScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    initializeMessages();

    // Cleanup function
    return () => {
      // Cleanup will be handled by the subscription unsubscribe
    };
  }, []);

  // Refresh messages when screen comes into focus (after sign-in)
  useFocusEffect(
    useCallback(() => {
      initializeMessages();
    }, [])
  );

  const initializeMessages = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        // Not authenticated, redirect to sign-in
        router.replace('/auth-sign-in');
        return;
      }
      
      setCurrentUser(user);
      await registerCurrentUser();
      await loadConversations();

      // Subscribe to real-time conversation updates
      const unsubscribe = subscribeToConversations((updatedConversation) => {
        setConversations(prev => {
          const existingIndex = prev.findIndex(c => c.id === updatedConversation.id);
          if (existingIndex >= 0) {
            // Update existing conversation
            const updated = [...prev];
            updated[existingIndex] = updatedConversation;
            return updated.sort((a, b) => b.updatedAt - a.updatedAt);
          } else {
            // Add new conversation
            return [updatedConversation, ...prev];
          }
        });
      });

      // Store unsubscribe function for cleanup
      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing messages:', error);
      Alert.alert('Error', 'Failed to initialize messages');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const userConversations = await getConversations();
      setConversations(userConversations);
      // Load profile photos for all participants
      loadProfilePhotos(userConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadProfilePhotos = async (convos: Conversation[]) => {
    try {
      console.log('=== loadProfilePhotos called ===');
      console.log('Conversations:', convos.map(c => ({
        id: c.id,
        participantId: c.participantId,
        participantName: c.participantName,
        participantAvatarUrl: c.participantAvatarUrl
      })));
      
      const photos: Record<string, string | null> = {};
      // Load the current user's own profile avatar
      try {
        const profile = await getProfile();
        console.log('Current user profile:', profile ? { id: profile.id, avatar: profile.avatar } : null);
        if (profile.avatar && profile.id) {
          photos[profile.id] = profile.avatar;
        }
      } catch (error) {
        console.error('Error loading current user profile:', error);
      }
      // Load profile photos for all conversation participants from Supabase data
      convos.forEach((convo) => {
        console.log(`Processing conversation ${convo.id}: participant ${convo.participantId} has avatarUrl:`, convo.participantAvatarUrl);
        if (convo.participantAvatarUrl) {
          photos[convo.participantId] = convo.participantAvatarUrl;
        }
      });
      console.log('Final photos object:', photos);
      setProfilePhotos(photos);
    } catch (error) {
      console.error('Error loading profile photos:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  const handleConversationPress = (conversation: Conversation) => {
    console.log('=== Conversation Press Debug ===');
    console.log('Participant ID:', conversation.participantId);
    console.log('Participant Name:', conversation.participantName);
    console.log('Participant Avatar URL:', conversation.participantAvatarUrl);
    
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conversation.participantId,
        username: conversation.participantUsername,
        name: conversation.participantName,
        avatarUrl: conversation.participantAvatarUrl || '',
      },
    });
  };

  const handleNewMessage = () => {
    setShowNewMessageModal(true);
  };

  const handleImportContacts = async () => {
    setShowNewMessageModal(false);
    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant contacts permission to import your phone contacts.',
          [{ text: 'OK' }]
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
          Contacts.Fields.Dates,
        ],
      });

      if (data.length > 0) {
        const now = Date.now();
        const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000); // 365 days in milliseconds

        // Filter and sort contacts
        const recentContacts = data
          .map((contact: any) => {
            // Get the most recent date from the contact
            let lastUsedDate = 0;

            // Check if contact has dates (like last contacted, modified, etc.)
            if (contact.dates && contact.dates.length > 0) {
              const dates = contact.dates.map((d: any) => {
                if (d.year && d.month && d.day) {
                  return new Date(d.year, d.month - 1, d.day).getTime();
                }
                return 0;
              });
              lastUsedDate = Math.max(...dates);
            }

            // If no date info, consider it as recently used (give it current timestamp)
            // This ensures contacts without date info are included
            if (lastUsedDate === 0) {
              lastUsedDate = now;
            }

            return {
              id: contact.id,
              name: contact.name || 'Unknown',
              phoneNumbers: contact.phoneNumbers?.map((p: any) => p.number) || [],
              emails: contact.emails?.map((e: any) => e.email) || [],
              lastUsed: lastUsedDate,
            };
          })
          // Filter out dormant contacts (not used in past 365 days)
          .filter((contact: any) => contact.lastUsed >= oneYearAgo)
          // Sort by most recently used
          .sort((a: any, b: any) => b.lastUsed - a.lastUsed)
          // Take only the first 100
          .slice(0, 100)
          // Remove the lastUsed field before saving
          .map(({ lastUsed, ...contact }: any) => contact);

        if (recentContacts.length > 0) {
          await AsyncStorage.setItem('@imported_contacts', JSON.stringify(recentContacts));

          Alert.alert(
            'Contacts Imported',
            `Found ${recentContacts.length} recent contacts. You can now search for them when starting a new conversation.`,
            [
              {
                text: 'Start Chatting',
                onPress: () => router.push('/new-message')
              },
              {
                text: 'OK'
              }
            ]
          );
        } else {
          Alert.alert(
            'No Recent Contacts',
            'No contacts found that have been used in the past year. Try adjusting your contact usage or add new contacts.'
          );
        }
      } else {
        Alert.alert('No Contacts', 'No contacts found on your device.');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      Alert.alert('Error', 'Failed to import contacts. Please try again.');
    }
  };

  const handleSearchUsers = () => {
    setShowNewMessageModal(false);
    router.push('/new-message');
  };

  const handleDeleteConversation = (conversationId: string, participantId: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteConversation(participantId);
              await loadConversations();
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  const formatLastMessage = (message: any) => {
    if (message.content.length > 50) {
      return message.content.substring(0, 50) + '...';
    }
    return message.content;
  };

  const formatTime = (timestamp: number) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 24 * 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}>

      <View style={styles.avatarContainer}>
        {(profilePhotos[item.participantId] || item.participantAvatarUrl) ? (
          <Image
            source={{ uri: profilePhotos[item.participantId] || item.participantAvatarUrl }}
            style={styles.avatarPhoto}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
            <Text style={styles.avatarText}>
              {item.participantName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.participantIsOnline ? (
          <View style={styles.onlineDot} />
        ) : null}
        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: '#FF3B30' }]}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.participantName, { color: colors.text }]}>
            {currentUser && item.participantId === currentUser.id ? `${item.participantName} (You)` : item.participantName}
          </Text>
          <Text style={[styles.messageTime, { color: colors.textSecondary }]}>
            {formatTime(item.lastMessage.timestamp)}
          </Text>
        </View>

        <View style={styles.messagePreview}>
          <Text
            style={[
              styles.lastMessage,
              {
                color: item.unreadCount > 0 ? colors.text : colors.textSecondary,
                fontWeight: item.unreadCount > 0 ? '600' : '400'
              }
            ]}
            numberOfLines={1}>
            {item.lastMessage.isFromCurrentUser ? 'You: ' : ''}
            {formatLastMessage(item.lastMessage)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteConversation(item.id, item.participantId)}
        activeOpacity={0.7}>
        <IconSymbol size={18} name="trash" color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        <TouchableOpacity
          style={[styles.newMessageButton, { backgroundColor: colors.gold }]}
          onPress={handleNewMessage}
          activeOpacity={0.8}>
          <IconSymbol size={20} name="plus" color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.conversationsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <IconSymbol size={56} name="message" color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No conversations yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Tap the + button to start a new conversation
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Custom New Message Modal */}
      <Modal
        visible={showNewMessageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewMessageModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowNewMessageModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Start New Conversation
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Choose how you want to connect
              </Text>
            </View>

            {/* Options */}
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={[styles.modalOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleSearchUsers}
                activeOpacity={0.7}>
                <View style={[styles.modalOptionIcon, { backgroundColor: colors.gold }]}>
                  <IconSymbol size={24} name="magnifyingglass" color="#000000" />
                </View>
                <View style={styles.modalOptionContent}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>
                    Search Users
                  </Text>
                  <Text style={[styles.modalOptionDescription, { color: colors.textSecondary }]}>
                    Find Pro & Trial users in the app
                  </Text>
                </View>
                <IconSymbol size={20} name="chevron.right" color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={handleImportContacts}
                activeOpacity={0.7}>
                <View style={[styles.modalOptionIcon, { backgroundColor: '#34C759' }]}>
                  <IconSymbol size={24} name="person.crop.circle.badge.plus" color="#FFFFFF" />
                </View>
                <View style={styles.modalOptionContent}>
                  <Text style={[styles.modalOptionTitle, { color: colors.text }]}>
                    Import Contacts
                  </Text>
                  <Text style={[styles.modalOptionDescription, { color: colors.textSecondary }]}>
                    Add people from your phone
                  </Text>
                </View>
                <IconSymbol size={20} name="chevron.right" color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => setShowNewMessageModal(false)}
              activeOpacity={0.7}>
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newMessageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationsList: {
    padding: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOptions: {
    gap: 12,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalOptionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalCancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
