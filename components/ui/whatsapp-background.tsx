import { useTheme } from '@/hooks/use-theme';
import React from 'react';
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

export function WhatsAppBackground({ children }: { children: React.ReactNode }) {
  const { colors, actualTheme } = useTheme();
  const isLightTheme = actualTheme === 'light';

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={[styles.backgroundContainer, { backgroundColor: colors.background }]}>
        <ImageBackground
          source={require('../../assets/images/bg_doodle.png')}
          style={styles.backgroundImage}
          imageStyle={{ opacity: isLightTheme ? 0.15 : 0.6 }} // Higher opacity for light theme to make doodles visible
          resizeMode="cover"
        >
          {/* Only apply overlay in dark theme to blend doodles better */}
          {!isLightTheme && (
            <View style={[styles.drawingOverlay, { backgroundColor: colors.background, opacity: 0.35 }]} />
          )}
        </ImageBackground>
      </View>
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
}

// Fallback component if image is not available
export function WhatsAppBackgroundFallback({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <View style={styles.patternContainer}>
        {/* Create subtle dot pattern similar to WhatsApp */}
        {Array.from({ length: 50 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.patternDot,
              {
                left: (index * 37) % width,
                top: Math.floor(index * 37 / width) * 37,
                width: 4,
                height: 4,
                opacity: 0.04,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.overlay} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  darkOverlay: {
    flex: 1,
  },
  drawingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  // Fallback styles
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternDot: {
    position: 'absolute',
    backgroundColor: '#242525', // Use drawing color for dots
    borderRadius: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
});
