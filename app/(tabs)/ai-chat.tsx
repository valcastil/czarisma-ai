import { IconSymbol } from '@/components/ui/icon-symbol';
import { WhatsAppBackground } from '@/components/ui/whatsapp-background';
import { useTheme } from '@/hooks/use-theme';
import { initializeGemini } from '@/lib/gemini';
import { saveAIQuote } from '@/utils/ai-quote-storage';
import { speakAIMessage, stopAIVoice } from '@/utils/ai-voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AI_CHAT_STORAGE_KEY = '@charisma_ai_chat_history';
const NEXT_GREETING_KEY = '@charisma_next_greeting';
const AI_USAGE_KEY = '@ai_chat_usage';
const AI_FIRST_USE_KEY = '@ai_chat_first_use';

// Daily message limit for ALL users before showing subscribe prompt
const DAILY_MESSAGE_LIMIT = 15;
// Maximum number of days a user can use AI chat for free
const MAX_FREE_DAYS = 7;

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
        if (parsed.date !== getTodayKey()) return 0;
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
 */
const getFreePeriodStatus = async (): Promise<{ daysUsed: number; daysRemaining: number; isExpired: boolean }> => {
    try {
        let firstUse = await AsyncStorage.getItem(AI_FIRST_USE_KEY);
        if (!firstUse) {
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
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [message, setMessage] = useState('');
    const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
    const [messages, setMessages] = useState<{ id: string; text: string; isUser: boolean; reactions?: string[] }[]>([]);

    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [reactionMessageId, setReactionMessageId] = useState<string | null>(null);

    const isMounted = React.useRef(true);
    const scrollViewRef = useRef<ScrollView>(null);
    const prevMessageCountRef = useRef(0);

    useEffect(() => {
        if (messages.length > prevMessageCountRef.current) {
            prevMessageCountRef.current = messages.length;
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
        }
    }, [messages.length]);

    const bottomInset = Math.max(insets.bottom, 10);

    useEffect(() => {
        isMounted.current = true;
        loadChatHistory();
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
     * Check usage limits for ALL users:
     * 1. 7-day free period — after that, must subscribe
     * 2. 15 messages/day within the free period
     */
    const checkUsageLimit = async (): Promise<boolean> => {
        const period = await getFreePeriodStatus();
        if (period.isExpired) {
            Alert.alert(
                '⏰ Free trial ended',
                'Your 7-day free AI chat access has ended. Subscribe now to continue chatting with your Charisma AI!',
                [
                    { text: 'Maybe Later', style: 'cancel' },
                    { text: 'Subscribe Now', onPress: () => {} },
                ]
            );
            return false;
        }

        const count = await getUsageCount();
        if (count >= DAILY_MESSAGE_LIMIT) {
            Alert.alert(
                '💬 Daily limit reached',
                `You've used your ${DAILY_MESSAGE_LIMIT} free messages for today (Day ${period.daysUsed} of ${MAX_FREE_DAYS}). Come back tomorrow or subscribe for unlimited access!`,
                [
                    { text: 'OK', style: 'cancel' },
                    { text: 'Subscribe Now', onPress: () => {} },
                ]
            );
            return false;
        }
        return true;
    };

    const speakText = async (text: string) => {
        if (!isMounted.current) return;
        if (!isSpeakerEnabled) return;
        await speakAIMessage(text);
    };

    const loadChatHistory = async () => {
        try {
            const storedMessages = await AsyncStorage.getItem(AI_CHAT_STORAGE_KEY);
            if (storedMessages) {
                const parsedMessages = JSON.parse(storedMessages);
                if (isMounted.current) setMessages(parsedMessages);

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
            if (!genAI) return;
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const systemPrompt = { role: "user", parts: [{ text: "System: You are a charismatic AI assistant. Generate a SHORT, warm, one-sentence welcome back message for the NEXT time the user opens the app, based on our conversation so far. VARY YOUR TONE (witty, calm, enthusiastic). Do not give advice, just a hook for next time." }] };
            const systemAck = { role: "model", parts: [{ text: "Understood. I will generate a short, warm welcome back message." }] };
            const chat = model.startChat({ history: [systemPrompt, systemAck, ...history] });
            const result = await chat.sendMessage("Generate the cached welcome message for the next session.");
            const nextGreeting = result.response.text();

            await AsyncStorage.setItem(NEXT_GREETING_KEY, nextGreeting);
        } catch (e) {
            console.log("Failed to generate next greeting", e);
        }
    };

    const toggleSpeaker = async () => {
        if (isSpeakerEnabled) {
            try {
                await stopAIVoice();
            } catch (e) {
                console.log('Error stopping speech:', e);
            }
            setIsSpeakerEnabled(false);
        } else {
            setIsSpeakerEnabled(true);
        }
    };

    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [genAI, setGenAI] = useState<ReturnType<typeof initializeGemini>>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Initialize Gemini AI on component mount
    useEffect(() => {
        const initAI = async () => {
            try {
                const ai = initializeGemini();
                if (ai) {
                    setGenAI(ai);
                    setAiError(null);
                } else {
                    setAiError('AI not available - API key missing');
                }
            } catch (error) {
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

        const canSend = await checkUsageLimit();
        if (!canSend) return;

        await incrementUsage();
        setIsLoading(true);

        const newUserMessage = { id: Date.now().toString(), text: userMessageText, isUser: true };
        const updatedMessagesWithUser = [...messages, newUserMessage];
        if (isMounted.current) setMessages(updatedMessagesWithUser);
        await AsyncStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(updatedMessagesWithUser));

        try {
            if (!genAI) {
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

            const aiResponse = { id: (Date.now() + 1).toString(), text: responseText, isUser: false };
            const finalMessages = [...updatedMessagesWithUser, aiResponse];
            if (isMounted.current) setMessages(finalMessages);
            await AsyncStorage.setItem(AI_CHAT_STORAGE_KEY, JSON.stringify(finalMessages));

            const newHistory = [
                ...chatHistory,
                { role: "user", parts: [{ text: userMessageText }] },
                { role: "model", parts: [{ text: responseText }] }
            ];
            if (isMounted.current) setChatHistory(newHistory);

            speakText(responseText);
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

    const handleShareMessage = (text: string) => {
        setSelectedMessageId(null);
        Alert.alert(
            'Share Message',
            'How would you like to share this?',
            [
                {
                    text: 'Share Externally',
                    onPress: async () => {
                        try {
                            await Share.share({ message: `${text}\n\n— Czar AI` });
                        } catch (error) {
                            console.error('Error sharing message:', error);
                        }
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
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

    const handleClearChat = () => {
        Alert.alert(
            'Clear Chat',
            'Are you sure you want to clear all chat history?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        await AsyncStorage.removeItem(AI_CHAT_STORAGE_KEY);
                        await AsyncStorage.removeItem(NEXT_GREETING_KEY);
                        const randomGreeting = INITIAL_GREETINGS[Math.floor(Math.random() * INITIAL_GREETINGS.length)];
                        setMessages([{ id: '1', text: randomGreeting, isUser: false }]);
                        setChatHistory([]);
                    },
                },
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={[styles.title, { color: colors.text }]}>Czar AI</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleClearChat}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="trash" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={toggleSpeaker}
                        activeOpacity={0.7}
                    >
                        <IconSymbol
                            name={isSpeakerEnabled ? "speaker.wave.2" : "speaker.slash"}
                            size={22}
                            color={isSpeakerEnabled ? colors.gold : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <WhatsAppBackground>
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesContainer}
                    contentContainerStyle={styles.messagesContent}
                    keyboardShouldPersistTaps="handled"
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

                    {isLoading && (
                        <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card }]}>
                            <Text style={[styles.messageText, { color: colors.textSecondary }]}>Thinking...</Text>
                        </View>
                    )}
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
                        disabled={!message.trim() || isLoading}
                    >
                        <IconSymbol
                            name="paperplane"
                            size={20}
                            color={message.trim() ? '#FFFFFF' : colors.textSecondary}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerButton: {
        padding: 8,
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
        maxWidth: '85%',
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
        paddingRight: 28,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
        paddingRight: 14,
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
        right: 6,
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
