import { AttachmentModal } from '@/components/messages/attachment-modal';
import { AttachmentRenderer } from '@/components/messages/attachment-renderer';
import { CharismaAttachmentModal } from '@/components/messages/charisma-attachment-modal';
import { ColorPickerModal } from '@/components/messages/color-picker-modal';
import { EmojiPickerModal } from '@/components/messages/emoji-picker-modal';
import { ForwardModal } from '@/components/messages/forward-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WhatsAppBackground } from '@/components/ui/whatsapp-background';
import { Attachment, Message, User } from '@/constants/message-types';
import { CharismaEntry } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { formatCharismaEntryForMessage } from '@/utils/charisma-share-utils';
import {
  getCurrentUser,
  getMessages,
  sendMessage,
  subscribeToMessages,
  updateConversation,
  updateMessageReactions,
} from '@/utils/message-utils';
import { checkPaidProStatus } from '@/utils/subscription-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

  const { id, username, name } = params as { id: string; username: string; name: string };

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [canChat, setCanChat] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [otherUser, setOtherUser] = useState<User>({
    id,
    username,
    name,
    isOnline: false,
  });
  const [showMediaAttachmentModal, setShowMediaAttachmentModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showCharismaModal, setShowCharismaModal] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [messageTextColor, setMessageTextColor] = useState<string>('#000000');
  const [receivedMessageTextColor, setReceivedMessageTextColor] = useState<string>('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerMode, setColorPickerMode] = useState<'sent' | 'received'>('sent');

  const flatListRef = useRef<FlatList>(null);

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    initializeChat();
    loadSubscriptionStatus();
    loadMuteStatus();
    loadProfilePhoto();
    loadTextColor();

    // Subscribe to real-time messages
    const unsubscribe = subscribeToMessages(id, (newMessage) => {
      setMessages(prev => {
        // Check if message already exists
        const exists = prev.some(m => m.id === newMessage.id);
        if (!exists) {
          return [...prev, newMessage];
        }
        // Update existing message (for reactions)
        return prev.map(m => m.id === newMessage.id ? newMessage : m);
      });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [id]);

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
      // Check actual paid pro status (QR code subscription)
      const proStatus = await checkPaidProStatus();
      setIsPro(proStatus);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setCanChat(false);
      setUserEmail(null);
      setIsPro(false);
    }
  };


  const initializeChat = async () => {
    try {
      const [currentUserData, chatMessages] = await Promise.all([
        getCurrentUser(),
        getMessages(id),
      ]);

      setCurrentUser(currentUserData);
      setMessages(chatMessages);

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
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    console.log('=== handleSendMessage called ===');
    console.log('messageText:', messageText);
    console.log('currentUser:', currentUser);
    console.log('otherUser:', otherUser);
    console.log('canChat:', canChat);
    console.log('pendingAttachment:', pendingAttachment);

    if ((!messageText.trim() && !pendingAttachment) || !currentUser) {
      console.log('Early return: no messageText/attachment or currentUser');
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
        messageText.trim(),
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
    // Update local state immediately for responsive UI
    let updatedReactions: string[] = [];
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        if (reactions.includes(emoji)) {
          updatedReactions = reactions.filter(r => r !== emoji);
          return { ...msg, reactions: updatedReactions };
        } else {
          updatedReactions = [...reactions, emoji];
          return { ...msg, reactions: updatedReactions };
        }
      }
      return msg;
    }));
    setReactionMessageId(null);

    // Persist to Supabase for real-time sync
    try {
      await updateMessageReactions(messageId, updatedReactions);
    } catch (error) {
      console.error('Error updating reactions:', error);
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

  const handleViewProfile = () => {
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
  };

  const loadProfilePhoto = async () => {
    try {
      const photoKey = `@profile_photo_${otherUser.id}`;
      const savedPhoto = await AsyncStorage.getItem(photoKey);
      setProfilePhoto(savedPhoto);
    } catch (error) {
      console.error('Error loading profile photo:', error);
    }
  };

  const handlePickPhoto = async () => {
    try {
      const { MediaPickerService } = await import('@/lib/media-picker-service');
      const photo = await MediaPickerService.pickImageWithAdjustableCrop();
      
      if (photo?.uri) {
        setProfilePhoto(photo.uri);

        // Save to AsyncStorage
        const photoKey = `@profile_photo_${otherUser.id}`;
        await AsyncStorage.setItem(photoKey, photo.uri);

        Alert.alert('Success', 'Profile photo updated successfully!');
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to update profile photo. Please try again.');
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setProfilePhoto(null);
      const photoKey = `@profile_photo_${otherUser.id}`;
      await AsyncStorage.removeItem(photoKey);
      Alert.alert('Success', 'Profile photo removed successfully!');
    } catch (error) {
      console.error('Error removing photo:', error);
      Alert.alert('Error', 'Failed to remove profile photo. Please try again.');
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
    // Date separator: show above the first message of each date group
    // In inverted list, index+1 is the visually-above (older) item
    const nextItem = reversedMessages[index + 1];
    const showDateSeparator = !nextItem || nextItem.date !== item.date;
    const isFromCurrentUser = item.isFromCurrentUser;
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
        if (line.startsWith('**') && line.endsWith('**')) {
          // Charisma name (bold)
          elements.push(
            <Text key={index} style={[
              styles.charismaName,
              { color: isFromCurrentUser ? messageTextColor : receivedMessageTextColor }
            ]}>
              {line.replace(/\*\*/g, '')}
            </Text>
          );
        } else if (line.startsWith('*') && line.endsWith('*')) {
          // Sub charisma (italic)
          elements.push(
            <Text key={index} style={[
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
            <View key={index} style={styles.emotionsContainer}>
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
          elements.push(<View key={index} style={styles.emptyLine} />);
        } else {
          // Regular text (notes)
          elements.push(
            <Text key={index} style={[
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
          isFromCurrentUser ? styles.messageRight : styles.messageLeft
        ]}>
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

          {showReactionPicker && (
            <View style={[
              styles.reactionPicker,
              { 
                backgroundColor: colors.card,
                borderColor: colors.border,
                [isFromCurrentUser ? 'right' : 'left']: 0,
              }
            ]}>
              {quickReactions.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.reactionButton}
                  onPress={() => handleAddReaction(item.id, emoji)}
                  activeOpacity={0.7}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.reactionButton}
                onPress={() => setShowFullEmojiPicker(true)}
                activeOpacity={0.7}>
                <Text style={styles.reactionPlus}>+</Text>
              </TouchableOpacity>
            </View>
          )}

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
                <View key={index} style={[styles.reactionBadge, { backgroundColor: colors.card }]}>
                  <Text style={styles.reactionBadgeEmoji}>{emoji}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
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

        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]}>
            {otherUser.name}
          </Text>
          <View style={styles.headerStatusRow}>
            <Text style={[styles.headerUsername, { color: colors.textSecondary }]}>
              @{otherUser.username}
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
            {isPro && (
              <View style={[
                styles.proBadge,
                { backgroundColor: colors.gold }
              ]}>
                <Text style={styles.proBadgeText} numberOfLines={1}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages area with background */}
      <WhatsAppBackground>
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          renderItem={renderMessageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted
          ListEmptyComponent={
            <View style={styles.emptyState}>
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
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: (messageText.trim() || pendingAttachment) ? colors.gold : colors.border }
              ]}
              onPress={handleSendMessage}
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
        />

        {/* Charisma Attachment Modal */}
        <CharismaAttachmentModal
          visible={showCharismaModal}
          onClose={() => setShowCharismaModal(false)}
          onAttach={handleAttachCharisma}
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
                  setShowMenu(false);
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
                  setShowMenu(false);
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
                      {profilePhoto ? (
                        <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
                      ) : (
                        <View style={[styles.profileAvatar, { backgroundColor: colors.card }]}>
                          <IconSymbol size={40} name="person" color={colors.text} />
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.photoEditButton, { backgroundColor: colors.gold }]}
                        onPress={profilePhoto ? handleRemovePhoto : handlePickPhoto}>
                        <IconSymbol size={16} name="camera" color="#000000" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.profileName, { color: colors.text }]}>
                      {otherUser.name}
                    </Text>
                    <Text style={[styles.profileUsername, { color: colors.textSecondary }]}>
                      @{otherUser.username}
                    </Text>
                  </View>

                  {/* Bio Section */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                      About
                    </Text>
                    <Text style={[styles.whatsappSectionText, { color: colors.textSecondary }]}>
                      Welcome to my charisma profile! 🌟
                    </Text>
                  </View>

                  {/* Contact Information Section */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                      Contact Information
                    </Text>
                    <View style={styles.whatsappInfoRow}>
                      <IconSymbol size={20} name="phone" color={colors.textSecondary} />
                      <Text style={[styles.whatsappInfoText, { color: colors.textSecondary }]}>
                        +1 234 567 8900
                      </Text>
                    </View>
                    <View style={styles.whatsappInfoRow}>
                      <IconSymbol size={20} name="envelope" color={colors.textSecondary} />
                      <Text style={[styles.whatsappInfoText, { color: colors.textSecondary }]}>
                        {otherUser.username}@charismachat.com
                      </Text>
                    </View>
                  </View>

                  {/* Interests Section */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                      Interests & Hobbies
                    </Text>
                    <View style={styles.interestTagsContainer}>
                      <View style={[styles.interestTag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.interestTagText, { color: colors.text }]}>Personal Development</Text>
                      </View>
                      <View style={[styles.interestTag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.interestTagText, { color: colors.text }]}>Communication</Text>
                      </View>
                      <View style={[styles.interestTag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.interestTagText, { color: colors.text }]}>Building Connections</Text>
                      </View>
                    </View>
                  </View>

                  {/* Charisma Stats Section */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                      Charisma Stats
                    </Text>
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.gold }]}>42</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entries</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.gold }]}>8.5</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Score</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.gold }]}>15</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                      </View>
                    </View>
                  </View>

                  {/* Achievements Section */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                      Recent Achievements
                    </Text>
                    <View style={styles.achievementContainer}>
                      <View style={styles.achievementItem}>
                        <View style={[styles.achievementIcon, { backgroundColor: colors.gold }]}>
                          <IconSymbol size={16} name="star.fill" color="#000000" />
                        </View>
                        <View style={styles.achievementContent}>
                          <Text style={[styles.achievementTitle, { color: colors.text }]}>Charisma Master</Text>
                          <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>Completed 30-day streak</Text>
                        </View>
                      </View>
                      <View style={styles.achievementItem}>
                        <View style={[styles.achievementIcon, { backgroundColor: colors.gold }]}>
                          <IconSymbol size={16} name="trophy.fill" color="#000000" />
                        </View>
                        <View style={styles.achievementContent}>
                          <Text style={[styles.achievementTitle, { color: colors.text }]}>Top Communicator</Text>
                          <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>High engagement score</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Settings Section */}
                  <View style={[styles.whatsappSection, { backgroundColor: colors.card }]}>
                    <Text style={[styles.whatsappSectionTitle, { color: colors.text }]}>
                      Settings
                    </Text>
                    <TouchableOpacity style={styles.settingItem}>
                      <IconSymbol size={20} name="bell" color={colors.textSecondary} />
                      <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
                      <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingItem}>
                      <IconSymbol size={20} name="lock" color={colors.textSecondary} />
                      <Text style={[styles.settingText, { color: colors.text }]}>Privacy</Text>
                      <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingItem}>
                      <IconSymbol size={20} name="shield" color={colors.textSecondary} />
                      <Text style={[styles.settingText, { color: colors.text }]}>Security</Text>
                      <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
                    </TouchableOpacity>
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
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '90%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 60,
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
    margin: 0,
    borderRadius: 0,
    maxHeight: '90%',
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
    top: 4,
    right: 4,
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
  reactionPicker: {
    position: 'absolute',
    top: -60,
    flexDirection: 'row',
    borderRadius: 30,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
    borderWidth: 1,
    gap: 4,
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
});
