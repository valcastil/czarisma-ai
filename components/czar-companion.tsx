import { useTheme } from '@/hooks/use-theme';
import { AI_VOICE_PREFERENCE_KEY } from '@/utils/ai-voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

interface CzarCompanionProps {
  message?: string;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  mood?: 'happy' | 'thinking' | 'excited' | 'encouraging' | 'search' | 'profile' | 'surprised' | 'sleepy';
  showMessage?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'floating';
  autoHideDelay?: number;
  appearDelay?: number;
  visible?: boolean;
  onHide?: () => void;
  intelligent?: boolean; // New: enables smart context-aware behavior
  onDismiss?: () => void; // New: callback when user dismisses Czar
  onInteract?: () => void; // New: callback when user taps or drags Czar
}

const messages = {
  happy: ['Great job!', 'You\'re doing amazing!', 'Keep it up!', 'Wonderful!'],
  thinking: ['Hmm, let me think...', 'Processing...', 'Give me a moment...', 'Interesting...'],
  excited: ['Wow! That\'s awesome!', 'Incredible!', 'You\'re on fire!', 'Amazing!'],
  encouraging: ['You\'ve got this!', 'Believe in yourself!', 'One step at a time!', 'Don\'t give up!'],
  search: ['What are we looking for today?', 'I\'m ready to help!', 'Let\'s find something great!', 'Searching...'],
  profile: ['Looking good!', 'Update your profile?', 'Make it yours!', 'Great photo!'],
  surprised: ['Oh my!', 'Really?!', 'No way!', 'Fantastic!'],
  sleepy: ['*yawn*', 'So tired...', 'Time for a break?', 'Goodnight!'],
};

// Czar images - Male and Female portraits
const CZAR_MALE_IMAGE = require('@/assets/images/czar.png');
const CZAR_FEMALE_IMAGE = require('@/assets/images/woman_czar.png');

// SCREEN_WIDTH / SCREEN_HEIGHT now obtained via useWindowDimensions() inside component

const sizeStyles = {
  small: { width: 70, height: 70 },
  medium: { width: 100, height: 100 },
  large: { width: 130, height: 130 },
};

