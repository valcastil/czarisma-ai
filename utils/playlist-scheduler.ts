/**
 * Playlist scheduler for "Play All in Native Apps" mode.
 *
 * Flow:
 *  1. startPlaylist(urls) — deep-links to URL[0] in the native app and
 *     schedules a local notification 10 s later.
 *  2. When the user taps the notification, the root layout's notification
 *     response handler calls advancePlaylist(), which deep-links the next
 *     URL and schedules the next notification.
 *  3. Repeats until the last URL. A final "playlist complete" notification
 *     is shown with no data (just informational).
 *
 * Limitation: if the user dismisses/swipes away the notification, the chain
 * breaks. They would need to re-tap the Play All button to resume.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { openSocialVideo } from '@/utils/social-deep-link';

// expo-notifications is not supported in Expo Go on Android since SDK 53.
// Lazy-load it and no-op in Expo Go so the app doesn't crash.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

const loadNotifications = async (): Promise<typeof import('expo-notifications') | null> => {
  if (isExpoGo) return null;
  try {
    return await import('expo-notifications');
  } catch (e) {
    console.warn('expo-notifications unavailable:', e);
    return null;
  }
};

const STATE_KEY = '@charisma_playlist_state';
export const PLAYLIST_VIDEO_DURATION_SEC = 10;
export const PLAYLIST_NOTIFICATION_TYPE = 'playlist-next';

interface PlaylistState {
  urls: string[];
  currentIndex: number; // index of the video currently playing
  active: boolean;
}

const loadState = async (): Promise<PlaylistState | null> => {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as PlaylistState) : null;
  } catch {
    return null;
  }
};

const saveState = async (state: PlaylistState): Promise<void> => {
  await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
};

const clearState = async (): Promise<void> => {
  await AsyncStorage.removeItem(STATE_KEY);
};

/**
 * Request notification permissions (idempotent).
 */
export const requestPlaylistPermissions = async (): Promise<boolean> => {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
};

/**
 * Schedule the "next video ready" notification 10 s from now.
 */
const scheduleNextNotification = async (
  nextIndex: number,
  total: number,
): Promise<void> => {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎬 Next video ready',
      body: `Tap to play video ${nextIndex + 1} of ${total}`,
      data: { type: PLAYLIST_NOTIFICATION_TYPE },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: PLAYLIST_VIDEO_DURATION_SEC,
      repeats: false,
    },
  });
};

const scheduleCompleteNotification = async (): Promise<void> => {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ Playlist complete',
      body: 'All videos played.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: PLAYLIST_VIDEO_DURATION_SEC,
      repeats: false,
    },
  });
};

/**
 * Start playing a playlist of social video URLs in native apps with
 * a 10-second notification nudge between each.
 */
export const startPlaylist = async (urls: string[]): Promise<void> => {
  if (urls.length === 0) return;

  const granted = await requestPlaylistPermissions();
  // Even without permission we still deep-link the first video, but no nudge.
  const Notifications = await loadNotifications();
  if (Notifications) {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  }

  const state: PlaylistState = { urls, currentIndex: 0, active: true };
  await saveState(state);

  // Open first video
  await openSocialVideo(urls[0], { preferNative: true, autoPlay: true });

  // Schedule nudge for next video (if any)
  if (granted && urls.length > 1) {
    await scheduleNextNotification(1, urls.length);
  } else if (granted && urls.length === 1) {
    await scheduleCompleteNotification();
  }
};

/**
 * Advance to the next video in the playlist. Called by the notification
 * response handler when the user taps the nudge notification.
 */
export const advancePlaylist = async (): Promise<void> => {
  const state = await loadState();
  if (!state || !state.active) return;

  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.urls.length) {
    await cancelPlaylist();
    return;
  }

  const updated: PlaylistState = { ...state, currentIndex: nextIndex };
  await saveState(updated);

  await openSocialVideo(state.urls[nextIndex], {
    preferNative: true,
    autoPlay: true,
  });

  if (nextIndex + 1 < state.urls.length) {
    await scheduleNextNotification(nextIndex + 1, state.urls.length);
  } else {
    await scheduleCompleteNotification();
  }
};

/**
 * Cancel any active playlist and clear scheduled notifications.
 */
export const cancelPlaylist = async (): Promise<void> => {
  const Notifications = await loadNotifications();
  if (Notifications) {
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
  }
  await clearState();
};

/**
 * Check whether there's an active playlist.
 */
export const getPlaylistState = async (): Promise<PlaylistState | null> => {
  return loadState();
};
