import { supabase } from '@/lib/supabase';
import { SecureStorage } from '@/utils/secure-storage';

const PRO_STATUS_KEY = '@pro_status';
const TRIAL_START_KEY = '@trial_start_date';
const PRO_EMAIL_KEY = '@pro_email';
const LOCAL_TRIAL_START_KEY = '@local_trial_start';
const SIGNED_UP_TRIAL_START_KEY = '@signed_up_trial_start';

// In-memory session cache to avoid repeated supabase.auth.getSession() calls
let _sessionCache: { session: any; timestamp: number } | null = null;
const SESSION_CACHE_TTL = 10000; // 10 seconds

const getCachedSession = async () => {
  const now = Date.now();
  if (_sessionCache && now - _sessionCache.timestamp < SESSION_CACHE_TTL) {
    return _sessionCache.session;
  }
  const { data: { session } } = await supabase.auth.getSession();
  _sessionCache = { session, timestamp: now };
  return session;
};

// Clear session cache on auth state changes
supabase.auth.onAuthStateChange(() => { _sessionCache = null; });

// NEW SUBSCRIPTION FLOW:
// 1. Non-signed-up users: 7-day local trial
// 2. After 7 days: persistent popup forces sign up
// 3. After sign up: 3-month free trial (90 days)
// 4. After 3 months: must subscribe to PRO monthly or yearly
const LOCAL_TRIAL_DAYS = 7;
const SIGNED_UP_TRIAL_DAYS = 90; // 3 months free after sign up

// FREE MODE is now controlled by the trial periods above
const FREE_MODE = true;

/**
 * Check if user is signed in (has an active Supabase session)
 */
export const isUserSignedIn = async (): Promise<boolean> => {
  try {
    const session = await getCachedSession();
    return !!session;
  } catch {
    return false;
  }
};

/**
 * Get local trial status for non-signed-up users.
 * Trial starts on first app open and lasts 7 days.
 * After 7 days, user must sign up to continue.
 */
export const getLocalTrialStatus = async (): Promise<TrialStatus> => {
  try {
    let trialStart = await SecureStorage.getItem(LOCAL_TRIAL_START_KEY);
    if (!trialStart) {
      // First time opening the app — start the trial now
      const now = Date.now();
      await SecureStorage.setItem(LOCAL_TRIAL_START_KEY, now.toString());
      trialStart = now.toString();
    }

    const startTime = parseInt(trialStart, 10);
    const endTime = startTime + LOCAL_TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const daysRemaining = Math.max(0, Math.ceil((endTime - now) / (24 * 60 * 60 * 1000)));
    const isExpired = now >= endTime;

    return {
      isTrialActive: !isExpired,
      trialStartDate: startTime,
      trialEndDate: endTime,
      daysRemaining: isExpired ? 0 : daysRemaining,
      isExpired,
    };
  } catch (error) {
    console.error('Error getting local trial status:', error);
    return { isTrialActive: true, trialStartDate: Date.now(), trialEndDate: Date.now() + LOCAL_TRIAL_DAYS * 86400000, daysRemaining: LOCAL_TRIAL_DAYS, isExpired: false };
  }
};

/**
 * Get signed-up user trial status (3-month free trial after sign up)
 */
export const getSignedUpTrialStatus = async (): Promise<TrialStatus> => {
  try {
    let trialStart = await SecureStorage.getItem(SIGNED_UP_TRIAL_START_KEY);
    
    if (!trialStart) {
      // User just signed up - start the 3-month trial
      const now = Date.now();
      await SecureStorage.setItem(SIGNED_UP_TRIAL_START_KEY, now.toString());
      trialStart = now.toString();
    }

    const startTime = parseInt(trialStart, 10);
    const endTime = startTime + SIGNED_UP_TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const daysRemaining = Math.max(0, Math.ceil((endTime - now) / (24 * 60 * 60 * 1000)));
    const isExpired = now >= endTime;

    return {
      isTrialActive: !isExpired,
      trialStartDate: startTime,
      trialEndDate: endTime,
      daysRemaining: isExpired ? 0 : daysRemaining,
      isExpired,
    };
  } catch (error) {
    console.error('Error getting signed-up trial status:', error);
    return { isTrialActive: true, trialStartDate: Date.now(), trialEndDate: Date.now() + SIGNED_UP_TRIAL_DAYS * 86400000, daysRemaining: SIGNED_UP_TRIAL_DAYS, isExpired: false };
  }
};

