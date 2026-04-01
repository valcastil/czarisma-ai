/**
 * Message Utilities - Supabase Backend
 * 
 * This module provides messaging functionality using Supabase as the backend.
 * All messages are stored in the cloud and synced in real-time across devices.
 */

import { Attachment, Conversation, Message, User } from '@/constants/message-types';
import * as SupabaseMessageService from '@/lib/supabase-message-service';
import { decryptMessage, encryptMessage } from '@/utils/encryption';
import { sanitizeMessage } from '@/utils/input-sanitizer';
import { logger } from '@/utils/logger';
import { getProfile } from '@/utils/profile-utils';
import { isRateLimited, recordAttempt } from '@/utils/rate-limiter';
import { SecureStorage } from '@/utils/secure-storage';

const selfMessagesKey = (userId: string) => `@charisma_self_messages_${userId}`;

const readSelfMessages = async (userId: string): Promise<Message[]> => {
  try {
    const raw = await SecureStorage.getItem(selfMessagesKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Message[];
  } catch (e) {
    return [];
  }
};

const appendSelfMessage = async (userId: string, message: Message): Promise<void> => {
  try {
    const existing = await readSelfMessages(userId);
    const next = [...existing, message];
    await SecureStorage.setItem(selfMessagesKey(userId), JSON.stringify(next));
  } catch (e) {
    // ignore
  }
};

// =====================================================
// USER MANAGEMENT
// =====================================================

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<User | null> => {
  return await SupabaseMessageService.getCurrentUserProfile();
};

/**
 * Get all registered users (excluding current user)
 */
export const getRegisteredUsers = async (): Promise<User[]> => {
  return await SupabaseMessageService.getRegisteredUsers();
};

/**
 * Register/update current user in the database
 */
export const registerCurrentUser = async (): Promise<void> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      logger.warn('No current user found, skipping registration');
      return;
    }

    logger.info('Registering/updating current user in Supabase...', {
      userId: currentUser.id,
      username: currentUser.username
    });

    try {
      const localProfile = await getProfile();
      const name = (localProfile?.name || currentUser.name || 'User').trim();
      const username = (localProfile?.username || currentUser.username || undefined)?.trim();
      const avatarUrl = localProfile?.avatar;

      logger.info('Syncing profile to Supabase:', { name, username, hasAvatar: !!avatarUrl });

      const result = await SupabaseMessageService.createOrUpdateProfile(
        name,
        username || undefined,
        avatarUrl
      );

      if (result) {
        logger.info('Profile successfully synced to Supabase');
      } else {
        logger.error('Profile sync returned null - check Supabase connection');
      }
    } catch (e) {
      logger.error('Failed to sync local profile to Supabase:', e);
      // Continue to update online status even if profile sync fails
    }

    await SupabaseMessageService.updateOnlineStatus(true);
    logger.info('User online status updated');
  } catch (error) {
    logger.error('Error registering current user:', error);
    throw error; // Propagate error so caller knows it failed
  }
};

/**
 * Update user's online status
 */
export const updateUserOnlineStatus = async (isOnline: boolean): Promise<void> => {
  await SupabaseMessageService.updateOnlineStatus(isOnline);
};

/**
 * Check if user session is valid and active
 */
export const checkSessionValidity = async (): Promise<boolean> => {
  return await SupabaseMessageService.checkSessionValidity();
};

// =====================================================
// MESSAGING
// =====================================================

/**
 * Send a message to another user
 */
/**
 * Send a message to another user
 */
