import { LinkParserService } from './link-parser-service';
import { supabase } from './supabase';

export interface SharedLink {
  id: string;
  userId: string;
  url: string;
  originalUrl?: string;
  domain?: string;
  platform?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  author?: string;
  duration?: number;
  status: 'unread' | 'read' | 'archived' | 'shared';
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  archivedAt?: string;
  sharedAt?: string;
  sharedToConversationId?: string;
  tags?: string[];
  notes?: string;
}

export class LinkStorageService {
  /**
   * Save a shared link to the database
   */
  static async saveSharedLink(url: string): Promise<SharedLink> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Normalize URL (remove tracking parameters)
      const normalizedUrl = LinkParserService.normalizeUrl(url);

      console.log('Extracting metadata for:', normalizedUrl);

      // Extract metadata from URL
      const metadata = await LinkParserService.extractMetadata(normalizedUrl);

      console.log('Metadata extracted:', metadata);

      // Save to database with metadata
      const { data, error } = await supabase
        .from('shared_links')
        .insert({
          user_id: user.id,
          url: normalizedUrl,
          original_url: url,
          domain: metadata.domain,
          platform: metadata.platform,
          title: metadata.title,
          description: metadata.description,
          thumbnail_url: metadata.thumbnailUrl,
          author: metadata.author,
          duration: metadata.duration,
          status: 'unread',
          is_favorite: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Link saved successfully with metadata:', data);
      return this.mapToSharedLink(data);
    } catch (error) {
      console.error('Error saving shared link:', error);
      throw error;
    }
  }

  /**
   * Get shared links for current user
   */
  static async getSharedLinks(
    status?: 'unread' | 'read' | 'archived' | 'shared'
  ): Promise<SharedLink[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      let query = supabase
        .from('shared_links')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching links:', error);
        throw error;
      }

      return (data || []).map(this.mapToSharedLink);
    } catch (error) {
      console.error('Error getting shared links:', error);
      throw error;
    }
  }

  /**
   * Get a single shared link by ID
   */
  static async getSharedLink(linkId: string): Promise<SharedLink | null> {
    try {
      const { data, error } = await supabase
        .from('shared_links')
        .select('*')
        .eq('id', linkId)
        .single();

      if (error) {
        console.error('Error fetching link:', error);
        throw error;
      }

      return data ? this.mapToSharedLink(data) : null;
    } catch (error) {
      console.error('Error getting shared link:', error);
      throw error;
    }
  }

  /**
   * Update link status
   */
  static async updateLinkStatus(
    linkId: string,
    status: 'read' | 'archived' | 'shared'
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'read') {
        updates.read_at = new Date().toISOString();
      } else if (status === 'archived') {
        updates.archived_at = new Date().toISOString();
      } else if (status === 'shared') {
        updates.shared_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('shared_links')
        .update(updates)
        .eq('id', linkId);

      if (error) {
        console.error('Error updating link status:', error);
        throw error;
      }

      console.log('Link status updated:', linkId, status);
    } catch (error) {
      console.error('Error updating link status:', error);
      throw error;
    }
  }

  /**
   * Toggle favorite status
   */
  static async toggleFavorite(linkId: string, isFavorite: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('shared_links')
        .update({ is_favorite: isFavorite })
        .eq('id', linkId);

      if (error) {
        console.error('Error toggling favorite:', error);
        throw error;
      }

      console.log('Favorite toggled:', linkId, isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }

  /**
   * Delete a shared link
   */
  static async deleteLink(linkId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('shared_links')
        .delete()
        .eq('id', linkId);

      if (error) {
        console.error('Error deleting link:', error);
        throw error;
      }

      console.log('Link deleted:', linkId);
    } catch (error) {
      console.error('Error deleting link:', error);
      throw error;
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
    };

    for (const [key, value] of Object.entries(platformMap)) {
      if (domain.includes(key)) {
        return value;
      }
    }

    return 'web';
  }

  /**
   * Map database row to SharedLink interface
   */
  private static mapToSharedLink(data: any): SharedLink {
    return {
      id: data.id,
      userId: data.user_id,
      url: data.url,
      originalUrl: data.original_url,
      domain: data.domain,
      platform: data.platform,
      title: data.title,
      description: data.description,
      thumbnailUrl: data.thumbnail_url,
      author: data.author,
      duration: data.duration,
      status: data.status,
      isFavorite: data.is_favorite,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      readAt: data.read_at,
      archivedAt: data.archived_at,
      sharedAt: data.shared_at,
      sharedToConversationId: data.shared_to_conversation_id,
      tags: data.tags,
      notes: data.notes,
    };
  }
}
