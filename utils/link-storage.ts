import { SecureStorage } from '@/utils/secure-storage';

const SHARED_LINKS_KEY = '@charisma_shared_links';

export type LinkPlatform = 'youtube' | 'instagram' | 'tiktok' | 'reels' | 'unknown';

export interface SharedLink {
  id: string;
  url: string;
  platform: LinkPlatform;
  label: string;
  title: string | null;
  description: string | null;
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
    const data = await SecureStorage.getItem(SHARED_LINKS_KEY);
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

interface LinkMetadata {
  thumbnail: string | null;
  title: string | null;
  description: string | null;
}

/**
 * Fetch title via noembed.com (supports YouTube, TikTok, Instagram, Facebook, etc.)
 */
const fetchTitleViaNoEmbed = async (url: string): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const apiUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);
    const json = await response.json();
    if (json.title) return json.title;
    return null;
  } catch {
    return null;
  }
};

/**
 * Fetch metadata via Microlink API
 */
const fetchMetadataViaApi = async (url: string): Promise<LinkMetadata> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);
    const json = await response.json();
    const result: LinkMetadata = { thumbnail: null, title: null, description: null };
    if (json.status === 'success') {
      result.title = json.data?.title || null;
      result.description = json.data?.description || null;
      result.thumbnail = json.data?.image?.url || json.data?.video?.poster || null;
    }
    return result;
  } catch {
    return { thumbnail: null, title: null, description: null };
  }
};

/**
 * Fallback: try direct HTML fetch for og:image and og:title
 */
const fetchMetadataDirect = async (url: string): Promise<LinkMetadata> => {
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

    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)
      || html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i)
      || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);

    return {
      thumbnail: ogImage?.[1] || null,
      title: ogTitle?.[1]?.trim() || null,
      description: ogDescription?.[1]?.trim() || null,
    };
  } catch {
    return { thumbnail: null, title: null, description: null };
  }
};

/**
 * Fetch title only — tries noembed first (most reliable), then Microlink, then direct HTML
 */
const fetchTitleOnly = async (url: string): Promise<string | null> => {
  // 1. noembed.com — works great for YouTube, TikTok, Instagram, Facebook
  const noembedTitle = await fetchTitleViaNoEmbed(url);
  if (noembedTitle) return noembedTitle;

  // 2. Microlink
  const microlinkResult = await fetchMetadataViaApi(url);
  if (microlinkResult.title) return microlinkResult.title;

  // 3. Direct HTML scraping
  const directResult = await fetchMetadataDirect(url);
  return directResult.title;
};

/**
 * Fetch metadata: combines multiple strategies for thumbnail + title
 */
const fetchLinkMetadata = async (url: string, platform: LinkPlatform): Promise<LinkMetadata> => {
  // For YouTube, we can build the thumbnail directly
  let youtubeThumbnail: string | null = null;
  if (platform === 'youtube') {
    const videoId = extractYouTubeId(url);
    if (videoId) youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  // Fetch title via noembed (most reliable for social platforms)
  const noembedTitle = await fetchTitleViaNoEmbed(url);

  // If we already have the title and a YouTube thumbnail, skip other APIs
  if (noembedTitle && youtubeThumbnail) {
    // Still try to get description from Microlink
    const apiResult = await fetchMetadataViaApi(url);
    return { thumbnail: youtubeThumbnail, title: noembedTitle, description: apiResult.description };
  }

  // Try Microlink for thumbnail (and title if noembed missed it)
  const apiResult = await fetchMetadataViaApi(url);
  const title = noembedTitle || apiResult.title;
  const description = apiResult.description;
  const thumbnail = youtubeThumbnail || apiResult.thumbnail;

  if (title || thumbnail) {
    return { thumbnail, title, description };
  }

  // Final fallback: direct HTML scraping
  const directResult = await fetchMetadataDirect(url);
  return {
    thumbnail: youtubeThumbnail || directResult.thumbnail,
    title: directResult.title,
    description: directResult.description,
  };
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
  const { thumbnail, title, description } = await fetchLinkMetadata(url.trim(), platform);
  return {
    id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url: url.trim(),
    platform,
    label,
    title,
    description,
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
  await SecureStorage.setItem(SHARED_LINKS_KEY, JSON.stringify(updated));
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
  await SecureStorage.setItem(SHARED_LINKS_KEY, JSON.stringify(updated));
  return newLinks;
};

/**
 * Delete a shared link by ID
 */
export const deleteSharedLink = async (linkId: string): Promise<void> => {
  const existing = await getSharedLinks();
  const filtered = existing.filter((l) => l.id !== linkId);
  await SecureStorage.setItem(SHARED_LINKS_KEY, JSON.stringify(filtered));
};

/**
 * Refresh missing titles AND thumbnails for existing links in the background.
 * Returns true if any links were updated.
 */
export const refreshMissingTitles = async (): Promise<boolean> => {
  try {
    const links = await getSharedLinks();
    // Check for missing titles OR missing thumbnails (common for TikTok/Instagram)
    const linksNeedingUpdate = links.filter(l => !l.title || !l.thumbnail);
    if (linksNeedingUpdate.length === 0) return false;

    let updated = false;
    const updatedLinks = await Promise.all(
      links.map(async (link) => {
        // Skip if already has both title and thumbnail
        if (link.title && link.thumbnail) return link;

        try {
          const metadata = await fetchLinkMetadata(link.url, link.platform);
          let hasUpdate = false;
          const updatedLink = { ...link };

          // Update title if missing and we found one
          if (!link.title && metadata.title) {
            updatedLink.title = metadata.title;
            hasUpdate = true;
          }

          // Update thumbnail if missing and we found one
          if (!link.thumbnail && metadata.thumbnail) {
            updatedLink.thumbnail = metadata.thumbnail;
            hasUpdate = true;
          }

          // Update description if missing and we found one
          if (!link.description && metadata.description) {
            updatedLink.description = metadata.description;
            hasUpdate = true;
          }

          if (hasUpdate) {
            updated = true;
            return updatedLink;
          }
        } catch {
          // Skip failed fetches
        }
        return link;
      })
    );

    if (updated) {
      await SecureStorage.setItem(SHARED_LINKS_KEY, JSON.stringify(updatedLinks));
    }
    return updated;
  } catch (error) {
    console.error('Error refreshing missing titles:', error);
    return false;
  }
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
