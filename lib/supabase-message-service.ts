import { Attachment, Conversation, Message, User } from '@/constants/message-types';
import { decryptMessage } from '@/utils/encryption';
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
 * Get registered users (excluding current user).
 * Paginated + server-side search. At scale, NEVER fetch all profiles.
 * - Default limit: 50
 * - `search`: when ≥2 chars, filters by name OR username via ILIKE.
 */
export const getRegisteredUsers = async (
    options?: { search?: string; limit?: number }
): Promise<User[]> => {
    try {
        const { search, limit = 50 } = options || {};
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        let q = supabase
            .from('profiles')
            .select('id, username, name, avatar_url, is_online, last_seen')
            .neq('id', session.user.id)
            .order('name')
            .limit(limit);

        const trimmed = search?.trim();
        if (trimmed && trimmed.length >= 2) {
            const body = (trimmed[0] === '@' || trimmed[0] === '#') ? trimmed.slice(1) : trimmed;
            const safe = body.replace(/[%_\\]/g, (m) => `\\${m}`);
            const pattern = `%${safe}%`;

            q = q.or(
                `name.ilike.${pattern},username.ilike.${pattern}`
            );
        }

        const { data, error } = await q;

        if (error) {
            logger.error('Error fetching registered users:', error);
            throw error;
        }

        return (data ?? []).map(profile => ({
            id: profile.id,
            username: profile.username,
            name: profile.name,
            isOnline: profile.is_online,
            lastSeen: new Date(profile.last_seen).getTime(),
            avatarUrl: profile.avatar_url,
            handleAt: (profile as any).handle_at ?? null,
            handleHash: (profile as any).handle_hash ?? null,
        }));
    } catch (error) {
        logger.error('Error fetching registered users:', error);
        return [];
    }
};

/**
 * Normalize a device phone number to E.164 format (best-effort, UAE +971 default).
 * Returns null if the number can't be reasonably normalized.
 */
const normalizePhone = (raw: string): string | null => {
    const digits = raw.replace(/[\s\-().]/g, '');
    if (!digits) return null;
    if (digits.startsWith('+')) return digits;
    // Already has country code without +
    if (digits.startsWith('00')) return `+${digits.slice(2)}`;
    // UAE local format: 05x xxxxxxx → +97105xxxxxxx
    if (digits.startsWith('0') && digits.length === 10) return `+971${digits.slice(1)}`;
    // Already a full number without leading 0 (9 digits UAE)
    if (digits.length === 9) return `+971${digits}`;
    return null;
};

/**
 * Batch-lookup Czar AI profiles by phone numbers.
 * Normalizes device numbers to E.164 before querying.
 * Returns a Map<normalizedPhone → User> for easy lookup.
 */
