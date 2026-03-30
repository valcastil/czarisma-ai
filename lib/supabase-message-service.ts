import { Attachment, Conversation, Message, User } from '@/constants/message-types';
import { logger } from '@/utils/logger';
import { supabase } from './supabase';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Helper to wait for a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to retry async operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  context: string,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors or permission errors
      const errorCode = error?.code || error?.status;
      if (
        errorCode === 'PGRST301' || // Auth error
        errorCode === '42501' || // Permission denied
        error?.message?.includes('session') ||
        error?.message?.includes('auth')
      ) {
        throw error;
      }
      
      if (attempt < retries) {
        logger.warn(`[${context}] Attempt ${attempt} failed, retrying...`, error?.message);
        await delay(RETRY_DELAY_MS * attempt);
      }
    }
  }
  
  throw lastError;
}

// Validate session before operations
async function validateSession(): Promise<{ userId: string; session: any }> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Session validation failed: ${error.message}`);
  }
  
  if (!session) {
    throw new Error('No active session');
  }
  
  return { userId: session.user.id, session };
}

// =====================================================
// USER PROFILE MANAGEMENT
// =====================================================

/**
 * Get current user's profile from Supabase
 */
export const getCurrentUserProfile = async (): Promise<User | null> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) {
            // If profile doesn't exist, create it
            if (error.code === 'PGRST116') {
                logger.log('Profile not found, creating new profile...');

                // Generate unique username
                const randomUsername = 'user_' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');

                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: session.user.id,
                        username: randomUsername,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                        is_online: true,
                    })
                    .select()
                    .single();

                if (createError) {
                    logger.error('Error creating profile:', createError);
                    return null;
                }

                return {
                    id: newProfile.id,
                    username: newProfile.username,
                    name: newProfile.name,
                    isOnline: newProfile.is_online,
                    lastSeen: new Date(newProfile.last_seen).getTime(),
                    avatarUrl: newProfile.avatar_url,
                };
            }

            logger.error('Error fetching user profile:', error);
            return null;
        }

        return {
            id: data.id,
            username: data.username,
            name: data.name,
            isOnline: data.is_online,
            lastSeen: new Date(data.last_seen).getTime(),
            avatarUrl: data.avatar_url,
        };
    } catch (error) {
        logger.error('Error getting current user profile:', error);
        return null;
    }
};

/**
 * Create or update user profile
 */
export const createOrUpdateProfile = async (
    name: string,
    username?: string,
    avatarUrl?: string
): Promise<User | null> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            logger.error('Cannot create/update profile: No active session');
            throw new Error('No active session');
        }

        logger.info('Creating/updating profile in Supabase:', {
            userId: session.user.id,
            name,
            username,
            hasAvatar: !!avatarUrl
        });

        const profileData: any = {
            id: session.user.id,
            name,
            is_online: true,
            last_seen: new Date().toISOString(),
        };

        if (username) profileData.username = username;
        if (avatarUrl) profileData.avatar_url = avatarUrl;

        let { data, error } = await supabase
            .from('profiles')
            .upsert(profileData, { onConflict: 'id' })
            .select()
            .single();

        // If username conflicts with another user, retry as update without username
        if (error && error.code === '23505' && error.message?.includes('profiles_username_key')) {
            logger.warn('Username conflict, updating profile without changing username');
            const { username: _removed, ...updateData } = profileData;
            delete updateData.id;
            ({ data, error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', session.user.id)
                .select()
                .single());
        }

        if (error) {
            logger.error('Supabase profile upsert error:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            throw error;
        }

        if (!data) {
            logger.error('Profile upsert succeeded but returned no data');
            return null;
        }

        logger.info('Profile successfully created/updated in Supabase:', {
            id: data.id,
            name: data.name,
            username: data.username
        });

        return {
            id: data.id,
            username: data.username,
            name: data.name,
            isOnline: data.is_online,
            lastSeen: new Date(data.last_seen).getTime(),
            avatarUrl: data.avatar_url,
        };
    } catch (error: any) {
        logger.productionError('createOrUpdateProfile', error, {
            name,
            username,
            hasAvatar: !!avatarUrl
        });
        return null;
    }
};

/**
 * Get all registered users (excluding current user)
 */
export const getRegisteredUsers = async (): Promise<User[]> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('id', session.user.id)
            .order('name');

        if (error) {
            logger.error('Error fetching registered users:', error);
            throw error;
        }

        return data.map(profile => ({
            id: profile.id,
            username: profile.username,
            name: profile.name,
            isOnline: profile.is_online,
            lastSeen: new Date(profile.last_seen).getTime(),
            avatarUrl: profile.avatar_url,
        }));
    } catch (error) {
        logger.error('Error fetching registered users:', error);
        return [];
    }
};

/**
 * Update user's online status
 */
export const updateOnlineStatus = async (isOnline: boolean): Promise<void> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase
            .from('profiles')
            .update({
                is_online: isOnline,
                last_seen: new Date().toISOString(),
            })
            .eq('id', session.user.id);
    } catch (error) {
        logger.error('Error updating online status:', error);
    }
};

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            logger.error('Error fetching user profile by ID:', error);
            throw error;
        }

        return {
            id: data.id,
            username: data.username,
            name: data.name,
            isOnline: data.is_online,
            lastSeen: new Date(data.last_seen).getTime(),
            avatarUrl: data.avatar_url,
        };
    } catch (error) {
        logger.error('Error fetching user profile:', error);
        return null;
    }
};

// =====================================================
// MESSAGING
// =====================================================

/**
 * Check if user session is valid and active
 */
export const checkSessionValidity = async (): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch (error) {
        logger.error('Error checking session validity:', error);
        return false;
    }
};

/**
 * Send a message to another user
 */
export const sendMessage = async (
    receiverId: string,
    content: string,
    attachment?: Attachment
): Promise<Message> => {
    try {
        // Validate session first
        const { userId, session } = await validateSession();
        
        // Validate inputs
        if (!receiverId || !receiverId.trim()) {
            throw new Error('Receiver ID is required');
        }
        
        if ((!content || !content.trim()) && !attachment) {
            throw new Error('Message must have content or attachment');
        }
        
        // Check if receiver profile exists
        const { data: receiverProfile, error: receiverError } = await supabase
            .from('profiles')
            .select('id, username, name')
            .eq('id', receiverId)
            .single();
        
        if (receiverError || !receiverProfile) {
            throw new Error('Receiver profile not found. They may need to sign in first.');
        }
        
        // Send message with retry logic
        const result = await retryOperation(async () => {
            const messageData: any = {
                sender_id: userId,
                receiver_id: receiverId,
                content: content?.trim() || '',
            };
            
            // Add attachment fields if present
            if (attachment) {
                messageData.attachment_type = attachment.type;
                messageData.attachment_url = attachment.url;
                messageData.attachment_name = attachment.name;
                messageData.attachment_size = attachment.size;
                messageData.attachment_mime_type = attachment.mimeType;
                messageData.attachment_thumbnail_url = attachment.thumbnailUrl;
                messageData.attachment_duration = attachment.duration;
                messageData.attachment_width = attachment.width;
                messageData.attachment_height = attachment.height;
            }
            
            const { data, error } = await supabase
                .from('messages')
                .insert(messageData)
                .select(`
                    *,
                    sender:sender_id(username, name),
                    receiver:receiver_id(username, name)
                `)
                .single();

            if (error) throw error;
            return data;
        }, 'sendMessage');

        return {
            id: result.id,
            senderId: result.sender_id,
            senderUsername: result.sender.username,
            senderName: result.sender.name,
            receiverId: result.receiver_id,
            receiverUsername: result.receiver.username,
            receiverName: result.receiver.name,
            content: result.content,
            timestamp: new Date(result.created_at).getTime(),
            date: new Date(result.created_at).toLocaleDateString(),
            time: new Date(result.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }),
            isRead: result.is_read,
            isFromCurrentUser: result.sender_id === userId,
            attachment: result.attachment_type ? {
                type: result.attachment_type,
                url: result.attachment_url,
                name: result.attachment_name,
                size: result.attachment_size,
                mimeType: result.attachment_mime_type,
                thumbnailUrl: result.attachment_thumbnail_url,
                duration: result.attachment_duration,
                width: result.attachment_width,
                height: result.attachment_height,
            } : undefined,
        };
    } catch (error: any) {
        const errorInfo = logger.productionError('send message', error, {
            receiverId,
            contentLength: content?.length,
        });
        
        // Throw with enhanced error information
        const enhancedError: any = new Error(errorInfo.userMessage);
        enhancedError.code = errorInfo.code;
        enhancedError.context = errorInfo.context;
        enhancedError.originalError = error;
        throw enhancedError;
    }
};

/**
 * Get messages between current user and another user
 */
export const getMessages = async (otherUserId: string): Promise<Message[]> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const { data, error } = await supabase
            .from('messages')
            .select(`
        *,
        sender:sender_id(username, name),
        receiver:receiver_id(username, name)
      `)
            .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${session.user.id})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data.map(msg => ({
            id: msg.id,
            senderId: msg.sender_id,
            senderUsername: msg.sender.username,
            senderName: msg.sender.name,
            receiverId: msg.receiver_id,
            receiverUsername: msg.receiver.username,
            receiverName: msg.receiver.name,
            content: msg.content,
            timestamp: new Date(msg.created_at).getTime(),
            date: new Date(msg.created_at).toLocaleDateString(),
            time: new Date(msg.created_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }),
            isRead: msg.is_read,
            isFromCurrentUser: msg.sender_id === session.user.id,
            reactions: msg.reactions || [],
            attachment: msg.attachment_type ? {
                type: msg.attachment_type,
                url: msg.attachment_url,
                name: msg.attachment_name,
                size: msg.attachment_size,
                mimeType: msg.attachment_mime_type,
                thumbnailUrl: msg.attachment_thumbnail_url,
                duration: msg.attachment_duration,
                width: msg.attachment_width,
                height: msg.attachment_height,
            } : undefined,
        }));
    } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
    }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (messageIds: string[]): Promise<void> => {
    try {
        const { error } = await supabase
            .from('messages')
            .update({
                is_read: true,
                read_at: new Date().toISOString(),
            })
            .in('id', messageIds);

        if (error) throw error;
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
};

/**
 * Subscribe to new messages in a conversation
 */
export const subscribeToMessages = (
    otherUserId: string,
    onNewMessage: (message: Message) => void
): (() => void) => {
    let currentUserId: string | null = null;

    const handleMessageChange = async (payload: any) => {
        try {
            // Fetch the complete message with sender/receiver info
            const { data } = await supabase
                .from('messages')
                .select(`
            *,
            sender:sender_id(username, name),
            receiver:receiver_id(username, name)
          `)
                .eq('id', payload.new.id)
                .single();

            if (data) {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user.id;

                // Only process messages that involve the current conversation
                const isRelevantMessage = 
                    (data.sender_id === otherUserId && data.receiver_id === userId) ||
                    (data.sender_id === userId && data.receiver_id === otherUserId);

                if (!isRelevantMessage) {
                    return;
                }

                logger.info('Received realtime message:', {
                    messageId: data.id,
                    from: data.sender_id,
                    to: data.receiver_id,
                    isFromOther: data.sender_id === otherUserId
                });

                onNewMessage({
                    id: data.id,
                    senderId: data.sender_id,
                    senderUsername: data.sender.username,
                    senderName: data.sender.name,
                    receiverId: data.receiver_id,
                    receiverUsername: data.receiver.username,
                    receiverName: data.receiver.name,
                    content: data.content,
                    timestamp: new Date(data.created_at).getTime(),
                    date: new Date(data.created_at).toLocaleDateString(),
                    time: new Date(data.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    }),
                    isRead: data.is_read,
                    isFromCurrentUser: data.sender_id === userId,
                    reactions: data.reactions || [],
                    attachment: data.attachment_type ? {
                        type: data.attachment_type,
                        url: data.attachment_url,
                        name: data.attachment_name,
                        size: data.attachment_size,
                        mimeType: data.attachment_mime_type,
                        thumbnailUrl: data.attachment_thumbnail_url,
                        duration: data.attachment_duration,
                        width: data.attachment_width,
                        height: data.attachment_height,
                    } : undefined,
                });
            }
        } catch (error) {
            logger.error('Error handling realtime message:', error);
        }
    };

    // Get current user ID for filtering
    (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            currentUserId = session.user.id;
            logger.info('Subscribed to messages with:', {
                currentUserId,
                otherUserId
            });
        }
    })();

    // Create unique channel name to avoid conflicts between multiple chat screens
    const channelName = `messages:${otherUserId}:${Date.now()}`;
    
    const channel = supabase
        .channel(channelName)
        // Listen for messages FROM the other user (incoming messages)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `sender_id=eq.${otherUserId}`,
            },
            handleMessageChange
        )
        // Listen for messages TO the other user (outgoing messages from current user)
        // This ensures sender sees their own message in realtime
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${otherUserId}`,
            },
            handleMessageChange
        )
        // Listen for message updates (reactions, read status)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages',
            },
            handleMessageChange
        )
        .subscribe((status) => {
            logger.info('Realtime subscription status:', status);
            if (status === 'SUBSCRIBED') {
                logger.info('Bidirectional message sync active for:', { otherUserId, channelName });
            } else if (status === 'CHANNEL_ERROR') {
                logger.error('Realtime channel error - messages may not sync properly');
            } else if (status === 'TIMED_OUT') {
                logger.error('Realtime subscription timed out - attempting reconnect');
            }
        });

    // Return unsubscribe function
    return () => {
        logger.info('Unsubscribing from messages channel');
        supabase.removeChannel(channel);
    };
};

