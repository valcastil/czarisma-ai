import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { UserProfile } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface PrivacySettingsProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => void;
}

export function PrivacySettings({ profile, onUpdate }: PrivacySettingsProps) {
  const { colors } = useTheme();
  
  const [privacy, setPrivacy] = useState(profile.privacy);

  const handleVisibilityChange = (visibility: UserProfile['privacy']['profileVisibility']) => {
    setPrivacy(prev => ({ ...prev, profileVisibility: visibility }));
  };

  const handleToggleSetting = (key: keyof UserProfile['privacy']) => {
    if (key === 'profileVisibility') return;
    
    setPrivacy(prev => ({ 
      ...prev, 
      [key]: !prev[key] 
    }));
    
    onUpdate({ 
      privacy: { 
        ...privacy, 
        [key]: !privacy[key] 
      } 
    });
  };

  const handleSaveVisibility = () => {
    onUpdate({ privacy });
    Alert.alert('Success', 'Privacy settings updated');
  };

  const visibilityOptions = [
    { 
      key: 'public' as const, 
      title: 'Public', 
      description: 'Anyone can see your profile' 
    },
    { 
      key: 'friends' as const, 
      title: 'Friends Only', 
      description: 'Only friends can see your profile' 
    },
    { 
      key: 'private' as const, 
      title: 'Private', 
      description: 'Only you can see your profile' 
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Privacy Settings
      </Text>

      <View style={styles.section}>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>
          Profile Visibility
        </Text>
        
        {visibilityOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.visibilityOption,
              { backgroundColor: colors.card },
              privacy.profileVisibility === option.key && styles.selectedOption
            ]}
            onPress={() => handleVisibilityChange(option.key)}>
            
            <View style={styles.optionContent}>
              <Text style={[
                styles.optionTitle,
                { 
                  color: privacy.profileVisibility === option.key ? colors.gold : colors.text 
                }
              ]}>
                {option.title}
              </Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                {option.description}
              </Text>
            </View>
            
            {privacy.profileVisibility === option.key && (
              <IconSymbol size={20} name="checkmark.circle.fill" color={colors.gold} />
            )}
          </TouchableOpacity>
        ))}
        
        {privacy.profileVisibility !== profile.privacy.profileVisibility && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.gold }]}
            onPress={handleSaveVisibility}>
            <Text style={styles.saveButtonText}>Save Visibility Changes</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>
          Information Sharing
        </Text>
        
        <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Show Email Address
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Display email on your public profile
            </Text>
          </View>
          <Switch
            value={privacy.showEmail}
            onValueChange={() => handleToggleSetting('showEmail')}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={colors.background}
          />
        </View>

        <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Show Phone Number
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Display phone number on your public profile
            </Text>
          </View>
          <Switch
            value={privacy.showPhone}
            onValueChange={() => handleToggleSetting('showPhone')}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={colors.background}
          />
        </View>

        <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Show Location
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Display your city and country
            </Text>
          </View>
          <Switch
            value={privacy.showLocation}
            onValueChange={() => handleToggleSetting('showLocation')}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={colors.background}
          />
        </View>

        <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Show Birth Date
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Display your date of birth (age only)
            </Text>
          </View>
          <Switch
            value={privacy.showBirthDate}
            onValueChange={() => handleToggleSetting('showBirthDate')}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={colors.background}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>
          Account Security
        </Text>
        
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card }]}
          onPress={() => {
            // TODO: Implement 2FA setup
            Alert.alert('Coming Soon', 'Two-factor authentication setup will be available soon');
          }}>
          
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Two-Factor Authentication
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
              Add an extra layer of security to your account
            </Text>
          </View>
          
          <View style={styles.settingRight}>
            <Text style={[styles.settingStatus, { color: colors.textSecondary }]}>
              {profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            <IconSymbol size={16} name="chevron.right" color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
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
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  selectedOption: {
    borderWidth: 1,
    borderColor: '#F4C542',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    fontWeight: '400',
  },
  saveButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
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
  settingStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
});
