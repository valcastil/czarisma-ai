// utils/security.ts - Input validation and sanitization utilities

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { 
  valid: boolean; 
  message: string;
  strength: 'weak' | 'medium' | 'strong';
} => {
  if (!password) {
    return { valid: false, message: 'Password is required', strength: 'weak' };
  }

  if (password.length < 12) {
    return { 
      valid: false, 
      message: 'Password must be at least 12 characters', 
      strength: 'weak' 
    };
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (!hasLowercase) {
    return { 
      valid: false, 
      message: 'Password must contain lowercase letters', 
      strength: 'weak' 
    };
  }

  if (!hasUppercase) {
    return { 
      valid: false, 
      message: 'Password must contain uppercase letters', 
      strength: 'weak' 
    };
  }

  if (!hasNumber) {
    return { 
      valid: false, 
      message: 'Password must contain numbers', 
      strength: 'medium' 
    };
  }

  if (!hasSpecial) {
    return { 
      valid: false, 
      message: 'Password must contain special characters (!@#$%^&*)', 
      strength: 'medium' 
    };
  }

  // Check for common patterns
  const commonPatterns = ['123456', 'password', 'qwerty', 'abc123'];
  const lowerPassword = password.toLowerCase();
  
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      return { 
        valid: false, 
        message: 'Password contains common patterns. Please choose a stronger password.', 
        strength: 'weak' 
      };
    }
  }

  return { valid: true, message: 'Password is strong', strength: 'strong' };
};

/**
 * Sanitize SQL input to prevent SQL injection
 */
export const sanitizeSQL = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/['";]/g, '') // Remove SQL special chars
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '') // Remove extended stored procedures
    .replace(/sp_/gi, '') // Remove stored procedures
    .trim();
};

/**
 * Validate URL format and protocol
 */
export const validateURL = (url: string): boolean => {
  if (!url) return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Sanitize filename to prevent directory traversal
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return '';
  
  return filename
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .substring(0, 255); // Limit length
};

/**
 * Rate limiting helper - tracks attempts per user/IP
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}
  
  check(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);
    
    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetIn: this.windowMs,
      };
    }
    
    if (record.count >= this.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: record.resetTime - now,
      };
    }
    
    record.count++;
    
    return {
      allowed: true,
      remaining: this.maxAttempts - record.count,
      resetIn: record.resetTime - now,
    };
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

/**
 * Check if input contains potential security threats
 */
export const detectSecurityThreats = (input: string): {
  isSafe: boolean;
  threats: string[];
} => {
  const threats: string[] = [];
  
  // Check for XSS attempts
  if (/<script|javascript:|onerror=|onload=/i.test(input)) {
    threats.push('Potential XSS attack detected');
  }
  
  // Check for SQL injection attempts
  if (/(\bOR\b|\bAND\b).*[=<>]|union.*select|drop.*table/i.test(input)) {
    threats.push('Potential SQL injection detected');
  }
  
  // Check for path traversal
  if (/\.\.\/|\.\.\\/.test(input)) {
    threats.push('Potential path traversal detected');
  }
  
  // Check for command injection
  if (/[;&|`$()]/.test(input)) {
    threats.push('Potential command injection detected');
  }
  
  return {
    isSafe: threats.length === 0,
    threats,
  };
};
