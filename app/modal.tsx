import { CharismaLogo } from '@/components/charisma-logo';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ONBOARDING_KEY = '@charisma_onboarding';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const handleGetStarted = () => {
    // Navigate to charisma selection screen
    router.push('/onboarding-charisma');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Section - App Name */}
      <View style={styles.topSection}>
        <Text style={[styles.appName, { color: colors.gold }]}>Czar AI</Text>
      </View>

      {/* Middle Section - Logo */}
      <View style={styles.middleSection}>
        <View style={styles.logoContainer}>
          <CharismaLogo size={200} />
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.gold }]}>Improve Your{"\n"}Charisma Now</Text>
      </View>

      {/* Bottom Section - Get Started Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.gold, shadowColor: colors.gold }]}
          onPress={handleGetStarted}
          activeOpacity={0.8}>
          <Text style={[styles.buttonText, { color: '#000000' }]}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 56,
  },
  middleSection: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  button: {
    paddingVertical: 20,
    borderRadius: 30,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
