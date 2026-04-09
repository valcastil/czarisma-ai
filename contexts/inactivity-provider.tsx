import { useCzar } from '@/contexts/czar-context';
import React, { useCallback, useEffect } from 'react';
import { PanResponder, View } from 'react-native';

interface InactivityProviderProps {
  children: React.ReactNode;
}

export function InactivityProvider({ children }: InactivityProviderProps) {
  const { resetInactivity } = useCzar();

  // Create a pan responder to detect any touch/activity
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          resetInactivity();
        },
        onPanResponderMove: () => {
          resetInactivity();
        },
        onPanResponderRelease: () => {
          resetInactivity();
        },
        onPanResponderTerminate: () => {
          resetInactivity();
        },
      }),
    [resetInactivity]
  );

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
