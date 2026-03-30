import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        // Get the current session after OAuth redirect
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Auth callback error:', error);
          router.replace('/auth-sign-in');
          return;
        }

        if (session) {
          logger.info('OAuth session established successfully');
          try {
            const { refreshProStatus } = await import('@/utils/subscription-utils');
            await refreshProStatus();
          } catch (error) {
            logger.error('Error refreshing pro status after OAuth callback:', error);
          }

          router.replace('/(tabs)');
        } else {
          logger.warn('No session found in callback');
          router.replace('/auth-sign-in');
        }
      } catch (error) {
        logger.error('Error handling auth callback:', error);
        router.replace('/auth-sign-in');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#D4AF37" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
