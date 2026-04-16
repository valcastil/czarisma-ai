import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CZAR_IMAGE = require('@/assets/images/czar.png');

export default function CzarChatTab() {
  const router = useRouter();
  const { colors } = useTheme();
  const hasNavigated = useRef(false);

  // Auto-navigate to ai-chat when this tab is focused
  useFocusEffect(
    useCallback(() => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;
        router.push('/ai-chat');
      }

      return () => {
        // Reset so next focus triggers navigation again
        hasNavigated.current = false;
      };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={CZAR_IMAGE} style={styles.czarImage} resizeMode="contain" />
      <Text style={[styles.title, { color: colors.text }]}>Czar AI</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Your personal AI companion
      </Text>
      <TouchableOpacity
        style={[styles.chatButton, { backgroundColor: colors.gold }]}
        onPress={() => router.push('/ai-chat')}
        activeOpacity={0.8}>
        <Text style={styles.chatButtonText}>Start Chat</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  czarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  chatButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  chatButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});
