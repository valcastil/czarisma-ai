import AsyncStorage from '@react-native-async-storage/async-storage';

// Try to import EncryptedStorage, but handle cases where it's not available
let EncryptedStorage: any = null;
try {
  EncryptedStorage = require('react-native-encrypted-storage').default;
} catch (error) {
  console.warn('EncryptedStorage not available, falling back to AsyncStorage');
}

// Define which keys should be encrypted (sensitive data)
const ENCRYPTED_KEYS = [
  '@charisma_profile',
  '@pro_status',
  '@trial_start_date',
  '@charisma_entries',
  '@charisma_shared_links',
  '@supabase.auth.token',
  '@charisma_session',
];

/**
 * Secure storage utility that uses encrypted storage for sensitive data
 * and regular AsyncStorage for non-sensitive data
 */
export class SecureStorage {
  /**
   * Store data with encryption for sensitive keys
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (ENCRYPTED_KEYS.includes(key) && EncryptedStorage) {
        await EncryptedStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Error storing data:', error);
      // Fallback to AsyncStorage if EncryptedStorage fails
      try {
        await AsyncStorage.setItem(key, value);
      } catch (fallbackError) {
        console.error('Fallback storage also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Retrieve data from appropriate storage
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      if (ENCRYPTED_KEYS.includes(key) && EncryptedStorage) {
        const value = await EncryptedStorage.getItem(key);
        return value;
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error: any) {
      console.error('Error retrieving data:', error);
      // Check if error is due to AsyncStorage not being initialized yet
      if (error?.message?.includes('window is not defined') || error?.message?.includes('window')) {
        console.warn('AsyncStorage not initialized yet, returning null');
        return null;
      }
      // Fallback to AsyncStorage if EncryptedStorage fails
      try {
        return await AsyncStorage.getItem(key);
      } catch (fallbackError: any) {
        console.error('Fallback storage also failed:', fallbackError);
        // Check if fallback error is also due to initialization
        if (fallbackError?.message?.includes('window is not defined') || fallbackError?.message?.includes('window')) {
          console.warn('AsyncStorage fallback not initialized yet, returning null');
          return null;
        }
        return null;
      }
    }
  }

  /**
   * Remove item from appropriate storage
   */
  static async removeItem(key: string): Promise<void> {
    try {
      if (ENCRYPTED_KEYS.includes(key) && EncryptedStorage) {
        await EncryptedStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing data:', error);
      // Fallback to AsyncStorage if EncryptedStorage fails
      try {
        await AsyncStorage.removeItem(key);
      } catch (fallbackError) {
        console.error('Fallback storage also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Clear all storage (both encrypted and regular)
   */
  static async clear(): Promise<void> {
    try {
      const promises = [AsyncStorage.clear()];
      if (EncryptedStorage) {
        promises.push(EncryptedStorage.clear());
      }
      await Promise.all(promises);
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Migrate existing data from AsyncStorage to EncryptedStorage
   */
  static async migrateToEncrypted(): Promise<void> {
    if (!EncryptedStorage) {
      console.log('⚠️ EncryptedStorage not available, skipping migration');
      return;
    }
    
    console.log('🔐 Migrating sensitive data to encrypted storage...');
    
    for (const key of ENCRYPTED_KEYS) {
      try {
        const existingValue = await AsyncStorage.getItem(key);
        if (existingValue) {
          await EncryptedStorage.setItem(key, existingValue);
          await AsyncStorage.removeItem(key);
          console.log(`✅ Migrated ${key} to encrypted storage`);
        }
      } catch (error) {
        console.error(`❌ Failed to migrate ${key}:`, error);
      }
    }
    
    console.log('🔐 Migration completed');
  }
}

// Export convenience functions for backward compatibility
export const secureSetItem = SecureStorage.setItem.bind(SecureStorage);
export const secureGetItem = SecureStorage.getItem.bind(SecureStorage);
export const secureRemoveItem = SecureStorage.removeItem.bind(SecureStorage);
export const secureClear = SecureStorage.clear.bind(SecureStorage);
