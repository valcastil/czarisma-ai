import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/hooks/use-theme';
import { exportUserData } from '@/utils/profile-utils';
import React from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Define valid icon names
const iconNames = {
  person: 'person',
  export: 'square.and.arrow.up',
  gear: 'gearshape',
  star: 'star.fill',
  chevron: 'chevron.right'
} as const;

interface SettingsButtonProps {
  title: string;
  icon: keyof typeof iconNames;
  onPress?: () => void;
  destructive?: boolean;
}

export function SettingsButton({ title, icon, onPress, destructive = false }: SettingsButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.card },
        destructive && styles.destructiveButton
      ]}
      onPress={onPress}
      activeOpacity={0.7}>

      <View style={styles.buttonContent}>
        <IconSymbol
          size={20}
          name={iconNames[icon]}
          color={destructive ? '#FF4444' : colors.gold}
        />
        <Text style={[
          styles.buttonText,
          { color: destructive ? '#FF4444' : colors.text }
        ]}>
          {title}
        </Text>
      </View>

      <IconSymbol
        size={16}
        name={iconNames.chevron}
        color={destructive ? '#FF4444' : colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

interface QuickActionsProps {
  onEditProfile: () => void;
  onExportData: () => void;
  onSettings: () => void;
  onSubscription?: () => void;
}

export function QuickActions({ onEditProfile, onExportData, onSettings, onSubscription }: QuickActionsProps) {
  const { colors } = useTheme();

  const handleExportData = async () => {
    try {
      const exportData = await exportUserData();
      await Share.share({
        message: exportData,
        title: 'CzarApp Data Export',
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

      <View style={styles.buttonGroup}>
        {onSubscription && (
          <SettingsButton
            title="Upgrade to Pro ✨"
            icon="star"
            onPress={onSubscription}
          />
        )}

        <SettingsButton
          title="Edit Profile"
          icon="person"
          onPress={onEditProfile}
        />

        <SettingsButton
          title="Export Data"
          icon="export"
          onPress={handleExportData}
        />

        <SettingsButton
          title="Settings"
          icon="gear"
          onPress={onSettings}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  buttonGroup: {
    marginHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  destructiveButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});
