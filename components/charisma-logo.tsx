import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface CharismaLogoProps {
  size?: number;
}

export interface CharismaLogoRef {
  flip: () => void;
}

// SVG content from assets/images/charisma-logo.svg (optimized for React Native)
const logoSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0" style="stop-color:#F4C542;stop-opacity:1"/>
      <stop offset="0.5" style="stop-color:#FFD93D;stop-opacity:1"/>
      <stop offset="1" style="stop-color:#A8E063;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="240" fill="url(#grad1)"/>
  <rect x="220" y="100" width="20" height="40" rx="4" fill="#000000"/>
  <rect x="272" y="100" width="20" height="40" rx="4" fill="#000000"/>
  <text x="256" y="377" font-family="Arial, Helvetica, sans-serif" font-size="340" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="-20">C</text>
  <rect x="220" y="372" width="20" height="40" rx="4" fill="#000000"/>
  <rect x="272" y="372" width="20" height="40" rx="4" fill="#000000"/>
</svg>
`;

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
          <SvgXml xml={logoSvg} width={size} height={size} />
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
