import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { speakCzarMessage, stopCzarVoice } from '@/utils/czar-voice';

const CZAR_ENABLED_KEY = '@czar_ai_enabled';
const CZAR_TIMER_KEY = '@czar_ai_timer';
const DEFAULT_IDLE_TIMEOUT = 20; // seconds

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
  'modal': [
    "Welcome to Czar AI! Your charisma journey starts NOW! 🎬",
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
    'profile': 'Profile',
    'profile-settings': 'Profile Settings',
    'add-entry': 'Add Entry',
    'entry/[id]': 'Entry Details',
    'settings': 'Settings',
    'onboarding-charisma': 'Onboarding',
    'onboarding-emotions': 'Onboarding',
    'auth-sign-in': 'Sign In',
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
  czarEnabled: boolean;
  setCzarEnabled: (enabled: boolean) => Promise<void>;
  idleTimeout: number;
  setIdleTimeout: (seconds: number) => Promise<void>;
  // For debugging/UI
  timeUntilNextAppearance: number;
  isVisibleWindow: boolean;
}

const CzarContext = createContext<CzarContextType | undefined>(undefined);

// Constants for timing
const VISIBILITY_DURATION = 18; // seconds Czar stays visible (long enough for voice to finish)

// Screens where the Czar companion should never appear (user is already interacting with AI)
const SUPPRESSED_SCREENS: string[] = [];

