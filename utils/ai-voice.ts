import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { AppState } from 'react-native';

// Storage key for voice preference
export const AI_VOICE_PREFERENCE_KEY = '@ai_voice_preference';

// Voice gender type
export type VoiceGender = 'male' | 'female';

// Get API key from environment variable or app.json extra config
const ENV_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const EXTRA_API_KEY = Constants.expoConfig?.extra?.elevenLabsApiKey || '';
const ELEVENLABS_API_KEY = ENV_API_KEY || EXTRA_API_KEY || '';

// Debug: Log API key status (without exposing the key)
console.log('AIVoice: API Key Source:', ENV_API_KEY ? 'Environment' : EXTRA_API_KEY ? 'App Config' : 'None');
console.log('AIVoice: API Key Status:', ELEVENLABS_API_KEY ? 'Present' : 'Missing');
console.log('AIVoice: API Key Length:', ELEVENLABS_API_KEY?.length || 0);

// ElevenLabs voice IDs
const MALE_VOICE_ID = 'pNInz6obpgDQGcFmaJgB';   // Adam - deep, authoritative male (same as Czar companion)
const FEMALE_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel - warm, natural female voice
const MODEL_ID = 'eleven_multilingual_v2';

const CACHE_PREFIX = '@ai_chat_audio_v1_';
const CACHE_INDEX_KEY = '@ai_chat_audio_cache_index';
const MAX_CACHED_AUDIO = 20;

// Active sound instance
let activeSound: Audio.Sound | null = null;

// Stop audio when app goes to background
AppState.addEventListener('change', (state) => {
  if (state === 'background' || state === 'inactive') {
    stopAIVoice().catch(() => {});
  }
});

/**
 * Get stored voice preference (defaults to male)
 */
export const getVoicePreference = async (): Promise<VoiceGender> => {
  try {
    const stored = await AsyncStorage.getItem(AI_VOICE_PREFERENCE_KEY);
    return (stored as VoiceGender) || 'male';
  } catch {
    return 'male';
  }
};

/**
 * Set voice preference
 */
export const setVoicePreference = async (gender: VoiceGender): Promise<void> => {
  await AsyncStorage.setItem(AI_VOICE_PREFERENCE_KEY, gender);
};

/**
 * Get current voice ID based on preference
 */
export const getCurrentVoiceId = async (): Promise<string> => {
  const preference = await getVoicePreference();
  return preference === 'female' ? FEMALE_VOICE_ID : MALE_VOICE_ID;
};

/**
 * Hash message for cache key
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
 * Stop AI voice audio (ElevenLabs and fallback)
 */
export const stopAIVoice = async (): Promise<void> => {
  // Stop ElevenLabs audio
  if (activeSound) {
    try {
      await activeSound.stopAsync();
      await activeSound.unloadAsync();
    } catch {
      // Ignore errors
    }
    activeSound = null;
  }
  // Stop fallback expo-speech
  try {
    await Speech.stop();
  } catch {
    // Ignore errors
  }
};

/**
 * Fallback TTS using expo-speech (when ElevenLabs fails)
 */
const fallbackTTS = (text: string): void => {
  const cleanText = text
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[*_~`]/g, '')
    .trim()
    .slice(0, 500);
  
  if (!cleanText) return;

  Speech.speak(cleanText, {
    language: 'en-US',
    pitch: 1.0,
    rate: 0.9,
    onError: (err) => console.log('Fallback TTS error:', err),
  });
};

/**
 * Cache management with LRU eviction
 */
const cacheAudioWithEviction = async (key: string, base64Audio: string): Promise<void> => {
  let index: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    if (raw) index = JSON.parse(raw);
  } catch { /* ignore */ }

  index = index.filter(k => k !== key);

  while (index.length >= MAX_CACHED_AUDIO) {
    const oldest = index.shift();
    if (oldest) {
      try { await AsyncStorage.removeItem(oldest); } catch { /* ignore */ }
    }
  }

  await AsyncStorage.setItem(key, base64Audio);
  index.push(key);
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
};

/**
 * Speak AI message using ElevenLabs TTS with selected voice
 */
export const speakAIMessage = async (message: string): Promise<void> => {
  // Re-check API key at runtime
  const runtimeApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || 
                      Constants.expoConfig?.extra?.elevenLabsApiKey || 
                      ELEVENLABS_API_KEY;
  
  if (!runtimeApiKey || runtimeApiKey === 'your-elevenlabs-api-key') {
    console.warn('AIVoice: No ElevenLabs API key configured');
    return;
  }

  // Clean message
  const cleanMessage = message.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[*_~`]/g, '').trim();
  if (!cleanMessage) return;

  // Stop any playing audio
  await stopAIVoice();

  // Get voice preference and corresponding voice ID
  const voiceId = await getCurrentVoiceId();

  // Configure audio session
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: 1,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: 2,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.error('AIVoice: Audio mode config failed', e);
  }

  const cacheKey = CACHE_PREFIX + voiceId + '_' + hashMessage(cleanMessage);

  try {
    // Check cache
    let base64Audio = await AsyncStorage.getItem(cacheKey);

    if (!base64Audio) {
      // Fetch from ElevenLabs
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
        console.error(`AIVoice: ElevenLabs API error ${response.status} - falling back to device TTS`);
        // Fallback to expo-speech when ElevenLabs fails (e.g., 402 payment required)
        fallbackTTS(cleanMessage);
        return;
      }

      console.log('AIVoice: ElevenLabs API success - using premium voice');

      // Convert to base64
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Audio = btoa(binary);

      // Cache it
      try {
        await cacheAudioWithEviction(cacheKey, base64Audio);
      } catch {
        // Non-critical
      }
    }

    // Play audio
    const { sound } = await Audio.Sound.createAsync(
      { uri: `data:audio/mpeg;base64,${base64Audio}` },
      { shouldPlay: true, volume: 1.0 }
    );

    activeSound = sound;

    // Cleanup after playback
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        if (activeSound === sound) {
          activeSound = null;
        }
      }
    });

  } catch (error) {
    console.error('AIVoice: Playback error, falling back to device TTS:', error);
    // Fallback to expo-speech on any error
    fallbackTTS(cleanMessage);
  }
};
