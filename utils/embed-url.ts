/**
 * Convert social media video URLs to their embeddable equivalents
 * so they can be played inside a WebView.
 */

export type EmbedPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'unknown';

export interface EmbedInfo {
  platform: EmbedPlatform;
  embedUrl: string | null;
  originalUrl: string;
}

/**
 * Extract YouTube video ID from a variety of URL formats.
 */
const getYouTubeId = (url: string): string | null => {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

/**
 * Extract TikTok video ID.
 */
const getTikTokId = (url: string): string | null => {
  // https://www.tiktok.com/@user/video/1234567890
  const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (m) return m[1];
  // Short links like vm.tiktok.com/XXXXX need to be resolved first; fall back to passing original.
  return null;
};

/**
 * Extract Instagram reel/post shortcode.
 */
const getInstagramShortcode = (url: string): string | null => {
  const m = url.match(/instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
};

/**
 * Convert a URL to its embeddable form. Returns null embedUrl if we can't embed it.
 */
export const toEmbedUrl = (url: string): EmbedInfo => {
  const lower = url.toLowerCase();

  // YouTube
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    const id = getYouTubeId(url);
    if (id) {
      return {
        platform: 'youtube',
        originalUrl: url,
        embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`,
      };
    }
    return { platform: 'youtube', originalUrl: url, embedUrl: null };
  }

  // TikTok
  if (lower.includes('tiktok.com')) {
    const id = getTikTokId(url);
    if (id) {
      return {
        platform: 'tiktok',
        originalUrl: url,
        embedUrl: `https://www.tiktok.com/embed/v2/${id}`,
      };
    }
    return { platform: 'tiktok', originalUrl: url, embedUrl: null };
  }

  // Instagram
  if (lower.includes('instagram.com')) {
    const code = getInstagramShortcode(url);
    if (code) {
      return {
        platform: 'instagram',
        originalUrl: url,
        embedUrl: `https://www.instagram.com/reel/${code}/embed/`,
      };
    }
    return { platform: 'instagram', originalUrl: url, embedUrl: null };
  }

  // Facebook
  if (lower.includes('facebook.com') || lower.includes('fb.watch')) {
    return {
      platform: 'facebook',
      originalUrl: url,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1&mute=1`,
    };
  }

  return { platform: 'unknown', originalUrl: url, embedUrl: null };
};