export const sendMessage = async (
  receiverId: string,
  receiverUsername: string,
  receiverName: string,
  content: string,
  attachment?: Attachment
): Promise<Message> => {
  try {
    // Sanitize and encrypt message content for security
    const sanitizedContent = sanitizeMessage(content);
    const encryptedContent = encryptMessage(sanitizedContent);
    logger.log('sendMessage called:', { receiverId, contentLength: sanitizedContent.length });
    
    // Check for demo user or forced demo mode
    const isDemoReceiver = receiverId.startsWith('demo_');
    const isContactReceiver = receiverId.startsWith('contact_');

    // Try to get current user, but don't fail if we can't (for demo mode)
    let senderId = 'unknown';
    let senderUsername = 'unknown';
    let senderName = 'Unknown';

    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        senderId = currentUser.id;
        senderUsername = currentUser.username;
        senderName = currentUser.name;

        // Check message rate limiting
        const rateLimitStatus = await isRateLimited('MESSAGE', senderId);
        if (rateLimitStatus.isLimited) {
          throw new Error('Rate limit exceeded. Please wait before sending more messages.');
        }

        // Explicit SELF-CHAT handling: Supabase blocks sender_id == receiver_id.
        // Keep self-chat local-only so it works consistently on iOS + Android.
        if (receiverId === senderId) {
          logger.log('Self-chat detected, using local storage');
          const localMessage: Message = {
            id: Date.now().toString(),
            senderId: senderId,
            senderUsername: senderUsername,
            senderName: senderName,
            receiverId: receiverId,
            receiverUsername: receiverUsername,
            receiverName: receiverName,
            content: encryptedContent,
            timestamp: Date.now(),
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            isRead: true,
            isFromCurrentUser: true,
          };

          await appendSelfMessage(senderId, localMessage);
          await recordAttempt('MESSAGE', senderId);
          return localMessage;
        }

        // If current user is a demo user, force local handling
        if (currentUser.id === 'demo_current_user') {
          logger.log('Demo user detected, using local handling');
          // Fall through to local handling below
        } else if (!isDemoReceiver && !isContactReceiver) {
          // Normal case: Real user sending to Real user -> Use Supabase
          logger.log('Sending message via Supabase');
          try {
            const message = await SupabaseMessageService.sendMessage(
              receiverId,
              encryptedContent,
              attachment
            );
            logger.log('Message sent successfully via Supabase');
            await recordAttempt('MESSAGE', senderId);
            return message;
          } catch (e) {
            logger.error('Error sending message via Supabase:', e);
          }
        }
      }
    } catch (e: any) {
      // Check if this is a real error or just demo mode
      if (e?.message?.includes('session') || e?.message?.includes('auth')) {
        logger.log('Auth error, falling back to local handling');
        // Fall through to local handling for demo/testing
      } else {
        // This is a real error, propagate it
        logger.error('Error in sendMessage:', e);
        throw e;
      }
    }

    // LOCAL HANDLING (Demo/Simulation)
    // This runs if:
    // 1. Receiver is a demo user or contact
    // 2. Sender is a demo user
    // 3. Auth failed / No session

    // Simulate network delay (Removed for instant feedback)
    // await new Promise(resolve => setTimeout(resolve, 500));

    const localMessage: Message = {
      id: Date.now().toString(),
      senderId: senderId === 'unknown' ? 'demo_current_user' : senderId,
      senderUsername: senderUsername === 'unknown' ? 'demo_user' : senderUsername,
      senderName: senderName === 'Unknown' ? 'Demo User' : senderName,
      receiverId: receiverId,
      receiverUsername: receiverUsername,
      receiverName: receiverName,
      content: encryptedContent,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      isRead: false,
      isFromCurrentUser: true,
      attachment,
    };

    // Persist local-only self-chat messages for consistent cross-platform behavior.
    if (localMessage.senderId === localMessage.receiverId && localMessage.senderId !== 'unknown') {
      await appendSelfMessage(localMessage.senderId, localMessage);
    }

    return localMessage;

  } catch (error: any) {
    logger.error('Error sending message:', error);
    // Re-throw with context preserved
    if (error.userMessage) {
      throw error; // Already enhanced by Supabase service
    }
    throw new Error(error?.message || 'Failed to send message');
  }
};

/**
 * Get messages between current user and another user
 */
