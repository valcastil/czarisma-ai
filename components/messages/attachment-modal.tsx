import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { MediaPickerService } from '@/lib/media-picker-service';
import { Attachment, MediaUploadService } from '@/lib/media-upload-service';
import { supabase } from '@/lib/supabase';
import { ImageEditorModal } from '@/components/messages/image-editor-modal';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AttachmentModalProps {
  visible: boolean;
  onClose: () => void;
  onAttachMedia: (attachment: Attachment) => void;
  onAttachCharisma?: () => void;
  onAttachLocation?: () => void;
}

export function AttachmentModal({ visible, onClose, onAttachMedia, onAttachCharisma, onAttachLocation }: AttachmentModalProps) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [previewMedia, setPreviewMedia] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const pendingPickRef = useRef(false);

  const handlePickImage = () => {
    pendingPickRef.current = true;
    onClose();
  };

  const launchPickerAfterDismiss = async () => {
    if (!pendingPickRef.current) return;
    pendingPickRef.current = false;
    const media = await MediaPickerService.pickImageFromGalleryNoCrop();
    if (media) {
      setPreviewMedia(media);
      setShowPreview(true);
    }
  };

  useEffect(() => {
    if (!visible && pendingPickRef.current && Platform.OS === 'android') {
      const t = setTimeout(launchPickerAfterDismiss, 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const handlePreviewSend = async () => {
    setShowPreview(false);
    if (previewMedia) {
      await uploadAndAttach(previewMedia, 'image');
    }
    setPreviewMedia(null);
  };

  const [showEditor, setShowEditor] = useState(false);

  const handlePreviewEdit = () => {
    setShowPreview(false);
    setShowEditor(true);
  };

  const handleEditorDone = async (editedUri: string) => {
    setShowEditor(false);
    const media = {
      uri: editedUri,
      fileName: `edited_${Date.now()}.jpg`,
      fileSize: 0,
      mimeType: 'image/jpeg',
      type: 'image' as const,
    };
    await uploadAndAttach(media, 'image');
    setPreviewMedia(null);
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    if (previewMedia) {
      setShowPreview(true);
    }
  };

  const handlePreviewCancel = () => {
    setShowPreview(false);
    setPreviewMedia(null);
  };

  const handlePickVideo = async () => {
    const media = await MediaPickerService.pickVideoFromGallery();
    if (media) {
      await uploadAndAttach(media, 'video');
    }
  };

  const handleTakePhoto = async () => {
    const media = await MediaPickerService.takePhoto();
    if (media) {
      await uploadAndAttach(media, 'image');
    }
  };

  const handleRecordVideo = async () => {
    const media = await MediaPickerService.recordVideo();
    if (media) {
      await uploadAndAttach(media, 'video');
    }
  };

  const handlePickDocument = async () => {
    const media = await MediaPickerService.pickDocument();
    if (media) {
      await uploadAndAttach(media, 'document');
    }
  };

  const uploadAndAttach = async (media: any, type: 'image' | 'video' | 'document') => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let attachment: Attachment;
      
      if (type === 'image') {
        attachment = await MediaUploadService.uploadImage(
          media.uri,
          user.id,
          (progress) => setUploadProgress(progress)
        );
      } else if (type === 'video') {
        attachment = await MediaUploadService.uploadVideo(
          media.uri,
          user.id,
          (progress) => setUploadProgress(progress)
        );
      } else {
        attachment = await MediaUploadService.uploadDocument(
          media.uri,
          user.id,
          media.fileName,
          (progress) => setUploadProgress(progress)
        );
      }

      onAttachMedia(attachment);
      onClose();
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Upload Failed', 'Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const attachmentOptions: { id: string; icon: any; label: string; color: string; onPress: () => void }[] = [
    {
      id: 'gallery_photo',
      icon: 'photo.fill',
      label: 'Gallery Photo',
      color: '#FF6B6B',
      onPress: handlePickImage,
    },
    {
      id: 'gallery_video',
      icon: 'video.fill',
      label: 'Gallery Video',
      color: '#4ECDC4',
      onPress: handlePickVideo,
    },
    {
      id: 'camera_photo',
      icon: 'camera.fill',
      label: 'Take Photo',
      color: '#95E1D3',
      onPress: handleTakePhoto,
    },
    {
      id: 'camera_video',
      icon: 'video.circle.fill',
      label: 'Record Video',
      color: '#F38181',
      onPress: handleRecordVideo,
    },
    {
      id: 'document',
      icon: 'doc.fill',
      label: 'Document',
      color: '#AA96DA',
      onPress: handlePickDocument,
    },
  ];

  if (onAttachLocation) {
    attachmentOptions.push({
      id: 'location',
      icon: 'location.fill',
      label: 'Location',
      color: '#3B82F6',
      onPress: () => {
        onClose();
        onAttachLocation();
      },
    });
  }

  if (onAttachCharisma) {
    attachmentOptions.push({
      id: 'charisma',
      icon: 'sparkles',
      label: 'Charisma Entry',
      color: colors.gold,
      onPress: () => {
        onClose();
        onAttachCharisma();
      },
    });
  }

  return (
    <>
      <ImageEditorModal
        visible={showEditor}
        imageUri={previewMedia?.uri ?? null}
        onCancel={handleEditorCancel}
        onDone={handleEditorDone}
      />

      {/* Image preview modal — shown after gallery pick, before upload */}
      <Modal
        visible={showPreview}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={handlePreviewCancel}>
        <View style={previewStyles.container}>
          <TouchableOpacity style={previewStyles.closeBtn} onPress={handlePreviewCancel}>
            <Text style={previewStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          {previewMedia && (
            <Image
              source={{ uri: previewMedia.uri }}
              style={previewStyles.image}
              resizeMode="contain"
            />
          )}
          <View style={previewStyles.actions}>
            <TouchableOpacity style={previewStyles.editBtn} onPress={handlePreviewEdit}>
              <Text style={previewStyles.editBtnText}>✏️  Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={previewStyles.sendBtn} onPress={handlePreviewSend}>
              <Text style={previewStyles.sendBtnText}>Send  ➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      onDismiss={launchPickerAfterDismiss}>
      
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Attach Media
            </Text>
            <TouchableOpacity onPress={onClose} disabled={uploading}>
              <IconSymbol size={24} name="xmark" color={colors.text} />
            </TouchableOpacity>
          </View>

          {uploading && (
            <View style={styles.uploadProgress}>
              <Text style={[styles.uploadText, { color: colors.text }]}>
                Uploading... {Math.round(uploadProgress)}%
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill,
                    { backgroundColor: colors.gold, width: `${uploadProgress}%` }
                  ]} 
                />
              </View>
            </View>
          )}

          <ScrollView 
            style={styles.optionsContainer}
            showsVerticalScrollIndicator={false}>
            <View style={styles.optionsGrid}>
              {attachmentOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionButton, { backgroundColor: colors.background }]}
                  onPress={option.onPress}
                  disabled={uploading}
                  activeOpacity={0.7}>
                  <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                    <IconSymbol size={24} name={option.icon} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
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
    paddingBottom: 40,
    maxHeight: '70%',
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
  uploadProgress: {
    padding: 20,
  },
  uploadText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  optionsContainer: {
    padding: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    ...Platform.select({
      android: {
        gap: 0,
        marginHorizontal: -6,
      },
    }),
  },
  optionButton: {
    width: '28%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      android: {
        gap: 0,
        marginHorizontal: 6,
        marginBottom: 12,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const previewStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    left: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  image: {
    width: SCREEN_W,
    height: SCREEN_H * 0.75,
  },
  actions: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    gap: 16,
  },
  editBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sendBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#C9A84C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
