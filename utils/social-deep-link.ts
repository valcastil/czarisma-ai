/**
 * Social Media Deep Link Handler
 * Opens social media videos in native apps or falls back to WebView/browser
 */

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { parseSocialUrl, type ParsedSocialUrl, type SocialPlatform } from './social-url-parser';

export interface OpenVideoResult {
  success: boolean;
  method: 'deep-link' | 'web-view' | 'browser' | 'error';
  error?: string;
}

/**
 * Check if a native app is installed
 */
export const isAppInstalled = async (url: string): Promise<boolean> => {
  try {
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
};

/**
 * Generate platform-specific deep link URL
 */
export const generateDeepLink = (parsed: ParsedSocialUrl): string | null => {
  const { platform, videoId, username } = parsed;
  
  if (!videoId) return null;
  
  switch (platform) {
    case 'youtube':
      // YouTube deep links
      if (Platform.OS === 'ios') {
        return `youtube://shorts/${videoId}`;
      } else {
        return `vnd.youtube://${videoId}`;
      }
      
    case 'tiktok':
      // TikTok deep links (limited support)
      if (Platform.OS === 'ios') {
        return `snssdk1180://user/profile/${username || videoId}`;
      } else {
        return `tiktok://video/${videoId}`;
      }
      
    case 'instagram':
      // Instagram deep links
      return `instagram://media?id=${videoId}`;
      
    case 'facebook':
      // Facebook has limited reel deep link support
      return null;
      
    default:
      return null;
  }
};

/**
 * Open a social media video
 * Tries deep link first, then WebView, then browser
 */
export const openSocialVideo = async (
  url: string,
  options: {
    preferNative?: boolean;
    autoPlay?: boolean;
  } = {}
): Promise<OpenVideoResult> => {
  const { preferNative = true, autoPlay = true } = options;
  
  try {
    const parsed = parseSocialUrl(url);
    
    // Try deep link first if preferred
    if (preferNative) {
      const deepLink = generateDeepLink(parsed);
      
      if (deepLink) {
        const canOpen = await isAppInstalled(deepLink);
        
        if (canOpen) {
          await Linking.openURL(deepLink);
          return { success: true, method: 'deep-link' };
        }
      }
    }
    
    // Fall back to web URL with autoplay parameter
    const webUrl = getWebUrlWithAutoplay(parsed);
    await Linking.openURL(webUrl);
    
    return { success: true, method: 'browser' };
    
  } catch (error) {
    console.error('Error opening social video:', error);
    return {
      success: false,
      method: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get web URL with autoplay parameters
 */
const getWebUrlWithAutoplay = (parsed: ParsedSocialUrl): string => {
  const { platform, videoId, webUrl } = parsed;
  
  if (!videoId) return webUrl;
  
  switch (platform) {
    case 'youtube':
      // YouTube autoplay parameter
      return `https://youtube.com/shorts/${videoId}?autoplay=1`;
      
    case 'tiktok':
      // TikTok doesn't support autoplay in web
      return webUrl;
      
    case 'facebook':
      // Facebook reels
      return `https://facebook.com/reel/${videoId}`;
      
    case 'instagram':
      // Instagram doesn't support autoplay in web
      return webUrl;
      
    default:
      return webUrl;
  }
};

/**
 * Open multiple videos in sequence
 * Note: Due to platform limitations, this will open one at a time
 * and return to the app between each video
 */
export const openVideoSequence = async (
  urls: string[],
  onVideoComplete?: (index: number, url: string) => void
): Promise<void> => {
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    
    try {
      await openSocialVideo(url);
      
      // Callback to notify that video was opened
      onVideoComplete?.(i, url);
      
    } catch (error) {
      console.error(`Error opening video ${i}:`, error);
    }
  }
};

/**
 * Get app store URL for platform
 */
export const getAppStoreUrl = (platform: SocialPlatform): string | null => {
  switch (platform) {
    case 'youtube':
      return Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/youtube/id544007664'
        : 'https://play.google.com/store/apps/details?id=com.google.android.youtube';
        
    case 'tiktok':
      return Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/tiktok/id835599320'
        : 'https://play.google.com/store/apps/details?id=com.zhiliaoapp.musically';
        
    case 'instagram':
      return Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/instagram/id389801252'
        : 'https://play.google.com/store/apps/details?id=com.instagram.android';
        
    case 'facebook':
      return Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/facebook/id284882215'
        : 'https://play.google.com/store/apps/details?id=com.facebook.katana';
        
    default:
      return null;
  }
};

/**
 * Open app store for a platform
 */
export const openAppStore = async (platform: SocialPlatform): Promise<boolean> => {
  const storeUrl = getAppStoreUrl(platform);
  
  if (!storeUrl) return false;
  
  try {
    await Linking.openURL(storeUrl);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if a URL can be opened
 */
export const canOpenUrl = async (url: string): Promise<boolean> => {
  try {
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
};
