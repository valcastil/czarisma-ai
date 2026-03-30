// utils/logger.ts - Secure logging utility
const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors to console, even in production for debugging
    console.error(...args);
    // In production, send to error tracking service (Sentry, etc.)
    // TODO: Implement Sentry error tracking
  },
  
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  // Never log sensitive data - always redact in production
  sensitive: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(message, '[REDACTED]');
    }
  },
  
  // Log security events (should be sent to monitoring service)
  security: (event: string, details?: any) => {
    if (isDevelopment) {
      console.warn('🔒 SECURITY:', event, details);
    }
    // TODO: Send to security monitoring service
  },

  // Production-safe error with detailed context
  productionError: (context: string, error: any, additionalInfo?: any) => {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || error?.status || 'UNKNOWN';
    
    console.error(`[${context}] Error:`, {
      message: errorMessage,
      code: errorCode,
      additional: additionalInfo,
      stack: isDevelopment ? error?.stack : undefined,
    });
    
    // Return formatted error info for user display
    return {
      context,
      message: errorMessage,
      code: errorCode,
      userMessage: getUserFriendlyMessage(context, errorCode, errorMessage),
    };
  },
};

// Helper to generate user-friendly error messages
function getUserFriendlyMessage(context: string, code: string, message: string): string {
  // Network errors
  if (message.includes('network') || message.includes('fetch') || code === 'NETWORK_ERROR') {
    return 'Network connection issue. Please check your internet and try again.';
  }
  
  // Auth errors
  if (message.includes('session') || message.includes('auth') || code === 'PGRST301') {
    return 'Session expired. Please sign in again.';
  }
  
  // Permission errors
  if (code === 'PGRST116' || code === '42501' || message.includes('permission')) {
    return 'You don\'t have permission to perform this action.';
  }
  
  // Database constraint errors
  if (code === '23503' || message.includes('foreign key')) {
    return 'Unable to complete action. Please ensure your profile is set up correctly.';
  }
  
  // Timeout errors
  if (message.includes('timeout') || code === 'ETIMEDOUT') {
    return 'Request timed out. Please try again.';
  }
  
  // Generic fallback
  return `Unable to ${context}. Please try again.`;
}
