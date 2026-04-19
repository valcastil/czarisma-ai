import { IconSymbol } from '@/components/ui/icon-symbol';
import { WhatsAppBackground } from '@/components/ui/whatsapp-background';
import { useTheme } from '@/hooks/use-theme';
import { initializeGemini } from '@/lib/gemini';
import { speakAIMessage, stopAIVoice } from '@/utils/ai-voice';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { saveAIQuote } from '@/utils/ai-quote-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_CHAT_STORAGE_KEY = '@charisma_ai_chat_history';
const NEXT_GREETING_KEY = '@charisma_next_greeting';
const AI_USAGE_KEY = '@ai_chat_usage';
const AI_FIRST_USE_KEY = '@ai_chat_first_use';

// Daily message limit for ALL users before showing subscribe prompt
const DAILY_MESSAGE_LIMIT = 15;
// Maximum number of days a user can use AI chat for free
const MAX_FREE_DAYS = 7;

// Payment QR code images — local assets
const QR_E_AND_MONEY = require('../assets/images/payment/qr-e-and-money.png');
const QR_GCASH = require('../assets/images/payment/qr-gcash.png');

/**
 * Get today's date string for daily counter reset
 */
const getTodayKey = () => new Date().toISOString().split('T')[0];

/**
 * Get current daily usage count
 */
const getUsageCount = async (): Promise<number> => {
    try {
        const data = await AsyncStorage.getItem(AI_USAGE_KEY);
        if (!data) return 0;
        const parsed = JSON.parse(data);
        if (parsed.date !== getTodayKey()) return 0; // Reset for new day
        return parsed.count || 0;
    } catch {
        return 0;
    }
};

/**
 * Increment daily usage count
 */
const incrementUsage = async (): Promise<number> => {
    try {
        const today = getTodayKey();
        const data = await AsyncStorage.getItem(AI_USAGE_KEY);
        let count = 1;
        if (data) {
            const parsed = JSON.parse(data);
            count = parsed.date === today ? (parsed.count || 0) + 1 : 1;
        }
        await AsyncStorage.setItem(AI_USAGE_KEY, JSON.stringify({ date: today, count }));
        return count;
    } catch {
        return 0;
    }
};

/**
 * Get how many days the user has been using AI chat.
 * Returns { daysUsed, daysRemaining, isExpired }
 */
const getFreePeriodStatus = async (): Promise<{ daysUsed: number; daysRemaining: number; isExpired: boolean }> => {
    try {
        let firstUse = await AsyncStorage.getItem(AI_FIRST_USE_KEY);
        if (!firstUse) {
            // First time using AI chat — record the date
            const now = Date.now();
            await AsyncStorage.setItem(AI_FIRST_USE_KEY, now.toString());
            return { daysUsed: 1, daysRemaining: MAX_FREE_DAYS - 1, isExpired: false };
        }
        const startTime = parseInt(firstUse, 10);
        const daysUsed = Math.floor((Date.now() - startTime) / (24 * 60 * 60 * 1000)) + 1;
        const daysRemaining = Math.max(0, MAX_FREE_DAYS - daysUsed);
        return { daysUsed, daysRemaining, isExpired: daysUsed > MAX_FREE_DAYS };
    } catch {
        return { daysUsed: 0, daysRemaining: MAX_FREE_DAYS, isExpired: false };
    }
};

const INITIAL_GREETINGS = [
    "Hello! I am your Czar AI. How can I help you improve your social skills today?",
    "Hi there! Ready to boost your confidence and charm? Let's chat!",
    "Welcome! I'm here to help you master your social interactions. What's on your mind?",
    "Greetings! Let's work on unlocking your full charismatic potential today.",
    "Hey! Whether it's small talk or big speeches, I'm here to help. Where shall we start?"
];

