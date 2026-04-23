import { AttachmentModal } from '@/components/messages/attachment-modal';
import { AttachmentRenderer } from '@/components/messages/attachment-renderer';
import { CharismaAttachmentModal } from '@/components/messages/charisma-attachment-modal';
import { ColorPickerModal } from '@/components/messages/color-picker-modal';
import { EmojiPickerModal } from '@/components/messages/emoji-picker-modal';
import { ForwardModal } from '@/components/messages/forward-modal';
import { LocationPickerModal, LocationSendPayload } from '@/components/messages/location-picker-modal';
import {
    beginLiveLocationWatcher,
    createLiveLocationRow,
} from '@/lib/location-service';
import { CharismaEntriesPreview } from '@/components/profile/charisma-entries-preview';
import { FollowButton } from '@/components/profile/follow-button';
import { SharedLinksPreview } from '@/components/profile/shared-links-preview';
import { SocialLinksDisplay } from '@/components/profile/social-links-display';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WhatsAppBackground } from '@/components/ui/whatsapp-background';
import { Attachment, Message, User } from '@/constants/message-types';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { formatCharismaEntryForMessage } from '@/utils/charisma-share-utils';
import {
    getFollowCounts,
    getUserEntries,
    getUserEntryCount,
    getUserFullProfile,
    getUserSharedLinks,
    isFollowing as checkIsFollowing,
} from '@/utils/follow-utils';
import {
    getCurrentUser,
    getMessages,
    getUserProfile,
    sendMessage,
    subscribeToMessages,
    updateConversation,
    updateMessageReactions,
} from '@/utils/message-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const { id, username, name, avatarUrl } = params as { id: string; username: string; name: string; avatarUrl?: string };

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canChat, setCanChat] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<User>({
    id,
    username,
    name,
    avatarUrl: avatarUrl || undefined,
    isOnline: false,
  });
  const [showMediaAttachmentModal, setShowMediaAttachmentModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showCharismaModal, setShowCharismaModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [activeLiveShare, setActiveLiveShare] = useState<{ id: string; expiresAt: number } | null>(null);
  const liveShareStopRef = useRef<null | (() => Promise<void>)>(null);
  const [liveCountdownNow, setLiveCountdownNow] = useState<number>(Date.now());
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [currentUserPhoto, setCurrentUserPhoto] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [messageTextColor, setMessageTextColor] = useState<string>('#000000');
  const [receivedMessageTextColor, setReceivedMessageTextColor] = useState<string>('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerMode, setColorPickerMode] = useState<'sent' | 'received'>('sent');

  // Follow feature state
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [profileSocialLinks, setProfileSocialLinks] = useState<Record<string, string>>({});
  const [profileBio, setProfileBio] = useState('');
  const [profileEntries, setProfileEntries] = useState<any[]>([]);
  const [profileEntryCount, setProfileEntryCount] = useState(0);
  const [profileSharedLinks, setProfileSharedLinks] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  // Message pagination state — chat loads newest 50 first, older pages on scroll.
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  // Refs for realtime enrichment — realtime payloads arrive without sender/receiver
  // profile joins (N+1 fix), so we fill them in from already-loaded local state.
  const currentUserRef = useRef(currentUser);
  const otherUserRef = useRef(otherUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { otherUserRef.current = otherUser; }, [otherUser]);

    useEffect(() => {
    initializeChat().then(() => {
      // Load current user photo after currentUser is populated by initializeChat
      loadCurrentUserPhoto();
    });
    loadSubscriptionStatus();
    loadMuteStatus();
    // loadProfilePhoto() is not needed here - initializeChat sets profilePhoto from Supabase data
    loadTextColor();

    // Subscribe to real-time messages
    const unsubscribe = subscribeToMessages(id, (newMessage) => {
      // Validate message before processing
      if (!newMessage || !newMessage.id) {
        console.warn('Received invalid message:', newMessage);
        return;
      }
      
      // Enrich with sender/receiver names from local state (realtime skips the join)
      const cu = currentUserRef.current;
      const ou = otherUserRef.current;
      const enriched: Message = {
        ...newMessage,
        senderName: newMessage.senderName || (newMessage.isFromCurrentUser ? cu?.name : ou?.name) || '',
        senderUsername: newMessage.senderUsername || (newMessage.isFromCurrentUser ? cu?.username : ou?.username) || '',
        receiverName: newMessage.receiverName || (newMessage.isFromCurrentUser ? ou?.name : cu?.name) || '',
        receiverUsername: newMessage.receiverUsername || (newMessage.isFromCurrentUser ? ou?.username : cu?.username) || '',
      };
      
      setMessages(prev => {
        // Use a Map to ensure uniqueness and better performance
        const messageMap = new Map(prev.map(m => [m.id, m]));
        const existing = messageMap.get(enriched.id);
        
        if (!existing) {
          // Add new message
          messageMap.set(enriched.id, enriched);
          return Array.from(messageMap.values());
        }
        
        // Update existing message if it's newer (for reactions / read status)
        if (enriched.timestamp > existing.timestamp || 
            enriched.reactions?.length !== existing.reactions?.length ||
            enriched.isRead !== existing.isRead) {
          messageMap.set(enriched.id, enriched);
          return Array.from(messageMap.values());
        }
        
        return prev; // No update needed
      });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [id]);

  // Reload current user photo whenever currentUser changes (e.g., when avatarUrl is updated)
  useEffect(() => {
    if (currentUser) {
      loadCurrentUserPhoto();
    }
  }, [currentUser?.id, currentUser?.avatarUrl]);

  const loadMuteStatus = async () => {
    try {
      const muteKey = `@chat_muted_${otherUser.id}`;
      const muted = await AsyncStorage.getItem(muteKey);
      setIsMuted(muted === 'true');
    } catch (error) {
      console.error('Error loading mute status:', error);
    }
  };

  const loadTextColor = async () => {
    try {
      const sentColorKey = `@message_text_color_${id}`;
      const receivedColorKey = `@received_message_text_color_${id}`;
      
      const savedSentColor = await AsyncStorage.getItem(sentColorKey);
      const savedReceivedColor = await AsyncStorage.getItem(receivedColorKey);
      
      if (savedSentColor) {
        setMessageTextColor(savedSentColor);
      }
      if (savedReceivedColor) {
        setReceivedMessageTextColor(savedReceivedColor);
      }
    } catch (error) {
      console.error('Error loading text color:', error);
    }
  };

  // Set profile photo when otherUser data arrives from Supabase
  useEffect(() => {
    if (otherUser.avatarUrl && !profilePhoto) {
      console.log('otherUser updated with avatarUrl, setting profile photo:', otherUser.avatarUrl);
      setProfilePhoto(otherUser.avatarUrl);
    }
  }, [otherUser.avatarUrl]);

  const handleSelectTextColor = async (color: string) => {
    try {
      if (colorPickerMode === 'sent') {
        setMessageTextColor(color);
        const colorKey = `@message_text_color_${id}`;
        await AsyncStorage.setItem(colorKey, color);
      } else {
        setReceivedMessageTextColor(color);
        const colorKey = `@received_message_text_color_${id}`;
        await AsyncStorage.setItem(colorKey, color);
      }
    } catch (error) {
      console.error('Error saving text color:', error);
    }
  };

  const loadSubscriptionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserEmail = session?.user?.email || null;
      setCanChat(!!session);
      setUserEmail(currentUserEmail);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setCanChat(false);
      setUserEmail(null);
    }
  };


  const initializeChat = async () => {
    try {
      console.log('=== initializeChat called ===');
      console.log('Initial params:', { id, username, name, avatarUrl });
      
      const [currentUserData, chatMessages, otherUserData] = await Promise.all([
        getCurrentUser(),
        getMessages(id),
        getUserProfile(id), // Fetch other user's profile including avatar
      ]);

      console.log('Fetched data:', {
        currentUserData: currentUserData ? { id: currentUserData.id, avatarUrl: currentUserData.avatarUrl } : null,
        otherUserData: otherUserData ? { id: otherUserData.id, avatarUrl: otherUserData.avatarUrl } : null
      });

      setCurrentUser(currentUserData);
      setMessages(chatMessages);

      // Update otherUser with fetched profile data including avatarUrl
      if (otherUserData) {
        console.log('Updating otherUser with fetched data:', {
          id: otherUserData.id,
          username: otherUserData.username,
          name: otherUserData.name,
          avatarUrl: otherUserData.avatarUrl
        });
        
        setOtherUser({
          id: otherUserData.id,
          username: otherUserData.username,
          name: otherUserData.name,
          avatarUrl: otherUserData.avatarUrl,
          isOnline: otherUserData.isOnline,
          lastSeen: otherUserData.lastSeen,
          handleAt: otherUserData.handleAt ?? null,
          handleHash: otherUserData.handleHash ?? null,
        });
        // Set profile photo from Supabase avatar (prefer fetched data over passed params)
        if (otherUserData.avatarUrl) {
          console.log('Setting profile photo from Supabase:', otherUserData.avatarUrl);
          setProfilePhoto(otherUserData.avatarUrl);
        } else {
          console.log('No avatarUrl in fetched profile data');
        }
      } else {
        console.log('No otherUserData fetched');
        if (avatarUrl) {
          console.log('Using passed avatarUrl as fallback:', avatarUrl);
          setProfilePhoto(avatarUrl);
        }
      }

      // If no current user (not authenticated), create a demo user for testing
      if (!currentUserData) {
        const demoUser: User = {
          id: 'demo_current_user',
          username: 'demo_user',
          name: 'Demo User',
          isOnline: true,
        };
        setCurrentUser(demoUser);
        console.log('Using demo user as currentUser');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const chatMessages = await getMessages(id);
      // Validate and filter messages
      const validMessages = chatMessages.filter(msg => msg && msg.id);
      // Remove duplicates using Map
      const uniqueMessages = Array.from(new Map(validMessages.map(m => [m.id, m])).values());
      // Sort by timestamp to ensure correct order
      uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(uniqueMessages);
      // Initial page of 50 — if we got fewer, no more pages exist.
      setHasMoreMessages(uniqueMessages.length >= 50);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  /**
   * Load an older page of messages using the oldest currently-loaded message
   * as the cursor. Called from FlatList onEndReached (which, because the list
   * is inverted, corresponds to scrolling up past the oldest message).
   */
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreMessages) return;
    if (messages.length === 0) return;
    // messages[] is ascending, so [0] is the oldest we have.
    const oldest = messages[0];
    if (!oldest?.timestamp) return;
    setLoadingOlder(true);
    try {
      const older = await getMessages(id, {
        limit: 50,
        beforeTimestamp: new Date(oldest.timestamp).toISOString(),
      });
      
      // Validate and filter older messages
      const validOlder = older.filter(msg => msg && msg.id);
      if (validOlder.length < 50) setHasMoreMessages(false);
      
      if (validOlder.length > 0) {
        setMessages(prev => {
          // Create a Map to ensure uniqueness across all messages
          const messageMap = new Map(prev.map(m => [m.id, m]));
          // Add only new older messages
          validOlder.forEach(msg => {
            if (!messageMap.has(msg.id)) {
              messageMap.set(msg.id, msg);
            }
          });
          // Convert back to array and sort by timestamp
          const allMessages = Array.from(messageMap.values());
          allMessages.sort((a, b) => a.timestamp - b.timestamp);
          return allMessages;
        });
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [id, messages, loadingOlder, hasMoreMessages]);

  const handleSendMessage = async (overrideText?: string) => {
    console.log('=== handleSendMessage called ===');
    console.log('currentUser:', currentUser);
    console.log('otherUser:', otherUser);
    console.log('canChat:', canChat);
    console.log('pendingAttachment:', pendingAttachment);

    const textToSend = overrideText ?? messageText;
    console.log('textToSend:', textToSend);

    if ((!textToSend.trim() && !pendingAttachment) || !currentUser) {
      console.log('Early return: no textToSend/attachment or currentUser');
      return;
    }

    // Signed-in users can send messages; demo users can still use local handling.
    const isDemoUser = otherUser.id.startsWith('demo_');
    const isContactUser = otherUser.id.startsWith('contact_');
    
    // Validate session for real users
    if (!isDemoUser && !isContactUser) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert(
          'Sign in required',
          'Your session has expired. Please sign in again to send messages.',
          [
            { text: 'OK', style: 'default' }
          ]
        );
        return;
      }
    }

    try {
      setSending(true);
      console.log('Attempting to send message...');
      
      const newMessage = await sendMessage(
        otherUser.id,
        otherUser.username,
        otherUser.name,
        textToSend.trim(),
        pendingAttachment || undefined
      );

      console.log('Message sent successfully:', newMessage.id);
      setMessages(prev => [...prev, newMessage]);
      setMessageText('');
      setPendingAttachment(null);
      await updateConversation(newMessage);
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Show user-friendly error message
      const errorMessage = error?.userMessage || error?.message || 'Failed to send message';
      const errorCode = error?.code;
      
      let alertTitle = 'Message Failed';
      let alertMessage = errorMessage;
      
      // Provide specific guidance based on error type
      if (errorMessage.includes('session') || errorMessage.includes('Session expired')) {
        alertTitle = 'Session Expired';
        alertMessage = 'Your session has expired. Please sign in again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
        alertTitle = 'Connection Error';
        alertMessage = 'Unable to connect. Please check your internet connection and try again.';
      } else if (errorMessage.includes('profile not found')) {
        alertTitle = 'User Not Available';
        alertMessage = 'This user is not available. They may need to sign in first.';
      }
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          { 
            text: 'Retry', 
            onPress: () => handleSendMessage(),
            style: 'default'
          },
          { 
            text: 'Cancel', 
            style: 'cancel'
          }
        ]
      );
    } finally {
      setSending(false);
    }
  };

  const handleAttachMedia = (attachment: Attachment) => {
    console.log('=== handleAttachMedia called ===');
    console.log('attachment:', attachment);
    setPendingAttachment(attachment);
    setShowMediaAttachmentModal(false);
  };

  const handleClearAttachment = () => {
    setPendingAttachment(null);
  };

  const handleAttachCharisma = (entry: CharismaEntry) => {
    console.log('=== handleAttachCharisma called ===');
    console.log('entry:', entry);

    // Format the charisma entry as a shareable message
    const charismaMessage = formatCharismaEntryForMessage(entry);
    console.log('charismaMessage:', charismaMessage);

    // Set the formatted message as the message text
    setMessageText(charismaMessage);
    console.log('messageText set to:', charismaMessage);

    // Close the attachment modal
    setShowCharismaModal(false);
  };

  // ---------- Location sharing ----------

  const handleSendLocation = async (payload: LocationSendPayload) => {
    if (!currentUser) return;
    try {
      if (payload.kind === 'snapshot') {
        const attachment: Attachment = {
          type: 'location',
          url: `geo:${payload.latitude},${payload.longitude}`,
          latitude: payload.latitude,
          longitude: payload.longitude,
          locationLabel: payload.label,
        };
        const msg = await sendMessage(
          otherUser.id,
          otherUser.username,
          otherUser.name,
          '',
          attachment,
        );
        setMessages((prev) => [...prev, msg]);
        await updateConversation(msg);
        return;
      }

      // Live share: send message first (to get message_id), then create live row,
      // then update the message's attachment_live_share_id and begin the watcher.
      const expiresAtMs = Date.now() + payload.durationSec * 1000;
      const liveAttachment: Attachment = {
        type: 'location',
        url: `geo:${payload.initial.latitude},${payload.initial.longitude}`,
        latitude: payload.initial.latitude,
        longitude: payload.initial.longitude,
        locationLabel: payload.label,
        liveExpiresAt: expiresAtMs,
      };
      const msg = await sendMessage(
        otherUser.id,
        otherUser.username,
        otherUser.name,
        '',
        liveAttachment,
      );

      const liveId = await createLiveLocationRow({
        messageId: msg.id,
        sharerId: currentUser.id,
        durationSec: payload.durationSec,
        initial: payload.initial,
      });
      if (!liveId) {
        Alert.alert('Error', 'Could not start live location.');
        setMessages((prev) => [...prev, msg]);
        return;
      }

      // Patch the message row to reference the live share.
      await supabase
        .from('messages')
        .update({ attachment_live_share_id: liveId })
        .eq('id', msg.id);

      // Begin foreground watcher.
      const stopFn = await beginLiveLocationWatcher(liveId, expiresAtMs);
      liveShareStopRef.current = stopFn;
      setActiveLiveShare({ id: liveId, expiresAt: expiresAtMs });

      // Patch the local message object so the UI renders the live card immediately.
      const patched = { ...msg, attachment: { ...msg.attachment!, liveShareId: liveId } };
      setMessages((prev) => [...prev, patched]);
      await updateConversation(patched);
    } catch (e) {
      console.error('handleSendLocation failed:', e);
      Alert.alert('Error', 'Failed to share location.');
    }
  };

  const handleStopLiveShare = async () => {
    if (liveShareStopRef.current) {
      await liveShareStopRef.current();
      liveShareStopRef.current = null;
    }
    setActiveLiveShare(null);
  };

  // Stop watcher on unmount, tick countdown, auto-expire when reached.
  useEffect(() => {
    if (!activeLiveShare) return;
    const tick = setInterval(() => setLiveCountdownNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, [activeLiveShare]);

  useEffect(() => {
    if (!activeLiveShare) return;
    if (liveCountdownNow >= activeLiveShare.expiresAt) {
      handleStopLiveShare();
    }
  }, [liveCountdownNow, activeLiveShare]);

  useEffect(() => {
    return () => {
      // On unmount, stop any active watcher (does not cancel the share server-side
      // if the user just backgrounds the screen — explicit stop is required via the banner).
      if (liveShareStopRef.current) {
        liveShareStopRef.current().catch(() => {});
        liveShareStopRef.current = null;
      }
    };
  }, []);

  const handleForwardMessage = async (recipientId: string, recipientUsername: string, recipientName: string) => {
    if (!messageToForward || !currentUser) return;

    // Validate session before forwarding
    const { data: { session } } = await supabase.auth.getSession();
    if (!session && !recipientId.startsWith('demo_')) {
      Alert.alert('Sign in required', 'Please sign in to forward messages.');
      return;
    }

    try {
      const forwardedContent = `📩 Forwarded from ${messageToForward.senderName}\n\n${messageToForward.content}`;
      
      await sendMessage(recipientId, recipientUsername, recipientName, forwardedContent);
      Alert.alert('Success', 'Message forwarded successfully');
      setShowForwardModal(false);
      setMessageToForward(null);
    } catch (error) {
      console.error('Error forwarding message:', error);
      Alert.alert('Error', 'Failed to forward message');
    }
  };

  const handleCopyMessage = (content: string) => {
    Alert.alert('Copied', 'Message copied to clipboard');
    setSelectedMessageId(null);
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedMessageId(null) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setMessages(prev => prev.filter(m => m.id !== messageId));
            setSelectedMessageId(null);
          }
        }
      ]
    );
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    console.log('handleAddReaction called:', { messageId, emoji });
    
    // Find the message and calculate new reactions first
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      console.warn('Message not found:', messageId);
      return;
    }

    const currentReactions = message.reactions || [];
    const updatedReactions = currentReactions.includes(emoji)
      ? currentReactions.filter(r => r !== emoji) // Remove if exists (toggle off)
      : [...currentReactions, emoji]; // Add if not exists
    
    console.log('Updating reactions:', { 
      messageId, 
      currentReactions, 
      updatedReactions,
      action: currentReactions.includes(emoji) ? 'remove' : 'add'
    });

    // Update local state immediately for responsive UI
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, reactions: updatedReactions } : msg
    ));
    setReactionMessageId(null);

    // Persist to Supabase for real-time sync
    try {
      const result = await updateMessageReactions(messageId, updatedReactions);
      console.log('updateMessageReactions result:', result);
    } catch (error) {
      console.error('Error updating reactions:', error);
      // Revert on error
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, reactions: currentReactions } : msg
      ));
    }
  };

  const handleMenuPress = () => {
    if (!canChat || !userEmail) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to access chat options.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowMenu(!showMenu);
  };

  const handleClearChat = async () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this conversation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear messages from AsyncStorage
              const MESSAGES_KEY = '@charisma_messages';
              const messagesData = await AsyncStorage.getItem(MESSAGES_KEY);

              if (messagesData) {
                const allMessages = JSON.parse(messagesData);
                // Filter out messages for this conversation
                const filteredMessages = allMessages.filter((msg: any) =>
                  !(msg.senderId === currentUser?.id && msg.receiverId === otherUser.id) &&
                  !(msg.senderId === otherUser.id && msg.receiverId === currentUser?.id)
                );

                await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(filteredMessages));
              }

              // Clear conversation from conversations list
              const CONVERSATIONS_KEY = '@charisma_conversations';
              const conversationsData = await AsyncStorage.getItem(CONVERSATIONS_KEY);

              if (conversationsData) {
                const conversations = JSON.parse(conversationsData);
                const filteredConversations = conversations.filter((conv: any) =>
                  conv.userId !== otherUser.id
                );
                await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filteredConversations));
              }

              // Clear local state
              setMessages([]);
              setShowMenu(false);
              Alert.alert('Success', 'Chat cleared successfully');
            } catch (error) {
              console.error('Error clearing chat:', error);
              Alert.alert('Error', 'Failed to clear chat');
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = async () => {
    setShowMenu(false);
    if (!userEmail) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to view user profiles.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => router.push('/subscription'),
          },
        ]
      );
      return;
    }
    loadProfilePhoto();
    setShowProfile(true);
    setProfileLoading(true);
    await loadProfileData({ includeFollowStatus: true });
    setProfileLoading(false);
  };

  /**
   * Loads (or reloads) the profile modal's gated data: bio, social links,
   * charisma entries preview, entry count, and follow counts. Called on
   * profile open AND after follow/unfollow so newly-unlocked sections
   * (Charisma Entries, Social Links) populate immediately without needing
   * to reopen the modal.
   */
  const loadProfileData = async (opts?: { includeFollowStatus?: boolean }) => {
    try {
      const tasks: Promise<any>[] = [
        getUserFullProfile(otherUser.id),
        getFollowCounts(otherUser.id),
        getUserEntries(otherUser.id, 50),
        getUserEntryCount(otherUser.id),
        getUserSharedLinks(otherUser.id, 50),
      ];
      if (opts?.includeFollowStatus) {
        tasks.push(
          currentUser ? checkIsFollowing(currentUser.id, otherUser.id) : Promise.resolve(false)
        );
      }

      const [fullProfile, counts, entries, entryCount, sharedLinks, followStatus] = await Promise.all(tasks);

      console.log('[loadProfileData] result', {
        otherUserId: otherUser.id,
        includeFollowStatus: !!opts?.includeFollowStatus,
        followStatus,
        entriesLen: Array.isArray(entries) ? entries.length : 'not-array',
        entryCount,
        socialLinksKeys: fullProfile?.social_links ? Object.keys(fullProfile.social_links) : null,
        hasBio: !!fullProfile?.bio,
      });

      setFollowCounts(counts);
      setProfileEntries(entries);
      setProfileEntryCount(entryCount);
      setProfileSharedLinks(sharedLinks || []);

      if (fullProfile) {
        setProfileBio(fullProfile.bio || '');
        setProfileSocialLinks(fullProfile.social_links || {});
      }

      if (opts?.includeFollowStatus) {
        setIsFollowingUser(!!followStatus);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const loadProfilePhoto = async () => {
    try {
      // First check if we already have avatarUrl from Supabase profile
      if (otherUser.avatarUrl) {
        setProfilePhoto(otherUser.avatarUrl);
        return;
      }
      // Fallback to AsyncStorage for local-only users
      const photoKey = `@profile_photo_${otherUser.id}`;
      const savedPhoto = await AsyncStorage.getItem(photoKey);
      setProfilePhoto(savedPhoto);
    } catch (error) {
      console.error('Error loading profile photo:', error);
    }
  };

  const loadCurrentUserPhoto = async () => {
    try {
      // Use currentUser state that was populated by initializeChat()
      if (currentUser) {
        // Use Supabase avatarUrl if available
        if (currentUser.avatarUrl) {
          console.log('Setting current user photo from avatarUrl:', currentUser.avatarUrl);
          setCurrentUserPhoto(currentUser.avatarUrl);
          return;
        }
        // Fallback to AsyncStorage for local-only users
        const photoKey = `@profile_photo_${currentUser.id}`;
        const savedPhoto = await AsyncStorage.getItem(photoKey);
        if (savedPhoto) {
          console.log('Setting current user photo from AsyncStorage:', savedPhoto);
        }
        setCurrentUserPhoto(savedPhoto);
      } else {
        console.log('No current user available for photo load');
      }
    } catch (error) {
      console.error('Error loading current user photo:', error);
    }
  };

  const [isMuted, setIsMuted] = useState(false);

  const handleMuteNotifications = () => {
    setShowMenu(false);
    setIsMuted(!isMuted);

    // Store mute status in AsyncStorage
    const muteKey = `@chat_muted_${otherUser.id}`;
    if (!isMuted) {
      AsyncStorage.setItem(muteKey, 'true');
      Alert.alert('Muted', `Notifications muted for ${otherUser.name}`);
    } else {
      AsyncStorage.removeItem(muteKey);
      Alert.alert('Unmuted', `Notifications enabled for ${otherUser.name}`);
    }
  };

  const handleBlockUser = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${otherUser.name}? You will not receive messages from this user and the conversation will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get current blocked users list
              const BLOCKED_USERS_KEY = '@charisma_blocked_users';
              const blockedData = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
              let blockedUsers: string[] = [];

              if (blockedData) {
                blockedUsers = JSON.parse(blockedData);
              }

              // Add user to blocked list
              if (!blockedUsers.includes(otherUser.id)) {
                blockedUsers.push(otherUser.id);
                await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedUsers));
              }

              // Clear all messages from this conversation
              const MESSAGES_KEY = '@charisma_messages';
              const messagesData = await AsyncStorage.getItem(MESSAGES_KEY);

              if (messagesData) {
                const allMessages = JSON.parse(messagesData);
                const filteredMessages = allMessages.filter((msg: any) =>
                  !(msg.senderId === currentUser?.id && msg.receiverId === otherUser.id) &&
                  !(msg.senderId === otherUser.id && msg.receiverId === currentUser?.id)
                );

                await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(filteredMessages));
              }

              // Remove conversation from conversations list
              const CONVERSATIONS_KEY = '@charisma_conversations';
              const conversationsData = await AsyncStorage.getItem(CONVERSATIONS_KEY);

              if (conversationsData) {
                const conversations = JSON.parse(conversationsData);
                const filteredConversations = conversations.filter((conv: any) =>
                  conv.userId !== otherUser.id
                );
                await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filteredConversations));
              }

              setShowMenu(false);
              Alert.alert('Blocked', `${otherUser.name} has been blocked`);
              router.back();
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user');
            }
          },
        },
      ]
    );
  };


  const handleBack = () => {
    router.back();
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    // Safety check for invalid message data
    if (!item || !item.id) {
      console.warn('Invalid message item in renderMessageItem:', item);
      return null;
    }
    
    // Date separator: show above the first message of each date group
    // In inverted list, index+1 is the visually-above (older) item
    const nextItem = reversedMessages[index + 1];
    const showDateSeparator = !nextItem || nextItem.date !== item.date;
    const isFromCurrentUser = item.isFromCurrentUser;

    // Debug avatar state for received messages
    if (!isFromCurrentUser && index === 0) {
      console.log('=== Message Avatar Debug ===');
      console.log('Profile photo state:', profilePhoto);
      console.log('Other user avatarUrl:', otherUser.avatarUrl);
      console.log('Has avatar:', !!(profilePhoto || otherUser.avatarUrl));
    }
    const isForwarded = item.content.startsWith('📩 Forwarded from');
    const showActions = selectedMessageId === item.id;
    const showReactionPicker = reactionMessageId === item.id;
    const isHighlighted = showReactionPicker;
    
    const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

    // Parse formatted charisma entry message
    const parseCharismaMessage = (content: string) => {
      const lines = content.split('\n');
      const elements: React.ReactElement[] = [];

      lines.forEach((line, index) => {
        const uniqueKey = `${item.id}-line-${index}`;
        if (line.startsWith('**') && line.endsWith('**')) {
          // Charisma name (bold)
          elements.push(
            <Text key={uniqueKey} style={[
              styles.charismaName,
              { color: isFromCurrentUser ? messageTextColor : receivedMessageTextColor }
            ]}>
              {line.replace(/\*\*/g, '')}
            </Text>
          );
        } else if (line.startsWith('*') && line.endsWith('*')) {
          // Sub charisma (italic)
          elements.push(
            <Text key={uniqueKey} style={[
              styles.subCharisma,
              { color: isFromCurrentUser ? messageTextColor : receivedMessageTextColor }
            ]}>
              {line.replace(/\*/g, '')}
            </Text>
          );
        } else if (line.startsWith('Emotions:')) {
          // Emotions line
          const emotionText = line.replace('Emotions: ', '');
          elements.push(
            <View key={uniqueKey} style={styles.emotionsContainer}>
              <Text style={[
                styles.emotionsLabel,
                { color: isFromCurrentUser ? messageTextColor : receivedMessageTextColor }
              ]}>
                Emotions:{' '}
              </Text>
              <Text style={styles.emotionsText}>
                {emotionText}
              </Text>
            </View>
          );
        } else if (line.trim() === '') {
          // Empty line
          elements.push(<View key={uniqueKey} style={styles.emptyLine} />);
        } else {
          // Regular text (notes)
          elements.push(
            <Text key={uniqueKey} style={[
              styles.messageText,
              { color: isFromCurrentUser ? messageTextColor : receivedMessageTextColor }
            ]}>
              {line}
            </Text>
          );
        }
      });

      return <>{elements}</>;
    };

    return (
      <>
      {showDateSeparator && renderDateSeparator(item.date)}
      <View style={(showReactionPicker || showActions) ? { zIndex: 999 } : undefined}>
      <TouchableOpacity
        onLongPress={() => setReactionMessageId(item.id)}
        delayLongPress={500}
        activeOpacity={1}
        onPress={() => {
          if (showReactionPicker) setReactionMessageId(null);
          if (showActions) setSelectedMessageId(null);
        }}>
        <View style={[
          styles.messageContainer,
          isFromCurrentUser ? styles.messageRight : styles.messageLeft,
        ]}>
          {/* Avatar for received messages (left side) */}
          {!isFromCurrentUser && (
            (profilePhoto || otherUser.avatarUrl) ? (
              <Image source={{ uri: profilePhoto || otherUser.avatarUrl }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { backgroundColor: colors.gold }]}>
                <Text style={styles.messageAvatarText}>
                  {otherUser.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )
          )}

          <View style={styles.messageBubbleWrapper}>
          {isForwarded && (
            <View style={styles.forwardedLabel}>
              <IconSymbol size={12} name="arrowshape.turn.up.forward" color={colors.textSecondary} />
              <Text style={[styles.forwardedText, { color: colors.textSecondary }]}>
                Forwarded
              </Text>
            </View>
          )}
          
          <View style={[
            styles.messageBubble,
            {
              backgroundColor: isHighlighted
                ? colors.messageBubbleForwarded
                : (isForwarded && !isFromCurrentUser
                  ? colors.messageBubbleForwarded 
                  : (isFromCurrentUser ? colors.messageBubble : colors.messageBubbleReceived)),
              borderColor: colors.border,
            }
          ]}>
            {parseCharismaMessage(item.content)}
            
            {item.attachment && (
              <AttachmentRenderer 
                attachment={item.attachment} 
                isFromCurrentUser={isFromCurrentUser} 
              />
            )}
            
            <TouchableOpacity 
              style={styles.messageMenuButton}
              onPress={() => setSelectedMessageId(item.id)}
              activeOpacity={0.7}>
              <IconSymbol size={16} name="ellipsis" color={colors.textSecondary} />
            </TouchableOpacity>

            {!isFromCurrentUser && (
              <Text style={[
                styles.messageTime,
                {
                  color: colors.textSecondary,
                  textAlign: 'left'
                }
              ]}>
                {formatMessageTime(item.timestamp)}
              </Text>
            )}
          </View>


          {showActions && (
            <View style={[
              styles.messageActions,
              { 
                backgroundColor: colors.card,
                borderColor: colors.border,
                [isFromCurrentUser ? 'right' : 'left']: 0,
              }
            ]}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  setMessageToForward(item);
                  setShowForwardModal(true);
                  setSelectedMessageId(null);
                }}
                activeOpacity={0.7}>
                <IconSymbol size={20} name="arrowshape.turn.up.forward" color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Forward</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleCopyMessage(item.content)}
                activeOpacity={0.7}>
                <IconSymbol size={20} name="doc.on.doc" color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Copy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleDeleteMessage(item.id)}
                activeOpacity={0.7}>
                <IconSymbol size={20} name="trash" color="#FF3B30" />
                <Text style={[styles.actionText, { color: '#FF3B30' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.reactions && item.reactions.length > 0 && (
            <View style={styles.reactionsDisplay}>
              {item.reactions.map((emoji, index) => (
                <View key={`${item.id}-reaction-${index}-${emoji}`} style={[styles.reactionBadge, { backgroundColor: colors.card }]}>
                  <Text style={styles.reactionBadgeEmoji}>{emoji}</Text>
                </View>
              ))}
            </View>
          )}
          </View>

          {/* Avatar for sent messages (right side) */}
          {isFromCurrentUser && (
            (currentUserPhoto || currentUser?.avatarUrl) ? (
              <Image source={{ uri: currentUserPhoto || currentUser?.avatarUrl }} style={styles.messageAvatar} />
            ) : (
              <View style={[styles.messageAvatarPlaceholder, { backgroundColor: colors.gold }]}>
                <Text style={styles.messageAvatarText}>
                  {currentUser?.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )
          )}
        </View>
      </TouchableOpacity>

      {/* Reaction picker rendered OUTSIDE TouchableOpacity so taps aren't intercepted */}
      {showReactionPicker && (
        <View style={[
          styles.reactionPickerContainer,
          isFromCurrentUser ? { alignItems: 'flex-end', paddingRight: 12 } : { alignItems: 'flex-start', paddingLeft: 50 },
        ]}>
          <View 
            style={[
              styles.reactionPicker,
              { 
                backgroundColor: colors.card,
                borderColor: colors.border,
              }
            ]}
          >
            {quickReactions.map((emoji, index) => (
              <TouchableOpacity
                key={`${item.id}-picker-${index}-${emoji}`}
                style={styles.reactionButton}
                onPress={() => {
                  console.log('Reaction tapped:', emoji, 'for message:', item.id);
                  handleAddReaction(item.id, emoji);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                activeOpacity={0.6}>
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.reactionButton}
              onPress={() => setShowFullEmojiPicker(true)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              activeOpacity={0.6}>
              <Text style={styles.reactionPlus}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      </View>
      </>
    );
  };

  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateSeparatorLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.dateSeparatorText, { color: colors.textSecondary }]}>
        {date}
      </Text>
      <View style={[styles.dateSeparatorLine, { backgroundColor: colors.border }]} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Header with solid background */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}>
          <IconSymbol size={24} name="chevron.left" color={colors.text} />
        </TouchableOpacity>

        {(profilePhoto || otherUser.avatarUrl) ? (
          <Image
            source={{ uri: profilePhoto || otherUser.avatarUrl }}
            style={styles.headerAvatar}
          />
        ) : (
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.gold }]}>
            <Text style={styles.headerAvatarText}>
              {otherUser.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]}>
            {otherUser.name}
          </Text>
          <View style={styles.headerStatusRow}>
            <Text style={[styles.headerUsername, { color: colors.textSecondary }]}>
              {otherUser.handleAt ? `@${otherUser.handleAt}` : otherUser.handleHash ? `#${otherUser.handleHash}` : `@${otherUser.username}`}
            </Text>
            {canChat && (
              <View style={[styles.subscriptionBadge, { backgroundColor: 'rgba(52, 199, 89, 0.2)' }]}>
                <IconSymbol size={12} name="checkmark.circle.fill" color="#34C759" />
                <Text style={[styles.subscriptionBadgeText, { color: '#34C759' }]}>
                  Active
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.moreButtonContainer}>
          <TouchableOpacity
            style={[
              styles.moreButton,
              { opacity: (canChat && userEmail) ? 1 : 0.6 }
            ]}
            onPress={handleMenuPress}
            activeOpacity={0.7}>
            <IconSymbol size={24} name="ellipsis" color={(canChat && userEmail) ? colors.text : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active live-location banner */}
      {activeLiveShare && (
        <View style={styles.liveShareBanner}>
          <View style={styles.liveSharePulse} />
          <Text style={styles.liveShareText} numberOfLines={1}>
            Sharing live location
            {(() => {
              const left = activeLiveShare.expiresAt - liveCountdownNow;
              if (left <= 0) return ' · ending…';
              const mins = Math.ceil(left / 60_000);
              return mins < 60 ? ` · ${mins} min left` : ` · ${Math.floor(mins / 60)}h ${mins % 60}m left`;
            })()}
          </Text>
          <TouchableOpacity onPress={handleStopLiveShare} style={styles.liveShareStopBtn}>
            <Text style={styles.liveShareStopText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messages area with background */}
      <WhatsAppBackground>
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          renderItem={renderMessageItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.5}
          removeClippedSubviews={false}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={100}
          initialNumToRender={10}
          windowSize={21}
          ListFooterComponent={loadingOlder ? (
            <View key="loading-footer" style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          ) : null}
          ListEmptyComponent={
            <View key="empty-state" style={styles.emptyState}>
              <IconSymbol size={64} name="message" color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No messages yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Start the conversation with a message
              </Text>
            </View>
          }
        />

        {/* Message Input */}
        <View style={[styles.messageInputContainer, { borderTopColor: colors.border }]}>
          {pendingAttachment && (
            <View style={[styles.pendingAttachmentPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AttachmentRenderer 
                attachment={pendingAttachment} 
                isFromCurrentUser={true} 
              />
              <TouchableOpacity 
                style={styles.clearAttachmentButton}
                onPress={handleClearAttachment}>
                <IconSymbol size={20} name="xmark.circle.fill" color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowMediaAttachmentModal(true)}
              activeOpacity={0.7}>
              <IconSymbol size={20} name="paperclip" color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={[styles.messageInput, { color: colors.text }]}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              value={messageText}
              onChangeText={(text) => {
                if (/\bsend\b\.?$/i.test(text)) {
                  const cleaned = text.replace(/\bsend\b\.?$/i, '').trim();
                  setMessageText(cleaned);
                  if (cleaned) handleSendMessage(cleaned);
                } else {
                  setMessageText(text);
                }
              }}
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: (messageText.trim() || pendingAttachment) ? colors.gold : colors.border }
              ]}
              onPress={() => handleSendMessage()}
              disabled={(!messageText.trim() && !pendingAttachment) || sending}
              activeOpacity={0.8}>
              {sending ? (
                <ActivityIndicator size="small" color={colors.gold} />
              ) : (
                <IconSymbol size={20} name="paperplane.fill" color={(messageText.trim() || pendingAttachment) ? '#000000' : colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Media Attachment Modal */}
        <AttachmentModal
          visible={showMediaAttachmentModal}
          onClose={() => setShowMediaAttachmentModal(false)}
          onAttachMedia={handleAttachMedia}
          onAttachCharisma={() => {
            setShowMediaAttachmentModal(false);
            setShowCharismaModal(true);
          }}
          onAttachLocation={() => {
            setShowMediaAttachmentModal(false);
            setShowLocationPicker(true);
          }}
        />

        {/* Charisma Attachment Modal */}
        <CharismaAttachmentModal
          visible={showCharismaModal}
          onClose={() => setShowCharismaModal(false)}
          onAttach={handleAttachCharisma}
        />

        {/* Location Picker Modal */}
        <LocationPickerModal
          visible={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSend={handleSendLocation}
        />

        {/* Forward Modal */}
        <ForwardModal
          visible={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setMessageToForward(null);
          }}
          onForward={handleForwardMessage}
        />

        {/* Emoji Picker Modal */}
        <EmojiPickerModal
          visible={showFullEmojiPicker}
          onClose={() => setShowFullEmojiPicker(false)}
          onSelectEmoji={(emoji) => {
            if (reactionMessageId) {
              handleAddReaction(reactionMessageId, emoji);
            }
          }}
        />

        {/* Color Picker Modal */}
        <ColorPickerModal
          visible={showColorPicker}
          onClose={() => setShowColorPicker(false)}
          onSelectColor={handleSelectTextColor}
          currentColor={colorPickerMode === 'sent' ? messageTextColor : receivedMessageTextColor}
          mode={colorPickerMode}
        />

        {/* Menu Modal */}
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}>
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}>
            <View style={[styles.menuContainer, { backgroundColor: colors.card }]}>
              <View style={[styles.menuHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>
                  Chat Options
                </Text>
                <TouchableOpacity onPress={() => setShowMenu(false)}>
                  <Text style={[styles.menuClose, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleViewProfile}>
                <IconSymbol size={20} name="person" color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  View Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleMuteNotifications}>
                <IconSymbol size={20} name={isMuted ? "bell.slash" : "bell"} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  // On iOS, close menu first to avoid nested modal issues
                  if (Platform.OS === 'ios') {
                    setShowMenu(false);
                  }
                  setColorPickerMode('sent');
                  setShowColorPicker(true);
                }}>
                <IconSymbol size={20} name="paintbrush" color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Sent Message Text Color
                </Text>
                <View style={[styles.colorPreview, { backgroundColor: messageTextColor }]} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  // On iOS, close menu first to avoid nested modal issues
                  if (Platform.OS === 'ios') {
                    setShowMenu(false);
                  }
                  setColorPickerMode('received');
                  setShowColorPicker(true);
                }}>
                <IconSymbol size={20} name="paintbrush.fill" color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>
                  Received Message Text Color
                </Text>
                <View style={[styles.colorPreview, { backgroundColor: receivedMessageTextColor }]} />
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleClearChat}>
                <IconSymbol size={20} name="trash" color="#FF4444" />
                <Text style={[styles.menuItemText, { color: '#FF4444' }]}>
                  Clear Chat
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleBlockUser}>
                <IconSymbol size={20} name="person.crop.circle.badge.xmark" color="#FF4444" />
                <Text style={[styles.menuItemText, { color: '#FF4444' }]}>
                  Block User
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Profile Modal */}
        <Modal
          visible={showProfile}
          transparent
          animationType="slide"
          onRequestClose={() => setShowProfile(false)}>
          <View style={[styles.menuOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.profileContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.profileHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.profileTitle, { color: colors.text }]}>
                  User Profile
                </Text>
                <TouchableOpacity onPress={() => setShowProfile(false)}>
                  <Text style={[styles.profileClose, { color: colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileContent}>
                <ScrollView
                  style={styles.profileScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.profileScrollContent}
                  removeClippedSubviews={true}>

                  {/* Profile Header Section */}
                  <View style={styles.profileHeaderSection}>
                    <View style={styles.profileAvatarContainer}>
                      {(profilePhoto || otherUser.avatarUrl) ? (
                        <Image source={{ uri: profilePhoto || otherUser.avatarUrl }} style={styles.profilePhoto} />
                      ) : (
                        <View style={[styles.profileAvatar, { backgroundColor: colors.card }]}>
                          <IconSymbol size={40} name="person" color={colors.text} />
                        </View>
                      )}
                    </View>
                    <Text style={[styles.profileName, { color: colors.text }]}>
                      {otherUser.name}
                    </Text>
                    <Text style={[styles.profileUsername, { color: colors.textSecondary }]}>
                      {otherUser.handleAt ? `@${otherUser.handleAt}` : otherUser.handleHash ? `#${otherUser.handleHash}` : `@${otherUser.username}`}
                    </Text>

                    {/* Follow Button */}
                    {currentUser && currentUser.id !== otherUser.id && (
                      <View style={{ marginTop: 12 }}>
                        <FollowButton
                          currentUserId={currentUser.id}
                          targetUserId={otherUser.id}
                          isFollowing={isFollowingUser}
                          onFollowChange={(following) => {
                            // Optimistic UI flip so the lock/unlock shows instantly.
                            setIsFollowingUser(following);
                            setFollowCounts(prev => ({
                              followers: following ? prev.followers + 1 : Math.max(0, prev.followers - 1),
                              following: prev.following,
                            }));
                            // Refetch gated sections so newly-unlocked Charisma
                            // Entries + Social Links populate immediately (or
                            // re-lock correctly after unfollow).
                            loadProfileData();
                          }}
                        />
                      </View>
                    )}
                  </View>

                  {/* Stats Row */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.gold }]}>
                          {profileLoading ? '—' : profileEntryCount}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entries</Text>
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.gold }]}>
                          {profileLoading ? '—' : followCounts.followers}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.gold }]}>
                          {profileLoading ? '—' : followCounts.following}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
                      </View>
                    </View>
                  </View>

                  {/* Bio Section */}
                  {(profileBio || !profileLoading) && (
                    <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                      <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                        About
                      </Text>
                      <Text style={[styles.whatsappSectionText, { color: colors.textSecondary }]}>
                        {profileBio || 'No bio yet'}
                      </Text>
                    </View>
                  )}

                  {/* Social Handles Section (Instagram/TikTok/etc. usernames) */}
                  {Object.keys(profileSocialLinks).length > 0 && (
                    <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                      <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                        Social Handles
                      </Text>
                      <SocialLinksDisplay socialLinks={profileSocialLinks} />
                    </View>
                  )}

                  {/* Social Links (Shared Links feed) */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                      Social Links
                    </Text>
                    {profileLoading ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.gold} />
                      </View>
                    ) : (
                      <SharedLinksPreview
                        links={profileSharedLinks}
                        isFollowing={isFollowingUser}
                        totalCount={profileSharedLinks.length}
                      />
                    )}
                  </View>

                  {/* Charisma Collection Section */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                      Charisma Collection
                    </Text>
                    {profileLoading ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.gold} />
                      </View>
                    ) : (
                      <CharismaEntriesPreview
                        entries={profileEntries}
                        isFollowing={isFollowingUser}
                        totalCount={profileEntryCount}
                      />
                    )}
                  </View>

                </ScrollView>
              </View>

              <View style={[styles.profileFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.profileCloseButton, { backgroundColor: colors.gold }]}
                  onPress={() => setShowProfile(false)}>
                  <Text style={styles.profileCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </WhatsAppBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  headerUsername: {
    fontSize: 14,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreButton: {
    padding: 4,
  },
  moreButtonContainer: {
    alignItems: 'center',
    gap: 4,
  },
  proBadge: {
    position: 'absolute',
    top: -14,
    right: -2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    flexDirection: 'row',
    minWidth: 48,
  },
  proBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1,
    includeFontPadding: false,
    textAlign: 'center',
    width: '100%',
  },
  messagesList: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  messageRight: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 6,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  messageBubbleWrapper: {
    maxWidth: '85%',
    flexShrink: 1,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 60,
    paddingRight: 28,
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  charismaName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subCharisma: {
    fontSize: 16,
    fontStyle: 'italic',
    marginBottom: 10,
    opacity: 0.9,
  },
  emotionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  emotionsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  emotionsText: {
    fontSize: 20,
    lineHeight: 24,
  },
  emptyLine: {
    height: 12,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  messageInputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  pendingAttachmentPreview: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  clearAttachmentButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  attachButton: {
    padding: 4,
    marginBottom: 4,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  // Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContentTouchable: {
    flex: 1,
  },
  menuContainer: {
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuClose: {
    fontSize: 20,
    fontWeight: '300',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 20,
  },
  // Profile Modal Styles - WhatsApp Inspired
  profileContainer: {
    width: '95%',
    height: '92%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  profileTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  profileClose: {
    fontSize: 24,
    fontWeight: '300',
  },
  profileContent: {
    flex: 1,
  },
  profileScrollView: {
    flex: 1,
  },
  profileScrollContent: {
    paddingBottom: 20,
  },
  // WhatsApp-style sections
  profileHeaderSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  profileAvatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  whatsappSection: {
    marginBottom: 12,
  },
  whatsappSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  whatsappSectionText: {
    fontSize: 15,
    paddingHorizontal: 20,
    paddingBottom: 16,
    lineHeight: 20,
  },
  whatsappInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 16,
  },
  whatsappInfoText: {
    fontSize: 15,
    flex: 1,
  },
  // Interest tags
  interestTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  interestTagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Stats section
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    alignSelf: 'center',
  },
  // Achievements
  achievementContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  achievementIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  achievementDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Settings items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
  },
  settingText: {
    fontSize: 15,
    flex: 1,
  },
  profileFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  profileCloseButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  profileCloseButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  forwardedLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    paddingLeft: 8,
  },
  forwardedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  messageMenuButton: {
    position: 'absolute',
    top: 8,
    right: 6,
    padding: 4,
  },
  messageActions: {
    position: 'absolute',
    top: -120,
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    borderWidth: 1,
    minWidth: 140,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reactionPickerContainer: {
    marginTop: -8,
    marginBottom: 4,
    zIndex: 9999,
  },
  reactionPicker: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  reactionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  reactionPlus: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
  },
  reactionsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    paddingLeft: 8,
  },
  reactionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reactionBadgeEmoji: {
    fontSize: 14,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginLeft: 'auto',
  },
  liveShareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E74C3C',
  },
  liveSharePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  liveShareText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  liveShareStopBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  liveShareStopText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
