# 🔐 Comprehensive Security Implementation Guide

## 🚨 CRITICAL VULNERABILITIES FOUND

### 1. **EXPOSED CREDENTIALS** ⚠️
- `.env` file is NOT in `.gitignore` - Your SMTP password is visible in git!
- Hardcoded Supabase keys in source code (`lib/supabase.ts`)
- API keys committed to repository

### 2. **WEAK AUTHENTICATION**
- Minimum password length: 6 characters (should be 12+)
- No password complexity requirements
- No Multi-Factor Authentication (MFA)
- Anonymous sign-ins disabled but not properly secured

### 3. **INSUFFICIENT RATE LIMITING**
- Only 2 emails per hour (too restrictive for legitimate use)
- No protection against brute force attacks
- Missing CAPTCHA on auth endpoints

### 4. **DATA EXPOSURE**
- Console.log statements in production code
- Error messages revealing system information
- No input sanitization

---

## 🛡️ SECURITY MEASURES TO IMPLEMENT

### PHASE 1: IMMEDIATE CRITICAL FIXES (Do This NOW!)

#### 1.1 Fix .gitignore to Protect Secrets

**Action Required:** Update `.gitignore` to include all environment files.

Add these lines to `.gitignore`:
```gitignore
# Environment files - NEVER commit these!
.env
.env.local
.env.production
.env.development
.env*.local
*.env

# Sensitive credentials
credentials.json
*.jks
*.p8
*.p12
*.key
*.pem
*.mobileprovision

# Supabase secrets
supabase/.env
supabase/.env.local
```

**URGENT:** If you've already committed `.env`:
```bash
# Remove from git history
git rm --cached .env
git rm --cached .env.local
git commit -m "Remove sensitive files"

# Rotate ALL credentials immediately:
# 1. Change SMTP password in Hostinger
# 2. Regenerate Supabase anon key
# 3. Regenerate Stripe keys
# 4. Update .env with new credentials
```

#### 1.2 Move Hardcoded Keys to Environment Variables

**Current Issue:** `lib/supabase.ts` has hardcoded keys

**Fix Required:**
```typescript
// lib/supabase.ts - SECURE VERSION
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get credentials from environment variables - NEVER hardcode!
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

Update `app.json` or create `app.config.js`:
```javascript
// app.config.js
export default {
  expo: {
    // ... existing config
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    },
  },
};
```

#### 1.3 Remove Production Console.log Statements

**Security Risk:** Console logs expose sensitive data to attackers

Create `utils/logger.ts`:
```typescript
// utils/logger.ts
const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // In production, send to error tracking service (Sentry, etc.)
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  // Never log sensitive data
  sensitive: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(message, '[REDACTED]');
    }
  },
};
```

Replace all `console.log` with `logger.log` throughout the app.

---

### PHASE 2: AUTHENTICATION SECURITY

#### 2.1 Strengthen Password Requirements

Update `supabase/config.toml`:
```toml
[auth]
# Increase minimum password length
minimum_password_length = 12

# Require strong passwords
password_requirements = "lower_upper_letters_digits_symbols"
```

Add client-side validation in `app/auth-sign-in.tsx`:
```typescript
const validatePassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain lowercase letters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain uppercase letters' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain numbers' };
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain special characters' };
  }
  return { valid: true, message: '' };
};
```

#### 2.2 Enable Multi-Factor Authentication (MFA)

Update `supabase/config.toml`:
```toml
[auth.mfa]
max_enrolled_factors = 10

