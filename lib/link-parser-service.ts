export interface LinkMetadata {
  url: string;
  domain: string;
  platform: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  author?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export class LinkParserService {
  /**
   * Extract metadata from a URL
   */
  static async extractMetadata(url: string): Promise<LinkMetadata> {
    try {
      const domain = this.extractDomain(url);
      const platform = this.detectPlatform(domain);

      console.log('Extracting metadata:', { url, domain, platform });

      // Try platform-specific extraction first
      let metadata: Partial<LinkMetadata> = {};

      switch (platform) {
        case 'youtube':
          metadata = await this.extractYouTubeMetadata(url);
          break;
        case 'tiktok':
          metadata = await this.extractTikTokMetadata(url);
          break;
        case 'instagram':
          metadata = await this.extractInstagramMetadata(url);
          break;
        case 'twitter':
          metadata = await this.extractTwitterMetadata(url);
          break;
        default:
          // Fallback to Open Graph for generic URLs
          metadata = await this.extractOpenGraphMetadata(url);
      }

      return {
        url,
        domain,
        platform,
        ...metadata,
      };
    } catch (error) {
      console.error('Error extracting metadata:', error);
      // Return basic metadata on error
      return {
        url,
        domain: this.extractDomain(url),
        platform: this.detectPlatform(this.extractDomain(url)),
      };
    }
  }

  /**
   * Extract domain from URL
   */
  private static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (error) {
      console.error('Error extracting domain:', error);
      return '';
    }
  }

  /**
   * Detect platform from domain
   */
  private static detectPlatform(domain: string): string {
    const platformMap: Record<string, string> = {
      'youtube.com': 'youtube',
      'youtu.be': 'youtube',
      'tiktok.com': 'tiktok',
      'instagram.com': 'instagram',
      'facebook.com': 'facebook',
      'fb.com': 'facebook',
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'whatsapp.com': 'whatsapp',
      'wa.me': 'whatsapp',
      'messenger.com': 'messenger',
      'm.me': 'messenger',
      'reddit.com': 'reddit',
      'linkedin.com': 'linkedin',
      'pinterest.com': 'pinterest',
    };

    for (const [key, value] of Object.entries(platformMap)) {
      if (domain.includes(key)) {
        return value;
      }
    }

    return 'web';
  }

  /**
   * Extract YouTube metadata using oEmbed API
   */
  private static async extractYouTubeMetadata(url: string): Promise<Partial<LinkMetadata>> {
    try {
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) {
        console.warn('Could not extract YouTube video ID');
        return {};
      }

      // Use YouTube oEmbed API (no API key required)
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      
      const response = await fetch(oEmbedUrl);
      if (!response.ok) {
        throw new Error(`YouTube oEmbed failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        title: data.title,
        author: data.author_name,
        thumbnailUrl: data.thumbnail_url,
        width: data.thumbnail_width,
        height: data.thumbnail_height,
      };
    } catch (error) {
      console.error('Error fetching YouTube metadata:', error);
      return {};
    }
  }

  /**
   * Extract YouTube video ID from URL
   */
  private static extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract TikTok metadata using oEmbed API
   */
  private static async extractTikTokMetadata(url: string): Promise<Partial<LinkMetadata>> {
    try {
      // TikTok oEmbed API
      const oEmbedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(oEmbedUrl);
      if (!response.ok) {
        throw new Error(`TikTok oEmbed failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        title: data.title,
        author: data.author_name,
        thumbnailUrl: data.thumbnail_url,
        width: data.thumbnail_width,
        height: data.thumbnail_height,
      };
    } catch (error) {
      console.error('Error fetching TikTok metadata:', error);
      return {};
    }
  }

  /**
   * Extract Instagram metadata
   * Note: Instagram oEmbed requires Facebook access token
   */
  private static async extractInstagramMetadata(url: string): Promise<Partial<LinkMetadata>> {
    try {
      // For now, extract basic info from URL
      // Full implementation would require Facebook Graph API access token
      const match = url.match(/instagram\.com\/(p|reel)\/([^/?]+)/);
      if (match) {
        return {
          title: `Instagram ${match[1] === 'reel' ? 'Reel' : 'Post'}`,
          description: 'View on Instagram',
        };
      }

      return {};
    } catch (error) {
      console.error('Error fetching Instagram metadata:', error);
      return {};
    }
  }

  /**
   * Extract Twitter/X metadata
   */
  private static async extractTwitterMetadata(url: string): Promise<Partial<LinkMetadata>> {
    try {
      // Extract tweet ID from URL
      const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
      if (match) {
        return {
          title: 'Tweet',
          description: 'View on X (Twitter)',
        };
      }

      return {};
    } catch (error) {
      console.error('Error fetching Twitter metadata:', error);
      return {};
    }
  }

  /**
   * Extract Open Graph metadata for generic URLs
   * Uses a proxy service to fetch and parse HTML
   */
  private static async extractOpenGraphMetadata(url: string): Promise<Partial<LinkMetadata>> {
    try {
      // Use a CORS proxy to fetch the page
      // Note: In production, you should use your own backend or a paid service
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Proxy request failed: ${response.status}`);
      }

      const data = await response.json();
      const html = data.contents;

      // Parse Open Graph tags
      const metadata: Partial<LinkMetadata> = {};

      // Extract og:title
      const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
      if (titleMatch) {
        metadata.title = this.decodeHtmlEntities(titleMatch[1]);
      }

      // Extract og:description
      const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (descMatch) {
        metadata.description = this.decodeHtmlEntities(descMatch[1]);
      }

      // Extract og:image
      const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      if (imageMatch) {
        metadata.thumbnailUrl = imageMatch[1];
      }

      // Fallback to regular title tag if no og:title
      if (!metadata.title) {
        const regularTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (regularTitleMatch) {
          metadata.title = this.decodeHtmlEntities(regularTitleMatch[1]);
        }
      }

      // Fallback to meta description if no og:description
      if (!metadata.description) {
        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        if (metaDescMatch) {
          metadata.description = this.decodeHtmlEntities(metaDescMatch[1]);
        }
      }

      return metadata;
    } catch (error) {
      console.error('Error fetching Open Graph metadata:', error);
      return {};
    }
  }

  /**
   * Decode HTML entities
   */
  private static decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
      '&apos;': "'",
    };

    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean and normalize URL
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      return urlObj.toString();
    } catch {
      return url;
    }
  }
}
