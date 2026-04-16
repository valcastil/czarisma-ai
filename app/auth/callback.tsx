import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle the OAuth/email confirmation callback
    const handleCallback = async () => {
      try {
        // Check for email confirmation token in URL params
        // Supabase email links contain: ?token_hash=xxx&type=signup|recovery|etc
        const token_hash = params.token_hash as string | undefined;
        const type = params.type as string | undefined;
        const code = params.code as string | undefined;

        logger.info('Auth callback params:', { token_hash: !!token_hash, type, code: !!code });

        // If we have a token from email confirmation link, exchange it for session
        if (token_hash && type) {
          logger.info(`Exchanging token for session, type: ${type}`);
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });

          if (error) {
            logger.error('Token verification error:', error);
            router.replace('/auth-sign-in');
            return;
          }

          if (data.session) {
            logger.info('Email confirmation successful, session established');
            try {
              const { refreshProStatus, createTrialIfNeeded } = await import('@/utils/subscription-utils');
              await refreshProStatus();
              if (data.user) {
                await createTrialIfNeeded(data.user.id);
              }
            } catch (error) {
              logger.error('Error setting up subscription after email confirmation:', error);
            }

            router.replace('/(tabs)');
            return;
          }
        }

        // If we have a code (PKCE flow), exchange it
        if (code) {
          logger.info('Exchanging code for session (PKCE flow)');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            logger.error('Code exchange error:', error);
            router.replace('/auth-sign-in');
            return;
          }

          if (data.session) {
            logger.info('PKCE session established successfully');
            try {
              const { refreshProStatus } = await import('@/utils/subscription-utils');
              await refreshProStatus();
            } catch (error) {
              logger.error('Error refreshing pro status after PKCE callback:', error);
            }

            router.replace('/(tabs)');
            return;
          }
        }

        // Fallback: check for existing session (OAuth flows)
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
          logger.warn('No session or valid token found in callback');
          router.replace('/auth-sign-in');
        }
      } catch (error) {
        logger.error('Error handling auth callback:', error);
        router.replace('/auth-sign-in');
      }
    };

    handleCallback();
  }, [router, params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#D4AF37" />
      <Text style={styles.text}>Verifying your account...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    gap: 16,
  },
  text: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '500',
  },
});
