import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { isRateLimited, recordAttempt } from '@/utils/rate-limiter';
import { detectSecurityThreats, sanitizeInput, validateEmail, validatePassword } from '@/utils/security';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Determine if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export default function AuthSignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP verification state
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '', '', '']);
  const [signUpEmail, setSignUpEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Check rate limiting
    const action = isSignUp ? 'SIGNUP' : 'LOGIN';
    const rateLimitStatus = await isRateLimited(action, email);
    
    if (rateLimitStatus.isLimited) {
      const resetTime = new Date(rateLimitStatus.resetTime!).toLocaleTimeString();
      Alert.alert(
        'Too Many Attempts',
        `Please try again later. You can attempt again after ${resetTime}.`
      );
      return;
    }

    // Sanitize and validate inputs
    const cleanEmail = sanitizeInput(email).toLowerCase().trim();
    const cleanPassword = sanitizeInput(password);

    // Validate email format
    if (!validateEmail(cleanEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    // Check for security threats
    const emailThreat = detectSecurityThreats(cleanEmail);
    const passwordThreat = detectSecurityThreats(cleanPassword);
    
    if (!emailThreat.isSafe || !passwordThreat.isSafe) {
      logger.security('Security threat detected in auth input', {
        emailThreats: emailThreat.threats,
        passwordThreats: passwordThreat.threats,
      });
      Alert.alert('Invalid Input', 'Please enter valid credentials');
      return;
    }

    // Validate password strength for sign up
    if (isSignUp) {
      const passwordValidation = validatePassword(cleanPassword);
      if (!passwordValidation.valid) {
        Alert.alert('Weak Password', passwordValidation.message);
        return;
      }
    } else {
      // Minimum check for sign in
      if (cleanPassword.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters');
        return;
      }
    }

    try {
      setLoading(true);
      
      // Record authentication attempt for rate limiting
      await recordAttempt(action, email);

      if (isSignUp) {
        // Send Magic Link OTP first — do NOT call signUp() which triggers a confirmation link email
        // shouldCreateUser: true will create the account if it doesn't exist yet
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: true },
        });

        if (otpError) {
          // If user already exists, let them sign in
          if (otpError.message?.includes('already registered') || otpError.message?.includes('already exists')) {
            Alert.alert(
              'Account Exists',
              'An account with this email already exists. Please sign in instead.',
              [{ text: 'Sign In', onPress: () => setIsSignUp(false) }]
            );
            return;
          }
          throw otpError;
        }

        // Store password so we can set it after OTP verification
        setSignUpEmail(cleanEmail);
        setPendingPassword(cleanPassword);
        setOtpCode(['', '', '', '', '', '', '', '']);
        setShowOtpVerification(true);
        startResendCooldown();
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (error) throw error;

        if (data.user) {
          console.log('Email sign-in successful, restoring user data...');
          // Restore user data from Supabase
          const { restoreUserDataFromSupabase } = await import('@/utils/auth-utils');
          const restoreResult = await restoreUserDataFromSupabase();
          console.log('Restore result:', restoreResult);
          
          // Create trial subscription if user doesn't have one
          const { createTrialIfNeeded } = await import('@/utils/subscription-utils');
          await createTrialIfNeeded(data.user.id);
          
          // Navigate to home screen
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      logger.warn('Auth error:', error?.message || error);
      
      // Handle specific error cases
      let errorTitle = 'Authentication Error';
      let errorMessage = 'Failed to authenticate. Please try again.';
      
      try {
        // Safely extract error message
        const errorMsg = error?.message || error?.error_description || error?.msg || '';
        
        if (errorMsg) {
          errorMessage = errorMsg;
          
          if (errorMsg.includes('Email not confirmed')) {
            errorTitle = 'Email Not Verified';
            errorMessage = 'Your email is not yet verified. Would you like to resend the verification code?';
            Alert.alert(errorTitle, errorMessage, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Resend Code',
                onPress: async () => {
                  const cleanEmail = sanitizeInput(email).toLowerCase().trim();
                  setSignUpEmail(cleanEmail);
                  setOtpCode(['', '', '', '', '', '', '', '']);
                  try {
                    await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: false } });
                  } catch {}
                  setShowOtpVerification(true);
                  startResendCooldown();
                },
              },
            ]);
            return; // Already showed alert above
          } else if (errorMsg.includes('Invalid login credentials')) {
            errorTitle = 'Invalid Credentials';
            errorMessage = 'The email or password you entered is incorrect. Please try again.';
          } else if (errorMsg.includes('User already registered')) {
            errorTitle = 'Account Exists';
            errorMessage = 'An account with this email already exists. Please sign in instead.';
            setIsSignUp(false);
          }
        }
        
        // Ensure we have valid strings for Alert
        if (typeof errorTitle !== 'string') errorTitle = 'Error';
        if (typeof errorMessage !== 'string') errorMessage = 'An error occurred. Please try again.';
        
        Alert.alert(errorTitle, errorMessage);
      } catch (alertError) {
        console.error('Error showing alert:', alertError);
        // Fallback alert with guaranteed safe values
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Verification Helpers ──

  const startResendCooldown = () => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    setResendCooldown(60);
    resendTimerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current!);
          resendTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (value: string, index: number) => {
    // Only accept single digits
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = digit;
    setOtpCode(newOtp);

    // Auto-advance to next input
    if (digit && index < 7) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }

  };

  const handleVerifyOtp = async () => {
    const token = otpCode.join('');
    if (token.length !== 8 || otpCode.some(d => d === '')) {
      Alert.alert('Error', 'Please enter the full 8-digit code');
      return;
    }

    try {
      setLoading(true);
      logger.info('Verifying OTP for:', signUpEmail);

      const { data, error } = await supabase.auth.verifyOtp({
        email: signUpEmail,
        token,
        type: 'email',
      });

      if (error) {
        logger.error('OTP verification error:', error);
        if (error.message?.includes('expired')) {
          Alert.alert('Code Expired', 'Your verification code has expired. Please request a new one.');
        } else {
          Alert.alert('Invalid Code', 'The code you entered is incorrect. Please try again.');
        }
        return;
      }

      if (data.session) {
        logger.info('OTP verified — session established');

        // If this was a sign-up, set the password the user chose
        if (pendingPassword) {
          const { error: pwError } = await supabase.auth.updateUser({ password: pendingPassword });
          if (pwError) {
            logger.error('Failed to set password after OTP:', pwError);
            // Non-fatal — user can set password later via change-password screen
          }
          setPendingPassword('');
        }

        // Restore data & create trial
        const { restoreUserDataFromSupabase } = await import('@/utils/auth-utils');
        await restoreUserDataFromSupabase();

        const { createTrialIfNeeded, refreshProStatus } = await import('@/utils/subscription-utils');
        await refreshProStatus();
        if (data.user) {
          await createTrialIfNeeded(data.user.id);
        }

        setShowOtpVerification(false);
        Alert.alert(
          'Verified! 🎉',
          'Your account has been verified. Welcome to Charisma!',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (err: any) {
      logger.error('OTP verification exception:', err);
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: signUpEmail,
        options: { shouldCreateUser: false },
      });

      if (error) {
        logger.error('Resend OTP error:', error);
        Alert.alert('Error', 'Failed to resend code. Please try again.');
        return;
      }

      startResendCooldown();
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      logger.error('Resend OTP exception:', err);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleSignIn = async (userId?: string) => {
    console.log('Google sign-in successful, restoring user data...');

    const { restoreUserDataFromSupabase } = await import('@/utils/auth-utils');
    await restoreUserDataFromSupabase();

    const { refreshProStatus, createTrialIfNeeded } = await import('@/utils/subscription-utils');
    try { await refreshProStatus(); } catch (e) { logger.error('Error refreshing pro status:', e); }
    if (userId) await createTrialIfNeeded(userId);

    Alert.alert(
      'Success! 🎉',
      'Signed in with Google successfully.',
      [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
    );
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Create redirect URL based on environment
      // Expo Go uses exp:// scheme, production uses charismachat://
      let redirectUrl: string;
      
      if (isExpoGo) {
        // For Expo Go, use the exp:// URL
        redirectUrl = Linking.createURL('/');
      } else {
        // For production/development builds
        redirectUrl = 'charismachat://auth/callback';
      }
      
      logger.info('Is Expo Go:', isExpoGo);
      logger.info('Starting Google Sign-In with redirect:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        logger.error('OAuth initialization error:', error);
        throw error;
      }

      if (data?.url) {
        logger.info('Opening OAuth URL:', data.url);
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        logger.info('WebBrowser result:', result);

        if (result.type === 'success' && result.url) {
          const url = result.url;
          logger.info('OAuth callback URL received:', url);

          // Parse both hash fragment (#) and query string (?) — iOS vs Android may differ
          const hashFragment = url.includes('#') ? url.split('#')[1] : '';
          const queryString = url.includes('?') ? url.split('?')[1].split('#')[0] : '';

          const hashParams = new URLSearchParams(hashFragment);
          const queryParams = new URLSearchParams(queryString);

          // Tokens can be in hash (implicit) or query (PKCE code exchange)
          const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
          const code = queryParams.get('code');

          logger.info('Tokens extracted:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            hasCode: !!code,
          });

          if (accessToken && refreshToken) {
            // Implicit flow — set session directly
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              logger.error('Session error:', sessionError);
              throw sessionError;
            }

            await finishGoogleSignIn(sessionData.user?.id);

          } else if (code) {
            // PKCE flow — exchange code for session (common on iOS)
            logger.info('Exchanging PKCE code for session');
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

            if (sessionError) {
              logger.error('PKCE exchange error:', sessionError);
              throw sessionError;
            }

            await finishGoogleSignIn(sessionData.user?.id);

          } else {
            // Last resort: check if Supabase already picked up the session from the URL
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              await finishGoogleSignIn(session.user?.id);
            } else {
              throw new Error('No tokens or code received from OAuth callback');
            }
          }
        } else if (result.type === 'cancel') {
          logger.info('User cancelled OAuth flow');
        } else {
          logger.warn('OAuth flow did not complete successfully:', result);
        }
      } else {
        throw new Error('No OAuth URL received from Supabase');
      }
    } catch (error: any) {
      logger.error('Google Sign-In error:', error);
      Alert.alert(
        'Sign In Failed',
        error?.message || 'Failed to sign in with Google. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    Alert.alert(
      'Guest Mode',
      'You need an account to subscribe to Pro features. Would you like to create one?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create Account', onPress: () => setIsSignUp(true) },
      ]
    );
  };

  // ── OTP Verification Screen ──
  if (showOtpVerification) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => {
              setShowOtpVerification(false);
              setOtpCode(['', '', '', '', '', '', '', '']);
              setPendingPassword('');
            }}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IconSymbol name="chevron.left" size={24} color={colors.gold} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Verify Email</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.heroSection}>
            <Text style={styles.heroEmoji}>📧</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Enter Verification Code</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              We sent an 8-digit code to{'\n'}
              <Text style={{ color: colors.gold, fontWeight: '600' }}>{signUpEmail}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otpCode.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { otpInputRefs.current[index] = ref; }}
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: digit ? colors.gold : colors.border,
                  },
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleOtpKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.authButton,
              { backgroundColor: colors.gold },
              loading && styles.authButtonDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={[styles.authButtonText, { color: '#000000' }]}>Verify</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendLabel, { color: colors.textSecondary }]}>
              Didn't receive the code?
            </Text>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={resendCooldown > 0 || loading}>
              <Text
                style={[
                  styles.resendButton,
                  { color: resendCooldown > 0 ? colors.textSecondary : colors.gold },
                ]}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Main Auth Screen ──
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              // Navigate to welcome screen if can't go back (iOS production)
              router.replace('/modal');
            }
          }}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}>
          <IconSymbol name="chevron.left" size={24} color={colors.gold} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>🔐</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            {isSignUp
              ? 'Sign up to unlock Pro features and sync your data across devices'
              : 'Sign in to continue with your Pro subscription'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="your@email.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <IconSymbol
                  name={showPassword ? 'eye' : 'eye.slash'}
                  size={24}
                  color={colors.background === '#fff' ? '#000000' : '#FFFFFF'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Auth Button */}
          <TouchableOpacity
            style={[
              styles.authButton,
              { backgroundColor: colors.gold },
              loading && styles.authButtonDisabled,
            ]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={[styles.authButtonText, { color: '#000000' }]}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Sign In/Sign Up */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsSignUp(!isSignUp)}
            disabled={loading}>
            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <Text style={[styles.toggleTextBold, { color: colors.gold }]}>
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Text>
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.8}>
            <Text style={styles.googleIcon}>🔍</Text>
            <Text style={[styles.googleButtonText, { color: colors.text }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Guest Continue */}
          <TouchableOpacity
            style={[
              styles.guestButton,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
            onPress={handleGuestContinue}
            disabled={loading}
            activeOpacity={0.8}>
            <Text style={[styles.guestButtonText, { color: colors.text }]}>
              Continue as Guest
            </Text>
          </TouchableOpacity>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={[styles.benefitsTitle, { color: colors.text }]}>
            Why create an account?
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.gold} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Sync data across all devices
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.gold} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Never lose your progress
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.gold} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Access Pro features
              </Text>
            </View>
            <View style={styles.benefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.gold} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                Priority support
              </Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <Text style={[styles.termsText, { color: colors.textSecondary }]}>
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  passwordInputWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  authButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  toggleButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
  },
  toggleTextBold: {
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  googleButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  googleIcon: {
    fontSize: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    flex: 1,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  // OTP styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  otpInput: {
    width: 38,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  resendLabel: {
    fontSize: 14,
  },
  resendButton: {
    fontSize: 15,
    fontWeight: '600',
  },
});