/**
 * Determine if the user has access:
 * - Non-signed-in users: 7-day local trial only
 * - Signed-in users: 3-month free trial, then must subscribe to PRO
 */
export const hasAccess = async (): Promise<boolean> => {
  if (await isUserSignedIn()) {
    // Check if signed-up user's 3-month trial is still active
    const signedUpTrial = await getSignedUpTrialStatus();
    return signedUpTrial.isTrialActive;
  }
  // Non-signed-in users only get 7-day trial
  const localTrial = await getLocalTrialStatus();
  return localTrial.isTrialActive;
};

export interface ProStatus {
  isPro: boolean;
  expiresAt?: number;
}

export interface TrialStatus {
  isTrialActive: boolean;
  trialStartDate: number | null;
  trialEndDate: number | null;
  daysRemaining: number | null;
  isExpired: boolean;
}

/**
 * Check if user needs to subscribe to PRO (after 3-month free trial)
 */
export const needsProSubscription = async (): Promise<boolean> => {
  if (!(await isUserSignedIn())) return false; // Non-signed users handled separately
  
  const signedUpTrial = await getSignedUpTrialStatus();
  return signedUpTrial.isExpired; // After 3 months, needs PRO
};

/**
 * Force-refresh cached Pro status from Supabase.
 * Use this on app start and after sign-in so production builds immediately reflect
 * the latest subscription state.
 */
export const refreshProStatus = async (): Promise<boolean> => {
  if (FREE_MODE) return await hasAccess();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await saveProStatus(false);
      return false;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      await saveProStatus(false);
      return false;
    }

    const isPro = data.status === 'active' || data.status === 'trialing';
    await saveProStatus(isPro, data.current_period_end);
    return isPro;
  } catch (error) {
    console.error('Error refreshing pro status:', error);
    return false;
  }
};

/**
 * Check if user has a PAID Pro subscription (not trial)
 * Use this for premium-only features like entry editing
 */
export const checkPaidProStatus = async (): Promise<boolean> => {
  // Always check Supabase for actual paid subscription, regardless of FREE_MODE.
  // This ensures the PRO badge only shows for users who paid via QR code.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return false;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return false;
    }

    // Only return true for active (paid) subscriptions, not trialing
    return data.status === 'active';
  } catch (error) {
    console.error('Error checking paid pro status:', error);
    return false;
  }
};

/**
 * Check if user has an active Pro subscription (includes trial)
 */
export const checkProStatus = async (): Promise<boolean> => {
  if (FREE_MODE) return await hasAccess();
  try {
    // First check local storage for cached status
    const cachedStatus = await SecureStorage.getItem(PRO_STATUS_KEY);
    if (cachedStatus) {
      const status: ProStatus = JSON.parse(cachedStatus);
      // If not expired, return cached status
      if (status.expiresAt && status.expiresAt > Date.now()) {
        return status.isPro;
      }
    }

    // Check with Supabase for actual subscription status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await saveProStatus(false);
      return false;
    }

    // Query user's subscription status from database
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      // If table doesn't exist or other database error, return false
      console.log('Subscription table not found or database error:', error.message);
      await saveProStatus(false);
      return false;
    }

    if (!data) {
      await saveProStatus(false);
      return false;
    }

    const isPro = data.status === 'active' || data.status === 'trialing';
    await saveProStatus(isPro, data.current_period_end);
    return isPro;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false;
  }
};

/**
 * Save Pro status to local storage with expiration
 */
