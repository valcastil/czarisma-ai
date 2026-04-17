import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useRef, useState } from 'react';
import { supabase } from './supabase';

export type VoiceInputState = 'idle' | 'recording' | 'transcribing' | 'error';

interface UseVoiceInputOptions {
  onTranscribed: (text: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceInput({ onTranscribed, onError }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      onError?.('Microphone permission denied');
      return false;
    }
    return true;
  }, [onError]);

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setState('recording');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      setState('error');
      onError?.(msg);
      setTimeout(() => setState('idle'), 2000);
    }
  }, [state, requestPermission, onError]);

  const stopAndTranscribe = useCallback(async () => {
    if (state !== 'recording' || !recordingRef.current) return;

    setState('transcribing');

    try {
      const recording = recordingRef.current;
      recordingRef.current = null;

      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      if (!uri) throw new Error('No recording URI found');

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Clean up temp file
      await FileSystem.deleteAsync(uri, { idempotent: true });

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('elevenlabs-stt', {
        body: { audio: base64, mimeType: 'audio/m4a' },
      });

      if (error) throw new Error(error.message);
      if (!data?.text) throw new Error('No transcription returned');

      onTranscribed(data.text.trim());
      setState('idle');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setState('error');
      onError?.(msg);
      setTimeout(() => setState('idle'), 2000);
    }
  }, [state, onTranscribed, onError]);

  const cancelRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
    } catch {
      // ignore
    }
    recordingRef.current = null;
    setState('idle');
  }, []);

  return {
    state,
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    startRecording,
    stopAndTranscribe,
    cancelRecording,
  };
}
