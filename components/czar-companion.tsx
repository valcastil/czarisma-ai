import { useTheme } from '@/hooks/use-theme';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Easing, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View, Dimensions } from 'react-native';

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

// Czar image - Tsar portrait
const CZAR_IMAGE = require('@/assets/images/czar.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const mouthScaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Draggable position state
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const lastPosition = useRef({ x: 0, y: 0 });
  const [displayMessage, setDisplayMessage] = useState(message || messages[mood][0]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTalking, setIsTalking] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);
  const [isVisible, setIsVisible] = useState(controlledVisible ?? false);
  const [hasAppeared, setHasAppeared] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Handle controlled visibility prop
  useEffect(() => {
    if (controlledVisible !== undefined) {
      setIsVisible(controlledVisible);
    }
  }, [controlledVisible]);

  // Update message when prop changes (for intelligent mode)
  useEffect(() => {
    if (message && intelligent) {
      setDisplayMessage(message);
      // Start talking animation when message changes
      setIsTalking(true);
    }
  }, [message, intelligent]);

  // Trigger talking animation when Czar becomes visible
  useEffect(() => {
    if (isVisible && displayMessage) {
      setIsTalking(true);
    }
  }, [isVisible]);

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

  // Talking animation - mouth opening/closing
  useEffect(() => {
    if (!isTalking) {
      mouthScaleAnim.setValue(0);
      return;
    }

    const talkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(mouthScaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(mouthScaleAnim, {
          toValue: 0.3,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(mouthScaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(mouthScaleAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    talkAnimation.start();

    // Stop talking after estimated audio duration (~80ms per char, min 2s, max 15s)
    const estimatedDuration = Math.min(
      Math.max(2000, displayMessage.length * 80),
      15000
    );
    const timer = setTimeout(() => {
      setIsTalking(false);
    }, estimatedDuration);

    return () => {
      talkAnimation.stop();
      clearTimeout(timer);
    };
  }, [isTalking, mouthScaleAnim]);

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
            {/* Main circular image (like Duolingo owl) */}
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
                source={CZAR_IMAGE}
                style={[styles.czarImage, { width: currentSize.width, height: currentSize.height }]}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Animated Mouth - positioned on the face */}
            <Animated.View
              style={[
                styles.mouthWrapper,
                {
                  transform: [
                    { scale: mouthScaleAnim },
                  ],
                  opacity: mouthScaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ]}
            >
              <View style={styles.mouth}>
                <View style={styles.mouthInner}>
                  <View style={styles.teethTop} />
                  <View style={styles.tongue} />
                </View>
              </View>
            </Animated.View>

            {/* Base/stand shadow (like Duolingo owl sits on something) */}
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
  mouthWrapper: {
    position: 'absolute',
    bottom: '22%',
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mouth: {
    width: 36,
    height: 24,
    backgroundColor: '#4A1C1C',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2D0F0F',
  },
  mouthInner: {
    flex: 1,
    backgroundColor: '#8B3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teethTop: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 8,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  tongue: {
    position: 'absolute',
    bottom: 3,
    width: 14,
    height: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 7,
  },
});
