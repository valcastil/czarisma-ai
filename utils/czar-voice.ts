import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState, Platform } from 'react-native';
import { getCurrentVoiceId } from './ai-voice';

// Get API key from environment variable or app.json extra config
const ENV_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const EXTRA_API_KEY = Constants.expoConfig?.extra?.elevenLabsApiKey || '';
const ELEVENLABS_API_KEY = ENV_API_KEY || EXTRA_API_KEY || '';

// Debug: Log API key status (without exposing the key)
console.log('CzarVoice: API Key Source:', ENV_API_KEY ? 'Environment' : EXTRA_API_KEY ? 'App Config' : 'None');
console.log('CzarVoice: API Key Status:', ELEVENLABS_API_KEY ? 'Present' : 'Missing');

const MODEL_ID = 'eleven_multilingual_v2';

const CACHE_PREFIX = '@czar_audio_v1_';
const CACHE_INDEX_KEY = '@czar_audio_cache_index';
const MAX_CACHED_AUDIO = 15; // Keep at most 15 cached audio clips (~3MB)

// Active sound instance — keep ref so we can stop it
let activeSound: AudioPlayer | null = null;

// Stop audio whenever app goes to background (prevents Android freeze)
AppState.addEventListener('change', (state) => {
  if (state === 'background' || state === 'inactive') {
    stopCzarVoice().catch(() => {});
  }
});

/**
 * Simple hash to create a stable cache key from message text
 */
const hashMessage = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

/**
 * Stop any currently playing Czar voice audio
 */
export const stopCzarVoice = async (): Promise<void> => {
  if (activeSound) {
    try {
      activeSound.pause();
      activeSound.remove();
    } catch {
      // Ignore errors on stop
    }
    activeSound = null;
  }
};

/**
 * LRU cache management — evict oldest audio when over limit
 */
const cacheAudioWithEviction = async (key: string, base64Audio: string): Promise<void> => {
  // Read current cache index (ordered list of keys, newest last)
  let index: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    if (raw) index = JSON.parse(raw);
  } catch { /* ignore */ }

  // Remove this key if it already exists (will be re-added at end)
  index = index.filter(k => k !== key);

  // Evict oldest entries if over limit
  while (index.length >= MAX_CACHED_AUDIO) {
    const oldest = index.shift();
    if (oldest) {
      try { await AsyncStorage.removeItem(oldest); } catch { /* ignore */ }
    }
  }

  // Store the new audio + update index
  await AsyncStorage.setItem(key, base64Audio);
  index.push(key);
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
};

/**
 * Preload multiple TTS messages by fetching and caching them without playing.
 * Returns true if all messages were successfully cached.
 */
