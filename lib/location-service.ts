/**
 * Location service: permissions, single-shot reads, live sharing, realtime subscription,
 * and thin wrappers around the Supabase edge functions that proxy Google Places.
 *
 * Google API keys live ONLY in Supabase project secrets. The client calls the proxy
 * functions instead of Google directly so the key never ships with the app.
 */

import * as Location from 'expo-location';
import { supabase } from './supabase';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  primary: string;   // main_text
  secondary: string; // secondary_text
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface LiveLocationRow {
  id: string;
  sharer_id: string;
  message_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  started_at: string;
  expires_at: string;
  updated_at: string;
  stopped_at: string | null;
}

// -----------------------------------------------------------------------------
// Permissions
// -----------------------------------------------------------------------------

export async function ensureLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status === 'granted') return true;
  const req = await Location.requestForegroundPermissionsAsync();
  return req.status === 'granted';
}

// -----------------------------------------------------------------------------
// Single-shot position
// -----------------------------------------------------------------------------

export async function getCurrentPosition(): Promise<Coordinates | null> {
  const ok = await ensureLocationPermission();
  if (!ok) return null;
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? undefined,
    heading: pos.coords.heading ?? undefined,
    speed: pos.coords.speed ?? undefined,
  };
}

/** Cheap client-side reverse geocode via expo-location (works offline on iOS). */
export async function reverseGeocodeLocal(
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!results.length) return null;
    const r = results[0];
    const parts = [r.name, r.street, r.city, r.region, r.country].filter(Boolean);
    return parts.join(', ') || null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Places proxy (Supabase edge functions). Keys stay server-side.
// -----------------------------------------------------------------------------

export async function placesAutocomplete(
  query: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.functions.invoke('places-autocomplete', {
    body: { query, sessionToken },
  });
  if (error || !data) return [];
  return (data.suggestions ?? []) as PlaceSuggestion[];
}

export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetails | null> {
  const { data, error } = await supabase.functions.invoke('places-details', {
    body: { placeId, sessionToken },
  });
  if (error || !data) return null;
  return data as PlaceDetails;
}

/**
 * URL for a static map thumbnail. Uses the static-map edge function so the
 * Google API key is never exposed to the client.
 * Falls back to a direct Google URL shape if `EXPO_PUBLIC_GOOGLE_STATIC_MAPS_KEY`
 * is set (useful for quick local testing — NOT recommended for production).
 */
export function staticMapUrl(
  lat: number,
  lng: number,
  opts?: { width?: number; height?: number; zoom?: number },
): string {
  const w = opts?.width ?? 400;
  const h = opts?.height ?? 220;
  const z = opts?.zoom ?? 15;
  const devKey = process.env.EXPO_PUBLIC_GOOGLE_STATIC_MAPS_KEY;
  if (devKey) {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${z}&size=${w}x${h}&markers=color:red%7C${lat},${lng}&key=${devKey}`;
  }
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return `${base}/functions/v1/static-map?lat=${lat}&lng=${lng}&w=${w}&h=${h}&z=${z}`;
}

/** Deep-link URL to open native Maps app at a location. */
export function openInMapsUrl(lat: number, lng: number, label?: string): string {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  // iOS honors maps://?q=..; Android honors geo:..; Google Maps URL works everywhere as fallback.
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=&t=m&z=16&label=${q}`;
}

// -----------------------------------------------------------------------------
// Live-location lifecycle
// -----------------------------------------------------------------------------

export interface StartLiveShareInput {
  messageId: string;
  sharerId: string;
  durationSec: number; // capped server-side to 8h
  initial: Coordinates;
}

export async function createLiveLocationRow(
  input: StartLiveShareInput,
): Promise<string | null> {
  const expiresAt = new Date(Date.now() + input.durationSec * 1000).toISOString();
  const { data, error } = await supabase
    .from('live_locations')
    .insert({
      sharer_id: input.sharerId,
      message_id: input.messageId,
      latitude: input.initial.latitude,
      longitude: input.initial.longitude,
      accuracy: input.initial.accuracy ?? null,
      heading: input.initial.heading ?? null,
      speed: input.initial.speed ?? null,
      expires_at: expiresAt,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('createLiveLocationRow failed:', error);
    return null;
  }
  return data.id as string;
}

export async function updateLiveLocation(
  id: string,
  coords: Coordinates,
): Promise<void> {
  await supabase
    .from('live_locations')
    .update({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? null,
      heading: coords.heading ?? null,
      speed: coords.speed ?? null,
    })
    .eq('id', id);
}

export async function stopLiveLocation(id: string): Promise<void> {
  await supabase
    .from('live_locations')
    .update({ stopped_at: new Date().toISOString() })
    .eq('id', id);
}

/**
 * Starts a foreground position watcher that pushes updates to a live_locations row.
 * Returns a `stop()` callback that cancels the watcher and marks the row stopped.
 */
export async function beginLiveLocationWatcher(
  liveId: string,
  expiresAtMs: number,
  onUpdate?: (c: Coordinates) => void,
): Promise<() => Promise<void>> {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,
      distanceInterval: 10,
    },
    async (loc) => {
      if (Date.now() >= expiresAtMs) {
        sub.remove();
        await stopLiveLocation(liveId);
        return;
      }
      const coords: Coordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
        heading: loc.coords.heading ?? undefined,
        speed: loc.coords.speed ?? undefined,
      };
      onUpdate?.(coords);
      await updateLiveLocation(liveId, coords);
    },
  );

  return async () => {
    sub.remove();
    await stopLiveLocation(liveId);
  };
}

/**
 * Subscribes to realtime UPDATEs for a given live_locations row.
 * Returns an unsubscribe function.
 */
export function subscribeToLiveLocation(
  liveId: string,
  onChange: (row: LiveLocationRow) => void,
): () => void {
  const channel = supabase
    .channel(`live-location-${liveId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_locations',
        filter: `id=eq.${liveId}`,
      },
      (payload) => {
        onChange(payload.new as LiveLocationRow);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchLiveLocationRow(
  liveId: string,
): Promise<LiveLocationRow | null> {
  const { data, error } = await supabase
    .from('live_locations')
    .select('*')
    .eq('id', liveId)
    .single();
  if (error) return null;
  return data as LiveLocationRow;
}
