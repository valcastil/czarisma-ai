import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { SharedLink } from '@/lib/link-storage-service';
import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserUsername: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface ShareToConversationModalProps {
  visible: boolean;
  link: SharedLink | null;
  onClose: () => void;
  onShare: (conversationId: string) => void;
}

export function ShareToConversationModal({
  visible,
  link,
  onClose,
  onShare,
}: ShareToConversationModalProps) {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadConversations();
    }
  }, [visible]);

  const loadConversations = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all conversations for the current user
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          last_message,
          last_message_at
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get other user details for each conversation
      const conversationsWithUsers = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          const otherUserId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

          const { data: userData } = await supabase
            .from('profiles')
            .select('name, username')
            .eq('id', otherUserId)
            .single();

          return {
            id: conv.id,
            otherUserId,
            otherUserName: userData?.name || 'Unknown',
            otherUserUsername: userData?.username || 'unknown',
            lastMessage: conv.last_message,
            lastMessageAt: conv.last_message_at,
          };
        })
      );

      setConversations(conversationsWithUsers);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleShareToConversation = async (conversationId: string) => {
    if (!link) return;

    try {
      setSharing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create a message with the link
      const linkMessage = `🔗 Shared Link\n\n${link.title || link.url}\n\n${link.url}`;

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: linkMessage,
        attachment_type: 'link',
        attachment_url: link.url,
        attachment_name: link.title,
        attachment_thumbnail_url: link.thumbnailUrl,
      });

      if (error) throw error;

      // Update link status to 'shared'
      await supabase
        .from('shared_links')
        .update({
          status: 'shared',
          shared_to_conversation_id: conversationId,
          shared_at: new Date().toISOString(),
        })
        .eq('id', link.id);

      Alert.alert('Success', 'Link shared to conversation');
      onShare(conversationId);
      onClose();
    } catch (error) {
      console.error('Error sharing link:', error);
      Alert.alert('Error', 'Failed to share link');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Share to Conversation
            </Text>
            <TouchableOpacity onPress={onClose} disabled={sharing}>
              <IconSymbol size={24} name="xmark" color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Link Preview */}
          {link && (
            <View style={[styles.linkPreview, { backgroundColor: colors.background }]}>
              <Text style={[styles.linkTitle, { color: colors.text }]} numberOfLines={1}>
                {link.title || link.url}
              </Text>
              <Text style={[styles.linkUrl, { color: colors.textSecondary }]} numberOfLines={1}>
                {link.url}
              </Text>
            </View>
          )}

          {/* Conversations List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No conversations yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Start a chat to share links
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.conversationItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleShareToConversation(item.id)}
                  disabled={sharing}
                  activeOpacity={0.7}>
                  <View style={styles.conversationInfo}>
                    <Text style={[styles.conversationName, { color: colors.text }]}>
                      {item.otherUserName}
                    </Text>
                    <Text style={[styles.conversationUsername, { color: colors.textSecondary }]}>
                      @{item.otherUserUsername}
                    </Text>
                    {item.lastMessage && (
                      <Text
                        style={[styles.lastMessage, { color: colors.textSecondary }]}
                        numberOfLines={1}>
                        {item.lastMessage}
                      </Text>
                    )}
                  </View>
                  {sharing ? (
                    <ActivityIndicator size="small" color={colors.gold} />
                  ) : (
                    <IconSymbol
                      size={20}
                      name="arrowshape.turn.up.forward"
                      color={colors.textSecondary}
                    />
                  )}
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  linkPreview: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  linkUrl: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  list: {
    maxHeight: 400,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  conversationUsername: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 12,
  },
});