export function CzarProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreenState] = useState('index');
  const [shouldShowCzar, setShouldShowCzar] = useState(false);
  const [czarMessage, setCzarMessage] = useState('');
  const [timeUntilNextAppearance, setTimeUntilNextAppearance] = useState(0);
  const [isVisibleWindow, setIsVisibleWindow] = useState(false);
  const [czarEnabled, setCzarEnabledState] = useState(true);
  const [idleTimeout, setIdleTimeoutState] = useState(DEFAULT_IDLE_TIMEOUT);

  // Refs for timers
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentScreenRef = useRef('index');
  const czarEnabledRef = useRef(true);
  const idleTimeoutRef = useRef(DEFAULT_IDLE_TIMEOUT);

  // Load czar preferences on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(CZAR_ENABLED_KEY),
      AsyncStorage.getItem(CZAR_TIMER_KEY),
    ]).then(([enabledVal, timerVal]) => {
      const enabled = enabledVal === null ? true : enabledVal === 'true';
      czarEnabledRef.current = enabled;
      setCzarEnabledState(enabled);

      const timer = timerVal ? parseInt(timerVal, 10) : DEFAULT_IDLE_TIMEOUT;
      if (!isNaN(timer) && timer >= 5) {
        idleTimeoutRef.current = timer;
        setIdleTimeoutState(timer);
      }
    });
  }, []);

  // Show Czar now — pick a message for the current screen and speak it
  const showCzar = useCallback(() => {
    if (!czarEnabledRef.current) return;

    // Suppress on screens where AI interaction is already active
    if (SUPPRESSED_SCREENS.includes(currentScreenRef.current)) {
      startIdleTimer();
      return;
    }

    const context = getScreenContext(currentScreenRef.current);
    setCzarMessage(context.actionPrompt);
    czarVisibleRef.current = true;
    setShouldShowCzar(true);
    setIsVisibleWindow(true);

    // Clear any existing visibility timer
    if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);

    // Speak and get estimated duration, then set visibility timer based on speech length
    speakCzarMessage(context.actionPrompt)
      .then((durationMs) => {
        // Set visibility timer based on actual speech duration + 2 second buffer
        const visibilityTime = Math.max(VISIBILITY_DURATION * 1000, durationMs + 2000);
        visibilityTimerRef.current = setTimeout(() => {
          czarVisibleRef.current = false;
          setShouldShowCzar(false);
          setIsVisibleWindow(false);
          stopCzarVoice().catch(() => {});
          startIdleTimer();
        }, visibilityTime);
      })
      .catch(() => {
        // Fallback: use default visibility duration if speech fails
        visibilityTimerRef.current = setTimeout(() => {
          czarVisibleRef.current = false;
          setShouldShowCzar(false);
          setIsVisibleWindow(false);
          stopCzarVoice().catch(() => {});
          startIdleTimer();
        }, VISIBILITY_DURATION * 1000);
      });
  }, []);

  // Start (or restart) the idle countdown using user-configured timeout
  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      showCzar();
    }, idleTimeoutRef.current * 1000);
  }, [showCzar]);

  // Track whether Czar is currently visible (ref for sync access in callbacks)
  const czarVisibleRef = useRef(false);

  // Called by InactivityProvider on touch — resets idle clock
  const resetInactivity = useCallback(() => {
    // Only do heavy work if Czar is actually visible
    if (czarVisibleRef.current) {
      if (visibilityTimerRef.current) {
        clearTimeout(visibilityTimerRef.current);
        visibilityTimerRef.current = null;
      }
      czarVisibleRef.current = false;
      setShouldShowCzar(false);
      setIsVisibleWindow(false);
      stopCzarVoice().catch(() => {});
    }

    // Always restart the idle countdown
    startIdleTimer();
  }, [startIdleTimer]);

  // Track screen changes (just update ref — no longer triggers Czar directly)
  const prevScreenRef = useRef<string>('index');
  const setCurrentScreen = useCallback((screen: string) => {
    if (screen !== prevScreenRef.current) {
      prevScreenRef.current = screen;
      currentScreenRef.current = screen;
      setCurrentScreenState(screen);

      // Hide companion immediately when entering a suppressed screen
      if (SUPPRESSED_SCREENS.includes(screen) && czarVisibleRef.current) {
        if (visibilityTimerRef.current) {
          clearTimeout(visibilityTimerRef.current);
          visibilityTimerRef.current = null;
        }
        czarVisibleRef.current = false;
        setShouldShowCzar(false);
        setIsVisibleWindow(false);
        stopCzarVoice().catch(() => {});
      }
    }
  }, []);

  // Persist and apply czar timer setting
  const setIdleTimeout = useCallback(async (seconds: number) => {
    const clamped = Math.max(5, Math.min(300, Math.round(seconds)));
    idleTimeoutRef.current = clamped;
    setIdleTimeoutState(clamped);
    await AsyncStorage.setItem(CZAR_TIMER_KEY, String(clamped));
    // Restart idle timer with new duration
    if (czarEnabledRef.current) {
      startIdleTimer();
    }
  }, [startIdleTimer]);

  // Persist and apply czar enabled toggle
  const setCzarEnabled = useCallback(async (enabled: boolean) => {
    czarEnabledRef.current = enabled;
    setCzarEnabledState(enabled);
    await AsyncStorage.setItem(CZAR_ENABLED_KEY, String(enabled));
    if (!enabled) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
      setShouldShowCzar(false);
      setIsVisibleWindow(false);
      stopCzarVoice().catch(() => {});
    } else {
      startIdleTimer();
    }
  }, [startIdleTimer]);

  // User dismissed Czar manually (tapped X)
  const dismissCzar = useCallback(() => {
    if (visibilityTimerRef.current) {
      clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = null;
    }
    czarVisibleRef.current = false;
    setShouldShowCzar(false);
    setIsVisibleWindow(false);
    stopCzarVoice().catch(() => {});
    startIdleTimer();
  }, [startIdleTimer]);

  // User interacted with Czar (dragged) — keep visible, cancel auto-hide
  const interactWithCzar = useCallback(() => {
    if (visibilityTimerRef.current) {
      clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = null;
    }
  }, []);

  // Pause/resume idle timer based on app foreground/background state
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // App went to background — stop everything immediately
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
        setShouldShowCzar(false);
        setIsVisibleWindow(false);
        stopCzarVoice().catch(() => {});
      } else if (nextState === 'active') {
        // App returned to foreground — restart idle countdown fresh
        if (czarEnabledRef.current) {
          startIdleTimer();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [startIdleTimer]);

  // Start idle timer on mount, clear on unmount
  useEffect(() => {
    startIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
    };
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
        czarEnabled,
        setCzarEnabled,
        idleTimeout,
        setIdleTimeout,
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