export const preloadTTSMessages = async (messages: string[]): Promise<boolean> => {
  const runtimeApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || 
                      Constants.expoConfig?.extra?.elevenLabsApiKey || 
                      ELEVENLABS_API_KEY;
  
  if (!runtimeApiKey || runtimeApiKey === 'your-elevenlabs-api-key') {
    console.warn('CzarVoice: No ElevenLabs API key configured for preloading');
    return false;
  }

  const voiceId = await getCurrentVoiceId();
  console.log('CzarVoice: Preloading', messages.length, 'messages with voice', voiceId);

  try {
    for (const message of messages) {
      // Strip emojis and special chars for cleaner TTS
      const cleanMessage = message.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[*_~`]/g, '').trim();
      if (!cleanMessage) continue;

      const cacheKey = CACHE_PREFIX + voiceId + '_' + hashMessage(cleanMessage);
      
      // Check if already cached
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        console.log('CzarVoice: Message already cached:', cleanMessage.substring(0, 30) + '...');
        continue;
      }

      // Fetch from ElevenLabs
      console.log('CzarVoice: Fetching audio for:', cleanMessage.substring(0, 30) + '...');
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': runtimeApiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: cleanMessage,
            model_id: MODEL_ID,
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(`CzarVoice: ElevenLabs API error ${response.status}`);
        continue;
      }

      // Convert response to base64 and cache
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      try {
        await cacheAudioWithEviction(cacheKey, base64Audio);
        console.log('CzarVoice: Cached message:', cleanMessage.substring(0, 30) + '...');
      } catch {
        // Cache write failure is non-critical
      }
    }
    
    console.log('CzarVoice: Preloading complete');
    return true;
  } catch (error) {
    console.error('CzarVoice: Preloading error', error);
    return false;
  }
};

/**
 * Speak a message using ElevenLabs TTS.
 * - Checks AsyncStorage cache first (keyed by message hash)
 * - On cache miss: fetches from ElevenLabs, caches the base64 result
 * - Plays audio via expo-audio
 * Returns estimated duration in ms (for syncing mouth animation)
 */
export const speakCzarMessage = async (message: string): Promise<number> => {
  // Re-check API key at runtime in case it wasn't available at module load
  const runtimeApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || 
                      Constants.expoConfig?.extra?.elevenLabsApiKey || 
                      ELEVENLABS_API_KEY;
  
  if (!runtimeApiKey || runtimeApiKey === 'your-elevenlabs-api-key') {
    console.warn('CzarVoice: No ElevenLabs API key configured. Set EXPO_PUBLIC_ELEVENLABS_API_KEY or elevenLabsApiKey in app.json');
    return 0;
  }

  // Strip emojis and special chars for cleaner TTS
  const cleanMessage = message.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[*_~`]/g, '').trim();
  if (!cleanMessage) return 0;

  // Stop any playing audio first
  await stopCzarVoice();

  // Set audio mode for playback through speaker (critical for production builds)
  try {
    const audioMode: any = Platform.OS === 'android' 
      ? {
          allowsRecording: false,
          interruptionMode: 'doNotMix',
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        }
      : {
          allowsRecording: false,
          interruptionMode: 'doNotMix',
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        };
    await setAudioModeAsync(audioMode);
    console.log('CzarVoice: Audio session configured for playback on', Platform.OS);
  } catch (e) {
    console.error('CzarVoice: Audio mode config failed', e);
    // Continue even if audio mode fails
  }

  // Get voice ID based on user preference (male/female)
  const voiceId = await getCurrentVoiceId();
  console.log('CzarVoice: Using voice ID:', voiceId);

  const cacheKey = CACHE_PREFIX + voiceId + '_' + hashMessage(cleanMessage);

  try {
    // 1. Check cache
    let base64Audio = await AsyncStorage.getItem(cacheKey);

    if (!base64Audio) {
      // 2. Fetch from ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': runtimeApiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: cleanMessage,
            model_id: MODEL_ID,
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.75,
              style: 0.3,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(`CzarVoice: ElevenLabs API error ${response.status}`);
        return 0;
      }

      // Convert response to base64
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Audio = btoa(binary);

      // 3. Cache it with LRU eviction
      try {
        await cacheAudioWithEviction(cacheKey, base64Audio);
      } catch {
        // Cache write failure is non-critical
      }
    }

    // 4. Play audio from base64
    console.log('CzarVoice: Creating audio player for', Platform.OS);
    const player = createAudioPlayer({ uri: `data:audio/mpeg;base64,${base64Audio}` });
    player.volume = 1.0;
    
    activeSound = player;

    // Estimate duration for fallback (~80ms per character)
    const estimatedDuration = Math.max(2000, cleanMessage.length * 80);

    // Wait for playback to actually finish before resolving
    return new Promise<number>((resolve) => {
      let hasFinished = false;
      
      const sub = player.addListener('playbackStatusUpdate', (status) => {
        console.log('CzarVoice: Playback status on', Platform.OS, ':', status);
        
        // Check if playback is actually playing
        if (status.playing) {
          console.log('CzarVoice: Audio is now playing on', Platform.OS);
        }
        
        if (status.didJustFinish && !hasFinished) {
          hasFinished = true;
          console.log('CzarVoice: Playback finished on', Platform.OS);
          try { player.remove(); } catch {}
          try { sub.remove(); } catch {}
          if (activeSound === player) {
            activeSound = null;
          }
          resolve(estimatedDuration);
        }
      });
      
      // Android-specific: Small delay before playing to ensure audio session is ready
      const playDelay = Platform.OS === 'android' ? 100 : 0;
      
      setTimeout(() => {
        console.log('CzarVoice: Starting audio playback on', Platform.OS);
        player.play();
        
        // Android fallback: resolve after estimated duration if didJustFinish doesn't fire
        if (Platform.OS === 'android') {
          setTimeout(() => {
            if (!hasFinished) {
              console.log('CzarVoice: Android fallback timeout - forcing resolve');
              hasFinished = true;
              try { player.remove(); } catch {}
              try { sub.remove(); } catch {}
              if (activeSound === player) {
                activeSound = null;
              }
              resolve(estimatedDuration);
            }
          }, estimatedDuration + 3000);
        }
      }, playDelay);
      
      // General fallback: resolve after estimated duration + buffer
      setTimeout(() => {
        if (!hasFinished) {
          console.log('CzarVoice: General fallback timeout resolving');
          hasFinished = true;
          try { player.remove(); } catch {}
          try { sub.remove(); } catch {}
          if (activeSound === player) {
            activeSound = null;
          }
          resolve(estimatedDuration);
        }
      }, estimatedDuration + 8000);
    });

  } catch (error) {
    console.error('CzarVoice: Playback error', error);
    return 0;
  }
};
