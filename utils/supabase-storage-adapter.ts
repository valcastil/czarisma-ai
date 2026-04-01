import { SecureStorage } from './secure-storage';

/**
 * Custom storage adapter for Supabase that uses encrypted storage for auth tokens
 */
export const SupabaseSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    return await SecureStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await SecureStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    await SecureStorage.removeItem(key);
  }
};
