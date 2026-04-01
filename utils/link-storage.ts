import AsyncStorage from '@react-native-async-storage/async-storage';

const SHARED_LINKS_KEY = '@charisma_shared_links';

export type LinkPlatform = 'youtube' | 'instagram' | 'tiktok' | 'reels' | 'unknown';

export interface SharedLink {
  id: string;
  url: string;
  platform: LinkPlatform;
  label: string;
  thumbnail: string | null;
  timestamp: number;
  date: string;
  time: string;
}

/**
 * Detect platform from URL
 */
export const detectPlatform = (url: string): { platform: LinkPlatform; label: string } => {
  const lower = url.toLowerCase();

  if (lower.includes('youtube.com/shorts') || lower.includes('youtu.be/')) {
    return { platform: 'youtube', label: 'YouTube Shorts' };
  }
  if (lower.includes('youtube.com')) {
    return { platform: 'youtube', label: 'YouTube' };
  }
  if (lower.includes('instagram.com/reel')) {
    return { platform: 'reels', label: 'Instagram Reels' };
  }
  if (lower.includes('instagram.com')) {
    return { platform: 'instagram', label: 'Instagram' };
  }
  if (lower.includes('tiktok.com') || lower.includes('vm.tiktok.com')) {
    return { platform: 'tiktok', label: 'TikTok' };
  }
  if (lower.includes('facebook.com/reel') || lower.includes('facebook.com/share/r/') || lower.includes('fb.watch')) {
    return { platform: 'reels', label: 'Facebook Reels' };
  }
  if (lower.includes('facebook.com')) {
    return { platform: 'reels', label: 'Facebook' };
  }

  return { platform: 'unknown', label: 'Link' };
};

/**
 * Validate that a string is a URL from a supported platform
 */
export const isValidSocialLink = (url: string): boolean => {
  try {
    const lower = url.toLowerCase().trim();
    return (
      lower.includes('youtube.com') ||
      lower.includes('youtu.be') ||
      lower.includes('instagram.com') ||
      lower.includes('tiktok.com') ||
      lower.includes('vm.tiktok.com') ||
      lower.includes('facebook.com') ||
      lower.includes('fb.watch')
    );
  } catch {
    return false;
  }
};

/**
 * Get all shared links
 */
export const getSharedLinks = async (): Promise<SharedLink[]> => {
  try {
    const data = await AsyncStorage.getItem(SHARED_LINKS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading shared links:', error);
    return [];
  }
};

/**
 * Extract YouTube video ID from URL
 */
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/**
 * Fetch thumbnail using Microlink API (handles Facebook, Instagram, TikTok reliably)
 */
const fetchThumbnailViaApi = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);
    const json = await response.json();
    if (json.status === 'success' && json.data?.image?.url) {
      return json.data.image.url;
    }
    // Fallback: try video thumbnail if image not found
    if (json.status === 'success' && json.data?.video?.poster) {
      return json.data.video.poster;
    }
    return null;
  } catch (error) {
    console.log('Microlink API failed for:', url);
    return null;
  }
};

/**
 * Fallback: try direct HTML fetch for og:image
 */
const fetchOgImageDirect = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    const html = await response.text();
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch && ogMatch[1]) {
      return ogMatch[1];
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Fetch thumbnail: tries Microlink API first, then direct HTML scraping as fallback
 */
const fetchOgImage = async (url: string): Promise<string | null> => {
  // Try Microlink API first (most reliable for Facebook, Instagram, TikTok)
  const apiResult = await fetchThumbnailViaApi(url);
  if (apiResult) return apiResult;
  // Fallback to direct HTML fetch
  return await fetchOgImageDirect(url);
};

/**
 * Get thumbnail URL for a link
 */
export const getThumbnail = async (url: string, platform: LinkPlatform): Promise<string | null> => {
  if (platform === 'youtube') {
    const videoId = extractYouTubeId(url);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  // For Facebook, Instagram, TikTok — fetch og:image from the page
  if (platform === 'reels' || platform === 'instagram' || platform === 'tiktok') {
    return await fetchOgImage(url);
  }
  return null;
};

/**
 * Parse multiple URLs from text (newlines, spaces, commas)
 */
export const parseLinksFromText = (text: string): string[] => {
  const lines = text.split(/[\n\r,]+/);
  const urls: string[] = [];
  for (const line of lines) {
    const words = line.trim().split(/\s+/);
    for (const word of words) {
      const trimmed = word.trim();
      if (trimmed.length > 5 && isValidSocialLink(trimmed)) {
        urls.push(trimmed);
      }
    }
  }
  return urls;
};

/**
 * Create a SharedLink object from a URL
 */
const createLinkObject = async (url: string): Promise<SharedLink> => {
  const { platform, label } = detectPlatform(url.trim());
  const now = new Date();
  const thumbnail = await getThumbnail(url.trim(), platform);
  return {
    id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url: url.trim(),
    platform,
    label,
    thumbnail,
    timestamp: now.getTime(),
    date: now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
};

/**
 * Add a new shared link
 */
export const addSharedLink = async (url: string): Promise<SharedLink> => {
  const link = await createLinkObject(url);
  const existing = await getSharedLinks();
  const updated = [link, ...existing];
  await AsyncStorage.setItem(SHARED_LINKS_KEY, JSON.stringify(updated));
  return link;
};

/**
 * Add multiple shared links at once
 */
export const addMultipleLinks = async (urls: string[]): Promise<SharedLink[]> => {
  const newLinks = await Promise.all(
    urls.map(async (url, i) => {
      const link = await createLinkObject(url);
      // Slightly offset timestamps so ordering is preserved
      link.id = `link_${Date.now() + i}_${Math.random().toString(36).slice(2, 8)}`;
      return link;
    })
  );
  const existing = await getSharedLinks();
  const updated = [...newLinks, ...existing];
  await AsyncStorage.setItem(SHARED_LINKS_KEY, JSON.stringify(updated));
  return newLinks;
};

/**
 * Delete a shared link by ID
 */
export const deleteSharedLink = async (linkId: string): Promise<void> => {
  const existing = await getSharedLinks();
  const filtered = existing.filter((l) => l.id !== linkId);
  await AsyncStorage.setItem(SHARED_LINKS_KEY, JSON.stringify(filtered));
};

/**
 * Get platform color for tags
 */
export const getPlatformColor = (platform: LinkPlatform): string => {
  switch (platform) {
    case 'youtube':
      return '#FF0000';
    case 'instagram':
      return '#E1306C';
    case 'tiktok':
      return '#000000';
    case 'reels':
      return '#C13584';
    default:
      return '#888888';
  }
};

/**
 * Get platform emoji for display
 */
export const getPlatformEmoji = (platform: LinkPlatform): string => {
  switch (platform) {
    case 'youtube':
      return '▶️';
    case 'instagram':
      return '📸';
    case 'tiktok':
      return '🎵';
    case 'reels':
      return '🎬';
    default:
      return '🔗';
  }
};
