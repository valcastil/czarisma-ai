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
import React, { useState } from 'react';
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
        // Sign up with email confirmation enabled
        const redirectUrl = Linking.createURL('auth/callback');
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });

        if (error) throw error;

        if (data.user) {
          // Check if email confirmation is required
          if (data.session) {
            // User is immediately signed in (email confirmation disabled)
            // Create trial subscription for new user
            const { createTrialIfNeeded } = await import('@/utils/subscription-utils');
            await createTrialIfNeeded(data.user.id);
            
            Alert.alert(
              'Success! 🎉',
              'Account created successfully. Welcome to Charisma!',
              [
                {
                  text: 'Continue',
                  onPress: () => router.replace('/(tabs)'),
                },
              ]
            );
          } else {
            // Email confirmation required
            Alert.alert(
              'Check Your Email 📧',
              'We sent you a confirmation email. Please check your inbox and click the link to verify your account before signing in.',
              [
                {
                  text: 'OK',
                  onPress: () => setIsSignUp(false),
                },
              ]
            );
          }
        }
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
            errorTitle = 'Email Not Confirmed';
            errorMessage = 'Please check your email and click the confirmation link before signing in.';
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
          // Extract tokens from the callback URL
          const url = result.url;
          const hashParams = url.split('#')[1];
          const queryParams = url.split('?')[1];
          const params = new URLSearchParams(hashParams || queryParams);
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          logger.info('Tokens extracted:', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken 
          });

          if (accessToken && refreshToken) {
            // Set the session in Supabase
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              logger.error('Session error:', sessionError);
              throw sessionError;
            }

            logger.info('Session established:', sessionData);
            console.log('Google sign-in successful, restoring user data...');

            // Restore user data from Supabase
            const { restoreUserDataFromSupabase } = await import('@/utils/auth-utils');
            const restoreResult = await restoreUserDataFromSupabase();
            console.log('Google restore result:', restoreResult);

            try {
              const { refreshProStatus } = await import('@/utils/subscription-utils');
              await refreshProStatus();
            } catch (error) {
              logger.error('Error refreshing pro status after sign-in:', error);
            }

            // Create trial subscription if user doesn't have one
            const { createTrialIfNeeded } = await import('@/utils/subscription-utils');
            if (sessionData.user) {
              await createTrialIfNeeded(sessionData.user.id);
            }

            Alert.alert(
              'Success! 🎉',
              'Signed in with Google successfully.',
              [
                {
                  text: 'Continue',
                  onPress: () => router.replace('/(tabs)'),
                },
              ]
            );
          } else {
            throw new Error('No tokens received from OAuth callback');
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
            }
          }}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <IconSymbol name="chevron.left" size={24} color={router.canGoBack() ? colors.gold : 'transparent'} />
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
              <ActivityIndicator color={colors.gold} />
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
});
