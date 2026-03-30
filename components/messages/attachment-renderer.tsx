import { IconSymbol } from '@/components/ui/icon-symbol';
import { Attachment } from '@/constants/message-types';
import { useTheme } from '@/hooks/use-theme';
import { MediaSharingService } from '@/lib/media-sharing-service';
import React, { useState } from 'react';
import { ActionSheetIOS, Alert, Image, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AttachmentRendererProps {
  attachment: Attachment;
  isFromCurrentUser: boolean;
}

export function AttachmentRenderer({ attachment, isFromCurrentUser }: AttachmentRendererProps) {
  const { colors } = useTheme();
  const [showImageModal, setShowImageModal] = useState(false);

  const handleDownload = async () => {
    try {
      const supported = await Linking.canOpenURL(attachment.url);
      if (supported) {
        await Linking.openURL(attachment.url);
      } else {
        Alert.alert('Error', 'Cannot open this file');
      }
    } catch (error) {
      console.error('Error opening attachment:', error);
      Alert.alert('Error', 'Failed to open attachment');
    }
  };

  const showMediaActions = () => {
    const isMediaType = attachment.type === 'image' || attachment.type === 'video';

    if (Platform.OS === 'ios') {
      const options = [
        'Share to Apps',
        ...(isMediaType ? ['Save to Gallery'] : []),
        'Download',
        'Cancel',
      ];
      const cancelIndex = options.length - 1;
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (buttonIndex) => handleActionSelection(buttonIndex, isMediaType),
      );
    } else {
      // Android: merge Save to Gallery + Download into one "Save to Device"
      Alert.alert('Media Options', undefined, [
        { text: 'Share to Apps', onPress: () => MediaSharingService.shareToApps(attachment) },
        { text: 'Save to Device', onPress: () => MediaSharingService.downloadFile(attachment) },
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const handleActionSelection = (buttonIndex: number, isMediaType: boolean) => {
    if (isMediaType) {
      switch (buttonIndex) {
        case 0: MediaSharingService.shareToApps(attachment); break;
        case 1: MediaSharingService.saveToDevice(attachment); break;
        case 2: MediaSharingService.downloadFile(attachment); break;
      }
    } else {
      switch (buttonIndex) {
        case 0: MediaSharingService.shareToApps(attachment); break;
        case 1: MediaSharingService.downloadFile(attachment); break;
      }
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (attachment.type === 'image') {
    return (
      <>
        <TouchableOpacity 
          onPress={() => setShowImageModal(true)}
          onLongPress={showMediaActions}
          activeOpacity={0.9}>
          <Image
            source={{ uri: attachment.url }}
            style={styles.image}
            resizeMode="cover"
          />
        </TouchableOpacity>

        <Modal
          visible={showImageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}>
          <View style={styles.imageModalOverlay}>
            <Image
              source={{ uri: attachment.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <View style={styles.imageModalHeader}>
              <TouchableOpacity style={styles.imageModalCloseBtn} onPress={() => setShowImageModal(false)}>
                <IconSymbol size={32} name="xmark.circle.fill" color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.imageModalActions}>
                <TouchableOpacity
                  style={styles.imageModalActionBtn}
                  onPress={() => MediaSharingService.shareToApps(attachment)}>
                  <IconSymbol size={24} name="square.and.arrow.up" color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageModalActionBtn}
                  onPress={() => MediaSharingService.downloadFile(attachment)}>
                  <IconSymbol size={24} name="arrow.down.to.line" color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  if (attachment.type === 'video') {
    return (
      <TouchableOpacity 
        style={[styles.videoContainer, { backgroundColor: colors.background }]}
        onPress={handleDownload}
        onLongPress={showMediaActions}
        activeOpacity={0.7}>
        <View style={styles.videoIconContainer}>
          <IconSymbol size={48} name="play.circle.fill" color={colors.gold} />
        </View>
        <View style={styles.videoInfo}>
          <Text style={[styles.videoLabel, { color: colors.text }]}>
            Video
          </Text>
          {attachment.duration && (
            <Text style={[styles.videoMeta, { color: colors.textSecondary }]}>
              {formatDuration(attachment.duration)}
            </Text>
          )}
          {attachment.size && (
            <Text style={[styles.videoMeta, { color: colors.textSecondary }]}>
              {formatFileSize(attachment.size)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={showMediaActions} style={styles.actionIcon}>
          <IconSymbol size={20} name="square.and.arrow.up" color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  if (attachment.type === 'document') {
    const getDocumentIcon = () => {
      const ext = attachment.name?.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'pdf': return 'doc.text.fill';
        case 'doc':
        case 'docx': return 'doc.fill';
        case 'xls':
        case 'xlsx': return 'tablecells.fill';
        case 'ppt':
        case 'pptx': return 'chart.bar.doc.horizontal.fill';
        default: return 'doc.fill';
      }
    };

    return (
      <TouchableOpacity 
        style={[styles.documentContainer, { backgroundColor: colors.background }]}
        onPress={handleDownload}
        onLongPress={showMediaActions}
        activeOpacity={0.7}>
        <View style={[styles.documentIconContainer, { backgroundColor: colors.gold + '20' }]}>
          <IconSymbol size={32} name={getDocumentIcon()} color={colors.gold} />
        </View>
        <View style={styles.documentInfo}>
          <Text 
            style={[styles.documentName, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="middle">
            {attachment.name || 'Document'}
          </Text>
          {attachment.size && (
            <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
              {formatFileSize(attachment.size)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={showMediaActions} style={styles.actionIcon}>
          <IconSymbol size={20} name="square.and.arrow.up" color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  image: {
    width: 250,
    height: 250,
    borderRadius: 12,
    marginTop: 4,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageModalCloseBtn: {
    padding: 4,
  },
  imageModalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  imageModalActionBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
    gap: 12,
    minWidth: 250,
  },
  videoIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    flex: 1,
  },
  videoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoMeta: {
    fontSize: 12,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
    gap: 12,
    minWidth: 250,
  },
  documentIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 12,
  },
  actionIcon: {
    padding: 8,
  },
});