export function CzarCompanion({
  message,
  onPress,
  size = 'medium',
  mood = 'happy',
  showMessage = true,
  position = 'floating',
  autoHideDelay = 5,
  appearDelay = 3,
  visible: controlledVisible,
  onHide,
  intelligent = false,
  onDismiss,
  onInteract,
}: CzarCompanionProps) {
  const { colors } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Solar flare animation refs (replaces mouth animation)
  const flareScale1 = useRef(new Animated.Value(1)).current;
  const flareOpacity1 = useRef(new Animated.Value(0)).current;
  const flareScale2 = useRef(new Animated.Value(1)).current;
  const flareOpacity2 = useRef(new Animated.Value(0)).current;
  const flareScale3 = useRef(new Animated.Value(1)).current;
  const flareOpacity3 = useRef(new Animated.Value(0)).current;

  // Draggable position state
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const [displayMessage, setDisplayMessage] = useState(message || messages[mood][0]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTalking, setIsTalking] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('male');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load voice preference to determine which image to show
  useEffect(() => {
    const loadGender = async () => {
      try {
        const stored = await AsyncStorage.getItem(AI_VOICE_PREFERENCE_KEY);
        if (stored === 'female' || stored === 'male') {
          setVoiceGender(stored);
        }
      } catch {}
    };
    loadGender();
  }, []);

  // Get current size based on prop
  const currentSize = sizeStyles[size];

  // Handle interaction - defined early for panResponder
  const handlePress = useCallback(() => {
    // Trigger wiggle animation
    setIsWiggling(true);

    // Start talking animation
    setIsTalking(true);

    // In intelligent mode, tapping dismisses Czar
    if (intelligent) {
      onDismiss?.();
    } else {
      // Cycle through messages in normal mode
      const moodMessages = messages[mood];
      const nextIndex = (messageIndex + 1) % moodMessages.length;
      setMessageIndex(nextIndex);
      setDisplayMessage(moodMessages[nextIndex]);
    }

    onPress?.();
    onInteract?.();
  }, [intelligent, onDismiss, onPress, onInteract, mood, messageIndex]);

  // Hide czar function
  const hideCzar = useCallback(() => {
    setIsVisible(false);
    onHide?.();
  }, [onHide]);

  // Create PanResponder for dragging - simplified approach
  const panResponder = React.useMemo(() => {
    let startX = 0;
    let startY = 0;
    let didDrag = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        startX = 0;
        startY = 0;
        didDrag = false;
      },
      onPanResponderMove: (_, gestureState) => {
        // Track if this is an actual drag vs tap
        if (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5) {
          if (!didDrag) {
            didDrag = true;
            onInteract?.(); // Notify that user started dragging
          }
        }

        // Update position
        pan.setValue({
          x: gestureState.dx,
          y: gestureState.dy,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        setIsDragging(false);

        // Update last position with current values
        lastPosition.current.x += gestureState.dx;
        lastPosition.current.y += gestureState.dy;

        // Keep within bounds after release
        const padding = 20;
        const maxX = SCREEN_WIDTH - currentSize.width - padding;
        const maxY = SCREEN_HEIGHT - currentSize.height - padding;

        const boundedX = Math.max(padding, Math.min(lastPosition.current.x, maxX));
        const boundedY = Math.max(padding, Math.min(lastPosition.current.y, maxY));

        lastPosition.current = { x: boundedX, y: boundedY };

        // Animate to bounded position using separate springs for x and y
        Animated.parallel([
          Animated.spring(pan.x, {
            toValue: boundedX,
            useNativeDriver: false,
            friction: 8,
          }),
          Animated.spring(pan.y, {
            toValue: boundedY,
            useNativeDriver: false,
            friction: 8,
          }),
        ]).start();

        // If it was a tap (minimal movement), trigger onPress
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          handlePress();
        }
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    });
  }, [pan, handlePress, onInteract, currentSize.width, currentSize.height]);

  // Handle controlled visibility prop — sync immediately, reset opacity before fade-in
  useEffect(() => {
    if (controlledVisible === undefined) return;
    if (controlledVisible) {
      // Reset to invisible first so the fade-in animation always fires
      opacityAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
    setIsVisible(controlledVisible);
  }, [controlledVisible]);

  // Update message when prop changes (for intelligent mode)
  useEffect(() => {
    if (message && intelligent) {
      setDisplayMessage(message);
    }
  }, [message, intelligent]);

  // Trigger talking animation when Czar becomes visible or message changes
  useEffect(() => {
    if (isVisible && displayMessage) {
      setIsTalking(true);
    }
  }, [isVisible, displayMessage]);

  // Position styles for different placements
  const positionStyles = {
    'top-right': { position: 'absolute' as const, top: 80, right: 20 },
    'top-left': { position: 'absolute' as const, top: 80, left: 20 },
    'bottom-right': { position: 'absolute' as const, bottom: 100, right: 20 },
    'bottom-left': { position: 'absolute' as const, bottom: 100, left: 20 },
    'floating': {}, // Default floating in place
  };

  // Initial delayed appearance
  useEffect(() => {
    if (hasAppeared || controlledVisible !== undefined) return;

    appearTimerRef.current = setTimeout(() => {
      setIsVisible(true);
      setHasAppeared(true);
    }, appearDelay * 1000);

    return () => {
      if (appearTimerRef.current) {
        clearTimeout(appearTimerRef.current);
      }
    };
  }, [appearDelay, hasAppeared, controlledVisible]);

  // Auto-hide timer when visible
  useEffect(() => {
    if (!isVisible || autoHideDelay <= 0) return;

    // Clear any existing timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Set new hide timer
    hideTimerRef.current = setTimeout(() => {
      hideCzar();
    }, autoHideDelay * 1000);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isVisible, autoHideDelay]);

  // Show/hide animation
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isVisible, opacityAnim, scaleAnim]);

  // Floating/hovering animation (like Duolingo owl)
  useEffect(() => {
    const hover = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -12,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    hover.start();

    return () => hover.stop();
  }, [bounceAnim]);

  // Wiggle animation when interacted with
  useEffect(() => {
    if (!isWiggling) return;

    const wiggle = Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: -0.1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0.1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: -0.1,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
    ]);
    wiggle.start();

    const timer = setTimeout(() => setIsWiggling(false), 400);
    return () => clearTimeout(timer);
  }, [isWiggling, rotateAnim]);

  // Solar flare animation - pulsing rings when talking (like Claude Code AI)
  useEffect(() => {
    if (!isTalking) {
      flareScale1.setValue(1);
      flareOpacity1.setValue(0);
      flareScale2.setValue(1);
      flareOpacity2.setValue(0);
      flareScale3.setValue(1);
      flareOpacity3.setValue(0);
      return;
    }

    const createFlareAnimation = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1.6,
              duration: 1200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: false,
            }),
            Animated.sequence([
              Animated.timing(opacity, {
                toValue: 0.6,
                duration: 200,
                useNativeDriver: false,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 1000,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
              }),
            ]),
          ]),
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: false,
          }),
        ])
      );

    const flare1 = createFlareAnimation(flareScale1, flareOpacity1, 0);
    const flare2 = createFlareAnimation(flareScale2, flareOpacity2, 400);
    const flare3 = createFlareAnimation(flareScale3, flareOpacity3, 800);

    flare1.start();
    flare2.start();
    flare3.start();

    // Stop talking after estimated audio duration (~80ms per char, min 2s, max 15s)
    const estimatedDuration = Math.min(
      Math.max(2000, displayMessage.length * 80),
      15000
    );
    const timer = setTimeout(() => {
      setIsTalking(false);
    }, estimatedDuration);

    return () => {
      flare1.stop();
      flare2.stop();
      flare3.stop();
      clearTimeout(timer);
    };
  }, [isTalking]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        positionStyles[position],
        {
          opacity: opacityAnim,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale: scaleAnim },
          ],
        },
      ]}
      pointerEvents={isVisible ? 'auto' : 'none'}
      {...panResponder.panHandlers}
    >
      <View style={styles.container}>
        <View style={styles.companionWrapper}>
          {/* Speech Bubble */}
          {showMessage && (
            <View style={[styles.speechBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.speechText, { color: colors.text }]}>
                {displayMessage}
              </Text>
            </View>
          )}

          {/* Czar Character Container */}
          <Animated.View
            style={[
              styles.czarContainer,
              {
                transform: [
                  { translateY: bounceAnim },
                ],
              },
            ]}
          >
            {/* Solar flare rings - pulsing outward when talking */}
            <Animated.View
              style={[
                styles.flareRing,
                {
                  width: currentSize.width,
                  height: currentSize.height,
                  borderRadius: currentSize.width / 2,
                  borderColor: colors.gold || '#F4C542',
                  transform: [{ scale: flareScale1 }],
                  opacity: flareOpacity1,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.flareRing,
                {
                  width: currentSize.width,
                  height: currentSize.height,
                  borderRadius: currentSize.width / 2,
                  borderColor: colors.gold || '#F4C542',
                  transform: [{ scale: flareScale2 }],
                  opacity: flareOpacity2,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.flareRing,
                {
                  width: currentSize.width,
                  height: currentSize.height,
                  borderRadius: currentSize.width / 2,
                  borderColor: colors.gold || '#F4C542',
                  transform: [{ scale: flareScale3 }],
                  opacity: flareOpacity3,
                },
              ]}
            />

            {/* Main circular image */}
            <Animated.View
              style={[
                styles.czarBody,
                {
                  width: currentSize.width,
                  height: currentSize.height,
                  transform: [
                    { rotate: rotateInterpolate },
                  ],
                },
              ]}
            >
              <Image
                source={voiceGender === 'female' ? CZAR_FEMALE_IMAGE : CZAR_MALE_IMAGE}
                style={[styles.czarImage, { width: currentSize.width, height: currentSize.height }]}
                resizeMode="cover"
              />
            </Animated.View>

            {/* Base/stand shadow */}
            <View style={[styles.shadowBase, { width: currentSize.width * 0.8 }]} />
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  companionWrapper: {
    alignItems: 'center',
  },
  speechBubble: {
    maxWidth: 280,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  speechText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  czarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  czarBody: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  czarImage: {
    borderRadius: 50,
  },
  shadowBase: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 50,
    marginTop: 8,
    transform: [{ scaleX: 1.2 }],
  },
  flareRing: {
    position: 'absolute',
    borderWidth: 3,
  },
});
