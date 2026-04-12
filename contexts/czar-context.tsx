import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Screen-specific context messages for Czar
type ScreenContext = {
  screen: string;
  message: string;
  actionPrompt: string;
};

// Randomized messages per screen — mix of tips, encouragement, and jokes
const screenMessages: Record<string, string[]> = {
  'index': [
    "Your charisma is off the charts today! 🔥",
    "Fun fact: Charismatic people blink less. Try it... or don't. 😂",
    "Welcome back, legend! Ready to level up?",
    "Did you know? Confidence is just charisma's warm-up act! 💪",
    "Knock knock! Who's there? Your untapped potential! 🚀",
    "A wise Czar once said: 'Track your growth, rule your world.' That Czar was me. 👑",
    "You've got more charisma than a room full of motivational speakers!",
    "Quick tip: Smile more — it's free charisma points! 😊",
    "Your vibe today? Absolutely magnetic. ✨",
    "Why did the charismatic person cross the road? To inspire the other side! 🤣",
  ],
  '(tabs)': [
    "Swipe, explore, conquer! The world is your stage. 🌍",
    "Every tab is a new adventure. What'll it be today?",
    "Pro tip: Great leaders explore all their options. You're doing great! 👏",
    "Why don't charismatic people get lost? They always find their way! 😄",
    "Keep exploring — that's what legends do! 🏆",
  ],
  'ai-chat': [
    "AI + You = Unstoppable combo! 🤖✨",
    "Ask me anything! I promise I won't judge... much. 😜",
    "Fun fact: Even AI needs a coffee break. Just kidding, I'm always here!",
    "Your AI buddy is ready! Let's brainstorm something brilliant. 💡",
    "Why did the AI go to therapy? Too many unresolved queries! 😂",
    "Think of me as your charisma co-pilot. Let's fly! ✈️",
    "Pro tip: The best conversations start with curiosity. Go ahead!",
    "I've been waiting for you! ...okay that sounded creepy. But really, hi! 👋",
  ],
  'profile': [
    "Looking sharp! Your profile is 🔥",
    "Fun fact: Your profile pic has more charisma than most people's whole personality! 😎",
    "Stats don't lie — you're crushing it! 📊",
    "Your profile called. It wants you to know how awesome you are. 💪",
    "Why update your profile? Because the world deserves to see the real you! 🌟",
    "Pro tip: A great profile pic = +100 charisma points (scientifically proven*) 📸\n\n*Not actually proven.",
    "Mirror mirror on the wall, who's the most charismatic of them all? You! 👑",
    "Your achievements are stacking up like a royal treasury! 💰",
  ],
  'profile-settings': [
    "Customization is the key to world domination! Or at least a cool profile. 🎨",
    "Settings are like a wardrobe — pick what fits you best! 👔",
    "Pro tip: The best settings are the ones that make YOU happy.",
    "Tweaking your profile? That's what champions do! 🏅",
    "Fun fact: Even royalty updates their look from time to time! 👑",
  ],
  'subscription': [
    "PRO users have 200% more charisma. Okay I made that up, but still! 😂",
    "Investing in yourself? That's the most charismatic move of all! 💎",
    "Fun fact: PRO stands for Pretty Remarkable & Outstanding. Obviously.",
    "Your future PRO self is cheering you on right now! 🎉",
    "Going PRO is like adding a crown to your charisma toolkit! 👑",
  ],
  'subscriptions-info': [
    "Knowledge is power! Understanding your options = big brain energy. 🧠",
    "PRO tip: Reading the fine print makes you 10x more sophisticated! 📋",
    "The more you know, the better you grow! 🌱",
    "Smart people ask questions. You're clearly one of them! 💡",
  ],
  'add-entry': [
    "New entry time! Your future self will thank you for this. 📝",
    "Every entry is a step toward legendary charisma! 🚶‍♂️→🏃‍♂️→🦸‍♂️",
    "Pro tip: Be honest in your entries — growth loves authenticity! 💯",
    "Fun fact: Writing things down makes them 42% more likely to happen! ✍️",
    "Your journal is your kingdom. Rule it wisely! 👑",
    "One small entry for you, one giant leap for your charisma! 🚀",
    "Quick joke: Why did the entry blush? It was too personal! 😂",
  ],
  'entry/[id]': [
    "Reviewing past entries? That's elite-level self-awareness! 🧠",
    "Look how far you've come! This entry is proof. 📖",
    "Pro tip: Share your wins — charisma multiplies when shared! 🤝",
    "Your past self left you breadcrumbs of wisdom. Follow them! 🍞",
    "Every entry tells a story. This one's a bestseller! 📚",
  ],
  'settings': [
    "Adjusting the controls? A true master of their domain! ⚙️",
    "Pro tip: Good settings = smooth sailing! 🚢",
    "Fun fact: 73% of successful people customize their app settings. The other 27% wish they did! 😄",
    "Settings are like seasoning — a little tweak makes everything better! 🧂",
  ],
  'onboarding-charisma': [
    "Welcome aboard, future charisma champion! 🎖️",
    "First steps are always the bravest. I'm proud of you! 🦁",
    "Fun fact: You're already more charismatic just by being here! ✨",
    "The journey of a thousand miles begins with... this screen! 🗺️",
  ],
  'onboarding-emotions': [
    "Emotions are your superpower! Let's understand them better. 💫",
    "Did you know? Emotionally aware people are 40% more charismatic! 🧠",
    "Fun fact: Even Czars have feelings. Mine is 'excitement' right now! 😄",
    "Mastering emotions = mastering life. You're on the right track! 🎯",
  ],
  'auth-sign-in': [
    "Welcome! Great things await behind this door! 🚪✨",
    "Signing in is step one to greatness. Let's go! 🏁",
    "Your kingdom awaits, Your Majesty! Just sign in. 👑",
    "Fun fact: The password to success is... well, your actual password! 🔑😂",
  ],
  'chat': [
    "Chatting with friends? Your charisma is contagious! 💬✨",
    "Pro tip: Good listeners make the best conversationalists! 👂",
    "Fun fact: The average person sends 72 texts a day. You're clearly above average! 📱",
    "Your words have power — use them wisely and hilariously! 😄",
    "Why did the text message break up with the email? It wanted a quicker response! 💌😂",
  ],
  'modal': [
    "Welcome to CzarApp! Your charisma journey starts NOW! 🎬",
    "The Czar is in! Ready to guide you to greatness! 👑",
    "Fun fact: You've just opened the most charismatic app ever created. Coincidence? I think not! 😎",
  ],
};