// =====================================================
// CONVERSATIONS
// =====================================================

/**
 * Get all conversations for current user
 */
export const getConversations = async (): Promise<Conversation[]> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const { data, error } = await supabase
            .from('conversations')
            .select(`
        *,
        participant:participant_id(username, name, is_online, last_seen)
      `)
            .eq('user_id', session.user.id)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return data.map(conv => ({
            id: conv.id,
            participantId: conv.participant_id,
            participantUsername: conv.participant.username,
            participantName: conv.participant.name,
            participantIsOnline: conv.participant.is_online,
            participantLastSeen: conv.participant.last_seen ? new Date(conv.participant.last_seen).getTime() : undefined,
            lastMessage: {
                id: conv.last_message_id || '',
                content: conv.last_message_content || '',
                timestamp: conv.last_message_timestamp ? new Date(conv.last_message_timestamp).getTime() : Date.now(),
                isFromCurrentUser: conv.last_message_sender_id === session.user.id,
                senderId: conv.last_message_sender_id || '',
                senderUsername: '',
                senderName: '',
                receiverId: '',
                receiverUsername: '',
                receiverName: '',
                date: '',
                time: '',
                isRead: false,
            },
            unreadCount: conv.unread_count,
            updatedAt: new Date(conv.updated_at).getTime(),
        }));
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (participantId: string): Promise<void> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Delete the conversation
        await supabase
            .from('conversations')
            .delete()
            .eq('user_id', session.user.id)
            .eq('participant_id', participantId);
    } catch (error) {
        console.error('Error deleting conversation:', error);
    }
};

