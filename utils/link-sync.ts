/**
 * Shared Link Sync Utilities
 *
 * Shared links (YouTube/TikTok/Instagram items shown on the homescreen) are
 * stored locally in SecureStorage. To make a user's followers see those
 * links on the Profile modal, each link must also be pushed to Supabase's
 * `shared_links` table.
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { getSharedLinks, SharedLink } from '@/utils/link-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKFILL_FLAG_PREFIX = '@charisma_shared_links_supabase_backfilled_';

const mapLinkForInsert = (link: SharedLink, userId: string) => ({
  user_id: userId,
  url: link.url,
  platform: link.platform,
  title: link.title,
  description: link.description,
  thumbnail_url: link.thumbnail,
  // created_at maps to the local link's timestamp so ordering is preserved.
  created_at: new Date(link.timestamp).toISOString(),
});

/**
 * Push a single new shared link to Supabase (best-effort).
 */
export const syncLinkToSupabase = async (link: SharedLink): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('shared_links')
      .insert([mapLinkForInsert(link, userId)]);
    if (error) {
      logger.error('Failed to sync shared link to Supabase:', error);
    } else {
      logger.info('Shared link synced to Supabase', { url: link.url });
    }
  } catch (e) {
    logger.error('syncLinkToSupabase error:', e);
  }
};

/**
 * Update an existing Supabase row when its metadata (title/description/
 * thumbnail) is filled in asynchronously after creation. Best-effort.
 * Matched by (user_id, url, created_at) — same keys used on insert.
 */
export const updateLinkOnSupabase = async (link: SharedLink): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('shared_links')
      .update({
        title: link.title,
        description: link.description,
        thumbnail_url: link.thumbnail,
      })
      .eq('user_id', userId)
      .eq('url', link.url)
      .eq('created_at', new Date(link.timestamp).toISOString());
    if (error) {
      logger.error('Failed to update shared link on Supabase:', error);
    }
  } catch (e) {
    logger.error('updateLinkOnSupabase error:', e);
  }
};

/**
 * One-time backfill: push every local shared link to Supabase.
 * Per-user flag in AsyncStorage prevents re-runs; dedupe uses the timestamp.
 */
export const backfillLocalLinksToSupabase = async (userId: string): Promise<void> => {
  const flagKey = BACKFILL_FLAG_PREFIX + userId;
  try {
    const alreadyDone = await AsyncStorage.getItem(flagKey);
    if (alreadyDone === 'true') return;

    const localLinks = await getSharedLinks();
    if (localLinks.length === 0) {
      await AsyncStorage.setItem(flagKey, 'true');
      return;
    }

    // Fetch existing created_at stamps for this user to avoid duplicates.
    const { data: existing, error: fetchErr } = await supabase
      .from('shared_links')
      .select('created_at')
      .eq('user_id', userId);

    if (fetchErr) {
      logger.error('Link backfill: failed to fetch existing rows:', fetchErr);
      return;
    }

    const existingStamps = new Set(
      (existing || []).map((r: any) => new Date(r.created_at).getTime())
    );

    const toInsert = localLinks
      .filter(l => !existingStamps.has(l.timestamp))
      .map(l => mapLinkForInsert(l, userId));

    if (toInsert.length === 0) {
      logger.info('Link backfill: all local links already on Supabase', {
        localCount: localLinks.length,
      });
      await AsyncStorage.setItem(flagKey, 'true');
      return;
    }

    logger.info('Link backfill: uploading local shared links', {
      total: localLinks.length,
      toInsert: toInsert.length,
    });

    const CHUNK = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { error: insertErr } = await supabase
        .from('shared_links')
        .insert(chunk);
      if (insertErr) {
        logger.error('Link backfill: chunk insert failed:', insertErr);
        return;
      }
    }

    await AsyncStorage.setItem(flagKey, 'true');
    logger.info('Link backfill complete');
  } catch (e) {
    logger.error('backfillLocalLinksToSupabase error:', e);
  }
};

/**
 * Delete a shared link from Supabase, matched by owner + URL + created_at.
 */
export const deleteLinkOnSupabase = async (link: SharedLink): Promise<void> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('shared_links')
      .delete()
      .eq('user_id', userId)
      .eq('url', link.url)
      .eq('created_at', new Date(link.timestamp).toISOString());
    if (error) {
      logger.error('Failed to delete shared link on Supabase:', error);
    }
  } catch (e) {
    logger.error('deleteLinkOnSupabase error:', e);
  }
};
