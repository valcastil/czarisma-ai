import { Attachment } from '@/constants/message-types';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

export { Attachment };

export class MediaUploadService {
  private static BUCKET_NAME = 'message-attachments';
  private static MAX_FILE_SIZE = 50 * 1024 * 1024;

  static async uploadImage(
    uri: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<Attachment> {
    try {
      onProgress?.(10);

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('Image file not found');

      onProgress?.(30);

      const imagePath = await this.uploadToStorage(
        uri,
        userId,
        'image',
        'image/jpeg'
      );

      onProgress?.(100);

      return {
        type: 'image',
        url: imagePath,
        mimeType: 'image/jpeg',
        size: fileInfo.size,
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  static async uploadVideo(
    uri: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<Attachment> {
    try {
      onProgress?.(10);

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('Video file not found');

      if (fileInfo.size > this.MAX_FILE_SIZE) {
        throw new Error('Video file is too large (max 50MB)');
      }

      onProgress?.(30);

      const videoPath = await this.uploadToStorage(
        uri,
        userId,
        'video',
        'video/mp4'
      );

      onProgress?.(100);

      return {
        type: 'video',
        url: videoPath,
        mimeType: 'video/mp4',
        size: fileInfo.size,
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      throw new Error('Failed to upload video');
    }
  }

  static async uploadDocument(
    uri: string,
    userId: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<Attachment> {
    try {
      onProgress?.(20);

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('File not found');

      if (fileInfo.size > this.MAX_FILE_SIZE) {
        throw new Error('File is too large (max 50MB)');
      }

      onProgress?.(40);

      const extension = fileName.split('.').pop()?.toLowerCase();
      const mimeType = this.getMimeTypeFromExtension(extension || '');

      onProgress?.(60);

      const docPath = await this.uploadToStorage(
        uri,
        userId,
        'document',
        mimeType,
        fileName
      );

      onProgress?.(100);

      return {
        type: 'document',
        url: docPath,
        name: fileName,
        mimeType,
        size: fileInfo.size,
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new Error('Failed to upload document');
    }
  }

  private static async uploadToStorage(
    uri: string,
    userId: string,
    type: string,
    mimeType: string,
    customFileName?: string
  ): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const timestamp = Date.now();
      const extension = this.getExtensionFromMimeType(mimeType);
      const fileName = customFileName 
        ? `${userId}/${type}_${timestamp}_${customFileName}`
        : `${userId}/${type}_${timestamp}.${extension}`;

      // Optimized base64 to byte array conversion
      const byteCharacters = atob(base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, byteArray, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading to storage:', error);
      throw error;
    }
  }

  private static getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  private static getExtensionFromMimeType(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/quicktime': 'mov',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'text/plain': 'txt',
    };

    return extensions[mimeType] || 'bin';
  }

  static async deleteMedia(url: string): Promise<void> {
    try {
      const path = url.split(`${this.BUCKET_NAME}/`)[1];
      if (!path) return;

      await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([path]);
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  }
}
