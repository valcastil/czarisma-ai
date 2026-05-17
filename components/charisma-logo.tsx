import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

interface CharismaLogoProps {
  size?: number;
}

export interface CharismaLogoRef {
  flip: () => void;
}

const logoImage = require('@/assets/images/adaptive-icon.png');

export const CharismaLogo = forwardRef<CharismaLogoRef, CharismaLogoProps>(
  ({ size = 50 }, ref) => {
    const flipAnim = useRef(new Animated.Value(0)).current;

    useImperativeHandle(ref, () => ({
      flip: () => {
        flipAnim.setValue(0);
        Animated.timing(flipAnim, {
          toValue: 2, // Two full flips
          duration: 800,
          easing: Easing.bezier(0.4, 0, 0.2, 1), // Cubic ease-in-out
          useNativeDriver: true,
        }).start();
      },
    }));

    // ScaleX-based coin flip (works on both iOS and Android)
    const scaleX = flipAnim.interpolate({
      inputRange: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      outputRange: [1, 0, -1, 0, 1, 0, -1, 0, 1], // Two full coin flips
    });

    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Animated.View
          style={{
            width: size,
            height: size,
            transform: [{ scaleX }],
          }}
        >
          <Image source={logoImage} style={{ width: size, height: size, borderRadius: size / 2 }} />
        </Animated.View>
      </View>
    );
  }
);

CharismaLogo.displayName = 'CharismaLogo';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
