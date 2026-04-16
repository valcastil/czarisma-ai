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
 * Fetch oEmbed data (supports YouTube, TikTok, Instagram, Facebook, etc.)
 * Returns title and thumbnail_url when available
 */
interface OEmbedResult {
  title: string | null;
  thumbnail: string | null;
}

const fetchOEmbed = async (url: string, platform: LinkPlatform): Promise<OEmbedResult> => {
  const endpoints: string[] = [];

  // Platform-specific oEmbed endpoints (most reliable for thumbnails)
  if (platform === 'tiktok') {
    endpoints.push(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  } else if (platform === 'instagram' || platform === 'reels') {
    // Instagram/Facebook oEmbed requires app token, use noembed as fallback
    endpoints.push(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
  } else if (platform === 'youtube') {
    endpoints.push(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    endpoints.push(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
  }

  // For Facebook, try NoEmbed which works without authentication
  if (platform === 'reels' || url.includes('facebook.com') || url.includes('fb.watch')) {
    endpoints.push(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
  }

  // Generic fallback
  endpoints.push(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);

  for (const apiUrl of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const json = await response.json();
      // NoEmbed uses 'title' and 'thumbnail_url' or 'media_url'
      const title = json.title || json.meta?.title || null;
      let thumbnail = json.thumbnail_url || json.thumbnail || json.media_url || json.image || null;
      // Convert HTTP to HTTPS for Android compatibility (cleartext blocked)
      if (thumbnail && thumbnail.startsWith('http:')) {
        thumbnail = thumbnail.replace(/^http:/, 'https:');
      }
      if (title || thumbnail) return { title, thumbnail };
    } catch {
      continue;
    }
  }
  return { title: null, thumbnail: null };
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
      let thumbnail = json.data?.image?.url || json.data?.video?.poster || null;
      // Convert HTTP to HTTPS for Android compatibility
      if (thumbnail && thumbnail.startsWith('http:')) {
        thumbnail = thumbnail.replace(/^http:/, 'https:');
      }
      result.thumbnail = thumbnail;
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

    let thumbnail = ogImage?.[1] || null;
    // Convert HTTP to HTTPS for Android compatibility
    if (thumbnail && thumbnail.startsWith('http:')) {
      thumbnail = thumbnail.replace(/^http:/, 'https:');
    }
    return {
      thumbnail,
      title: ogTitle?.[1]?.trim() || null,
      description: ogDescription?.[1]?.trim() || null,
    };
  } catch {
    return { thumbnail: null, title: null, description: null };
  }
};

/**
 * Fetch title only — tries oEmbed first, then Microlink, then direct HTML
 */
const fetchTitleOnly = async (url: string, platform?: LinkPlatform): Promise<string | null> => {
  // 1. oEmbed — works great for YouTube, TikTok
  const oembed = await fetchOEmbed(url, platform || 'unknown');
  if (oembed.title) return oembed.title;

  // 2. Microlink
  const microlinkResult = await fetchMetadataViaApi(url);
  if (microlinkResult.title) return microlinkResult.title;

  // 3. Direct HTML scraping
  const directResult = await fetchMetadataDirect(url);
  return directResult.title;
};

/**
 * Fetch metadata: combines multiple strategies for thumbnail + title
 * Priority: oEmbed (platform-native) > YouTube direct > Microlink > HTML scraping
 */
const fetchLinkMetadata = async (url: string, platform: LinkPlatform): Promise<LinkMetadata> => {
  // For YouTube, we can build the thumbnail directly
  let youtubeThumbnail: string | null = null;
  if (platform === 'youtube') {
    const videoId = extractYouTubeId(url);
    if (videoId) youtubeThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  // 1. Try oEmbed first — most reliable for TikTok & YouTube thumbnails
  const oembed = await fetchOEmbed(url, platform);
  const oembedTitle = oembed.title;
  const oembedThumb = oembed.thumbnail;

  // If we have both from oEmbed + YouTube direct, we're done
  const bestThumb = youtubeThumbnail || oembedThumb;
  if (oembedTitle && bestThumb) {
    return { thumbnail: bestThumb, title: oembedTitle, description: null };
  }

  // 2. Try Microlink for remaining metadata
  const apiResult = await fetchMetadataViaApi(url);
  const title = oembedTitle || apiResult.title;
  const thumbnail = bestThumb || apiResult.thumbnail;
  const description = apiResult.description;

  if (title || thumbnail) {
    return { thumbnail, title, description };
  }

  // 3. Final fallback: direct HTML scraping (useful for Instagram/Facebook)
  const directResult = await fetchMetadataDirect(url);
  return {
    thumbnail: directResult.thumbnail,
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
  const seen = new Set<string>();
  for (const line of lines) {
    const words = line.trim().split(/\s+/);
    for (const word of words) {
      let trimmed = word.trim();
      // Add https:// if missing
      if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://') && isValidSocialLink(trimmed)) {
        trimmed = 'https://' + trimmed;
      }
      if (trimmed.length > 5 && isValidSocialLink(trimmed) && !seen.has(trimmed)) {
        seen.add(trimmed);
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
    // Process links in batches of 3 to avoid overwhelming network
    const BATCH_SIZE = 3;
    const updatedLinks = [...links];
    for (let i = 0; i < updatedLinks.length; i += BATCH_SIZE) {
      const batch = updatedLinks.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (link) => {
          if (link.title && link.thumbnail) return link;
          try {
            const metadata = await fetchLinkMetadata(link.url, link.platform);
            let hasUpdate = false;
            const updatedLink = { ...link };
            if (!link.title && metadata.title) {
              updatedLink.title = metadata.title;
              hasUpdate = true;
            }
            if (!link.thumbnail && metadata.thumbnail) {
              updatedLink.thumbnail = metadata.thumbnail;
              hasUpdate = true;
            }
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
      // Write results back into the updatedLinks array at correct positions
      for (let j = 0; j < results.length; j++) {
        updatedLinks[i + j] = results[j];
      }
    }

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