export const getMessages = async (otherUserId: string): Promise<Message[]> => {
  try {
    const me = await getCurrentUser();
    if (me && otherUserId === me.id) {
      const selfMsgs = await readSelfMessages(me.id);
      // Decrypt self messages for display
      return selfMsgs.map(msg => ({
        ...msg,
        content: decryptMessage(msg.content)
      }));
    }

    // Demo and contact users don't exist in Supabase — return empty
    if (otherUserId.startsWith('demo_') || otherUserId.startsWith('contact_')) {
      return [];
    }

    const messages = await SupabaseMessageService.getMessages(otherUserId);

    // Decrypt message content for display
    const decryptedMessages = messages.map(msg => ({
      ...msg,
      content: decryptMessage(msg.content)
    }));

    // Mark unread messages as read
    const unreadMessages = decryptedMessages.filter(
      msg => !msg.isRead && !msg.isFromCurrentUser
    );

    if (unreadMessages.length > 0) {
      await markMessagesAsRead(unreadMessages.map(msg => msg.id));
    }

    return decryptedMessages;
  } catch (error) {
    logger.error('Error getting messages:', error);
    return [];
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (messageIds: string[]): Promise<void> => {
  await SupabaseMessageService.markMessagesAsRead(messageIds);
};

/**
 * Subscribe to new messages in a conversation
 * Returns an unsubscribe function
 */
export const subscribeToMessages = (
  otherUserId: string,
  onNewMessage: (message: Message) => void
): (() => void) => {
  // Demo and contact users don't exist in Supabase — no-op subscription
  if (otherUserId.startsWith('demo_') || otherUserId.startsWith('contact_')) {
    return () => {};
  }
  return SupabaseMessageService.subscribeToMessages(otherUserId, onNewMessage);
};

// =====================================================
// CONVERSATIONS
// =====================================================

/**
 * Get all conversations for current user
 */
export const getConversations = async (): Promise<Conversation[]> => {
  const conversations = await SupabaseMessageService.getConversations();

  try {
    const me = await getCurrentUser();
    if (!me) return conversations;

    // If any backend conversation ever comes back with participantId == me.id, it would duplicate self-chat.
    // Normalize by removing those and relying on the local self-chat conversation below.
    const baseConversations = conversations.filter(c => c.participantId !== me.id);

    const selfMsgs = await readSelfMessages(me.id);
    if (selfMsgs.length === 0) return baseConversations;

    const last = selfMsgs[selfMsgs.length - 1];

    let selfName = me.name;
    let selfUsername = me.username;
    try {
      const localProfile = await getProfile();
      if (localProfile?.name) selfName = localProfile.name;
      if (localProfile?.username) selfUsername = localProfile.username;
    } catch (e) {
      // ignore
    }

    const selfConversation: Conversation = {
      id: `self_${me.id}`,
      participantId: me.id,
      participantUsername: selfUsername,
      participantName: selfName,
      participantIsOnline: true,
      participantLastSeen: Date.now(),
      lastMessage: last,
      unreadCount: 0,
      updatedAt: last.timestamp,
    };

    const withoutDuplicate = baseConversations.filter(c => c.id !== selfConversation.id);
    return [selfConversation, ...withoutDuplicate].sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (e) {
    return conversations;
  }
};

/**
 * Update or create conversation (called automatically by database triggers)
 */
export const updateConversation = async (message: Message): Promise<void> => {
  // This is now handled automatically by database triggers
  // Keeping this function for backward compatibility
  console.log('Conversation updated automatically by database trigger');
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (participantId: string): Promise<void> => {
  await SupabaseMessageService.deleteConversation(participantId);
};

/**
 * Subscribe to conversation updates
 * Returns an unsubscribe function
 */
export const subscribeToConversations = (
  onUpdate: (conversation: Conversation) => void
): (() => void) => {
  return SupabaseMessageService.subscribeToConversations(onUpdate);
};

/**
 * Get total unread message count
 */
export const getUnreadCount = async (): Promise<number> => {
  return await SupabaseMessageService.getUnreadCount();
};

/**
 * Update message reactions
 */
export const updateMessageReactions = async (
  messageId: string,
  reactions: string[]
): Promise<boolean> => {
  return await SupabaseMessageService.updateMessageReactions(messageId, reactions);
};