// Helper to pick a random message for a screen
const getRandomMessage = (screen: string): string => {
  const messages = screenMessages[screen] || screenMessages['index'] || ['Welcome! 👋'];
  return messages[Math.floor(Math.random() * messages.length)];
};

// Build screen context from screen name
const getScreenContext = (screen: string): ScreenContext => {
  const friendlyNames: Record<string, string> = {
    'index': 'Home',
    '(tabs)': 'Home',
    'ai-chat': 'AI Chat',
    'profile': 'Profile',
    'profile-settings': 'Profile Settings',
    'subscription': 'Subscription',
    'subscriptions-info': 'Subscriptions',
    'add-entry': 'Add Entry',
    'entry/[id]': 'Entry Details',
    'settings': 'Settings',
    'onboarding-charisma': 'Onboarding',
    'onboarding-emotions': 'Onboarding',
    'auth-sign-in': 'Sign In',
    'chat': 'Chat',
    'modal': 'Welcome',
  };

  const message = getRandomMessage(screen);
  return {
    screen: friendlyNames[screen] || screen,
    message,
    actionPrompt: message,
  };
};

interface CzarContextType {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  shouldShowCzar: boolean;
  dismissCzar: () => void;
  interactWithCzar: () => void;
  resetInactivity: () => void;
  screenContext: ScreenContext | null;
  czarMessage: string;
  // For debugging/UI
  timeUntilNextAppearance: number;
  isVisibleWindow: boolean;
}

const CzarContext = createContext<CzarContextType | undefined>(undefined);

// Constants for timing
const INITIAL_DELAY = 1; // seconds after screen change to show Czar (fast for navigation)
const VISIBILITY_DURATION = 6; // seconds Czar stays visible
const COOLDOWN_DURATION = 10; // seconds before Czar can appear again (shorter for more interaction)

