import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { UserProfile } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface NotificationPreferencesProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
}

export function NotificationPreferences({ profile, onUpdate }: NotificationPreferencesProps) {
  const { colors } = useTheme();
  
  const [notifications, setNotifications] = useState(profile.notifications);

  const handleToggleNotification = (key: keyof UserProfile['notifications']) => {
    const updatedNotifications = { 
      ...notifications, 
      [key]: !notifications[key] 
    };
    
    setNotifications(updatedNotifications);
    onUpdate({ notifications: updatedNotifications });
  };

  const notificationSettings = [
    {
      key: 'email' as const,
      title: 'Email Notifications',
      description: 'Receive updates and alerts via email',
      icon: 'envelope' as 'envelope',
    },
    {
      key: 'push' as const,
      title: 'Push Notifications',
      description: 'Receive notifications on your device',
      icon: 'bell' as 'bell',
    },
    {
      key: 'dailyReminders' as const,
      title: 'Daily Reminders',
      description: 'Get reminded to track your charisma daily',
      icon: 'clock' as 'clock',
    },
    {
      key: 'weeklyReports' as const,
      title: 'Weekly Reports',
      description: 'Receive weekly progress summaries',
      icon: 'chart' as 'chart.bar',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Notification Preferences
      </Text>

      <View style={styles.section}>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>
          Notification Types
        </Text>
        
        {notificationSettings.map((setting) => (
          <View key={setting.key} style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingLeft}>
              <IconSymbol 
                size={20} 
                name={setting.icon} 
                color={colors.gold} 
              />
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  {setting.title}
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {setting.description}
                </Text>
              </View>
            </View>
            
            <Switch
              value={notifications[setting.key]}
              onValueChange={() => handleToggleNotification(setting.key)}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.background}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>
          Notification Schedule
        </Text>
        
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card }]}
          onPress={() => {
            Alert.alert('Coming Soon', 'Custom notification scheduling will be available soon');
          }}>
          
          <View style={styles.settingLeft}>
            <IconSymbol 
              size={20} 
              name="calendar" 
              color={colors.gold} 
            />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Reminder Time
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Set your daily reminder time
              </Text>
            </View>
          </View>
          
          <View style={styles.settingRight}>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
              9:00 AM
            </Text>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card }]}
          onPress={() => {
            Alert.alert('Coming Soon', 'Do not disturb settings will be available soon');
          }}>
          
          <View style={styles.settingLeft}>
            <IconSymbol 
              size={20} 
              name="moon" 
              color={colors.gold} 
            />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Do Not Disturb
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Quiet hours for notifications
              </Text>
            </View>
          </View>
          
          <View style={styles.settingRight}>
            <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
              Off
            </Text>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>
          Advanced Settings
        </Text>
        
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card }]}
          onPress={() => {
            Alert.alert('Coming Soon', 'Advanced notification settings will be available soon');
          }}>
          
          <View style={styles.settingLeft}>
            <IconSymbol 
              size={20} 
              name="gear" 
              color={colors.gold} 
            />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Notification Categories
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Customize which notifications you receive
              </Text>
            </View>
          </View>
          
          <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card }]}
          onPress={() => {
            Alert.alert('Coming Soon', 'Notification history will be available soon');
          }}>
          
          <View style={styles.settingLeft}>
            <IconSymbol 
              size={20} 
              name="list.bullet" 
              color={colors.gold} 
            />
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Notification History
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                View your recent notifications
              </Text>
            </View>
          </View>
          
          <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <IconSymbol size={20} name="info.circle" color={colors.gold} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          You can change these settings at any time. Some notifications may be delayed based on your device settings.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 30,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    fontWeight: '400',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    alignItems: 'flex-start',
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});
