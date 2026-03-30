// Vexo Analytics Wrapper
// Note: Update this file with correct Vexo API once documentation is available

const VEXO_API_KEY = process.env.EXPO_PUBLIC_VEXO_API_KEY || '';

let vexoInitialized = false;

/**
 * Initialize Vexo Analytics
 */
export const initializeVexo = () => {
  if (!VEXO_API_KEY) {
    console.warn('Vexo Analytics API key not found. Analytics will be disabled.');
    return false;
  }

  if (!vexoInitialized) {
    try {
      // TODO: Initialize vexo with correct API when documentation is available
      // For now, we'll log events to console in development
      vexoInitialized = true;
      console.log('Vexo Analytics initialized successfully');
    } catch (error) {
      console.error('Error initializing Vexo Analytics:', error);
      return false;
    }
  }

  return true;
};

/**
 * Internal tracking function
 */
const trackEvent = (eventName: string, properties: Record<string, any>) => {
  if (!vexoInitialized) return;

  try {
    // TODO: Replace with actual Vexo API call
    if (__DEV__) {
      console.log(`[Vexo Analytics] ${eventName}`, properties);
    }
    // When Vexo API is available, call it here:
    // vexo.track(eventName, properties);
  } catch (error) {
    console.error(`Error tracking ${eventName}:`, error);
  }
};

/**
 * Track screen view
 */
export const trackScreenView = (screenName: string, params?: Record<string, any>) => {
  trackEvent('screen_view', {
    screen_name: screenName,
    ...params,
  });
};

/**
 * Track charisma entry creation
 */
export const trackCharismaEntry = (charismaType: string, emotions: string[]) => {
  trackEvent('charisma_entry_created', {
    charisma_type: charismaType,
    emotions: emotions.join(','),
    emotion_count: emotions.length,
  });
};

/**
 * Track user authentication
 */
export const trackAuth = (action: 'sign_in' | 'sign_up' | 'sign_out', method?: string) => {
  trackEvent(`user_${action}`, {
    method: method || 'email',
    timestamp: Date.now(),
  });
};

/**
 * Track subscription events
 */
export const trackSubscription = (
  action: 'started' | 'cancelled' | 'renewed' | 'trial_started',
  plan?: string
) => {
  trackEvent(`subscription_${action}`, {
    plan: plan || 'pro',
    timestamp: Date.now(),
  });
};

/**
 * Track message sent
 */
export const trackMessage = (recipientId: string, hasAI: boolean = false) => {
  trackEvent('message_sent', {
    recipient_id: recipientId,
    ai_assisted: hasAI,
    timestamp: Date.now(),
  });
};

/**
 * Track search performed
 */
export const trackSearch = (query: string, resultsCount: number) => {
  trackEvent('search_performed', {
    query_length: query.length,
    results_count: resultsCount,
    timestamp: Date.now(),
  });
};

/**
 * Track profile update
 */
export const trackProfileUpdate = (fields: string[]) => {
  trackEvent('profile_updated', {
    fields_updated: fields.join(','),
    field_count: fields.length,
    timestamp: Date.now(),
  });
};

/**
 * Track AI feature usage
 */
export const trackAIUsage = (feature: string, success: boolean) => {
  trackEvent('ai_feature_used', {
    feature_name: feature,
    success: success,
    timestamp: Date.now(),
  });
};

/**
 * Track error events
 */
export const trackError = (errorType: string, errorMessage: string, context?: string) => {
  trackEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage,
    context: context || 'unknown',
    timestamp: Date.now(),
  });
};

/**
 * Set user properties
 */
export const setUserProperties = (properties: Record<string, any>) => {
  if (!vexoInitialized) return;

  try {
    // TODO: Replace with actual Vexo API call
    if (__DEV__) {
      console.log('[Vexo Analytics] Set User Properties', properties);
    }
    // vexo.setUserProperties(properties);
  } catch (error) {
    console.error('Error setting user properties:', error);
  }
};

/**
 * Identify user
 */
export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (!vexoInitialized) return;

  try {
    // TODO: Replace with actual Vexo API call
    if (__DEV__) {
      console.log('[Vexo Analytics] Identify User', userId, traits);
    }
    // vexo.identify(userId, traits);
  } catch (error) {
    console.error('Error identifying user:', error);
  }
};
