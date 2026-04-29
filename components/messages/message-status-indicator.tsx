import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { View, StyleSheet } from 'react-native';

interface MessageStatusIndicatorProps {
  status: 'sent' | 'delivered' | 'read';
  size?: number;
}

export function MessageStatusIndicator({ status, size = 14 }: MessageStatusIndicatorProps) {
  const { colors } = useTheme();

  // Color mapping
  const checkColor = status === 'read' ? '#34C759' : colors.textSecondary;

  if (status === 'sent') {
    // Single checkmark
    return (
      <IconSymbol
        size={size}
        name="checkmark"
        color={colors.textSecondary}
      />
    );
  }

  // Double checkmark for delivered and read
  return (
    <View style={styles.container}>
      <IconSymbol
        size={size}
        name="checkmark"
        color={checkColor}
        style={styles.firstCheck}
      />
      <IconSymbol
        size={size}
        name="checkmark"
        color={checkColor}
        style={styles.secondCheck}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 3,
    gap: 1,
  },
  firstCheck: {
    // No negative margin - checkmarks are side by side
  },
  secondCheck: {
    marginLeft: -8,
  },
});
