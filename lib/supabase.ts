import { SupabaseSecureStorage } from '@/utils/supabase-storage-adapter';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Get credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials not found in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SupabaseSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Initialize Supabase and set up auth state listener
 * This ensures user profiles are created/updated when users sign in
 */
export const initializeSupabase = async () => {
  try {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user.email);

        try {
          const { refreshProStatus } = await import('@/utils/subscription-utils');
          await refreshProStatus();
        } catch (error) {
          console.error('Error refreshing pro status on sign-in:', error);
        }

        // Profile will be created automatically by database trigger
        // Update online status
        await supabase
          .from('profiles')
          .update({ is_online: true, last_seen: new Date().toISOString() })
          .eq('id', session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');

        try {
          const { clearProStatus } = await import('@/utils/subscription-utils');
          await clearProStatus();
        } catch (error) {
          console.error('Error clearing pro status on sign-out:', error);
        }

        // Update online status to false
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          await supabase
            .from('profiles')
            .update({ is_online: false, last_seen: new Date().toISOString() })
            .eq('id', currentSession.user.id);
        }
      }
    });

    // Check current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('Active session found:', session.user.email);

      try {
        const { refreshProStatus } = await import('@/utils/subscription-utils');
        await refreshProStatus();
      } catch (error) {
        console.error('Error refreshing pro status on app start:', error);
      }

      // Update online status for current session
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', session.user.id);
    } else {
      console.log('No active session');
    }
  } catch (error) {
    console.error('Error initializing Supabase:', error);
  }
};