export default function AIChatScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [message, setMessage] = useState('');
    const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
    const [messages, setMessages] = useState<{ id: string; text: string; isUser: boolean; reactions?: string[] }[]>([]);
    const [showQRModal, setShowQRModal] = useState(false);
    const [activePaymentTab, setActivePaymentTab] = useState<'e&' | 'gcash'>('e&');
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);

    const isMounted = React.useRef(true);
    const scrollViewRef = useRef<ScrollView>(null);

    const bottomInset = Math.max(insets.bottom, 10);

    useEffect(() => {
        isMounted.current = true;
        
        loadChatHistory();
        // Check trial status on mount and show QR modal if expired
        checkTrialStatusOnMount();
        return () => {
            isMounted.current = false;
            try {
                stopAIVoice();
            } catch (e) {
                // Ignore errors on cleanup
            }
        };
    }, []);

    /**
     * Check trial status on mount - shows QR modal immediately if trial expired
     */
    const checkTrialStatusOnMount = async () => {
        try {
            const period = await getFreePeriodStatus();
            if (period.isExpired && isMounted.current) {
                // Small delay to let the screen render first
                setTimeout(() => {
                    if (isMounted.current) {
                        setShowQRModal(true);
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Error checking trial status:', error);
        }
    };

    /**
     * Check usage limits for ALL users:
     * 1. 7-day free period — after that, must subscribe
     * 2. 15 messages/day within the free period
     * Returns true if the user can send a message, false if blocked.
     */
    const checkUsageLimit = async (): Promise<boolean> => {
        // Check 7-day free period first
        const period = await getFreePeriodStatus();
        if (period.isExpired) {
            Alert.alert(
                '⏰ Free trial ended',
                'Your 7-day free AI chat access has ended. Subscribe now to continue chatting with your Charisma AI!',
                [
                    { text: 'Maybe Later', style: 'cancel' },
                    {
                        text: 'Subscribe Now',
                        onPress: () => setShowQRModal(true),
                    },
                ]
            );
            return false;
        }

        // Check daily message limit
        const count = await getUsageCount();
        if (count >= DAILY_MESSAGE_LIMIT) {
            Alert.alert(
                '💬 Daily limit reached',
                `You've used your ${DAILY_MESSAGE_LIMIT} free messages for today (Day ${period.daysUsed} of ${MAX_FREE_DAYS}). Come back tomorrow or subscribe for unlimited access!`,
                [
                    { text: 'OK', style: 'cancel' },
                    {
                        text: 'Subscribe Now',
                        onPress: () => setShowQRModal(true),
                    },
                ]
            );
            return false;
        }
        return true;
    };

    const speakText = async (text: string) => {
        if (!isMounted.current) return;
        if (!isSpeakerEnabled) return; // Don't speak if speaker is disabled
        
        // Use ElevenLabs voice (same as Czar companion) with male/female preference
        await speakAIMessage(text);
    };

    const loadChatHistory = async () => {
        try {
            const storedMessages = await AsyncStorage.getItem(AI_CHAT_STORAGE_KEY);
            if (storedMessages) {
                const parsedMessages = JSON.parse(storedMessages);
                if (isMounted.current) setMessages(parsedMessages);

                // Reconstruct history for Gemini
                const history = parsedMessages.map((msg: any) => ({
                    role: msg.isUser ? "user" : "model",
                    parts: [{ text: msg.text }]
                }));
                const firstUserIndex = history.findIndex((h: any) => h.role === "user");

                let validHistory: any[] = [];
                if (firstUserIndex !== -1) {
                    validHistory = history.slice(firstUserIndex);
                }

                if (isMounted.current) setChatHistory(validHistory);

                // Always greet the user when they open the chat
                const cachedGreeting = await AsyncStorage.getItem(NEXT_GREETING_KEY);
                let greetingText: string;
                
                if (cachedGreeting) {
                    greetingText = cachedGreeting;
                    await AsyncStorage.removeItem(NEXT_GREETING_KEY);
                } else {
                    greetingText = INITIAL_GREETINGS[Math.floor(Math.random() * INITIAL_GREETINGS.length)];
                }
                
                const welcomeMsg = { id: Date.now().toString(), text: greetingText, isUser: false };
                const newMessages = [...parsedMessages, welcomeMsg];
                if (isMounted.current) setMessages(newMessages);
                await AsyncStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(newMessages));
                
                if (isSpeakerEnabled) {
                    speakText(greetingText);
                }
            } else {
                // Initial greeting - Randomly selected
                const randomGreeting = INITIAL_GREETINGS[Math.floor(Math.random() * INITIAL_GREETINGS.length)];
                const initialGreeting = { id: '1', text: randomGreeting, isUser: false };
                if (isMounted.current) setMessages([initialGreeting]);
                if (isSpeakerEnabled) {
                    speakText(initialGreeting.text);
                }
            }
        } catch (error) {
            console.error('Failed to load chat history', error);
        }
    };

    const generateNextWelcome = async (history: any[]) => {
        try {
            if (!genAI) {
                console.warn('Gemini AI not initialized');
                return;
            }
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const systemPrompt = { role: "user", parts: [{ text: "System: You are a charismatic AI assistant. Generate a SHORT, warm, one-sentence welcome back message for the NEXT time the user opens the app, based on our conversation so far. VARY YOUR TONE (witty, calm, enthusiastic). Do not give advice, just a hook for next time." }] };
            const systemAck = { role: "model", parts: [{ text: "Understood. I will generate a short, warm welcome back message." }] };
            const chat = model.startChat({ history: [systemPrompt, systemAck, ...history] });
            const result = await chat.sendMessage("Generate the cached welcome message for the next session.");
            const nextGreeting = result.response.text();

            await AsyncStorage.setItem(NEXT_GREETING_KEY, nextGreeting);
            console.log("Pre-generated next greeting:", nextGreeting);
        } catch (e) {
            console.log("Failed to generate next greeting", e);
        }
    };



    const toggleSpeaker = async () => {
        if (isSpeakerEnabled) {
            // Turning speaker off
            try {
                await stopAIVoice();
            } catch (e) {
                console.log('Error stopping speech:', e);
            }
            setIsSpeakerEnabled(false);
        } else {
            // Turning speaker on - test if speech is available
            setIsSpeakerEnabled(true);
            // Speak a test message to confirm it's working
            setTimeout(() => {
                if (isMounted.current && isSpeakerEnabled) {
                    speakAIMessage('Speaker enabled');
                }
            }, 100);
        }
    };

    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [genAI, setGenAI] = useState<ReturnType<typeof initializeGemini>>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Initialize Gemini AI on component mount (not at module level)
    useEffect(() => {
        const initAI = async () => {
            try {
                console.log('Initializing Gemini AI...');
                const ai = initializeGemini();
                if (ai) {
                    console.log('Gemini AI initialized successfully');
                    setGenAI(ai);
                    setAiError(null);
                } else {
                    console.error('Gemini AI initialization returned null');
                    setAiError('AI not available - API key missing');
                }
            } catch (error) {
                console.error('Failed to initialize Gemini AI:', error);
                setAiError(error instanceof Error ? error.message : 'Unknown error');
            }
        };
        initAI();
    }, []);

    const handleSendWithText = async (text: string) => {
        if (!text.trim() || isLoading) return;
        setMessage('');
        await handleSendCore(text.trim());
    };

    const handleSend = async () => {
        if (!message.trim() || isLoading) return;
        const text = message.trim();
        setMessage('');
        await handleSendCore(text);
    };

    const handleSendCore = async (userMessageText: string) => {
        if (isLoading) return;

        // Check usage limit before sending
        const canSend = await checkUsageLimit();
        if (!canSend) return;

        // Increment usage counter
        await incrementUsage();

        setIsLoading(true);

        // Add user message to UI immediately
        const newUserMessage = { id: Date.now().toString(), text: userMessageText, isUser: true };

        // Update state and save
        const updatedMessagesWithUser = [...messages, newUserMessage];
        if (isMounted.current) setMessages(updatedMessagesWithUser);
        await AsyncStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(updatedMessagesWithUser));

        try {
            if (!genAI) {
                console.error('Cannot send message - genAI is null. Error:', aiError);
                if (isMounted.current) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        text: aiError 
                            ? `AI is currently unavailable (${aiError}). Please restart the app.`
                            : "AI is currently unavailable. Please check your internet connection and try again.",
                        isUser: false
                    }]);
                }
                setIsLoading(false);
                return;
            }
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const systemPrompt = { role: "user", parts: [{ text: "System: You are a charismatic AI assistant. CRITICAL: Keep your response strictly under 500 characters. ONLY answer questions about: Charisma, Emotions, Feelings, Health, Mind, and Fitness. Politely refuse to answer any other topics and steer the conversation back to personal growth." }] };
            const systemAck = { role: "model", parts: [{ text: "Understood. I will keep responses under 500 characters and only discuss Charisma, Emotions, Feelings, Health, Mind, and Fitness topics." }] };
            const chat = model.startChat({
                history: [systemPrompt, systemAck, ...chatHistory],
            });

            const result = await chat.sendMessage(userMessageText);
            const responseText = result.response.text();

            // Add AI response to UI
            const aiResponse = { id: (Date.now() + 1).toString(), text: responseText, isUser: false };
            const finalMessages = [...updatedMessagesWithUser, aiResponse];
            if (isMounted.current) setMessages(finalMessages);
            await AsyncStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(finalMessages));

            // Update history for next turn
            const newHistory = [
                ...chatHistory,
                { role: "user", parts: [{ text: userMessageText }] },
                { role: "model", parts: [{ text: responseText }] }
            ];
            if (isMounted.current) setChatHistory(newHistory);

            speakText(responseText);

            // Generate the NEXT welcome message in background
            generateNextWelcome(newHistory);
        } catch (error) {
            console.error('AI send message error:', error);
            const errorDetails = error instanceof Error ? error.message : 'Unknown error';
            const errorMessage = {
                id: Date.now().toString(),
                text: `I'm having trouble connecting right now. ${errorDetails.includes('API key') ? 'API key issue detected.' : 'Please check your internet connection.'}`,
                isUser: false
            };
            if (isMounted.current) setMessages(prev => [...prev, errorMessage]);
            speakText(errorMessage.text);
            
            // Try to re-initialize AI on error (maybe the session expired)
            try {
                const reinitAI = initializeGemini();
                if (reinitAI) setGenAI(reinitAI);
            } catch (e) {
                console.error('Failed to re-initialize AI:', e);
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    const handleAddReaction = async (messageId: string, emoji: string) => {
        const msg = messages.find(m => m.id === messageId);
        if (!msg) return;
        const current = msg.reactions || [];
        const updated = current.includes(emoji)
            ? current.filter(r => r !== emoji)
            : [...current, emoji];
        const newMessages = messages.map(m =>
            m.id === messageId ? { ...m, reactions: updated } : m
        );
        setMessages(newMessages);
        setReactionMessageId(null);
        await AsyncStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(newMessages));
    };

    const handleShareMessage = async (text: string) => {
        try {
            await Share.share({ message: `${text}\n\n— Czar AI` });
        } catch (error) {
            console.error('Error sharing message:', error);
        }
        setSelectedMessageId(null);
    };

    const handleSaveAsQuote = async (text: string) => {
        try {
            await saveAIQuote(text);
            Alert.alert('Saved!', 'Quote saved to your personalized quotes.');
        } catch (error) {
            console.error('Error saving quote:', error);
            Alert.alert('Error', 'Failed to save quote.');
        }
        setSelectedMessageId(null);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            {/* QR Code Payment Modal — Two Payment Channels */}
            <Modal
                visible={showQRModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowQRModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Subscribe to Czar AI</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            Choose a payment channel and scan the QR code to transfer payment.
                        </Text>

                        {/* Payment Channel Tabs */}
                        <View style={styles.tabRow}>
                            <TouchableOpacity
                                style={[
                                    styles.tab,
                                    activePaymentTab === 'e&' && [styles.tabActive, { borderColor: colors.gold }],
                                ]}
                                onPress={() => setActivePaymentTab('e&')}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: activePaymentTab === 'e&' ? colors.gold : colors.textSecondary },
                                ]}>e& money</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.tab,
                                    activePaymentTab === 'gcash' && [styles.tabActive, { borderColor: '#007AFF' }],
                                ]}
                                onPress={() => setActivePaymentTab('gcash')}
                            >
                                <Text style={[
                                    styles.tabText,
                                    { color: activePaymentTab === 'gcash' ? '#007AFF' : colors.textSecondary },
                                ]}>GCash</Text>
                            </TouchableOpacity>
                        </View>

                        {/* QR Code Display */}
                        <View style={styles.qrContainer}>
                            <Image
                                source={activePaymentTab === 'e&' ? QR_E_AND_MONEY : QR_GCASH}
                                style={styles.qrImage}
                                resizeMode="contain"
                            />
                        </View>

                        <Text style={[styles.paymentNote, { color: colors.textSecondary }]}>
                            {activePaymentTab === 'e&'
                                ? 'Scan with e& money app to transfer'
                                : 'Scan with GCash app to transfer via InstaPay'}
                        </Text>

                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowQRModal(false)}
                        >
                            <Text style={[styles.modalCloseText, { color: colors.textSecondary }]}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={async () => {
                        try {
                            await stopAIVoice();
                        } catch (e) { }
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: '(tabs)' }],
                            })
                        );
                    }}
                    style={styles.backButton}
                >
                    <IconSymbol name="chevron.left" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Czar AI</Text>

                <TouchableOpacity
                    style={styles.speakerButton}
                    onPress={toggleSpeaker}
                    activeOpacity={0.7}
                >
                    <IconSymbol
                        name={isSpeakerEnabled ? "speaker.wave.2" : "speaker.slash"}
                        size={24}
                        color={isSpeakerEnabled ? colors.gold : colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>

            <WhatsAppBackground>
                <ScrollView 
                    ref={scrollViewRef}
                    style={styles.messagesContainer} 
                    contentContainerStyle={styles.messagesContent}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
                >
                    {messages.map((msg) => {
                        const showActions = selectedMessageId === msg.id;
                        const showReactionPicker = reactionMessageId === msg.id;
                        const quickReactions = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

                        return (
                        <View key={msg.id} style={(showActions || showReactionPicker) ? { zIndex: 999 } : undefined}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onLongPress={() => {
                                    if (!msg.isUser) {
                                        setReactionMessageId(msg.id);
                                        setSelectedMessageId(null);
                                    }
                                }}
                                onPress={() => {
                                    if (reactionMessageId) setReactionMessageId(null);
                                    if (selectedMessageId) setSelectedMessageId(null);
                                }}
                                delayLongPress={400}
                                style={[
                                    styles.messageBubble,
                                    msg.isUser ? styles.userBubble : styles.aiBubble,
                                    { backgroundColor: msg.isUser ? colors.gold : colors.card },
                                    (showActions || showReactionPicker) && { borderWidth: 1, borderColor: colors.gold },
                                ]}
                            >
                                <Text style={[styles.messageText, { color: msg.isUser ? '#000000' : colors.text }]}>
                                    {msg.text}
                                </Text>

                                {!msg.isUser && (
                                    <TouchableOpacity
                                        style={styles.messageBubbleMenuButton}
                                        onPress={() => {
                                            setSelectedMessageId(showActions ? null : msg.id);
                                            setReactionMessageId(null);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <IconSymbol size={14} name="ellipsis" color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>

                            {/* Reactions display */}
                            {msg.reactions && msg.reactions.length > 0 && (
                                <View style={styles.reactionsDisplay}>
                                    {msg.reactions.map((emoji, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            style={[styles.reactionBadge, { backgroundColor: colors.card }]}
                                            onPress={() => handleAddReaction(msg.id, emoji)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.reactionBadgeEmoji}>{emoji}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Reaction picker */}
                            {showReactionPicker && (
                                <View style={styles.reactionPickerContainer}>
                                    <View style={[styles.reactionPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        {quickReactions.map((emoji, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                style={styles.reactionButton}
                                                onPress={() => handleAddReaction(msg.id, emoji)}
                                                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                                activeOpacity={0.6}
                                            >
                                                <Text style={styles.reactionEmoji}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Action bar (Share / Save as Quote) */}
                            {showActions && (
                                <View style={[styles.messageActionBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <TouchableOpacity
                                        style={styles.messageActionButton}
                                        onPress={() => handleShareMessage(msg.text)}
                                        activeOpacity={0.7}
                                    >
                                        <IconSymbol size={18} name="square.and.arrow.up" color={colors.gold} />
                                        <Text style={[styles.messageActionText, { color: colors.text }]}>Share</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.messageActionDivider, { backgroundColor: colors.border }]} />
                                    <TouchableOpacity
                                        style={styles.messageActionButton}
                                        onPress={() => handleSaveAsQuote(msg.text)}
                                        activeOpacity={0.7}
                                    >
                                        <IconSymbol size={18} name="bookmark" color={colors.gold} />
                                        <Text style={[styles.messageActionText, { color: colors.text }]}>Save as Quote</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        );
                    })}
                </ScrollView>
            </WhatsAppBackground>

            <View style={[styles.messageInputContainer, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: bottomInset }]}>
                <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TextInput
                        style={[styles.messageInput, { color: colors.text }]}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.textSecondary}
                        value={message}
                        onChangeText={(text) => {
                            if (/\bsend\b\.?$/i.test(text)) {
                                const cleaned = text.replace(/\bsend\b\.?$/i, '').trim();
                                setMessage(cleaned);
                                if (cleaned) handleSendWithText(cleaned);
                            } else {
                                setMessage(text);
                            }
                        }}
                        multiline
                    />

                    <TouchableOpacity
                        onPress={handleSend}
                        style={[
                            styles.sendButton,
                            { backgroundColor: message.trim() ? colors.gold : colors.border }
                        ]}
                        disabled={!message.trim()}
                    >
                        <IconSymbol
                            name="paperplane"
                            size={20}
                            color={message.trim() ? '#FFFFFF' : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        gap: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    tabRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: 'rgba(128,128,128,0.1)',
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: 'rgba(244,197,66,0.1)',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '700',
    },
    qrContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginVertical: 8,
    },
    qrImage: {
        width: 220,
        height: 220,
    },
    paymentNote: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    modalCloseButton: {
        paddingVertical: 10,
        marginTop: 4,
    },
    modalCloseText: {
        fontSize: 14,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 30,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    speakerButton: {
        padding: 8,
        marginRight: -8,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesContent: {
        padding: 20,
        gap: 16,
        paddingBottom: 40,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    messageActionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 6,
        paddingVertical: 6,
        paddingHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    messageActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        gap: 6,
    },
    messageActionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    messageActionDivider: {
        width: 1,
        height: 20,
    },
    messageBubbleMenuButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
    },
    reactionPickerContainer: {
        alignItems: 'flex-start',
        marginTop: -4,
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
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reactionEmoji: {
        fontSize: 22,
    },
    reactionsDisplay: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
        alignSelf: 'flex-start',
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
    messageInputContainer: {
        paddingHorizontal: 10,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 10,
    },
    messageInput: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        paddingVertical: 8,
        textAlignVertical: 'center',
    },
    sendButton: {
        padding: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
