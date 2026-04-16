import { useCzar } from '@/contexts/czar-context';
import React, { useRef } from 'react';
import { View } from 'react-native';

interface InactivityProviderProps {
  children: React.ReactNode;
}

export function InactivityProvider({ children }: InactivityProviderProps) {
  const { resetInactivity } = useCzar();

  // Debounce ref — only reset idle timer once per touch sequence, not on every event
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleActivity = () => {
    if (debounceRef.current) return; // already scheduled
    resetInactivity();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
    }, 500);
  };

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={handleActivity}
      // Do NOT set pointerEvents — let all touches pass through normally
    >
      {children}
    </View>
  );
}
