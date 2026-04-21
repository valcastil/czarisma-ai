/**
 * Handle utilities for the dual-handle (@ / #) username system.
 *
 * Rules (enforced by DB — mirrored here for fast client-side UX):
 *  - @handle requires email-linked auth
 *  - #handle requires phone-linked auth
 *  - Body: 3-30 chars, must start with a-z, then [a-z0-9_]
 *  - Reserved words (brand prefixes + generic exact words) blocked
 *  - 30-day cooldown between changes; old handle quarantined 90 days
 *  - is_official profiles bypass reserved check
 *
 * Server is the source of truth; UI calls `check_handle_availability` /
 * `claim_handle` RPCs. The reserved_handles table is mirrored locally with
 * a 24h cache for instant "reserved" feedback.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export type HandlePrefix = '@' | '#';

export interface ParsedHandle {
  prefix: HandlePrefix;
  body: string; // lowercased, prefix stripped
}

export type AvailabilityStatus =
  | 'ok'
  | 'invalid_prefix'
  | 'invalid_shape'
  | 'reserved'
  | 'quarantined'
  | 'taken';

export type ClaimStatus =
  | AvailabilityStatus
  | 'no_auth'
  | 'auth_not_linked'
  | 'cooldown'
  | 'error';

const HANDLE_BODY_REGEX = /^[a-z][a-z0-9_]{2,29}$/;
const RESERVED_CACHE_KEY = '@handles_reserved_v1';
const RESERVED_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// -----------------------------------------------------------------------------
// Parsing / validation
// -----------------------------------------------------------------------------

/** Parse a user-typed string into `{ prefix, body }`. Returns null if unrecognized. */
export function parseHandle(input: string): ParsedHandle | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length < 2) return null;
  const first = trimmed[0];
  if (first !== '@' && first !== '#') return null;
  return { prefix: first as HandlePrefix, body: trimmed.slice(1).toLowerCase() };
}

/** Format prefix + body into a display string. */
export function formatHandle(prefix: HandlePrefix, body: string): string {
  return `${prefix}${body}`;
}

export interface HandleShapeError {
  code: 'too_short' | 'too_long' | 'bad_start' | 'bad_chars' | 'empty';
  message: string;
}

