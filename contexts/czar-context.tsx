import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Screen-specific context messages for Czar
type ScreenContext = {
  screen: string;
  message: string;
  actionPrompt: string;
};

const screenContexts: Record<string, ScreenContext> = {
  'index': {
    screen: 'Home',
    message: 'Welcome to your Charisma journey!',
    actionPrompt: 'Would you like to add a new entry or check your progress?',
  },
  'ai-chat': {
    screen: 'AI Chat',
    message: 'Chatting with your AI companion!',
    actionPrompt: 'Need help with anything specific?',
  },
  'profile': {
    screen: 'Profile',
    message: 'Viewing your profile stats!',
    actionPrompt: 'Want to update your profile or check your achievements?',
  },
  'profile-settings': {
    screen: 'Profile Settings',
    message: 'Customizing your profile!',
    actionPrompt: 'Need to change any settings?',
  },
  'subscription': {
    screen: 'Subscription',
    message: 'Exploring subscription options!',
    actionPrompt: 'Have questions about our plans?',
  },
  'add-entry': {
    screen: 'Add Entry',
    message: 'Adding a new Charisma entry!',
    actionPrompt: 'Need help filling out the entry?',
  },
  'entry/[id]': {
    screen: 'Entry Details',
    message: 'Viewing your entry details!',
    actionPrompt: 'Want to edit or share this entry?',
  },
  'onboarding-charisma': {
    screen: 'Onboarding',
    message: 'Getting started with Charisma!',
    actionPrompt: 'Need help understanding the app?',
  },
  'onboarding-emotions': {
    screen: 'Onboarding',
    message: 'Learning about emotions!',
    actionPrompt: 'Have questions about emotions?',
  },
  'onboarding-password': {
    screen: 'Onboarding',
    message: 'Setting up your account!',
    actionPrompt: 'Need help with password setup?',
  },
  'modal': {
    screen: 'Welcome',
    message: 'Welcome to CzarApp!',
    actionPrompt: 'Ready to start your journey?',
  },
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
const INITIAL_DELAY = 3; // seconds after screen change to show Czar
const VISIBILITY_DURATION = 5; // seconds Czar stays visible
const COOLDOWN_DURATION = 20; // seconds before Czar can appear again

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
    const context = screenContexts[currentScreen];
    if (!context) return;

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

  // Handle screen change
  const setCurrentScreen = useCallback((screen: string) => {
    setCurrentScreenState(screen);

    // Check if we're in cooldown period
    const now = Date.now();
    if (now < cooldownEndTimeRef.current) {
      // Still in cooldown, don't show Czar yet
      clearAllTimers();
      setShouldShowCzar(false);
      setIsVisibleWindow(false);
      return;
    }

    // Not in cooldown, schedule Czar appearance
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

  const screenContext = screenContexts[currentScreen] || null;

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
