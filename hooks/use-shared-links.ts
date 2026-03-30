/**
 * Custom hook for managing shared links with real-time updates
 * 
 * Features:
 * - Real-time subscriptions via Supabase
 * - Automatic UI updates when links added/modified
 * - Loading and error states
 * - Optimistic updates
 */

import { LinkStorageService, SharedLink } from '@/lib/link-storage-service';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export function useSharedLinks(status?: 'unread' | 'read' | 'archived' | 'shared') {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial links
  useEffect(() => {
    loadLinks();
  }, [status]);

  // Set up real-time subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setupRealtimeSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Subscribe to changes in shared_links table for current user
        channel = supabase
          .channel('shared-links-changes')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'shared_links',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('Real-time update:', payload);
              handleRealtimeUpdate(payload);
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status);
          });
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [status]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedLinks = await LinkStorageService.getSharedLinks(status);
      setLinks(fetchedLinks);
    } catch (err: any) {
      console.error('Error loading links:', err);
      setError(err.message || 'Failed to load links');
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'INSERT':
        // New link added
        const newLink = mapToSharedLink(newRecord);
        
        // Only add if matches current filter
        if (!status || newLink.status === status) {
          setLinks((prev) => [newLink, ...prev]);
        }
        break;

      case 'UPDATE':
        // Link updated
        const updatedLink = mapToSharedLink(newRecord);
        
        setLinks((prev) => {
          // Remove if status changed and doesn't match filter
          if (status && updatedLink.status !== status) {
            return prev.filter((link) => link.id !== updatedLink.id);
          }
          
          // Update existing link
          return prev.map((link) =>
            link.id === updatedLink.id ? updatedLink : link
          );
        });
        break;

      case 'DELETE':
        // Link deleted
        setLinks((prev) => prev.filter((link) => link.id !== oldRecord.id));
        break;
    }
  };

  const mapToSharedLink = (data: any): SharedLink => {
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
  };

  const refresh = () => {
    loadLinks();
  };

  const deleteLink = async (linkId: string) => {
    try {
      // Optimistic update
      setLinks((prev) => prev.filter((link) => link.id !== linkId));
      
      await LinkStorageService.deleteLink(linkId);
      // Real-time subscription will handle the actual update
    } catch (error) {
      console.error('Error deleting link:', error);
      // Revert optimistic update on error
      await loadLinks();
      throw error;
    }
  };

  const updateLinkStatus = async (
    linkId: string,
    newStatus: 'read' | 'archived' | 'shared'
  ) => {
    try {
      // Optimistic update
      setLinks((prev) =>
        prev.map((link) =>
          link.id === linkId ? { ...link, status: newStatus } : link
        )
      );

      await LinkStorageService.updateLinkStatus(linkId, newStatus);
      // Real-time subscription will handle the actual update
    } catch (error) {
      console.error('Error updating link status:', error);
      // Revert optimistic update on error
      await loadLinks();
      throw error;
    }
  };

  const toggleFavorite = async (linkId: string, isFavorite: boolean) => {
    try {
      // Optimistic update
      setLinks((prev) =>
        prev.map((link) =>
          link.id === linkId ? { ...link, isFavorite } : link
        )
      );

      await LinkStorageService.toggleFavorite(linkId, isFavorite);
      // Real-time subscription will handle the actual update
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update on error
      await loadLinks();
      throw error;
    }
  };

  return {
    links,
    loading,
    error,
    refresh,
    deleteLink,
    updateLinkStatus,
    toggleFavorite,
  };
}
