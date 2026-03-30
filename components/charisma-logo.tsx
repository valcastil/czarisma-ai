import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface CharismaLogoProps {
  size?: number;
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

export function CharismaLogo({ size = 50 }: CharismaLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <SvgXml xml={logoSvg} width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
