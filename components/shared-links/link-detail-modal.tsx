import { ShareToConversationModal } from '@/components/shared-links/share-to-conversation-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { LinkStorageService, SharedLink } from '@/lib/link-storage-service';
import React, { useState } from 'react';
import { Alert, Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface LinkDetailModalProps {
  visible: boolean;
  link: SharedLink | null;
  onClose: () => void;
  onDelete: () => void;
  onShare?: (link: SharedLink) => void;
}

export function LinkDetailModal({ visible, link, onClose, onDelete }: LinkDetailModalProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  if (!link) return null;

  const handleOpenLink = async () => {
    try {
      // Use originalUrl to preserve platform-specific formats (e.g., YouTube Shorts)
      const urlToOpen = link.originalUrl || link.url;
      const supported = await Linking.canOpenURL(urlToOpen);
      if (supported) {
        await Linking.openURL(urlToOpen);
        // Mark as read
        await LinkStorageService.updateLinkStatus(link.id, 'read');
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      setLoading(true);
      await LinkStorageService.toggleFavorite(link.id, !link.isFavorite);
      Alert.alert('Success', link.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setLoading(true);
      await LinkStorageService.updateLinkStatus(link.id, 'archived');
      Alert.alert('Success', 'Link archived');
      onClose();
    } catch (error) {
      console.error('Error archiving link:', error);
      Alert.alert('Error', 'Failed to archive link');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Link',
      'Are you sure you want to delete this link?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
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
            <Text style={[styles.title, { color: colors.text }]}>Link Details</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol size={24} name="xmark" color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Thumbnail */}
            {link.thumbnailUrl && (
              <Image
                source={{ uri: link.thumbnailUrl }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            )}

            {/* Platform Badge */}
            <View style={styles.platformContainer}>
              <Text style={[styles.platformText, { color: colors.textSecondary }]}>
                {link.platform?.toUpperCase() || 'WEB'}
              </Text>
              {link.isFavorite && (
                <IconSymbol size={16} name="star.fill" color={colors.gold} />
              )}
            </View>

            {/* Title */}
            <Text style={[styles.linkTitle, { color: colors.text }]}>
              {link.title || 'Untitled'}
            </Text>

            {/* Author */}
            {link.author && (
              <Text style={[styles.author, { color: colors.textSecondary }]}>
                By {link.author}
              </Text>
            )}

            {/* Description */}
            {link.description && (
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {link.description}
              </Text>
            )}

            {/* URL */}
            <View style={[styles.urlContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.url, { color: colors.textSecondary }]} numberOfLines={2}>
                {link.url}
              </Text>
            </View>

            {/* Metadata */}
            <View style={styles.metadata}>
              <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                Added {new Date(link.createdAt).toLocaleDateString()}
              </Text>
              {link.domain && (
                <Text style={[styles.metadataText, { color: colors.textSecondary }]}>
                  • {link.domain}
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {/* Open Link */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.gold }]}
                onPress={handleOpenLink}>
                <IconSymbol size={20} name="link" color="#000" />
                <Text style={styles.actionButtonText}>Open Link</Text>
              </TouchableOpacity>

              {/* Share to Conversation */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.background }]}
                onPress={() => setShowShareModal(true)}>
                <IconSymbol size={20} name="arrowshape.turn.up.forward" color={colors.text} />
                <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>
                  Share to Chat
                </Text>
              </TouchableOpacity>

              {/* Toggle Favorite */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.background }]}
                onPress={handleToggleFavorite}
                disabled={loading}>
                <IconSymbol
                  size={20}
                  name="star.fill"
                  color={link.isFavorite ? colors.gold : colors.textSecondary}
                />
                <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>
                  {link.isFavorite ? 'Unfavorite' : 'Favorite'}
                </Text>
              </TouchableOpacity>

              {/* Archive */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.background }]}
                onPress={handleArchive}
                disabled={loading}>
                <IconSymbol size={20} name="checkmark" color={colors.text} />
                <Text style={[styles.actionButtonTextSecondary, { color: colors.text }]}>
                  Archive
                </Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.background }]}
                onPress={handleDelete}>
                <IconSymbol size={20} name="trash" color="#FF3B30" />
                <Text style={[styles.actionButtonTextSecondary, { color: '#FF3B30' }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Share to Conversation Modal */}
      <ShareToConversationModal
        visible={showShareModal}
        link={link}
        onClose={() => setShowShareModal(false)}
        onShare={(conversationId) => {
          console.log('Shared to conversation:', conversationId);
          setShowShareModal(false);
          onClose();
        }}
      />
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
    maxHeight: '90%',
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
  content: {
    padding: 20,
  },
  thumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  platformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  platformText: {
    fontSize: 12,
    fontWeight: '700',
  },
  linkTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  author: {
    fontSize: 16,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  urlContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  url: {
    fontSize: 12,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  metadataText: {
    fontSize: 12,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
});
