import { useVoiceInput } from '@/lib/elevenlabs-stt-service';
import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { IconSymbol } from '../ui/icon-symbol';

interface VoiceInputButtonProps {
    onTranscribed: (text: string) => void;
    onSend?: () => void;
    onError?: (error: string) => void;
    color?: string;
    size?: number;
}

const SEND_TRIGGER = /\bsend\b\.?$/i;

export function VoiceInputButton({
    onTranscribed,
    onSend,
    onError,
    color = '#FFFFFF',
    size = 20,
}: VoiceInputButtonProps) {
    const handleTranscribed = (raw: string) => {
        if (onSend && SEND_TRIGGER.test(raw)) {
            const text = raw.replace(SEND_TRIGGER, '').trim();
            if (text) onTranscribed(text);
            // Small delay so state update settles before send fires
            setTimeout(() => onSend(), 50);
        } else {
            onTranscribed(raw);
        }
    };

    const { state, startRecording, stopAndTranscribe, cancelRecording } = useVoiceInput({
        onTranscribed: handleTranscribed,
        onError,
    });

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (state === 'recording') {
            pulseLoop.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.4,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseLoop.current.start();
        } else {
            pulseLoop.current?.stop();
            pulseAnim.setValue(1);
        }

        return () => {
            pulseLoop.current?.stop();
        };
    }, [state, pulseAnim]);

    const handlePressIn = () => {
        startRecording();
    };

    const handlePressOut = () => {
        if (state === 'recording') {
            stopAndTranscribe();
        }
    };

    if (state === 'transcribing') {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="small" color={color} />
            </View>
        );
    }

    const isRecording = state === 'recording';
    const isError = state === 'error';

    return (
        <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={() => {}}
            delayLongPress={10000}
            activeOpacity={0.7}
            style={styles.container}
        >
            {isRecording && (
                <Animated.View
                    style={[
                        styles.pulse,
                        {
                            transform: [{ scale: pulseAnim }],
                            backgroundColor: 'rgba(255, 59, 48, 0.25)',
                        },
                    ]}
                />
            )}
            <IconSymbol
                name={isError ? 'exclamationmark.circle' : isRecording ? 'mic.fill' : 'mic'}
                size={size}
                color={isRecording ? '#FF3B30' : isError ? '#FF9500' : color}
            />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulse: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
    },
});
