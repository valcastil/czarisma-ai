import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInactivityOptions {
  timeout?: number; // in seconds
  onInactive?: () => void;
  onActive?: () => void;
}

interface UseInactivityReturn {
  isInactive: boolean;
  resetTimer: () => void;
  timeRemaining: number;
}

export function useInactivity(options: UseInactivityOptions = {}): UseInactivityReturn {
  const { timeout = 20, onInactive, onActive } = options;
  const [isInactive, setIsInactive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const clearInactivityTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearInactivityTimer();
    setIsInactive(false);
    setTimeRemaining(timeout);
    lastActivityRef.current = Date.now();

    // Start countdown timer
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - lastActivityRef.current) / 1000;
      const remaining = Math.max(0, timeout - elapsed);
      setTimeRemaining(Math.ceil(remaining));

      if (remaining <= 0) {
        setIsInactive(true);
        onInactive?.();
        clearInactivityTimer();
      }
    }, 1000);
  }, [timeout, onInactive, clearInactivityTimer]);

  // Handle activity detection
  const handleActivity = useCallback(() => {
    if (isInactive) {
      onActive?.();
    }
    resetTimer();
  }, [isInactive, onActive, resetTimer]);

  // Setup and cleanup
  useEffect(() => {
    resetTimer();
    return () => clearInactivityTimer();
  }, [resetTimer, clearInactivityTimer]);

  return {
    isInactive,
    resetTimer,
    timeRemaining,
  };
}
