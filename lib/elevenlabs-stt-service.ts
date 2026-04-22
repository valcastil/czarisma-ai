import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { supabase } from './supabase';

export type VoiceInputState = 'idle' | 'recording' | 'transcribing' | 'error';

interface UseVoiceInputOptions {
  onTranscribed: (text: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceInput({ onTranscribed, onError }: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>('idle');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync();
    if (!granted) {
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
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setState('recording');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start recording';
      setState('error');
      onError?.(msg);
      setTimeout(() => setState('idle'), 2000);
    }
  }, [state, requestPermission, onError, recorder]);

  const stopAndTranscribe = useCallback(async () => {
    if (state !== 'recording') return;

    setState('transcribing');

    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });

      const uri = recorder.uri;
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
  }, [state, onTranscribed, onError, recorder]);

  const cancelRecording = useCallback(async () => {
    try {
      await recorder.stop();
    } catch {
      // ignore
    }
    setState('idle');
  }, [recorder]);

  return {
    state,
    isRecording: state === 'recording',
    isTranscribing: state === 'transcribing',
    startRecording,
    stopAndTranscribe,
    cancelRecording,
  };
}