[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

Create MFA enrollment screen:
```typescript
// app/mfa-setup.tsx
import { supabase } from '@/lib/supabase';

const enrollMFA = async () => {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  });
  
  if (error) {
    logger.error('MFA enrollment error:', error);
    return;
  }
  
  // Show QR code to user
  const { qr_code, secret } = data;
  // Display QR code for user to scan with authenticator app
};
```

#### 2.3 Implement CAPTCHA Protection

Update `supabase/config.toml`:
```toml
[auth.captcha]
enabled = true
provider = "turnstile"  # or "hcaptcha"
secret = "env(CAPTCHA_SECRET)"
```

Add to `.env`:
```env
CAPTCHA_SECRET=your_captcha_secret_key
EXPO_PUBLIC_CAPTCHA_SITE_KEY=your_captcha_site_key
```

#### 2.4 Improve Rate Limiting

Update `supabase/config.toml`:
```toml
[auth.rate_limit]
# Increase email limit for legitimate use
email_sent = 10

# Strengthen brute force protection
sign_in_sign_ups = 5  # Reduced from 30

# Add stricter token verification
token_verifications = 10  # Reduced from 30
```

---

### PHASE 3: DATA SECURITY

#### 3.1 Implement Row Level Security (RLS)

Create `supabase/migrations/001_enable_rls.sql`:
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own data
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

-- Prevent SQL injection
CREATE POLICY "Prevent malicious queries"
  ON entries FOR ALL
  USING (
    user_id IS NOT NULL AND
    user_id = auth.uid()
  );
```

#### 3.2 Input Validation & Sanitization

Create `utils/security.ts`:
```typescript
// utils/security.ts
export const sanitizeInput = (input: string): string => {
  // Remove potential XSS attacks
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const sanitizeSQL = (input: string): string => {
  // Prevent SQL injection
  return input
    .replace(/['";]/g, '') // Remove SQL special chars
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comments
    .trim();
};

export const validateURL = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

Use in auth screen:
```typescript
import { sanitizeInput, validateEmail } from '@/utils/security';

const handleAuth = async () => {
  // Sanitize inputs
  const cleanEmail = sanitizeInput(email).toLowerCase();
  const cleanPassword = sanitizeInput(password);
  
  // Validate email
  if (!validateEmail(cleanEmail)) {
    Alert.alert('Error', 'Invalid email format');
    return;
  }
  
  // Continue with auth...
};
```

#### 3.3 Secure Data Storage

Create `utils/secure-storage.ts`:
```typescript
// utils/secure-storage.ts
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Web fallback - encrypt before storing
      localStorage.setItem(key, btoa(value));
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      const value = localStorage.getItem(key);
      return value ? atob(value) : null;
    } else {
      return await SecureStore.getItemAsync(key);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
```

Install required package:
```bash
npx expo install expo-secure-store
```

---

### PHASE 4: NETWORK SECURITY

#### 4.1 Enable SSL/TLS Pinning

Create `utils/network-security.ts`:
```typescript
// utils/network-security.ts
export const secureHeaders = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export const makeSecureRequest = async (url: string, options: RequestInit = {}) => {
  // Validate URL
  if (!url.startsWith('https://')) {
    throw new Error('Only HTTPS requests are allowed');
  }

  // Add security headers
  const secureOptions: RequestInit = {
    ...options,
    headers: {
      ...secureHeaders,
      ...options.headers,
    },
  };

  return fetch(url, secureOptions);
};
```

#### 4.2 Implement Request Signing

```typescript
// utils/request-signing.ts
import { supabase } from '@/lib/supabase';

export const signRequest = async (data: any): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session');
  }

  // Create signature using JWT
  const timestamp = Date.now();
  const payload = JSON.stringify({ ...data, timestamp });
  
  return btoa(payload + session.access_token.substring(0, 32));
};

export const verifyRequest = (signature: string, data: any): boolean => {
  // Verify request hasn't been tampered with
  const maxAge = 5 * 60 * 1000; // 5 minutes
  const { timestamp } = data;
  
  return Date.now() - timestamp < maxAge;
};
```

---

### PHASE 5: MONITORING & INCIDENT RESPONSE

#### 5.1 Implement Security Logging

Create `utils/security-logger.ts`:
```typescript
// utils/security-logger.ts
import { supabase } from '@/lib/supabase';

export const logSecurityEvent = async (event: {
  type: 'auth_failure' | 'suspicious_activity' | 'rate_limit' | 'invalid_input';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  metadata?: any;
}) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    await supabase.from('security_logs').insert({
      event_type: event.type,
      severity: event.severity,
      details: event.details,
      metadata: event.metadata,
      user_id: session?.user?.id || null,
      ip_address: await getClientIP(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Don't let logging errors break the app
    logger.error('Failed to log security event:', error);
  }
};

const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};
```

Create security logs table:
```sql
-- supabase/migrations/002_security_logs.sql
CREATE TABLE security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  details TEXT NOT NULL,
  metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_security_logs_timestamp ON security_logs(timestamp DESC);
CREATE INDEX idx_security_logs_user ON security_logs(user_id);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);

-- Enable RLS
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Only admins can view security logs"
  ON security_logs FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

#### 5.2 Implement Anomaly Detection

```typescript
// utils/anomaly-detection.ts
import { logSecurityEvent } from './security-logger';

export const detectAnomalies = async (action: string, metadata: any) => {
  // Track failed login attempts
  if (action === 'login_failed') {
    const attempts = await getFailedAttempts(metadata.email);
    
    if (attempts >= 5) {
      await logSecurityEvent({
        type: 'auth_failure',
        severity: 'high',
        details: `Multiple failed login attempts for ${metadata.email}`,
        metadata: { attempts, email: metadata.email },
      });
      
      // Lock account temporarily
      await lockAccount(metadata.email, 15); // 15 minutes
    }
  }
  
  // Detect unusual activity patterns
  if (action === 'data_access') {
    const accessRate = await getAccessRate(metadata.userId);
    
    if (accessRate > 100) { // More than 100 requests per minute
      await logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'critical',
        details: 'Unusual access pattern detected',
        metadata: { userId: metadata.userId, rate: accessRate },
      });
    }
  }
};
```

---

### PHASE 6: PRODUCTION HARDENING

#### 6.1 Security Checklist

```markdown
# Pre-Production Security Checklist

## Environment & Secrets
- [ ] All API keys moved to environment variables
- [ ] `.env` files added to `.gitignore`
- [ ] All credentials rotated after any exposure
- [ ] Secrets stored in secure vault (not in code)
- [ ] Environment variables validated on startup

## Authentication
- [ ] Strong password requirements (12+ chars, complexity)
- [ ] MFA enabled for all users
- [ ] CAPTCHA enabled on auth endpoints
- [ ] Rate limiting configured
- [ ] Session timeout configured (1 hour)
- [ ] Email verification required
- [ ] Account lockout after failed attempts

## Data Security
- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention
- [ ] XSS protection implemented
- [ ] CSRF tokens on sensitive operations
- [ ] Data encrypted at rest
- [ ] Data encrypted in transit (HTTPS only)

## Network Security
- [ ] HTTPS enforced everywhere
- [ ] SSL/TLS certificate valid
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] API endpoints authenticated
- [ ] Request signing implemented

## Code Security
- [ ] No console.log in production
- [ ] No hardcoded secrets
- [ ] Dependencies updated (no vulnerabilities)
- [ ] Code obfuscation enabled
- [ ] Source maps disabled in production
- [ ] Debug mode disabled

## Monitoring
- [ ] Security logging enabled
- [ ] Anomaly detection active
- [ ] Error tracking configured (Sentry)
- [ ] Audit logs for sensitive operations
- [ ] Alerts for security events

## Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance (if applicable)
- [ ] Data retention policy defined
- [ ] User data export functionality
- [ ] User data deletion functionality
```

#### 6.2 Install Security Dependencies

```bash
# Install security packages
npx expo install expo-secure-store
npm install @sentry/react-native
npm install react-native-device-info

# Install code obfuscation (production builds)
npm install --save-dev javascript-obfuscator
```

Update `package.json`:
```json
{
  "scripts": {
    "build:secure": "expo build:android --release-channel production && npm run obfuscate",
    "obfuscate": "javascript-obfuscator ./dist --output ./dist-obfuscated"
  }
}
```

---

## 🚀 IMPLEMENTATION PRIORITY

### **CRITICAL (Do Immediately)**
1. ✅ Fix `.gitignore` to exclude `.env`
2. ✅ Remove hardcoded API keys
3. ✅ Rotate all exposed credentials
4. ✅ Remove production console.log statements

### **HIGH (This Week)**
5. ✅ Strengthen password requirements
6. ✅ Enable MFA
7. ✅ Implement RLS policies
8. ✅ Add input validation

### **MEDIUM (This Month)**
9. ✅ Enable CAPTCHA
10. ✅ Implement security logging
11. ✅ Add anomaly detection
12. ✅ Set up monitoring

### **ONGOING**
13. ✅ Regular security audits
14. ✅ Dependency updates
15. ✅ Penetration testing
16. ✅ User security training

---

## 📊 SECURITY METRICS TO TRACK

1. **Failed login attempts per hour**
2. **Account lockouts**
3. **Suspicious activity alerts**
4. **API rate limit hits**
5. **Data access patterns**
6. **Session duration**
7. **MFA adoption rate**

---

## 🆘 INCIDENT RESPONSE PLAN

### If Credentials Are Compromised:
1. **Immediately** rotate all API keys
2. Invalidate all user sessions
3. Force password reset for all users
4. Review security logs for unauthorized access
5. Notify affected users
6. Document the incident

### If Data Breach Detected:
1. Isolate affected systems
2. Preserve evidence
3. Assess scope of breach
4. Notify authorities (if required by law)
5. Notify affected users
6. Implement fixes
7. Conduct post-mortem

---

## 📚 ADDITIONAL RESOURCES

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/security)
- [React Native Security](https://reactnative.dev/docs/security)
- [Expo Security](https://docs.expo.dev/guides/security/)

---

## ⚠️ LEGAL DISCLAIMER

This guide provides security recommendations but does not guarantee complete protection. Security is an ongoing process requiring regular updates, monitoring, and adaptation to new threats.
