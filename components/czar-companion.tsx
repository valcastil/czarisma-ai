import { useTheme } from '@/hooks/use-theme';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CzarCompanionProps {
  message?: string;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  mood?: 'happy' | 'thinking' | 'excited' | 'encouraging' | 'search' | 'profile' | 'surprised' | 'sleepy';
  showMessage?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'floating';
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

export function CzarCompanion({
  message,
  onPress,
  size = 'medium',
  mood = 'happy',
  showMessage = true,
  position = 'floating',
}: CzarCompanionProps) {
  const { colors } = useTheme();
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const mouthScaleAnim = useRef(new Animated.Value(0)).current;
  const [displayMessage, setDisplayMessage] = useState(message || messages[mood][0]);
  const [messageIndex, setMessageIndex] = useState(0);
  const [isTalking, setIsTalking] = useState(false);
  const [isWiggling, setIsWiggling] = useState(false);

  const sizeStyles = {
    small: { width: 70, height: 70 },
    medium: { width: 100, height: 100 },
    large: { width: 130, height: 130 },
  };

  const currentSize = sizeStyles[size];

  // Position styles for different placements
  const positionStyles = {
    'top-right': { position: 'absolute' as const, top: 80, right: 20 },
    'top-left': { position: 'absolute' as const, top: 80, left: 20 },
    'bottom-right': { position: 'absolute' as const, bottom: 100, right: 20 },
    'bottom-left': { position: 'absolute' as const, bottom: 100, left: 20 },
    'floating': {}, // Default floating in place
  };

  // Floating/hovering animation (like Duolingo owl)
  useEffect(() => {
    const hover = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -12,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
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
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: -0.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
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
          useNativeDriver: true,
        }),
        Animated.timing(mouthScaleAnim, {
          toValue: 0.3,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(mouthScaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(mouthScaleAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    talkAnimation.start();

    // Stop talking after 2 seconds
    const timer = setTimeout(() => {
      setIsTalking(false);
    }, 2000);

    return () => {
      talkAnimation.stop();
      clearTimeout(timer);
    };
  }, [isTalking, mouthScaleAnim]);

  // Handle interaction
  const handlePress = () => {
    // Trigger wiggle animation
    setIsWiggling(true);
    
    // Start talking animation
    setIsTalking(true);

    // Cycle through messages
    const moodMessages = messages[mood];
    const nextIndex = (messageIndex + 1) % moodMessages.length;
    setMessageIndex(nextIndex);
    setDisplayMessage(moodMessages[nextIndex]);

    onPress?.();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={[styles.container, positionStyles[position]]}>
      <View style={styles.companionWrapper}>
        {/* Speech Bubble */}
        {showMessage && (
          <View style={[styles.speechBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.speechText, { color: colors.text }]} numberOfLines={2}>
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
              resizeMode="cover"
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionWrapper: {
    alignItems: 'center',
  },
  speechBubble: {
    maxWidth: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
