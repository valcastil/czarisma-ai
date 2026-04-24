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
 * Reconcile local shared links with Supabase. Runs every startup (idempotent):
 *   - Inserts any local link whose timestamp is not yet on the server.
 *   - Updates any server row whose thumbnail/title/description differs from
 *     the local copy (e.g. because backfill inserted before metadata was
 *     fetched, or an older release didn't mirror refreshMissingTitles).
 * This is what makes follower-visible thumbnails stay current.
 */
export const backfillLocalLinksToSupabase = async (userId: string): Promise<void> => {
  try {
    const localLinks = await getSharedLinks();
    if (localLinks.length === 0) return;

    const { data: existing, error: fetchErr } = await supabase
      .from('shared_links')
      .select('created_at, thumbnail_url, title, description')
      .eq('user_id', userId);

    if (fetchErr) {
      logger.error('Link reconcile: failed to fetch existing rows:', fetchErr);
      return;
    }

    const existingByTs = new Map<number, { thumbnail_url: string | null; title: string | null; description: string | null }>();
    (existing || []).forEach((r: any) => {
      existingByTs.set(new Date(r.created_at).getTime(), {
        thumbnail_url: r.thumbnail_url ?? null,
        title: r.title ?? null,
        description: r.description ?? null,
      });
    });

    const toInsert: ReturnType<typeof mapLinkForInsert>[] = [];
    const toUpdate: SharedLink[] = [];

    for (const link of localLinks) {
      const existingRow = existingByTs.get(link.timestamp);
      if (!existingRow) {
        toInsert.push(mapLinkForInsert(link, userId));
        continue;
      }
      const needsUpdate =
        (link.thumbnail && link.thumbnail !== existingRow.thumbnail_url) ||
        (link.title && link.title !== existingRow.title) ||
        (link.description && link.description !== existingRow.description);
      if (needsUpdate) toUpdate.push(link);
    }

    if (toInsert.length === 0 && toUpdate.length === 0) return;

    logger.info('Link reconcile: syncing local → Supabase', {
      total: localLinks.length,
      toInsert: toInsert.length,
      toUpdate: toUpdate.length,
    });

    if (toInsert.length > 0) {
      const CHUNK = 50;
      for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK);
        const { error: insertErr } = await supabase
          .from('shared_links')
          .insert(chunk);
        if (insertErr) {
          logger.error('Link reconcile: chunk insert failed:', insertErr);
          return;
        }
      }
    }

    for (const link of toUpdate) {
      await updateLinkOnSupabase(link);
    }
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