const saveProStatus = async (isPro: boolean, expiresAt?: string) => {
  try {
    const status: ProStatus = {
      isPro,
      expiresAt: expiresAt ? new Date(expiresAt).getTime() : Date.now() + 3600000, // 1 hour cache
    };
    await SecureStorage.setItem(PRO_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Error saving pro status:', error);
  }
};

/**
 * Clear cached Pro status (call after sign out or subscription changes)
 */
export const clearProStatus = async () => {
  try {
    await SecureStorage.removeItem(PRO_STATUS_KEY);
  } catch (error) {
    console.error('Error clearing pro status:', error);
  }
};

/**
 * List of charisma IDs that require Pro subscription
 */
export const PRO_CHARISMA_IDS = [
  // Transformational Charisma
  'transformational_repeat',
  'transformational_rocket',
  'seedling',
  'wrench',
  'glowing_star',
  'gear',
  // Ethical Charisma
  'balance_scale',
  'compass',
  'ethical_handshake',
  'dove',
  'lotus_position',
  'ethical_idea',
  // Socialized Charisma
  'socialized_handshake',
  'globe',
  'silhouette',
  'open_hands',
  'speech_balloon',
  'hugging_face',
  // Personalized Charisma
  'money_mouth',
  'performing_arts',
  'smiling_horns',
  'gem_stone',
  'sunglasses',
  'briefcase',
  // Neo-Charismatic Leadership
  'mechanical_arm',
  'neo_wrench',
  'neo_repeat',
  'hammer_wrench',
  'neo_gear',
  'chart_increasing',
  // Divine Charisma
  'place_worship',
  'baby_angel',
  'sparkles',
  'folded_hands',
  'divine_star',
  'candle',
  // Office-holder Charisma
  'classical_building',
  'military_medal',
  'necktie',
  'scroll',
  'office_briefcase',
  'receipt',
  // Star Power Charisma
  'star_power_star',
  'clapper_board',
  'microphone',
  'shooting_star',
  'star',
  'camera_flash',
  // Difficult/Disliked Charisma
  'angry_face',
  'firecracker',
  'steam_nose',
  'bomb',
  'high_voltage',
  'difficult_fire',
];

/**
 * Check if a charisma ID requires Pro subscription
 */
export const isProCharisma = (_charismaId: string): boolean => {
  if (FREE_MODE) return false;
  return PRO_CHARISMA_IDS.includes(_charismaId);
};

/**
 * For development/testing: Manually set Pro status
 * Remove this function in production
 */
export const setProStatusForTesting = async (isPro: boolean): Promise<void> => {
  try {
    await saveProStatus(isPro);
  } catch (error) {
    console.error('Error setting pro status for testing:', error);
  }
};

/**
 * Start the 30-day free trial for a new user
 */
export const startFreeTrial = async (): Promise<void> => {
  try {
    // Trials are controlled by the backend subscription status.
    // This function is kept for backward compatibility.
    return;
  } catch (error) {
    console.error('Error starting free trial:', error);
  }
};

/**
 * Initialize trial for new users if not already started
 */
export const initializeTrialIfNeeded = async (): Promise<void> => {
  try {
    // Trials are controlled by the backend subscription status.
    // This function is kept for backward compatibility.
    return;
  } catch (error) {
    console.error('Error initializing trial:', error);
  }
};

/**
 * Get current trial status
 */
export const getTrialStatus = async (): Promise<TrialStatus> => {
  return await getTrialStatusFromDb();
};

/**
 * Check if a specific email is a known Pro subscriber
 * This persists even if the app is deleted and reinstalled
 */
export const checkKnownProUser = async (email?: string | null): Promise<boolean> => {
  try {
    // List of known Pro subscriber emails
    const knownProEmails: string[] = [
      // Add Pro subscriber emails here
    ];

    // Check provided email or get from current session
    const emailToCheck = email || (await getCurrentUserEmail());
    
    if (!emailToCheck) {
      return false;
    }

    // Check if email is in the known Pro list
    const isKnownPro = knownProEmails.includes(emailToCheck.toLowerCase());
    
    if (isKnownPro) {
      // Store the Pro email for persistence
      await SecureStorage.setItem(PRO_EMAIL_KEY, emailToCheck.toLowerCase());
    }
    
    return isKnownPro;
  } catch (error) {
    console.error('Error checking known Pro user:', error);
    return false;
  }
};

/**
 * Get current user email from Supabase session
 */
const getCurrentUserEmail = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.email || null;
  } catch (error) {
    console.error('Error getting current user email:', error);
    return null;
  }
};

/**
 * Check if user can access features (either in trial or Pro)
 * Also handles automatic redirect when trial expires
 */
