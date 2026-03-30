import { MediaPermissions } from '@/utils/media-permissions';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface PickedMedia {
  type: 'image' | 'video' | 'document';
  uri: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}

export class MediaPickerService {
  private static MAX_VIDEO_DURATION = 300;
  private static MAX_FILE_SIZE = 50 * 1024 * 1024;

  /**
   * Helper for direct image picking with crop
   */
  static async pickImageWithAdjustableCrop(): Promise<{ uri: string; fileName?: string } | null> {
    try {
      const hasPermission = await MediaPermissions.requestMediaLibraryPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return null;

      return {
        uri: result.assets[0].uri,
        fileName: result.assets[0].fileName || undefined,
      };
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  static async pickImageFromGallery(): Promise<PickedMedia | null> {
    try {
      const hasPermission = await MediaPermissions.requestMediaLibraryPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > this.MAX_FILE_SIZE) {
        Alert.alert('File Too Large', 'Please select an image smaller than 50MB');
        return null;
      }

      return {
        type: 'image',
        uri: asset.uri,
        fileName: asset.fileName || `image_${Date.now()}.jpg`,
        fileSize: asset.fileSize || 0,
        mimeType: asset.mimeType || 'image/jpeg',
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
      };
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
      return null;
    }
  }

  static async pickVideoFromGallery(): Promise<PickedMedia | null> {
    try {
      const hasPermission = await MediaPermissions.requestMediaLibraryPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: this.MAX_VIDEO_DURATION,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];
      
      if (asset.fileSize && asset.fileSize > this.MAX_FILE_SIZE) {
        Alert.alert('File Too Large', 'Please select a video smaller than 50MB');
        return null;
      }

      if (asset.duration && asset.duration > this.MAX_VIDEO_DURATION) {
        Alert.alert(
          'Video Too Long',
          `Please select a video shorter than ${this.MAX_VIDEO_DURATION / 60} minutes`
        );
        return null;
      }

      return {
        type: 'video',
        uri: asset.uri,
        fileName: asset.fileName || `video_${Date.now()}.mp4`,
        fileSize: asset.fileSize || 0,
        mimeType: asset.mimeType || 'video/mp4',
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        duration: asset.duration ?? undefined,
      };
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video from gallery');
      return null;
    }
  }

  static async takePhoto(): Promise<PickedMedia | null> {
    try {
      const hasPermission = await MediaPermissions.requestCameraPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];

      return {
        type: 'image',
        uri: asset.uri,
        fileName: `photo_${Date.now()}.jpg`,
        fileSize: asset.fileSize || 0,
        mimeType: 'image/jpeg',
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
      };
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    }
  }

  static async recordVideo(): Promise<PickedMedia | null> {
    try {
      const hasPermission = await MediaPermissions.requestCameraPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: this.MAX_VIDEO_DURATION,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];

      return {
        type: 'video',
        uri: asset.uri,
        fileName: `video_${Date.now()}.mp4`,
        fileSize: asset.fileSize || 0,
        mimeType: 'video/mp4',
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        duration: asset.duration ?? undefined,
      };
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video');
      return null;
    }
  }

  static async pickDocument(): Promise<PickedMedia | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return null;

      const asset = result.assets[0];
      
      if (asset.size && asset.size > this.MAX_FILE_SIZE) {
        Alert.alert('File Too Large', 'Please select a file smaller than 50MB');
        return null;
      }

      return {
        type: 'document',
        uri: asset.uri,
        fileName: asset.name,
        fileSize: asset.size || 0,
        mimeType: asset.mimeType || 'application/octet-stream',
      };
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
      return null;
    }
  }

  static async pickMultipleImages(): Promise<PickedMedia[]> {
    try {
      const hasPermission = await MediaPermissions.requestMediaLibraryPermission();
      if (!hasPermission) return [];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });

      if (result.canceled) return [];

      return result.assets
        .filter(asset => !asset.fileSize || asset.fileSize <= this.MAX_FILE_SIZE)
        .map(asset => ({
          type: 'image' as const,
          uri: asset.uri,
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
          fileSize: asset.fileSize || 0,
          mimeType: asset.mimeType || 'image/jpeg',
          width: asset.width ?? undefined,
          height: asset.height ?? undefined,
        }));
    } catch (error) {
      console.error('Error picking multiple images:', error);
      Alert.alert('Error', 'Failed to pick images');
      return [];
    }
  }
}
