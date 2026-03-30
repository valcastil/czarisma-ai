import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRO_STATUS_KEY = '@pro_status';
const TRIAL_START_KEY = '@trial_start_date';
const PRO_EMAIL_KEY = '@pro_email';
const TRIAL_DURATION_DAYS = 30;

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
 * Force-refresh cached Pro status from Supabase.
 * Use this on app start and after sign-in so production builds immediately reflect
 * the latest subscription state.
 */
export const refreshProStatus = async (): Promise<boolean> => {
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
  try {
    // First check local storage for cached status
    const cachedStatus = await AsyncStorage.getItem(PRO_STATUS_KEY);
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
    await AsyncStorage.setItem(PRO_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('Error saving pro status:', error);
  }
};

/**
 * Clear cached Pro status (call after sign out or subscription changes)
 */
export const clearProStatus = async () => {
  try {
    await AsyncStorage.removeItem(PRO_STATUS_KEY);
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
export const isProCharisma = (charismaId: string): boolean => {
  return PRO_CHARISMA_IDS.includes(charismaId);
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
      await AsyncStorage.setItem(PRO_EMAIL_KEY, emailToCheck.toLowerCase());
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
    const isPro = await AsyncStorage.getItem(proKey);
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
    const trialData = await AsyncStorage.getItem(trialKey);
    
    if (!trialData) {
      // Default trial status for new users
      const defaultTrial = {
        isTrialActive: true,
        trialStartDate: Date.now(),
        trialEndDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
        daysRemaining: 30,
        isExpired: false,
      };
      await AsyncStorage.setItem(trialKey, JSON.stringify(defaultTrial));
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
 * Check trial expiration and redirect if needed
 * Call this on app startup and major screen navigation
 */
export const checkTrialExpirationAndRedirect = async (router: any): Promise<void> => {
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

    // Create a new trial subscription (30 days)
    const trialStartDate = new Date();
    const trialEndDate = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

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

    console.log('Trial subscription created for user:', userId);
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
