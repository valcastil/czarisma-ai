import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import React from 'react';
import { ActionSheetIOS, Alert, Platform, TouchableOpacity } from 'react-native';

interface FieldVisibilityToggleProps {
  visible: boolean;
  onToggle: (visible: boolean) => void;
  fieldName?: string;
}

export function FieldVisibilityToggle({ visible, onToggle, fieldName = 'this' }: FieldVisibilityToggleProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `Who can see ${fieldName}?`,
          options: ['Everyone', 'Only Me', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) onToggle(true);
          else if (index === 1) onToggle(false);
        }
      );
    } else {
      Alert.alert(
        `Who can see ${fieldName}?`,
        undefined,
        [
          { text: 'Everyone', onPress: () => onToggle(true) },
          { text: 'Only Me', onPress: () => onToggle(false) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <IconSymbol
        size={14}
        name={visible ? 'globe' : 'lock.fill'}
        color={visible ? colors.textSecondary : colors.gold}
      />
    </TouchableOpacity>
  );
}
