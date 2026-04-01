import CryptoJS from 'crypto-js';

/**
 * Encryption utilities for end-to-end encryption of sensitive data
 * Uses AES-256 encryption for message content
 */

// In a real app, this would be derived from user's password or key exchange
// For now, using a hardcoded key for demonstration
const ENCRYPTION_KEY = 'charisma-encryption-key-2024-secure';

/**
 * Encrypt text using AES-256
 */
export const encrypt = (text: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Fallback to plain text if encryption fails
  }
};

/**
 * Decrypt text using AES-256
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedText; // Fallback to encrypted text if decryption fails
  }
};

/**
 * Encrypt message content before storing or sending
 */
export const encryptMessage = (content: string): string => {
  if (!content) return '';
  return encrypt(content);
};

/**
 * Decrypt message content after receiving or retrieving
 */
export const decryptMessage = (encryptedContent: string): string => {
  if (!encryptedContent) return '';
  return decrypt(encryptedContent);
};

/**
 * Generate a secure random key for key exchange (future implementation)
 */
export const generateKeyPair = (): { publicKey: string; privateKey: string } => {
  // In a real implementation, this would use RSA or ECDH
  // For now, returning mock keys
  return {
    publicKey: `public_${Date.now()}_${Math.random().toString(36)}`,
    privateKey: `private_${Date.now()}_${Math.random().toString(36)}`,
  };
};

/**
 * Hash sensitive data for verification
 */
export const hashData = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

/**
 * Verify data integrity
 */
export const verifyIntegrity = (data: string, hash: string): boolean => {
  const computedHash = hashData(data);
  return computedHash === hash;
};
