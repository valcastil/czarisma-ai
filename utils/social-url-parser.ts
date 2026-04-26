/**
 * Social Media URL Parser
 * Parses URLs from YouTube Shorts, TikTok, Facebook Reels, Instagram Reels
 * and extracts video IDs and platform types for deep linking
 */

export type SocialPlatform = 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'twitter' | 'unknown';

export interface ParsedSocialUrl {
  platform: SocialPlatform;
  originalUrl: string;
  videoId: string | null;
  username: string | null;
  isShortForm: boolean; // true for Shorts, Reels, TikTok videos
  deepLinkUrl: string | null;
  webUrl: string;
}

const PLATFORM_PATTERNS: Record<SocialPlatform, RegExp[]> = {
  youtube: [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i,
    /youtu\.be\/([a-zA-Z0-9_-]+)/i,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i,
  ],
  tiktok: [
    /tiktok\.com\/@[\w.]+\/video\/(\d+)/i,
    /tiktok\.com\/t\/(\w+)/i,
    /vm\.tiktok\.com\/(\w+)/i,
    /vt\.tiktok\.com\/(\w+)/i,
  ],
  facebook: [
    /facebook\.com\/.*\/videos\/(\d+)/i,
    /facebook\.com\/reel\/(\d+)/i,
    /fb\.watch\/(\w+)/i,
    /facebook\.com\/watch\/?\?v=(\d+)/i,
  ],
  instagram: [
    /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i,
    /instagram\.com\/p\/([a-zA-Z0-9_-]+)/i,
    /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/i,
  ],
  twitter: [
    /twitter\.com\/\w+\/status\/(\d+)/i,
    /x\.com\/\w+\/status\/(\d+)/i,
  ],
  unknown: [],
};

/**
 * Extract username from TikTok URL
 */
const extractTikTokUsername = (url: string): string | null => {
  const match = url.match(/tiktok\.com\/(@[\w.]+)/i);
  return match ? match[1].replace('@', '') : null;
};

/**
 * Detect platform from URL
 */
export const detectPlatform = (url: string): SocialPlatform => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('youtube') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }
  if (lowerUrl.includes('tiktok')) {
    return 'tiktok';
  }
  if (lowerUrl.includes('facebook') || lowerUrl.includes('fb.watch')) {
    return 'facebook';
  }
  if (lowerUrl.includes('instagram')) {
    return 'instagram';
  }
  if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com')) {
    return 'twitter';
  }
  
  return 'unknown';
};

/**
 * Check if URL is a short-form video (Shorts, Reels, TikTok)
 */
const isShortFormVideo = (platform: SocialPlatform, url: string): boolean => {
  const lowerUrl = url.toLowerCase();
  
  switch (platform) {
    case 'youtube':
      return lowerUrl.includes('/shorts/') || lowerUrl.includes('shorts');
    case 'tiktok':
      return true; // All TikTok videos are short-form
    case 'facebook':
      return lowerUrl.includes('/reel/') || lowerUrl.includes('reel');
    case 'instagram':
      return lowerUrl.includes('/reel/') || lowerUrl.includes('/p/');
    default:
      return false;
  }
};

/**
 * Extract video ID from URL based on platform
 */
const extractVideoId = (platform: SocialPlatform, url: string): string | null => {
  const patterns = PLATFORM_PATTERNS[platform];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Generate platform-specific deep link
 */
const generateDeepLink = (platform: SocialPlatform, videoId: string | null, username: string | null): string | null => {
  if (!videoId) return null;
  
  switch (platform) {
    case 'youtube':
      return `youtube://shorts/${videoId}`;
    case 'tiktok':
      // TikTok deep links are complex, use web for now
      return null;
    case 'facebook':
      // Facebook has limited deep link support
      return null;
    case 'instagram':
      return `instagram://media?id=${videoId}`;
    default:
      return null;
  }
};

/**
 * Generate clean web URL
 */
const generateWebUrl = (platform: SocialPlatform, videoId: string | null, originalUrl: string): string => {
  if (!videoId) return originalUrl;
  
  switch (platform) {
    case 'youtube':
      return `https://youtube.com/shorts/${videoId}`;
    case 'tiktok':
      return originalUrl; // Keep original for TikTok
    case 'facebook':
      return `https://facebook.com/reel/${videoId}`;
    case 'instagram':
      return `https://instagram.com/reel/${videoId}`;
    default:
      return originalUrl;
  }
};

/**
 * Parse a social media URL
 */
export const parseSocialUrl = (url: string): ParsedSocialUrl => {
  const trimmedUrl = url.trim();
  const platform = detectPlatform(trimmedUrl);
  const videoId = extractVideoId(platform, trimmedUrl);
  const username = platform === 'tiktok' ? extractTikTokUsername(trimmedUrl) : null;
  const isShortForm = isShortFormVideo(platform, trimmedUrl);
  const deepLinkUrl = generateDeepLink(platform, videoId, username);
  const webUrl = generateWebUrl(platform, videoId, trimmedUrl);
  
  return {
    platform,
    originalUrl: trimmedUrl,
    videoId,
    username,
    isShortForm,
    deepLinkUrl,
    webUrl,
  };
};

/**
 * Parse multiple social URLs and return only valid video links
 */
export const parseSocialUrls = (urls: string[]): ParsedSocialUrl[] => {
  return urls
    .map(parseSocialUrl)
    .filter(parsed => parsed.videoId !== null && parsed.isShortForm);
};

/**
 * Check if URL is a valid short-form video
 */
export const isValidShortFormVideo = (url: string): boolean => {
  const parsed = parseSocialUrl(url);
  return parsed.isShortForm && parsed.videoId !== null;
};

/**
 * Get platform display name
 */
export const getPlatformDisplayName = (platform: SocialPlatform): string => {
  const names: Record<SocialPlatform, string> = {
    youtube: 'YouTube Shorts',
    tiktok: 'TikTok',
    facebook: 'Facebook Reels',
    instagram: 'Instagram Reels',
    twitter: 'X / Twitter',
    unknown: 'Unknown',
  };
  return names[platform];
};

/**
 * Get platform emoji
 */
export const getPlatformEmoji = (platform: SocialPlatform): string => {
  const emojis: Record<SocialPlatform, string> = {
    youtube: '▶️',
    tiktok: '🎵',
    facebook: '👤',
    instagram: '📸',
    twitter: '🐦',
    unknown: '🔗',
  };
  return emojis[platform];
};
