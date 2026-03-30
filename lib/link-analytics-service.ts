/**
 * Link Analytics Service
 * 
 * Tracks user interactions with shared links
 */

import { supabase } from './supabase';

export interface LinkAnalyticsEvent {
  linkId: string;
  eventType: 'view' | 'open' | 'share' | 'favorite' | 'archive' | 'delete';
  metadata?: Record<string, any>;
}

export class LinkAnalyticsService {
  /**
   * Track a link event
   */
  static async trackEvent(event: LinkAnalyticsEvent): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log to console in development
      if (__DEV__) {
        console.log('📊 Analytics:', event);
      }

      // In production, you could send to analytics service
      // Examples: Mixpanel, Amplitude, Google Analytics, etc.
      
      // For now, we'll store in a simple analytics table
      await supabase.from('link_analytics').insert({
        user_id: user.id,
        link_id: event.linkId,
        event_type: event.eventType,
        metadata: event.metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Don't throw errors for analytics failures
      console.error('Analytics error:', error);
    }
  }

  /**
   * Track link view
   */
  static async trackView(linkId: string): Promise<void> {
    await this.trackEvent({
      linkId,
      eventType: 'view',
    });
  }

  /**
   * Track link open
   */
  static async trackOpen(linkId: string, platform?: string): Promise<void> {
    await this.trackEvent({
      linkId,
      eventType: 'open',
      metadata: { platform },
    });
  }

  /**
   * Track link share
   */
  static async trackShare(linkId: string, conversationId: string): Promise<void> {
    await this.trackEvent({
      linkId,
      eventType: 'share',
      metadata: { conversationId },
    });
  }

  /**
   * Track favorite toggle
   */
  static async trackFavorite(linkId: string, isFavorite: boolean): Promise<void> {
    await this.trackEvent({
      linkId,
      eventType: 'favorite',
      metadata: { isFavorite },
    });
  }

  /**
   * Track archive
   */
  static async trackArchive(linkId: string): Promise<void> {
    await this.trackEvent({
      linkId,
      eventType: 'archive',
    });
  }

  /**
   * Track delete
   */
  static async trackDelete(linkId: string, platform?: string): Promise<void> {
    await this.trackEvent({
      linkId,
      eventType: 'delete',
      metadata: { platform },
    });
  }

  /**
   * Get analytics summary for user
   */
  static async getAnalyticsSummary(days: number = 30) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('link_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', since.toISOString());

      if (error) throw error;

      // Aggregate data
      const summary = {
        totalEvents: data?.length || 0,
        views: data?.filter(e => e.event_type === 'view').length || 0,
        opens: data?.filter(e => e.event_type === 'open').length || 0,
        shares: data?.filter(e => e.event_type === 'share').length || 0,
        favorites: data?.filter(e => e.event_type === 'favorite').length || 0,
        archives: data?.filter(e => e.event_type === 'archive').length || 0,
        deletes: data?.filter(e => e.event_type === 'delete').length || 0,
      };

      return summary;
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return null;
    }
  }
}
