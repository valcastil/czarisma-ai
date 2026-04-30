/**
 * Convert social media video URLs to their embeddable equivalents
 * so they can be played inside a WebView.
 */

export type EmbedPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'unknown';

export interface EmbedInfo {
  platform: EmbedPlatform;
  embedUrl: string | null;
  originalUrl: string;
  videoId: string | null;
}

export interface EmbedOptions {
  autoplay?: boolean;
  mute?: boolean;
}

/** Default per-platform playback durations (seconds). */
export const PLATFORM_DURATIONS: Record<EmbedPlatform, number> = {
  tiktok: 30,
  youtube: 60,
  instagram: 20,
  facebook: 20,
  unknown: 30,
};

/**
 * Detect platform from a URL string.
 */
export const detectPlatform = (url: string): EmbedPlatform => {
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch')) return 'facebook';
  return 'unknown';
};

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
  // Also match /video/ID without username
  const m2 = url.match(/\/video\/(\d+)/);
  if (m2) return m2[1];
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
 * Extract Facebook video/reel ID.
 */
const getFacebookVideoId = (url: string): string | null => {
  // /reel/123456
  const reelM = url.match(/\/reel\/(\d+)/);
  if (reelM) return reelM[1];
  // /watch/?v=123456
  const watchM = url.match(/\/watch\/\?v=(\d+)/);
  if (watchM) return watchM[1];
  // /videos/123456
  const vidM = url.match(/\/videos\/(\d+)/);
  if (vidM) return vidM[1];
  return null;
};

/**
 * Convert a URL to its embeddable form. Returns null embedUrl if we can't embed it.
 */
export const toEmbedUrl = (url: string, options: EmbedOptions = {}): EmbedInfo => {
  const { autoplay = true, mute = false } = options;
  const platform = detectPlatform(url);

  // YouTube
  if (platform === 'youtube') {
    const id = getYouTubeId(url);
    if (id) {
      const params = [`autoplay=${autoplay ? 1 : 0}`, 'playsinline=1', 'rel=0', 'modestbranding=1'];
      if (mute) params.push('mute=1');
      return {
        platform: 'youtube',
        originalUrl: url,
        embedUrl: `https://www.youtube.com/embed/${id}?${params.join('&')}`,
        videoId: id,
      };
    }
    return { platform: 'youtube', originalUrl: url, embedUrl: null, videoId: null };
  }

  // TikTok
  if (platform === 'tiktok') {
    const id = getTikTokId(url);
    if (id) {
      const params = [`autoplay=${autoplay ? 1 : 0}`];
      if (mute) params.push('muted=1');
      return {
        platform: 'tiktok',
        originalUrl: url,
        embedUrl: `https://www.tiktok.com/embed/v2/${id}?${params.join('&')}`,
        videoId: id,
      };
    }
    return { platform: 'tiktok', originalUrl: url, embedUrl: null, videoId: null };
  }

  // Instagram
  if (platform === 'instagram') {
    const code = getInstagramShortcode(url);
    if (code) {
      return {
        platform: 'instagram',
        originalUrl: url,
        embedUrl: `https://www.instagram.com/reel/${code}/embed/`,
        videoId: code,
      };
    }
    return { platform: 'instagram', originalUrl: url, embedUrl: null, videoId: null };
  }

  // Facebook
  if (platform === 'facebook') {
    const id = getFacebookVideoId(url);
    const params = [`href=${encodeURIComponent(url)}`, 'show_text=false', 'width=480'];
    if (autoplay) params.push('autoplay=1');
    if (mute) params.push('muted=1');
    return {
      platform: 'facebook',
      originalUrl: url,
      embedUrl: `https://www.facebook.com/plugins/video.php?${params.join('&')}`,
      videoId: id,
    };
  }

  return { platform: 'unknown', originalUrl: url, embedUrl: null, videoId: null };
};
