/**
 * Entry Sync Utilities
 *
 * Charisma entries are stored locally in AsyncStorage and (historically)
 * were never pushed to Supabase. This module provides:
 *   (1) A one-time backfill that uploads all local entries to Supabase.
 *   (2) A small helper to push a single newly-created entry.
 *
 * Without this sync, followers viewing a user's profile see an empty
 * Charisma Collection because Supabase has no rows for that user.
 */

import { CharismaEntry } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENTRIES_KEY = '@charisma_entries';
const BACKFILL_FLAG_PREFIX = '@charisma_entries_supabase_backfilled_';

const readLocalEntries = async (): Promise<CharismaEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(ENTRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mapEntryForInsert = (entry: CharismaEntry, userId: string) => ({
  user_id: userId,
  major_charisma: entry.majorCharisma,
  sub_charisma: entry.subCharisma || '',
  notes: entry.notes || '',
  timestamp: entry.timestamp,
  date: entry.date,
  time: entry.time,
  charisma_emoji: entry.charismaEmoji || '✨',
  emotion_emojis: entry.emotionEmojis || [],
});

/**
 * Sync a single newly-created entry to Supabase (best-effort, swallows errors).
 */
export const syncEntryToSupabase = async (
  entry: CharismaEntry,
  userId: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('charisma_entries')
      .insert([mapEntryForInsert(entry, userId)]);
    if (error) {
      logger.error('Failed to sync entry to Supabase:', error);
    } else {
      logger.info('Entry synced to Supabase', { timestamp: entry.timestamp });
    }
  } catch (e) {
    logger.error('syncEntryToSupabase error:', e);
  }
};

/**
 * One-time backfill: push all local entries to Supabase for this user.
 * Guarded by a per-user flag in AsyncStorage so it only runs once per
 * device/account.
 *
 * Dedupe strategy: before inserting, fetch existing (user_id, timestamp)
 * pairs from Supabase and skip any local entry whose timestamp already
 * exists. This handles partial-success reruns safely.
 */
export const backfillLocalEntriesToSupabase = async (userId: string): Promise<void> => {
  const flagKey = BACKFILL_FLAG_PREFIX + userId;
  try {
    const alreadyDone = await AsyncStorage.getItem(flagKey);
    if (alreadyDone === 'true') return;

    const localEntries = await readLocalEntries();
    if (localEntries.length === 0) {
      await AsyncStorage.setItem(flagKey, 'true');
      return;
    }

    // Fetch existing timestamps for this user to avoid duplicates.
    const { data: existing, error: fetchErr } = await supabase
      .from('charisma_entries')
      .select('timestamp')
      .eq('user_id', userId);

    if (fetchErr) {
      logger.error('Backfill: failed to fetch existing entries:', fetchErr);
      return; // don't set flag — retry next startup
    }

    const existingTimestamps = new Set(
      (existing || []).map((r: any) => String(r.timestamp))
    );

    const toInsert = localEntries
      .filter(e => !existingTimestamps.has(String(e.timestamp)))
      .map(e => mapEntryForInsert(e, userId));

    if (toInsert.length === 0) {
      logger.info('Backfill: all local entries already on Supabase', {
        localCount: localEntries.length,
      });
      await AsyncStorage.setItem(flagKey, 'true');
      return;
    }

    logger.info('Backfill: uploading local entries to Supabase', {
      total: localEntries.length,
      toInsert: toInsert.length,
    });

    // Insert in chunks to stay well under Postgres/PostgREST payload limits.
    const CHUNK = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { error: insertErr } = await supabase
        .from('charisma_entries')
        .insert(chunk);
      if (insertErr) {
        logger.error('Backfill: chunk insert failed:', insertErr);
        return; // don't set flag — retry next startup
      }
    }

    await AsyncStorage.setItem(flagKey, 'true');
    logger.info('Backfill complete');
  } catch (e) {
    logger.error('backfillLocalEntriesToSupabase error:', e);
  }
};
