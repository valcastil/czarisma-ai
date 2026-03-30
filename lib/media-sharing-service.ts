import { Attachment } from '@/constants/message-types';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export class MediaSharingService {
  /**
   * Share media to other apps (WhatsApp, Instagram, Messenger, etc.)
   * Uses the native share sheet on both iOS and Android.
   */
  static async shareToApps(attachment: Attachment): Promise<void> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Not Available', 'Sharing is not supported on this device.');
        return;
      }

      const localUri = await this.downloadToCache(attachment);
      if (!localUri) return;

      await Sharing.shareAsync(localUri, {
        mimeType: attachment.mimeType || this.getMimeType(attachment),
        dialogTitle: 'Share via',
        UTI: this.getUTI(attachment),
      });
    } catch (error: any) {
      // User cancelled sharing — not an error
      if (error?.message?.includes('cancel') || error?.message?.includes('dismiss')) return;
      console.error('Error sharing media:', error);
      Alert.alert('Share Failed', 'Failed to share media. Please try again.');
    }
  }

  /**
   * Save image or video to the device's photo library / gallery.
   */
  static async saveToDevice(attachment: Attachment): Promise<void> {
    try {
      if (attachment.type !== 'image' && attachment.type !== 'video') {
        Alert.alert('Not Supported', 'Only images and videos can be saved to your gallery.');
        return;
      }

      const localUri = await this.downloadToCache(attachment);
      if (!localUri) return;

      if (Platform.OS === 'android') {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('Permission not granted');
          }
          const fileName = this.getFileName(attachment);
          const destUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.copyAsync({ from: localUri, to: destUri });
          const asset = await MediaLibrary.createAssetAsync(destUri);
          await FileSystem.deleteAsync(destUri, { idempotent: true }).catch(() => {});
          if (asset) {
            Alert.alert('Saved', `${attachment.type === 'image' ? 'Image' : 'Video'} saved to your gallery.`);
            return;
          }
        } catch (mediaError) {
          // Fallback to share sheet if MediaLibrary fails (e.g. Expo Go)
          console.warn('MediaLibrary save failed, falling back to share sheet:', mediaError);
          await Sharing.shareAsync(localUri, {
            mimeType: attachment.mimeType || this.getMimeType(attachment),
            dialogTitle: 'Save to device',
          });
          return;
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library to save media.');
          return;
        }
        await MediaLibrary.saveToLibraryAsync(localUri);
        Alert.alert('Saved', `${attachment.type === 'image' ? 'Image' : 'Video'} saved to your gallery.`);
      }
    } catch (error) {
      console.error('Error saving to device:', error);
      Alert.alert('Save Failed', 'Failed to save media to your device. Please try again.');
    }
  }

  /**
   * Download a file to the device's Downloads folder (documents).
   * On iOS this triggers the share sheet for saving; on Android it saves to gallery for
   * images/videos or opens share sheet for documents.
   */
  static async downloadFile(attachment: Attachment): Promise<void> {
    try {
      const localUri = await this.downloadToCache(attachment);
      if (!localUri) return;

      if (Platform.OS === 'ios') {
        // On iOS, use share sheet which lets user save to Files app
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(localUri, {
            mimeType: attachment.mimeType || this.getMimeType(attachment),
            UTI: this.getUTI(attachment),
          });
        }
      } else {
        // On Android, save images/videos to gallery; use share sheet for documents
        if (attachment.type === 'image' || attachment.type === 'video') {
          await this.saveToDevice(attachment);
        } else {
          await Sharing.shareAsync(localUri, {
            mimeType: attachment.mimeType || this.getMimeType(attachment),
            dialogTitle: 'Save file',
          });
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('cancel') || error?.message?.includes('dismiss')) return;
      console.error('Error downloading file:', error);
      Alert.alert('Download Failed', 'Failed to download file. Please try again.');
    }
  }

  /**
   * Downloads the remote file to the app's cache directory.
   * Returns the local file URI or null on failure.
   */
  private static async downloadToCache(attachment: Attachment): Promise<string | null> {
    try {
      const fileName = this.getFileName(attachment);
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Check if already cached
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) return localUri;

      const downloadResult = await FileSystem.downloadAsync(attachment.url, localUri);

      if (downloadResult.status !== 200) {
        Alert.alert('Download Failed', 'Could not download the file.');
        return null;
      }

      return downloadResult.uri;
    } catch (error) {
      console.error('Error downloading to cache:', error);
      Alert.alert('Download Failed', 'Could not download the file. Please check your connection.');
      return null;
    }
  }

  private static getFileName(attachment: Attachment): string {
    if (attachment.name) return attachment.name;

    const timestamp = Date.now();
    switch (attachment.type) {
      case 'image': return `image_${timestamp}.jpg`;
      case 'video': return `video_${timestamp}.mp4`;
      case 'document': return `document_${timestamp}`;
      default: return `file_${timestamp}`;
    }
  }

  private static getMimeType(attachment: Attachment): string {
    if (attachment.mimeType) return attachment.mimeType;
    switch (attachment.type) {
      case 'image': return 'image/jpeg';
      case 'video': return 'video/mp4';
      case 'document': return 'application/octet-stream';
      default: return 'application/octet-stream';
    }
  }

  /** iOS Uniform Type Identifier for proper share sheet behavior */
  private static getUTI(attachment: Attachment): string {
    switch (attachment.type) {
      case 'image': return 'public.image';
      case 'video': return 'public.movie';
      case 'document': {
        const ext = attachment.name?.split('.').pop()?.toLowerCase();
        switch (ext) {
          case 'pdf': return 'com.adobe.pdf';
          case 'doc':
          case 'docx': return 'org.openxmlformats.wordprocessingml.document';
          case 'xls':
          case 'xlsx': return 'org.openxmlformats.spreadsheetml.sheet';
          case 'txt': return 'public.plain-text';
          case 'zip': return 'public.zip-archive';
          default: return 'public.data';
        }
      }
      default: return 'public.data';
    }
  }
}
