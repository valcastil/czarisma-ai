import { useTheme } from '@/hooks/use-theme';
import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface OtpInputProps {
  digitCount: number;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function OtpInput({ digitCount, value, onChange, disabled = false }: OtpInputProps) {
  const { colors } = useTheme();
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newValue = [...value];
    newValue[index] = digit;
    onChange(newValue);

    // Auto-advance to next input
    if (digit && index < digitCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: digitCount }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => { inputRefs.current[index] = ref; }}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: value[index] ? colors.gold : colors.border,
              // Slightly smaller inputs for 8 digits
              width: digitCount > 6 ? 38 : 46,
            },
          ]}
          value={value[index] || ''}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          editable={!disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
});
