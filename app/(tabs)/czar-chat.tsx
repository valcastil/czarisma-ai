import { useTheme } from '@/hooks/use-theme';
import { useRouter, useNavigation } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';

const CZAR_IMAGE = require('@/assets/images/czar.png');

export default function CzarChatTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const hasNavigated = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Auto-navigate to ai-chat when this tab is focused
  useFocusEffect(
    useCallback(() => {
      // Use setTimeout to ensure navigation happens after layout is complete
      const navigationTimeout = setTimeout(() => {
        if (!hasNavigated.current && isMounted.current) {
          hasNavigated.current = true;
          try {
            // Use navigate for better compatibility in production builds
            // navigate replaces the current screen instead of pushing to stack
            if (navigation && navigation.navigate) {
              navigation.navigate('ai-chat' as never);
            } else {
              router.navigate('/ai-chat');
            }
          } catch (error) {
            console.error('Navigation error:', error);
            // Fallback to router push if navigate fails
            try {
              router.push('/ai-chat');
            } catch (e) {
              console.error('Router push also failed:', e);
            }
          }
        }
      }, Platform.OS === 'android' ? 100 : 50);

      return () => {
        clearTimeout(navigationTimeout);
        // Reset navigation flag after a delay to allow re-navigation
        setTimeout(() => {
          hasNavigated.current = false;
        }, 500);
      };
    }, [navigation, router])
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
        onPress={() => {
          try {
            if (navigation && navigation.navigate) {
              navigation.navigate('ai-chat' as never);
            } else {
              router.navigate('/ai-chat');
            }
          } catch (error) {
            console.error('Button navigation error:', error);
            router.push('/ai-chat');
          }
        }}
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
