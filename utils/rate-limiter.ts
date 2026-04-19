import { SecureStorage } from '@/utils/secure-storage';

/**
 * Rate limiting utilities to prevent brute force attacks
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

const RATE_LIMIT_KEYS = {
  LOGIN: '@auth_rate_limit_login',
  SIGNUP: '@auth_rate_limit_signup',
  PHONE_LOGIN: '@auth_rate_limit_phone_login',
  PHONE_SIGNUP: '@auth_rate_limit_phone_signup',
  PASSWORD_RESET: '@auth_rate_limit_password_reset',
  MESSAGE: '@message_rate_limit',
} as const;

const RATE_LIMIT_CONFIG = {
  LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  SIGNUP: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  PHONE_LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  PHONE_SIGNUP: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  PASSWORD_RESET: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  MESSAGE: { maxAttempts: 30, windowMs: 60 * 1000 }, // 30 messages per minute
} as const;

/**
 * Get rate limit record from storage
 */
const getRateLimitRecord = async (key: string): Promise<AttemptRecord | null> => {
  try {
    const data = await SecureStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

/**
 * Save rate limit record to storage
 */
const saveRateLimitRecord = async (key: string, record: AttemptRecord): Promise<void> => {
  try {
    await SecureStorage.setItem(key, JSON.stringify(record));
  } catch (error) {
    console.error('Error saving rate limit record:', error);
  }
};

/**
 * Check if action is rate limited
 */
export const isRateLimited = async (
  action: keyof typeof RATE_LIMIT_KEYS,
  identifier?: string
): Promise<{ isLimited: boolean; remainingAttempts?: number; resetTime?: number }> => {
  const config = RATE_LIMIT_CONFIG[action];
  const storageKey = identifier 
    ? `${RATE_LIMIT_KEYS[action]}_${identifier}`
    : RATE_LIMIT_KEYS[action];

  const now = Date.now();
  const record = await getRateLimitRecord(storageKey);

  // No previous attempts
  if (!record) {
    return { isLimited: false, remainingAttempts: config.maxAttempts };
  }

  // Check if window has expired
  if (now - record.firstAttempt > config.windowMs) {
    // Window expired, reset counter
    await SecureStorage.removeItem(storageKey);
    return { isLimited: false, remainingAttempts: config.maxAttempts };
  }

  // Check if rate limit exceeded
  if (record.count >= config.maxAttempts) {
    const resetTime = record.firstAttempt + config.windowMs;
    return { 
      isLimited: true, 
      remainingAttempts: 0,
      resetTime 
    };
  }

  // Under the limit
  const remainingAttempts = config.maxAttempts - record.count;
  return { isLimited: false, remainingAttempts };
};

/**
 * Record an attempt for rate limiting
 */
export const recordAttempt = async (
  action: keyof typeof RATE_LIMIT_KEYS,
  identifier?: string
): Promise<void> => {
  const storageKey = identifier 
    ? `${RATE_LIMIT_KEYS[action]}_${identifier}`
    : RATE_LIMIT_KEYS[action];

  const now = Date.now();
  const record = await getRateLimitRecord(storageKey);

  if (!record) {
    // First attempt
    await saveRateLimitRecord(storageKey, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
  } else {
    // Increment counter
    await saveRateLimitRecord(storageKey, {
      count: record.count + 1,
      firstAttempt: record.firstAttempt,
      lastAttempt: now,
    });
  }
};

/**
 * Reset rate limit for a specific action/identifier
 */
export const resetRateLimit = async (
  action: keyof typeof RATE_LIMIT_KEYS,
  identifier?: string
): Promise<void> => {
  const storageKey = identifier 
    ? `${RATE_LIMIT_KEYS[action]}_${identifier}`
    : RATE_LIMIT_KEYS[action];
  
  await SecureStorage.removeItem(storageKey);
};

/**
 * Get rate limit status for UI display
 */
export const getRateLimitStatus = async (
  action: keyof typeof RATE_LIMIT_KEYS,
  identifier?: string
): Promise<{
  attempts: number;
  maxAttempts: number;
  remainingAttempts: number;
  resetTime?: number;
  isLimited: boolean;
}> => {
  const config = RATE_LIMIT_CONFIG[action];
  const storageKey = identifier 
    ? `${RATE_LIMIT_KEYS[action]}_${identifier}`
    : RATE_LIMIT_KEYS[action];

  const now = Date.now();
  const record = await getRateLimitRecord(storageKey);

  if (!record) {
    return {
      attempts: 0,
      maxAttempts: config.maxAttempts,
      remainingAttempts: config.maxAttempts,
      isLimited: false,
    };
  }

  // Check if window has expired
  if (now - record.firstAttempt > config.windowMs) {
    await SecureStorage.removeItem(storageKey);
    return {
      attempts: 0,
      maxAttempts: config.maxAttempts,
      remainingAttempts: config.maxAttempts,
      isLimited: false,
    };
  }

  const isLimited = record.count >= config.maxAttempts;
  const remainingAttempts = Math.max(0, config.maxAttempts - record.count);
  const resetTime = isLimited ? record.firstAttempt + config.windowMs : undefined;

  return {
    attempts: record.count,
    maxAttempts: config.maxAttempts,
    remainingAttempts,
    resetTime,
    isLimited,
  };
};
