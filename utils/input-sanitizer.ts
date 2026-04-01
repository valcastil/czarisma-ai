/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

// HTML entities for XSS protection
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// SQL injection patterns to detect and remove
const SQL_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(--|\/\*|\*\/|;|'|")/g,
  /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
  /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
];

/**
 * Escape HTML entities to prevent XSS
 */
export const escapeHtml = (text: string): string => {
  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char]);
};

/**
 * Remove potential SQL injection patterns
 */
export const sanitizeSql = (text: string): string => {
  let sanitized = text;
  SQL_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  return sanitized.trim();
};

/**
 * Comprehensive sanitization for user input
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

  // Remove SQL injection patterns
  sanitized = sanitizeSql(sanitized);

  // Escape HTML entities
  sanitized = escapeHtml(sanitized);

  // Limit length to prevent DoS attacks
  const MAX_LENGTH = 10000;
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized;
};

/**
 * Sanitize message content specifically
 */
export const sanitizeMessage = (message: string): string => {
  if (!message || typeof message !== 'string') {
    return '';
  }

  // Allow common message characters but sanitize dangerous ones
  let sanitized = message;

  // Remove script tags and event handlers
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*["']?[^"']*["']?/gi, '');

  // Remove potential XSS patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');

  // Apply general sanitization
  return sanitizeInput(sanitized);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize username (allow only alphanumeric, underscore, hyphen)
 */
export const sanitizeUsername = (username: string): string => {
  return username.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30);
};

/**
 * Sanitize URL to prevent XSS
 */
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove javascript: and data: protocols
  url = url.replace(/^(javascript|data|vbscript):/i, '');

  // Ensure URL starts with http:// or https://
  if (!url.match(/^https?:\/\//)) {
    url = 'https://' + url;
  }

  return url;
};
