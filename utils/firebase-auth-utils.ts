import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

// Firebase Auth is a native module that doesn't exist in Expo Go.
// We NEVER reference it in this file — instead, callers must check
// isFirebaseAvailable() first and the actual Firebase calls use
// the global reference set by initFirebaseAuth().
let _firebaseAuth: any = null;
let _firebaseAvailable: boolean | null = null;

/**
 * Initialise the Firebase Auth module.
 * Call this ONCE from a custom-build entry point (or behind a guard).
 * The `mod` parameter is `require('@react-native-firebase/auth')`.
 */
export const initFirebaseAuth = (mod: any) => {
  _firebaseAuth = mod;
  _firebaseAvailable = true;
};

function getFirebaseAuth() {
  if (_firebaseAuth) return _firebaseAuth;
  throw new Error(
    'Phone authentication is not available in this build. Please use a custom dev build.'
  );
}

/**
 * Check if Firebase Auth is available in the current runtime.
 * Safe to call in Expo Go — always returns false there.
 */
export const isFirebaseAvailable = (): boolean => {
  if (_firebaseAvailable !== null) return _firebaseAvailable;
  // Try a runtime probe using global check (set by native module auto-init)
  try {
    // If initFirebaseAuth was never called, it's unavailable
    _firebaseAvailable = _firebaseAuth !== null;
  } catch {
    _firebaseAvailable = false;
  }
  return _firebaseAvailable;
};

/**
 * Send SMS OTP to phone number via Firebase
 * Returns a confirmation result that can be used to verify the code
 */
export const sendPhoneOtp = async (phoneNumber: string) => {
  const auth = getFirebaseAuth();
  // auth is the default export from @react-native-firebase/auth
  // Call it as a function to get the auth instance, then call signInWithPhoneNumber
  const authInstance = auth();
  const confirmation = await authInstance.signInWithPhoneNumber(phoneNumber);
  return confirmation;
};

/**
 * Verify the SMS OTP code and get a Firebase ID token
 * Returns the Firebase ID token string
 */
export const verifyPhoneOtp = async (
  confirmationResult: any,
  code: string
): Promise<string> => {
  const auth = getFirebaseAuth();
  await confirmationResult.confirm(code);
  const currentUser = auth().currentUser;
  if (!currentUser) {
    throw new Error('Firebase user not available after OTP verification');
  }
  const idToken = await currentUser.getIdToken(true);
  return idToken;
};

/**
 * Bridge a Firebase phone auth session into a Supabase session
 * Calls the firebase-phone-auth edge function
 */
export const bridgeFirebaseToSupabase = async (
  firebaseIdToken: string,
  mode: 'signup' | 'signin' = 'signup'
): Promise<{
  access_token: string;
  refresh_token: string;
  user: any;
}> => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase URL not configured');

  const response = await fetch(
    `${supabaseUrl}/functions/v1/firebase-phone-auth`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        firebaseIdToken,
        mode,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to bridge Firebase to Supabase');
  }

  return data;
};

/**
 * Link a phone number to an existing Supabase account
 * The user must first verify via Firebase, then we call the edge function with link mode
 */
export const linkPhoneToAccount = async (
  firebaseIdToken: string,
  supabaseUserId: string
): Promise<boolean> => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Supabase URL not configured');

  const response = await fetch(
    `${supabaseUrl}/functions/v1/firebase-phone-auth`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        firebaseIdToken,
        mode: 'link',
        linkToUserId: supabaseUserId,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to link phone number');
  }

  return true;
};

/**
 * Complete phone auth flow: verify OTP → bridge to Supabase → set session
 * Returns the Supabase user data
 */
export const completePhoneAuth = async (
  confirmationResult: any,
  code: string,
  mode: 'signup' | 'signin' = 'signup'
) => {
  // Step 1: Verify OTP with Firebase
  logger.info('Verifying phone OTP with Firebase...');
  const firebaseIdToken = await verifyPhoneOtp(confirmationResult, code);

  // Step 2: Bridge to Supabase
  logger.info('Bridging Firebase token to Supabase session...');
  const { access_token, refresh_token, user } = await bridgeFirebaseToSupabase(
    firebaseIdToken,
    mode
  );

  // Step 3: Set Supabase session
  logger.info('Setting Supabase session...');
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    logger.error('Failed to set Supabase session:', error);
    throw new Error('Failed to establish session');
  }

  // Step 4: Clean up Firebase auth state (we don't need it anymore)
  await signOutFirebase();

  return user;
};

/**
 * Sign out of Firebase (cleanup — Supabase is the primary auth)
 */
export const signOutFirebase = async () => {
  try {
    const auth = getFirebaseAuth();
    await auth().signOut();
  } catch {
    // Silently ignore — Firebase cleanup is non-critical
  }
};