export const canAccessFeatures = async (router?: any): Promise<boolean> => {
  if (FREE_MODE) {
    const access = await hasAccess();
    if (!access && router) {
      router.push('/auth-sign-in');
    }
    return access;
  }
  try {
    const isPro = await checkProStatus();
    if (!isPro && router) {
      router.push('/subscription');
    }
    return isPro;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
};

/**
 * Check if a specific user has valid trial or Pro subscription
 */
export const hasValidSubscription = async (userId: string): Promise<boolean> => {
  if (FREE_MODE) return await hasAccess();
  try {
    const { data: { session } } = await supabase.auth.getSession();

    // We can only reliably check the current user's subscription client-side due to RLS.
    if (!session || session.user.id !== userId) {
      return true;
    }

    return await checkProStatus();
  } catch (error) {
    console.error('Error checking subscription for user:', userId, error);
    return false;
  }
};

/**
 * Check Pro status for a specific user
 */
export const checkProStatusForUser = async (userId: string): Promise<boolean> => {
  try {
    const proKey = `@pro_status_${userId}`;
    const isPro = await SecureStorage.getItem(proKey);
    return isPro === 'true';
  } catch (error) {
    console.error('Error checking Pro status for user:', userId, error);
    return false;
  }
};

/**
 * Get trial status for a specific user
 */
export const getTrialStatusForUser = async (userId: string) => {
  try {
    const trialKey = `@trial_status_${userId}`;
    const trialData = await SecureStorage.getItem(trialKey);
    
    if (!trialData) {
      // Default trial status for new users
      const defaultTrial: TrialStatus = {
        isTrialActive: true,
        trialStartDate: Date.now(),
        trialEndDate: Date.now() + LOCAL_TRIAL_DAYS * 24 * 60 * 60 * 1000,
        daysRemaining: LOCAL_TRIAL_DAYS,
        isExpired: false,
      };
      await SecureStorage.setItem(trialKey, JSON.stringify(defaultTrial));
      return defaultTrial;
    }
    
    const trialStatus = JSON.parse(trialData);
    const now = Date.now();
    
    // Check if trial has expired
    if (now > trialStatus.trialEndDate) {
      trialStatus.isExpired = true;
      trialStatus.isTrialActive = false;
      trialStatus.daysRemaining = 0;
    } else {
      trialStatus.isExpired = false;
      trialStatus.isTrialActive = true;
      trialStatus.daysRemaining = Math.ceil((trialStatus.trialEndDate - now) / (24 * 60 * 60 * 1000));
    }
    
    return trialStatus;
  } catch (error) {
    console.error('Error getting trial status for user:', userId, error);
    return {
      isTrialActive: false,
      trialStartDate: Date.now(),
      trialEndDate: Date.now(),
      daysRemaining: 0,
      isExpired: true,
    };
  }
};

/**
 * Get users with valid subscriptions (Pro or active trial)
 */
export const getUsersWithValidSubscriptions = async (users: any[]): Promise<any[]> => {
  try {
    const usersWithValidSubscriptions = await Promise.all(
      users.map(async (user) => {
        const hasValidSub = await hasValidSubscription(user.id);
        return {
          ...user,
          hasValidSubscription: hasValidSub,
        };
      })
    );
    
    // Filter users who have valid subscriptions (regardless of online status)
    return usersWithValidSubscriptions.filter(user => 
      user.hasValidSubscription
    );
  } catch (error) {
    console.error('Error getting users with valid subscriptions:', error);
    return [];
  }
};

/**
 * Check if should show persistent trial expiration popup
 * Returns true if 7-day trial expired and user hasn't signed up
 */
export const shouldShowTrialExpiredPopup = async (): Promise<boolean> => {
  if (await isUserSignedIn()) return false; // Signed up users don't see this
  const trial = await getLocalTrialStatus();
  return trial.isExpired; // Show popup if 7-day trial expired
};

/**
 * Check if should show PRO subscription popup (after 3-month free trial)
 * Returns true if signed-up user's 3-month trial expired
 */
export const shouldShowProSubscriptionPopup = async (): Promise<boolean> => {
  if (!(await isUserSignedIn())) return false; // Only for signed-up users
  const signedUpTrial = await getSignedUpTrialStatus();
  return signedUpTrial.isExpired; // Show PRO popup after 3 months
};

/**
 * Check trial expiration and redirect if needed
 * Call this on app startup and major screen navigation
 * 
 * NEW FLOW:
 * - 7-day trial for non-signed users -> redirect to sign-in
 * - 3-month free for signed users -> redirect to subscription after expiry
 */
export const checkTrialExpirationAndRedirect = async (router: any): Promise<void> => {
  if (FREE_MODE) {
    const signedIn = await isUserSignedIn();
    
    if (signedIn) {
      // Check if signed-up user's 3-month trial expired
      const needsPro = await needsProSubscription();
      if (needsPro) {
        router.replace('/subscription');
      }
      return;
    }
    
    // Non-signed-in users: check 7-day trial
    const trial = await getLocalTrialStatus();
    if (trial.isExpired) {
      router.replace('/auth-sign-in');
    }
    return;
  }
  try {
    const isPro = await checkProStatus();
    if (!isPro) return;
  } catch (error) {
    console.error('Error checking trial expiration:', error);
  }
};

/**
 * Get subscription status message for UI
 */
export const getSubscriptionStatus = async (): Promise<string> => {
  try {
    const isPro = await checkProStatus();
    if (isPro) return 'Pro Active';

    const trialStatus = await getTrialStatus();
    if (trialStatus.isTrialActive) {
      const days = trialStatus.daysRemaining;
      return days === 1 ? '1 day left in trial' : `${days} days left in trial`;
    }

    return 'Upgrade Required';
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return 'Status Unknown';
  }
};

/**
 * Get detailed subscription information for UI display
 */
export const getSubscriptionInfo = async (): Promise<{
  isPro: boolean;
  isTrialActive: boolean;
  daysRemaining: number | null;
  statusMessage: string;
  userEmail: string | null;
}> => {
  if (FREE_MODE) {
    const userEmail = await getCurrentUserEmail();
    const signedIn = await isUserSignedIn();
    if (signedIn) {
      return { isPro: true, isTrialActive: false, daysRemaining: null, statusMessage: 'Free Access', userEmail };
    }
    // Non-signed-in user: show local trial status
    const trial = await getLocalTrialStatus();
    if (trial.isExpired) {
      return { isPro: false, isTrialActive: false, daysRemaining: 0, statusMessage: 'Trial Expired - Sign Up Free', userEmail: null };
    }
    return { isPro: true, isTrialActive: true, daysRemaining: trial.daysRemaining, statusMessage: `${trial.daysRemaining} days left - Sign up for free access`, userEmail: null };
  }
  try {
    const isPro = await checkProStatus();
    const trialStatus = await getTrialStatus();
    const userEmail = await getCurrentUserEmail();
    const statusMessage = await getSubscriptionStatus();
    
    return {
      isPro,
      isTrialActive: trialStatus.isTrialActive,
      daysRemaining: trialStatus.daysRemaining,
      statusMessage,
      userEmail,
    };
  } catch (error) {
    console.error('Error getting subscription info:', error);
    return {
      isPro: false,
      isTrialActive: false,
      daysRemaining: null,
      statusMessage: 'Status Unknown',
      userEmail: null,
    };
  }
};

/**
 * Create a trial subscription for a user if they don't have one
 * This should be called after successful sign-in/sign-up
 */
export const createTrialIfNeeded = async (userId: string): Promise<void> => {
  try {
    // Check if user already has a subscription record
    const { data: existingSub, error: checkError } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected for new users
      console.error('Error checking existing subscription:', checkError);
      return;
    }

    // If user already has a subscription, don't create a new one
    if (existingSub) {
      console.log('User already has subscription:', existingSub.status);
      return;
    }

    // Create a new trial subscription (90 days = 3 months for signed-up users)
    const trialStartDate = new Date();
    const trialEndDate = new Date(Date.now() + SIGNED_UP_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { error: insertError } = await supabase.from('subscriptions').insert({
      user_id: userId,
      status: 'trialing',
      current_period_start: trialStartDate.toISOString(),
      current_period_end: trialEndDate.toISOString(),
    });

    if (insertError) {
      console.error('Error creating trial subscription:', insertError);
      return;
    }

    // Also set the local signed-up trial start date for client-side tracking
    await SecureStorage.setItem(SIGNED_UP_TRIAL_START_KEY, trialStartDate.getTime().toString());
    console.log('Trial subscription created for user:', userId, 'with 3-month local tracking');
  } catch (error) {
    console.error('Error in createTrialIfNeeded:', error);
  }
};

/**
 * Get current trial status
 */
export const getTrialStatusFromDb = async (): Promise<TrialStatus> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        isTrialActive: false,
        trialStartDate: null,
        trialEndDate: null,
        daysRemaining: null,
        isExpired: false,
      };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_start, current_period_end')
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return {
        isTrialActive: false,
        trialStartDate: null,
        trialEndDate: null,
        daysRemaining: null,
        isExpired: false,
      };
    }

    const isTrialActive = data.status === 'trialing';
    const trialStartDate = data.current_period_start ? new Date(data.current_period_start).getTime() : null;
    const trialEndDate = data.current_period_end ? new Date(data.current_period_end).getTime() : null;
    const daysRemaining = isTrialActive && trialEndDate
      ? Math.max(0, Math.ceil((trialEndDate - Date.now()) / (24 * 60 * 60 * 1000)))
      : null;

    return {
      isTrialActive,
      trialStartDate,
      trialEndDate,
      daysRemaining,
      isExpired: false,
    };
  } catch (error) {
    console.error('Error getting trial status:', error);
    return {
      isTrialActive: false,
      trialStartDate: null,
      trialEndDate: null,
      daysRemaining: null,
      isExpired: false,
    };
  }
};