/**
 * Subscribe to conversation updates for the current user
 */
export const subscribeToConversations = (
    onUpdate: (conversation: Conversation) => void
): (() => void) => {
    // Get current user ID synchronously from cache or return empty unsubscribe
    let channel: any = null;

    (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const userId = session.user.id;

        channel = supabase
            .channel(`conversations:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations',
                    filter: `user_id=eq.${userId}`,
                },
                async (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        // Fetch the complete conversation with participant info
                        const { data } = await supabase
                            .from('conversations')
                            .select(`
                  *,
                  participant:participant_id(username, name, is_online, last_seen)
                `)
                            .eq('id', payload.new.id)
                            .single();

                        if (data) {
                            onUpdate({
                                id: data.id,
                                participantId: data.participant_id,
                                participantUsername: data.participant?.username || '',
                                participantName: data.participant?.name || '',
                                participantIsOnline: data.participant?.is_online || false,
                                participantLastSeen: data.participant?.last_seen ? new Date(data.participant.last_seen).getTime() : undefined,
                                lastMessage: {
                                    id: data.last_message_id || '',
                                    content: data.last_message_content || '',
                                    timestamp: data.last_message_timestamp ? new Date(data.last_message_timestamp).getTime() : Date.now(),
                                    isFromCurrentUser: data.last_message_sender_id === userId,
                                    senderId: data.last_message_sender_id || '',
                                    senderUsername: '',
                                    senderName: '',
                                    receiverId: '',
                                    receiverUsername: '',
                                    receiverName: '',
                                    date: '',
                                    time: '',
                                    isRead: false,
                                },
                                unreadCount: data.unread_count || 0,
                                updatedAt: new Date(data.updated_at).getTime(),
                            });
                        }
                    }
                }
            )
            .subscribe();
    })();

    // Return unsubscribe function
    return () => {
        if (channel) {
            supabase.removeChannel(channel);
        }
    };
};

/**
 * Get unread message count
 */
export const getUnreadCount = async (): Promise<number> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return 0;

        const { data, error } = await supabase
            .from('conversations')
            .select('unread_count')
            .eq('user_id', session.user.id);

        if (error) throw error;

        return data.reduce((total, conv) => total + conv.unread_count, 0);
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

/**
 * Update message reactions
 */
export const updateMessageReactions = async (
    messageId: string,
    reactions: string[]
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ reactions })
            .eq('id', messageId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating message reactions:', error);
        return false;
    }
};
