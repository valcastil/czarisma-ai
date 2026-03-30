import { supabase } from '@/lib/supabase';
import { sanitizeInput, validatePassword as validatePasswordSecurity } from './security';
import { getProfile, saveProfile } from './profile-utils';
import { logger } from './logger';

/**
 * Check if a user exists in Supabase by email
 */
export const checkUserExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('Error checking user existence:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error in checkUserExists:', error);
    return false;
  }
};

/**
 * Get all existing users from Supabase
 */
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, username, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getAllUsers:', error);
    return [];
  }
};

/**
 * Change password for authenticated Supabase users
 */
export const changePasswordSupabase = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate new password
    const cleanPassword = sanitizeInput(newPassword);
    const passwordValidation = validatePasswordSecurity(cleanPassword);
    
    if (!passwordValidation.valid) {
      return {
        success: false,
        message: passwordValidation.message,
      };
    }

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: 'No authenticated user found. Please sign in first.',
      };
    }

    // Update password in Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: cleanPassword,
    });

    if (error) {
      logger.error('Error updating password in Supabase:', error);
      return {
        success: false,
        message: error.message || 'Failed to update password',
      };
    }

    logger.info('Password updated successfully in Supabase');
    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error: any) {
    logger.error('Error in changePasswordSupabase:', error);
    return {
      success: false,
      message: error?.message || 'An unexpected error occurred',
    };
  }
};

/**
 * Change password for local (guest) users
 */
export const changePasswordLocal = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
  try {
    const profile = await getProfile();
    
    // Verify current password
    if (profile.password !== currentPassword) {
      return {
        success: false,
        message: 'Current password is incorrect',
      };
    }

    // Validate new password
    const cleanPassword = sanitizeInput(newPassword);
    
    if (cleanPassword.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters long',
      };
    }

    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(cleanPassword)) {
      return {
        success: false,
        message: 'Password must contain at least one letter and one number',
      };
    }

    // Update password
    const updatedProfile = {
      ...profile,
      password: cleanPassword,
    };
    
    await saveProfile(updatedProfile);
    logger.info('Local password changed successfully');
    
    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error: any) {
    logger.error('Error changing local password:', error);
    return {
      success: false,
      message: error?.message || 'Failed to change password',
    };
  }
};

/**
 * Universal password change function that works for both authenticated and local users
 */
export const changePasswordUniversal = async (
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Check if user is authenticated with Supabase
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.email) {
      // For authenticated users, verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return {
          success: false,
          message: 'Current password is incorrect',
        };
      }

      // Change password for authenticated user
      return await changePasswordSupabase(newPassword);
    } else {
      // Change password for local user
      return await changePasswordLocal(currentPassword, newPassword);
    }
  } catch (error: any) {
    logger.error('Error in changePasswordUniversal:', error);
    return {
      success: false,
      message: error?.message || 'An unexpected error occurred',
    };
  }
};

/**
 * Check if current user is authenticated with Supabase
 */
export const isAuthenticatedUser = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user && !!user.email;
  } catch (error) {
    logger.error('Error checking authentication status:', error);
    return false;
  }
};
