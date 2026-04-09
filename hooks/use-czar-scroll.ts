import { useCallback, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

interface UseCzarScrollOptions {
  scrollThreshold?: number;
  hideDelay?: number;
}

interface UseCzarScrollReturn {
  czarVisible: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  showCzar: () => void;
  hideCzar: () => void;
}

export function useCzarScroll(options: UseCzarScrollOptions = {}): UseCzarScrollReturn {
  const { scrollThreshold = 10, hideDelay = 0 } = options;
  const [czarVisible, setCzarVisible] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideCzar = useCallback(() => {
    setCzarVisible(false);
  }, []);

  const showCzar = useCallback(() => {
    // Clear any pending hide timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setCzarVisible(true);
  }, []);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY.current);

      // Hide Czar if scrolled more than threshold
      if (scrollDelta > scrollThreshold) {
        hideCzar();
      }

      lastScrollY.current = currentScrollY;
    },
    [scrollThreshold, hideCzar]
  );

  return {
    czarVisible,
    onScroll,
    showCzar,
    hideCzar,
  };
}