/** Client-side shape validation. Returns null if valid. */
export function validateHandleBody(body: string): HandleShapeError | null {
  if (!body) return { code: 'empty', message: 'Handle cannot be empty' };
  if (body.length < 3) return { code: 'too_short', message: 'Must be at least 3 characters' };
  if (body.length > 30) return { code: 'too_long', message: 'Must be 30 characters or fewer' };
  if (!/^[a-z]/.test(body)) {
    return { code: 'bad_start', message: 'Must start with a letter (a-z)' };
  }
  if (!HANDLE_BODY_REGEX.test(body)) {
    return { code: 'bad_chars', message: 'Only lowercase letters, numbers, and underscore' };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Reserved-words client mirror
// -----------------------------------------------------------------------------

interface ReservedEntry {
  word: string;
  match: 'exact' | 'prefix';
}

interface ReservedCache {
  fetchedAt: number;
  entries: ReservedEntry[];
}

let memoryCache: ReservedCache | null = null;

async function loadReservedFromStorage(): Promise<ReservedCache | null> {
  try {
    const raw = await AsyncStorage.getItem(RESERVED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReservedCache;
    if (!parsed?.entries) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function fetchReservedFromServer(): Promise<ReservedEntry[]> {
  const { data, error } = await supabase
    .from('reserved_handles')
    .select('word, match');
  if (error || !data) return [];
  return data as ReservedEntry[];
}

/** Returns cached reserved list, refreshing from server if stale or missing. */
export async function getReservedHandles(forceRefresh = false): Promise<ReservedEntry[]> {
  const now = Date.now();
  if (!forceRefresh && memoryCache && now - memoryCache.fetchedAt < RESERVED_CACHE_TTL_MS) {
    return memoryCache.entries;
  }
  if (!forceRefresh) {
    const stored = await loadReservedFromStorage();
    if (stored && now - stored.fetchedAt < RESERVED_CACHE_TTL_MS) {
      memoryCache = stored;
      return stored.entries;
    }
  }
  const entries = await fetchReservedFromServer();
  if (entries.length > 0) {
    const cache: ReservedCache = { fetchedAt: now, entries };
    memoryCache = cache;
    try {
      await AsyncStorage.setItem(RESERVED_CACHE_KEY, JSON.stringify(cache));
    } catch {}
    return entries;
  }
  // Fallback: if server fetch failed, try stored cache even if stale.
  const stored = await loadReservedFromStorage();
  return stored?.entries ?? [];
}

/** Client-side reserved check (instant, no network). */
export async function isReservedLocally(body: string): Promise<boolean> {
  const entries = await getReservedHandles();
  const b = body.toLowerCase();
  for (const e of entries) {
    if (e.match === 'exact' && e.word === b) return true;
    if (e.match === 'prefix' && b.startsWith(e.word)) return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// RPC wrappers
// -----------------------------------------------------------------------------

/** Checks availability via server RPC. Returns structured status. */
export async function checkHandleAvailability(
  prefix: HandlePrefix,
  body: string,
): Promise<AvailabilityStatus> {
  const { data, error } = await supabase.rpc('check_handle_availability', {
    p_prefix: prefix,
    p_body: body,
  });
  if (error) return 'invalid_shape';
  return (data as AvailabilityStatus) ?? 'invalid_shape';
}

/** Claims a handle atomically. Returns status (`'ok'` on success). */
export async function claimHandle(
  prefix: HandlePrefix,
  body: string,
): Promise<ClaimStatus> {
  const { data, error } = await supabase.rpc('claim_handle', {
    p_prefix: prefix,
    p_body: body,
  });
  if (error) return 'error';
  return (data as ClaimStatus) ?? 'error';
}

// -----------------------------------------------------------------------------
// Profile helpers
// -----------------------------------------------------------------------------

export interface HandleState {
  handleAt: string | null;
  handleHash: string | null;
  handleAtChangedAt: string | null;
  handleHashChangedAt: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  isOfficial: boolean;
}

/** Fetches handle state + auth-link state for the current user. */
export async function fetchCurrentHandleState(): Promise<HandleState | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('handle_at, handle_hash, handle_at_changed_at, handle_hash_changed_at, phone, is_official')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;

  return {
    handleAt: data.handle_at ?? null,
    handleHash: data.handle_hash ?? null,
    handleAtChangedAt: data.handle_at_changed_at ?? null,
    handleHashChangedAt: data.handle_hash_changed_at ?? null,
    hasEmail: !!user.email,
    hasPhone: !!data.phone,
    isOfficial: !!data.is_official,
  };
}

/** Returns true if the profile is missing a required handle for its linked auth. */
export function needsHandleClaim(state: HandleState): boolean {
  if (state.hasEmail && !state.handleAt) return true;
  if (state.hasPhone && !state.handleHash) return true;
  return false;
}

/**
 * Pick the best display handle for a profile record.
 * Prefers @, falls back to #, then legacy username (for in-flight compat).
 */
export function pickDisplayHandle(profile: {
  handle_at?: string | null;
  handle_hash?: string | null;
  username?: string | null;
}): string | null {
  if (profile.handle_at) return `@${profile.handle_at}`;
  if (profile.handle_hash) return `#${profile.handle_hash}`;
  if (profile.username) return profile.username;
  return null;
}

/** Returns days until next allowed change for a given handle. 0 if changeable now. */
export function cooldownDaysRemaining(changedAt: string | null): number {
  if (!changedAt) return 0;
  const changed = new Date(changedAt).getTime();
  const cooldownEnd = changed + 30 * 24 * 60 * 60 * 1000;
  const remaining = cooldownEnd - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

/** Human-readable message for a status code. */
export function statusMessage(status: ClaimStatus | AvailabilityStatus): string {
  switch (status) {
    case 'ok': return 'Available';
    case 'invalid_prefix': return 'Invalid prefix';
    case 'invalid_shape': return 'Invalid format';
    case 'reserved': return 'This handle is reserved';
    case 'quarantined': return 'Recently released — try again later';
    case 'taken': return 'Already taken';
    case 'no_auth': return 'Not signed in';
    case 'auth_not_linked': return 'Link the matching auth method first';
    case 'cooldown': return 'You changed this recently — wait 30 days';
    case 'error': return 'Something went wrong';
    default: return 'Unknown error';
  }
}
