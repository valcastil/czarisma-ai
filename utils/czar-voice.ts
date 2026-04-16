import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { AppState } from 'react-native';

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';

// ElevenLabs "Adam" — deep, middle-aged authoritative male voice
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';
const MODEL_ID = 'eleven_multilingual_v2';

const CACHE_PREFIX = '@czar_audio_v1_';
const CACHE_INDEX_KEY = '@czar_audio_cache_index';
const MAX_CACHED_AUDIO = 15; // Keep at most 15 cached audio clips (~3MB)

// Active sound instance — keep ref so we can stop it
let activeSound: Audio.Sound | null = null;

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
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
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
 * Speak a message using ElevenLabs TTS.
 * - Checks AsyncStorage cache first (keyed by message hash)
 * - On cache miss: fetches from ElevenLabs, caches the base64 result
 * - Plays audio via expo-av
 * Returns estimated duration in ms (for syncing mouth animation)
 */
export const speakCzarMessage = async (message: string): Promise<number> => {
  if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'your-elevenlabs-api-key') {
    console.warn('CzarVoice: No ElevenLabs API key configured');
    return 0;
  }

  // Strip emojis and special chars for cleaner TTS
  const cleanMessage = message.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[*_~`]/g, '').trim();
  if (!cleanMessage) return 0;

  // Stop any playing audio first
  await stopCzarVoice();

  // Set audio mode for playback through speaker
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // Continue even if audio mode fails
  }

  const cacheKey = CACHE_PREFIX + hashMessage(cleanMessage);

  try {
    // 1. Check cache
    let base64Audio = await AsyncStorage.getItem(cacheKey);

    if (!base64Audio) {
      // 2. Fetch from ElevenLabs
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
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
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/mpeg;base64,${base64Audio}` },
      { shouldPlay: true, volume: 1.0 }
    );

    activeSound = sound;

    // Cleanup sound after playback finishes
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        if (activeSound === sound) {
          activeSound = null;
        }
      }
    });

    // Estimate duration for mouth animation sync (~80ms per character)
    const estimatedDuration = Math.max(2000, cleanMessage.length * 80);
    return estimatedDuration;

  } catch (error) {
    console.error('CzarVoice: Playback error', error);
    return 0;
  }
};
