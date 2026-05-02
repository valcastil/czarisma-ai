import { NotificationPreferences } from '@/components/profile/notification-preferences';
import { PrivacySettings } from '@/components/profile/privacy-settings';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UserProfile } from '@/constants/theme';
import { useCzar } from '@/contexts/czar-context';
import { useTheme } from '@/hooks/use-theme';
import { handleSignOut } from '@/utils/auth-utils';
import { exportUserData, getProfile, updateProfile } from '@/utils/profile-utils';
import { getVoicePreference, setVoicePreference, getVoiceVolume, setVoiceVolume, VoiceGender } from '@/utils/ai-voice';
import { setCzarVolume } from '@/utils/czar-voice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, setTheme, theme } = useTheme();
  const { czarEnabled, setCzarEnabled, idleTimeout, setIdleTimeout } = useCzar();
  const [localTimer, setLocalTimer] = useState(idleTimeout);
  const [aiVoicePreference, setAiVoicePreferenceState] = useState<VoiceGender>('male');
  const [aiVoiceVolume, setAiVoiceVolumeState] = useState(1.0);

  // Sync local state when context value loads from AsyncStorage
  useEffect(() => {
    setLocalTimer(idleTimeout);
  }, [idleTimeout]);

  // Load voice preference and volume on mount
  useEffect(() => {
    loadVoicePreference();
    loadVoiceVolume();
  }, []);

  const loadVoicePreference = async () => {
    const preference = await getVoicePreference();
    setAiVoicePreferenceState(preference);
  };

  const loadVoiceVolume = async () => {
    const volume = await getVoiceVolume();
    setAiVoiceVolumeState(volume);
  };

  const handleVoicePreferenceChange = async (gender: VoiceGender) => {
    setAiVoicePreferenceState(gender);
    await setVoicePreference(gender);
  };

  const handleVolumeChange = async (volume: number) => {
    setAiVoiceVolumeState(volume);
    await setVoiceVolume(volume);
    // Apply to any currently playing audio
    setCzarVolume(volume);
  };

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'notifications'>('general');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await getProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Unable to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    try {
      const updatedProfile = await updateProfile(updates);
      setProfile(updatedProfile);
    } catch (error) {
      Alert.alert('Error', 'Unable to update settings');
    }
  };

  const renderGeneralSettings = () => (
    profile ? (
      <View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={() => router.push('/profile-settings' as any)}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Profile Settings
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                Photo, name, and about
              </Text>
            </View>
            <IconSymbol size={20} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Name
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {profile.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/profile')}>
              <IconSymbol size={20} name="pencil" color={colors.gold} />
            </TouchableOpacity>
          </View>

          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Username
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                @{profile.username}
              </Text>
            </View>
          </View>

          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Email
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {profile.email}
              </Text>
            </View>
          </View>

          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Member Since
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {new Date(profile.joinDate).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={() => router.push({ pathname: '/claim-handle', params: { mode: 'edit' } })}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Handles
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                Manage your @ and # usernames
              </Text>
            </View>
            <IconSymbol size={20} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={() => router.push('/change-password')}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Change Password
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                Update your account password
              </Text>
            </View>
            <IconSymbol size={20} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Theme
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </Text>
            </View>
          </View>

          <View style={[styles.themeOptions, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'light' && styles.selectedTheme,
                { borderColor: colors.border }
              ]}
              onPress={() => handleThemeChange('light')}>
              <IconSymbol size={20} name="sun.max" color={theme === 'light' ? colors.gold : colors.textSecondary} />
              <Text style={[
                styles.themeText,
                { color: theme === 'light' ? colors.gold : colors.textSecondary }
              ]}>
                Light
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'dark' && styles.selectedTheme,
                { borderColor: colors.border }
              ]}
              onPress={() => handleThemeChange('dark')}>
              <IconSymbol size={20} name="moon" color={theme === 'dark' ? colors.gold : colors.textSecondary} />
              <Text style={[
                styles.themeText,
                { color: theme === 'dark' ? colors.gold : colors.textSecondary }
              ]}>
                Dark
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                theme === 'auto' && styles.selectedTheme,
                { borderColor: colors.border }
              ]}
              onPress={() => handleThemeChange('auto')}>
              <IconSymbol size={20} name="circle.lefthalf.filled" color={theme === 'auto' ? colors.gold : colors.textSecondary} />
              <Text style={[
                styles.themeText,
                { color: theme === 'auto' ? colors.gold : colors.textSecondary }
              ]}>
                Auto
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Czar AI</Text>

          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Czar AI Companion
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {czarEnabled ? `Appears after ${idleTimeout}s of inactivity` : 'Disabled'}
              </Text>
            </View>
            <Switch
              value={czarEnabled}
              onValueChange={(val) => setCzarEnabled(val)}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.background}
            />
          </View>

          {czarEnabled && (
            <View style={[styles.timerCard, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Czar AI Timer
                </Text>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                  {localTimer >= 60 ? `${localTimer / 60} min` : `${localTimer}s`}
                </Text>
              </View>
              <View style={styles.sliderRow}>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>5s</Text>
                <View style={styles.sliderTrackWrap}>
                  <View
                    style={[
                      styles.sliderTrack,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        backgroundColor: colors.gold,
                        width: `${((localTimer - 5) / (300 - 5)) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>5m</Text>
              </View>
              <View style={styles.timerButtons}>
                {[10, 20, 30, 60, 120, 300].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.timerPreset,
                      {
                        backgroundColor: localTimer === val ? colors.gold : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      setLocalTimer(val);
                      setIdleTimeout(val);
                    }}
                    activeOpacity={0.7}>
                    <Text
                      style={[
                        styles.timerPresetText,
                        { color: localTimer === val ? '#000000' : colors.text },
                      ]}>
                      {val >= 60 ? `${val / 60}m` : `${val}s`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* AI Voice Preference */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                AI Voice
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}
              >
                {aiVoicePreference === 'male' ? 'Male (Czar)' : 'Female'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  {
                    backgroundColor: aiVoicePreference === 'male' ? colors.gold : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleVoicePreferenceChange('male')}>
                <Text
                  style={[
                    styles.voiceButtonText,
                    { color: aiVoicePreference === 'male' ? '#000000' : colors.text },
                  ]}>
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.voiceButton,
                  {
                    backgroundColor: aiVoicePreference === 'female' ? colors.gold : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleVoicePreferenceChange('female')}>
                <Text
                  style={[
                    styles.voiceButtonText,
                    { color: aiVoicePreference === 'female' ? '#000000' : colors.text },
                  ]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* AI Voice Volume */}
          <View style={[styles.volumeCard, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Voice Volume
              </Text>
            </View>

            {/* Percentage Display with +/- Controls */}
            <View style={styles.volumeControlRow}>
              <TouchableOpacity
                style={[styles.volumeAdjustButton, { borderColor: colors.border }]}
                onPress={() => handleVolumeChange(Math.max(0, aiVoiceVolume - 0.05))}
                activeOpacity={0.7}>
                <Text style={[styles.volumeAdjustText, { color: colors.text }]}>−</Text>
              </TouchableOpacity>

              <View style={[styles.volumePercentBox, { backgroundColor: colors.background }]}>
                <Text style={[styles.volumePercentText, { color: colors.gold }]}>
                  {Math.round(aiVoiceVolume * 100)}%
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.volumeAdjustButton, { borderColor: colors.border }]}
                onPress={() => handleVolumeChange(Math.min(1, aiVoiceVolume + 0.05))}
                activeOpacity={0.7}>
                <Text style={[styles.volumeAdjustText, { color: colors.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Visual Volume Bar */}
            <View style={styles.volumeBarContainer}>
              <Text style={[styles.volumeIcon, { color: colors.textSecondary }]}>🔇</Text>
              <View style={[styles.volumeBarTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.volumeBarFill,
                    {
                      backgroundColor: colors.gold,
                      width: `${aiVoiceVolume * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.volumeIcon, { color: colors.textSecondary }]}>🔊</Text>
            </View>

            {/* Quick Preset Buttons */}
            <View style={styles.volumeButtons}>
              {[0, 0.25, 0.5, 0.75, 1].map((vol) => (
                <TouchableOpacity
                  key={vol}
                  style={[
                    styles.volumePreset,
                    {
                      backgroundColor: Math.abs(aiVoiceVolume - vol) < 0.05 ? colors.gold : colors.background,
                      borderColor: colors.border,
                      borderWidth: Math.abs(aiVoiceVolume - vol) < 0.05 ? 0 : 1,
                    },
                  ]}
                  onPress={() => handleVolumeChange(vol)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.volumePresetText,
                      { color: Math.abs(aiVoiceVolume - vol) < 0.05 ? '#000000' : colors.textSecondary },
                    ]}>
                    {vol === 0 ? 'Mute' : `${Math.round(vol * 100)}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
          
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: colors.card }]}
            onPress={handleExportData}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Export Data
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                Download all your entries and profile
              </Text>
            </View>
            <IconSymbol size={20} name="square.and.arrow.up" color={colors.gold} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem, { backgroundColor: 'rgba(255, 68, 68, 0.1)' }]}
            onPress={handleResetData}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: '#FF4444' }]}>
                Reset All Data
              </Text>
              <Text style={[styles.settingValue, { color: '#FF6666' }]}>
                Delete all entries and profile data
              </Text>
            </View>
            <IconSymbol size={20} name="trash" color="#FF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Version
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {Constants.expoConfig?.version || '1.0.2'}
              </Text>
            </View>
          </View>

          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Total Entries
              </Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
                {profile.totalEntries}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          
          <TouchableOpacity
            style={[
              styles.settingItem,
              styles.dangerItem,
              { 
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                opacity: isSigningOut ? 0.6 : 1,
              }
            ]}
            onPress={handleSignOutPress}
            disabled={isSigningOut}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: '#FF4444' }]}>
                {isSigningOut ? "Signing Out..." : "Sign Out"}
              </Text>
              <Text style={[styles.settingValue, { color: '#FF6666' }]}>
                {isSigningOut ? "Please wait..." : "Log out of your account"}
              </Text>
            </View>
            {isSigningOut ? (
              <ActivityIndicator size="small" color="#FF4444" />
            ) : (
              <IconSymbol size={20} name="arrow.right.square" color="#FF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    ) : null
  );

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'auto') => {
    try {
      // Update the theme in context immediately
      setTheme(newTheme);
      
      // Also update in profile for persistence
      if (profile) {
        await updateProfile({ 
          preferences: { ...profile.preferences, theme: newTheme }
        });
        // Reload profile to sync
        const updatedProfile = await getProfile();
        setProfile(updatedProfile);
      }
      
      Alert.alert('Success', 'Theme updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Unable to update theme');
    }
  };

  const handleExportData = async () => {
    try {
      const exportData = await exportUserData();
      Alert.alert('Export Complete', 'Your data has been exported successfully');
      console.log('Export data:', exportData);
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to export data');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all your entries, profile data, messages, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Get all keys in AsyncStorage
              const allKeys = await AsyncStorage.getAllKeys();
              
              // Filter for app-specific keys (keys starting with @charisma_ or @temp_)
              const appKeys = allKeys.filter(key => 
                key.startsWith('@charisma_') || 
                key.startsWith('@temp_') ||
                key.startsWith('@profile_photo_') ||
                key.startsWith('@chat_muted_')
              );

              // Remove all app-specific keys
              await Promise.all(appKeys.map(key => AsyncStorage.removeItem(key)));

              Alert.alert('Reset Complete', 'All data has been reset successfully');
              router.replace('/onboarding-charisma');
            } catch (error) {
              console.error('Error resetting data:', error);
              Alert.alert('Error', 'Unable to reset data');
            }
          }
        }
      ]
    );
  };

  const handleSignOutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your data will be saved and available when you sign back in.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            
            const result = await handleSignOut();
            
            if (result.success) {
              // Navigate to sign-in, dismissing all screens so user can't go back
              while (router.canGoBack()) {
                router.back();
              }
              router.replace('/auth-sign-in');
            } else {
              Alert.alert(
                'Error',
                'Failed to sign out completely. Please try again.'
              );
              setIsSigningOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading settings...
          </Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Unable to load settings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color={colors.gold} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'general' && styles.activeTab,
            { borderBottomColor: activeTab === 'general' ? colors.gold : 'transparent' }
          ]}
          onPress={() => setActiveTab('general')}>
          <Text style={[
            styles.tabText,
            { color: activeTab === 'general' ? colors.gold : colors.textSecondary }
          ]}>
            General
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'privacy' && styles.activeTab,
            { borderBottomColor: activeTab === 'privacy' ? colors.gold : 'transparent' }
          ]}
          onPress={() => setActiveTab('privacy')}>
          <Text style={[
            styles.tabText,
            { color: activeTab === 'privacy' ? colors.gold : colors.textSecondary }
          ]}>
            Privacy
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'notifications' && styles.activeTab,
            { borderBottomColor: activeTab === 'notifications' ? colors.gold : 'transparent' }
          ]}
          onPress={() => setActiveTab('notifications')}>
          <Text style={[
            styles.tabText,
            { color: activeTab === 'notifications' ? colors.gold : colors.textSecondary }
          ]}>
            Notifications
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'privacy' && profile && (
          <PrivacySettings
            profile={profile}
            onUpdate={handleProfileUpdate}
          />
        )}
        {activeTab === 'notifications' && profile && (
          <NotificationPreferences
            profile={profile}
            onUpdate={handleProfileUpdate}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  activeTab: {
    // Border color set dynamically
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  dangerItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  editButton: {
    padding: 8,
  },
  themeOptions: {
    flexDirection: 'row',
    marginHorizontal: 20,
    padding: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 8,
    marginHorizontal: 2,
    borderWidth: 1,
  },
  selectedTheme: {
    backgroundColor: 'rgba(244, 197, 66, 0.1)',
    borderColor: '#F4C542',
  },
  themeText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingBottom: 50,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  timerCard: {
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    gap: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sliderTrackWrap: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  sliderTrack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 3,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 3,
  },
  timerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  timerPreset: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  timerPresetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  voiceButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  voiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  volumeCard: {
    padding: 15,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  volumeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 10,
    gap: 15,
  },
  volumeAdjustButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeAdjustText: {
    fontSize: 24,
    fontWeight: '600',
  },
  volumePercentBox: {
    minWidth: 80,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumePercentText: {
    fontSize: 28,
    fontWeight: '700',
  },
  volumeBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    gap: 10,
  },
  volumeIcon: {
    fontSize: 16,
  },
  volumeBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  volumeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  volumeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  volumePreset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 55,
    alignItems: 'center',
  },
  volumePresetText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