export const getProfilesByPhones = async (
    rawPhones: string[]
): Promise<Map<string, User>> => {
    const result = new Map<string, User>();
    try {
        if (rawPhones.length === 0) return result;

        console.log('[getProfilesByPhones] Raw phones:', rawPhones);

        const normalized = rawPhones
            .map(p => normalizePhone(p))
            .filter((p): p is string => p !== null);

        console.log('[getProfilesByPhones] Normalized phones:', normalized);

        if (normalized.length === 0) return result;

        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, name, avatar_url, is_online, last_seen, phone')
            .in('phone', normalized);

        if (error) {
            logger.error('getProfilesByPhones error:', error);
            return result;
        }

        console.log('[getProfilesByPhones] Found profiles:', data?.length || 0);

        (data ?? []).forEach((profile: any) => {
            if (!profile.phone) return;
            console.log('[getProfilesByPhones] Profile:', profile.username, 'phone:', profile.phone);
            const user: User = {
                id: profile.id,
                username: profile.username,
                name: profile.name,
                isOnline: profile.is_online,
                lastSeen: new Date(profile.last_seen).getTime(),
                avatarUrl: profile.avatar_url,
            };
            result.set(profile.phone, user);
            // Also index by all normalized variants of the phone so raw lookups work
            normalized.forEach(n => {
                if (n === profile.phone) result.set(n, user);
            });
            // Also index by raw phone numbers
            rawPhones.forEach(raw => {
                const rawDigits = raw.replace(/\D/g, '');
                const profileDigits = profile.phone.replace(/\D/g, '');
                if (rawDigits === profileDigits) {
                    result.set(raw, user);
                    console.log('[getProfilesByPhones] Indexed raw phone:', raw, 'for user:', profile.username);
                }
            });
        });

        console.log('[getProfilesByPhones] Map keys:', Array.from(result.keys()));
    } catch (e) {
        logger.error('getProfilesByPhones exception:', e);
    }
    return result;
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
        logger.info('Fetching user profile for userId:', userId);
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            logger.error('Error fetching user profile by ID:', error);
            throw error;
        }

        logger.info('User profile fetched:', {
            id: data.id,
            username: data.username,
            name: data.name,
            avatar_url: data.avatar_url,
            is_online: data.is_online
        });

        return {
            id: data.id,
            username: data.username,
            name: data.name,
            isOnline: data.is_online,
            lastSeen: new Date(data.last_seen).getTime(),
            avatarUrl: data.avatar_url,
            handleAt: data.handle_at ?? null,
            handleHash: data.handle_hash ?? null,
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

        // Validate UUID format to prevent database errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(receiverId)) {
            throw new Error('Invalid receiver ID format. Expected UUID format.');
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
                // Location-specific fields
                messageData.attachment_latitude = attachment.latitude;
                messageData.attachment_longitude = attachment.longitude;
                messageData.attachment_location_label = attachment.locationLabel;
                messageData.attachment_live_share_id = attachment.liveShareId;
                messageData.attachment_live_expires_at = attachment.liveExpiresAt
                    ? new Date(attachment.liveExpiresAt).toISOString()
                    : null;
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
                latitude: result.attachment_latitude ?? undefined,
                longitude: result.attachment_longitude ?? undefined,
                locationLabel: result.attachment_location_label ?? undefined,
                liveShareId: result.attachment_live_share_id ?? undefined,
                liveExpiresAt: result.attachment_live_expires_at
                    ? new Date(result.attachment_live_expires_at).getTime()
                    : undefined,
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
 * Paginated: returns the most recent `limit` messages (default 50).
 * Pass `beforeTimestamp` (ISO string) to load older pages.
 * Result is always in ascending (oldest → newest) order for the UI.
 */
export const getMessages = async (
    otherUserId: string,
    options?: { limit?: number; beforeTimestamp?: string }
): Promise<Message[]> => {
    try {
        const { limit = 50, beforeTimestamp } = options || {};
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        // Validate UUID format to prevent database errors
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(otherUserId)) {
            console.error('Invalid UUID format for otherUserId:', otherUserId);
            return [];
        }

        let q = supabase
            .from('messages')
            .select(`
        *,
        sender:sender_id(username, name),
        receiver:receiver_id(username, name)
      `)
            .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${session.user.id})`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (beforeTimestamp) {
            q = q.lt('created_at', beforeTimestamp);
        }

        const { data, error } = await q;

        if (error) throw error;

        // Re-sort ascending (oldest first) for the UI, which expects chronological order.
        const rows = (data ?? []).slice().reverse();

        return rows.map(msg => ({
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
                latitude: msg.attachment_latitude ?? undefined,
                longitude: msg.attachment_longitude ?? undefined,
                locationLabel: msg.attachment_location_label ?? undefined,
                liveShareId: msg.attachment_live_share_id ?? undefined,
                liveExpiresAt: msg.attachment_live_expires_at
                    ? new Date(msg.attachment_live_expires_at).getTime()
                    : undefined,
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
    let channel: any = null;
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    const MAX_RECONNECT_ATTEMPTS = 10;
    const BASE_RECONNECT_DELAY_MS = 2000;
    const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

    const handleMessageChange = async (payload: any) => {
        try {
            // Use payload.new directly — avoids an extra DB round-trip per realtime event.
            // Sender/receiver names are left blank; the consumer (chat screen) already has
            // both participants loaded in local state and enriches the message there.
            const data = payload.new;
            if (!data) return;

            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user.id;

            // Only process messages that involve the current conversation
            const isRelevantMessage =
                (data.sender_id === otherUserId && data.receiver_id === userId) ||
                (data.sender_id === userId && data.receiver_id === otherUserId);

            if (!isRelevantMessage) return;

            onNewMessage({
                id: data.id,
                senderId: data.sender_id,
                senderUsername: '',
                senderName: '',
                receiverId: data.receiver_id,
                receiverUsername: '',
                receiverName: '',
                content: decryptMessage(data.content),
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
                    latitude: data.attachment_latitude ?? undefined,
                    longitude: data.attachment_longitude ?? undefined,
                    locationLabel: data.attachment_location_label ?? undefined,
                    liveShareId: data.attachment_live_share_id ?? undefined,
                    liveExpiresAt: data.attachment_live_expires_at
                        ? new Date(data.attachment_live_expires_at).getTime()
                        : undefined,
                    thumbnailUrl: data.attachment_thumbnail_url,
                    duration: data.attachment_duration,
                    width: data.attachment_width,
                    height: data.attachment_height,
                } : undefined,
            });
        } catch (error) {
            logger.error('Error handling realtime message:', error);
        }
    };

    // Clear all timers
    const clearTimers = () => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    };

    // Setup heartbeat to keep connection alive
    const setupHeartbeat = () => {
        heartbeatTimer = setInterval(() => {
            if (channel && channel.state === 'joined') {
                // Send heartbeat by calling a lightweight operation
                channel.send({ type: 'heartbeat' });
            }
        }, HEARTBEAT_INTERVAL_MS);
    };

    // Reconnect function with exponential backoff
    const reconnect = () => {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            logger.warn('Messages: Max reconnection attempts reached — will retry on next interaction');
            return;
        }

        reconnectAttempts++;
        const backoffDelay = Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1), 30000);
        logger.info(`Messages: Attempting reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${backoffDelay}ms`);

        reconnectTimer = setTimeout(() => {
            if (channel) supabase.removeChannel(channel);
            createChannel();
        }, backoffDelay);
    };

    // Create channel function
    const createChannel = () => {
        // Create unique channel name
        const channelName = `messages:${otherUserId}:${Date.now()}`;
        
        channel = supabase
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
                    reconnectAttempts = 0; // Reset counter on successful connection
                    setupHeartbeat();
                } else if (status === 'CHANNEL_ERROR') {
                    logger.warn('Messages: Realtime channel error - scheduling reconnect');
                    clearTimers();
                    reconnect();
                } else if (status === 'TIMED_OUT') {
                    logger.warn('Messages: Realtime subscription timed out - scheduling reconnect');
                    clearTimers();
                    reconnect();
                } else if (status === 'CLOSED') {
                    logger.warn('Realtime channel closed');
                    clearTimers();
                }
            });
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

    // Initial channel creation
    createChannel();

    // Return unsubscribe function
    return () => {
        logger.info('Unsubscribing from messages channel');
        clearTimers();
        if (channel) {
            supabase.removeChannel(channel);
        }
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

        logger.info('Fetching conversations for user:', session.user.id);

        const { data, error } = await supabase
            .from('conversations')
            .select(`
        *,
        participant:participant_id(username, name, is_online, last_seen, avatar_url)
      `)
            .eq('user_id', session.user.id)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        logger.info('Conversations fetched:', data.length);
        data.forEach(conv => {
            logger.info('Conversation participant:', {
                participantId: conv.participant_id,
                participantUsername: conv.participant.username,
                participantAvatarUrl: conv.participant.avatar_url
            });
        });

        return data.map(conv => ({
            id: conv.id,
            participantId: conv.participant_id,
            participantUsername: conv.participant.username,
            participantName: conv.participant.name,
            participantIsOnline: conv.participant.is_online,
            participantLastSeen: conv.participant.last_seen ? new Date(conv.participant.last_seen).getTime() : undefined,
            participantAvatarUrl: conv.participant.avatar_url,
            lastMessage: {
                id: conv.last_message_id || '',
                content: decryptMessage(conv.last_message_content || ''),
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
    let channel: any = null;
    let userId: string | null = null;
    let reconnectAttempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    const MAX_RECONNECT_ATTEMPTS = 10;
    const BASE_RECONNECT_DELAY_MS = 2000;
    const HEARTBEAT_INTERVAL_MS = 30000;

    const clearTimers = () => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    };

    const setupHeartbeat = () => {
        heartbeatTimer = setInterval(() => {
            if (channel && channel.state === 'joined') {
                channel.send({ type: 'heartbeat' });
            }
        }, HEARTBEAT_INTERVAL_MS);
    };

    const reconnect = () => {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            logger.warn('Conversations: Max reconnection attempts reached — will retry on next interaction');
            return;
        }
        reconnectAttempts++;
        const backoffDelay = Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1), 30000);
        logger.info(`Conversations: Attempting reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${backoffDelay}ms`);
        reconnectTimer = setTimeout(() => {
            if (channel) supabase.removeChannel(channel);
            createChannel();
        }, backoffDelay);
    };

    const createChannel = () => {
        if (!userId) return;
        
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
                        const { data } = await supabase
                            .from('conversations')
                            .select(`
                  *,
                  participant:participant_id(username, name, is_online, last_seen, avatar_url)
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
                                participantAvatarUrl: data.participant?.avatar_url,
                                lastMessage: {
                                    id: data.last_message_id || '',
                                    content: decryptMessage(data.last_message_content || ''),
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
            .subscribe((status) => {
                logger.info('Conversations realtime status:', status);
                if (status === 'SUBSCRIBED') {
                    reconnectAttempts = 0;
                    setupHeartbeat();
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    clearTimers();
                    reconnect();
                } else if (status === 'CLOSED') {
                    clearTimers();
                }
            });
    };

    // Initialize
    (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        userId = session.user.id;
        createChannel();
    })();

    // Return unsubscribe function
    return () => {
        clearTimers();
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
        // Validate session first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            logger.error('Cannot update reactions: No active session');
            return false;
        }

        logger.info('Updating reactions:', { messageId, reactions, userId: session.user.id });

        const { data, error } = await supabase
            .from('messages')
            .update({ reactions })
            .eq('id', messageId)
            .select();

        if (error) {
            logger.error('Supabase error updating reactions:', error);
            throw error;
        }

        logger.info('Reactions updated successfully:', { messageId, data });
        return true;
    } catch (error) {
        logger.error('Error updating message reactions:', error);
        return false;
    }
};