export function CzarProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreenState] = useState('index');
  const [shouldShowCzar, setShouldShowCzar] = useState(false);
  const [czarMessage, setCzarMessage] = useState('');
  const [timeUntilNextAppearance, setTimeUntilNextAppearance] = useState(0);
  const [isVisibleWindow, setIsVisibleWindow] = useState(false);

  // Refs for timers
  const initialDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownEndTimeRef = useRef<number>(0);
  const hasInteractedRef = useRef<boolean>(false);

  // Clear all timers
  const clearAllTimers = useCallback(() => {
    if (initialDelayTimerRef.current) {
      clearTimeout(initialDelayTimerRef.current);
      initialDelayTimerRef.current = null;
    }
    if (visibilityTimerRef.current) {
      clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = null;
    }
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  // Start cooldown period
  const startCooldown = useCallback(() => {
    cooldownEndTimeRef.current = Date.now() + COOLDOWN_DURATION * 1000;
    setTimeUntilNextAppearance(COOLDOWN_DURATION);

    cooldownTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((cooldownEndTimeRef.current - Date.now()) / 1000);
      setTimeUntilNextAppearance(Math.max(0, remaining));

      if (remaining <= 0) {
        if (cooldownTimerRef.current) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
      }
    }, 1000);
  }, []);

  // Show Czar after initial delay
  const scheduleCzarAppearance = useCallback(() => {
    // Get a fresh random message for this screen
    const context = getScreenContext(currentScreen);

    // Clear any existing timers
    clearAllTimers();

    // Set message for current screen
    setCzarMessage(context.actionPrompt);

    // Schedule appearance after 3 seconds
    initialDelayTimerRef.current = setTimeout(() => {
      setShouldShowCzar(true);
      setIsVisibleWindow(true);
      hasInteractedRef.current = false;

      // Set timer to hide Czar after 5 seconds if not interacted
      visibilityTimerRef.current = setTimeout(() => {
        if (!hasInteractedRef.current) {
          setShouldShowCzar(false);
          setIsVisibleWindow(false);
          startCooldown();
        }
      }, VISIBILITY_DURATION * 1000);
    }, INITIAL_DELAY * 1000);
  }, [currentScreen, clearAllTimers, startCooldown]);

  // Track previous screen to detect actual navigation
  const prevScreenRef = useRef<string>('index');

  // Handle screen change — trigger Czar on every navigation/swipe
  const setCurrentScreen = useCallback((screen: string) => {
    const prevScreen = prevScreenRef.current;
    prevScreenRef.current = screen;
    setCurrentScreenState(screen);

    // Only trigger on actual screen change (not same screen re-render)
    if (screen === prevScreen) return;

    // Check if we're in cooldown period
    const now = Date.now();
    if (now < cooldownEndTimeRef.current) {
      // Still in cooldown, don't show Czar yet
      clearAllTimers();
      setShouldShowCzar(false);
      setIsVisibleWindow(false);
      return;
    }

    // Screen changed — show Czar with a fresh random message
    scheduleCzarAppearance();
  }, [clearAllTimers, scheduleCzarAppearance]);

  // User dismissed Czar (tapped X or similar)
  const dismissCzar = useCallback(() => {
    setShouldShowCzar(false);
    setIsVisibleWindow(false);
    clearAllTimers();
    startCooldown();
  }, [clearAllTimers, startCooldown]);

  // User interacted with Czar (tapped or dragged)
  const interactWithCzar = useCallback(() => {
    hasInteractedRef.current = true;
    // Cancel the auto-hide timer since user interacted
    if (visibilityTimerRef.current) {
      clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = null;
    }
  }, []);

  // Reset everything (for testing/debugging)
  const resetInactivity = useCallback(() => {
    clearAllTimers();
    cooldownEndTimeRef.current = 0;
    setTimeUntilNextAppearance(0);
    setShouldShowCzar(false);
    setIsVisibleWindow(false);
    hasInteractedRef.current = false;
  }, [clearAllTimers]);

  // Initial mount - schedule Czar appearance
  useEffect(() => {
    scheduleCzarAppearance();
    return () => clearAllTimers();
  }, []);

  const screenContext = getScreenContext(currentScreen);

  return (
    <CzarContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        shouldShowCzar,
        dismissCzar,
        interactWithCzar,
        resetInactivity,
        screenContext,
        czarMessage,
        timeUntilNextAppearance,
        isVisibleWindow,
      }}
    >
      {children}
    </CzarContext.Provider>
  );
}

export function useCzar() {
  const context = useContext(CzarContext);
  if (context === undefined) {
    throw new Error('useCzar must be used within a CzarProvider');
  }
  return context;
}
