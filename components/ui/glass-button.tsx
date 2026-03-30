import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}: GlassButtonProps) {
  const { colors } = useTheme();

  // Variant colors
  const variantColors = {
    primary: {
      gradient: ['rgba(244, 197, 66, 0.3)', 'rgba(244, 197, 66, 0.1)'] as const,
      border: 'rgba(244, 197, 66, 0.5)',
      text: colors.gold,
      shadow: 'rgba(244, 197, 66, 0.3)',
    },
    secondary: {
      gradient: ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)'] as const,
      border: 'rgba(255, 255, 255, 0.3)',
      text: colors.text,
      shadow: 'rgba(0, 0, 0, 0.2)',
    },
    success: {
      gradient: ['rgba(52, 199, 89, 0.3)', 'rgba(52, 199, 89, 0.1)'] as const,
      border: 'rgba(52, 199, 89, 0.5)',
      text: '#34C759',
      shadow: 'rgba(52, 199, 89, 0.3)',
    },
    danger: {
      gradient: ['rgba(255, 68, 68, 0.3)', 'rgba(255, 68, 68, 0.1)'] as const,
      border: 'rgba(255, 68, 68, 0.5)',
      text: '#FF4444',
      shadow: 'rgba(255, 68, 68, 0.3)',
    },
  };

  // Size configurations
  const sizeConfig = {
    small: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      fontSize: 14,
      borderRadius: 10,
    },
    medium: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      fontSize: 16,
      borderRadius: 12,
    },
    large: {
      paddingVertical: 18,
      paddingHorizontal: 32,
      fontSize: 18,
      borderRadius: 14,
    },
  };

  const currentVariant = variantColors[variant];
  const currentSize = sizeConfig[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          borderRadius: currentSize.borderRadius,
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={currentVariant.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: currentSize.borderRadius },
        ]}
      />

      {/* Glass Effect Background */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.background === '#fff' 
              ? 'rgba(255, 255, 255, 0.15)' 
              : 'rgba(0, 0, 0, 0.3)',
            borderRadius: currentSize.borderRadius,
          },
        ]}
      />

      {/* Border */}
      <View
        style={[
          styles.border,
          {
            borderRadius: currentSize.borderRadius,
            borderColor: currentVariant.border,
          },
        ]}
      />

      {/* Content */}
      <View
        style={[
          styles.content,
          {
            paddingVertical: currentSize.paddingVertical,
            paddingHorizontal: currentSize.paddingHorizontal,
          },
        ]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text
          style={[
            styles.text,
            {
              fontSize: currentSize.fontSize,
              color: currentVariant.text,
            },
            textStyle,
          ]}>
          {title}
        </Text>
      </View>

      {/* Shine Effect */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.3)', 'transparent'] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.shine,
          { borderRadius: currentSize.borderRadius },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fullWidth: {
    width: '100%',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
});
