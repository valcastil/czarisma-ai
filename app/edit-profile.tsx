import { IconSymbol } from '@/components/ui/icon-symbol';
import { UserProfile } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getProfile, updateProfile } from '@/utils/profile-utils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  const activeTab = (params.tab as string) || 'basic';
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    occupation: '',
    website: '',
    location: {
      city: '',
      country: '',
    },
    interests: '',
    gender: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await getProfile();
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        username: profileData.username || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        bio: profileData.bio || '',
        occupation: profileData.occupation || '',
        website: profileData.website || '',
        location: {
          city: profileData.location?.city || '',
          country: profileData.location?.country || '',
        },
        interests: Array.isArray(profileData.interests) ? profileData.interests.join(', ') : '',
        gender: profileData.gender || '',
        dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth).toISOString().split('T')[0] : '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Unable to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Basic validation
      if (!formData.name.trim()) {
        setSaving(false);
        Alert.alert('Error', 'Name is required');
        return;
      }
      
      if (!formData.email.trim()) {
        setSaving(false);
        Alert.alert('Error', 'Email is required');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setSaving(false);
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      const updates: Partial<UserProfile> = {
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        bio: formData.bio.trim(),
        occupation: formData.occupation.trim() || undefined,
        website: formData.website.trim() || undefined,
        location: formData.location,
        interests: formData.interests.split(',').map(i => i.trim()).filter(i => i.length > 0),
        gender: formData.gender as any || undefined,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).getTime() : undefined,
      };

      console.log('Attempting to save profile with updates:', updates);
      await updateProfile(updates);
      console.log('Profile updated successfully');
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error) {
      console.error('Error saving profile:', error);
      console.error('Error details:', JSON.stringify(error));
      Alert.alert('Error', `Unable to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const renderBasicInfo = () => (
    <View style={styles.tabContent}>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Username</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.username}
          onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
          placeholder="Enter username"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Email Address *</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.email}
          onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
          placeholder="Enter email address"
          placeholderTextColor={colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Phone Number (Optional)</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.phone}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
          placeholder="Enter phone number"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Occupation</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.occupation}
          onChangeText={(text) => setFormData(prev => ({ ...prev, occupation: text }))}
          placeholder="Enter your occupation"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Website</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.website}
          onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
          placeholder="Enter your website URL"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.tabContent}>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Bio</Text>
        <TextInput
          style={[
            styles.textArea,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.bio}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
          placeholder="Tell us about yourself"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Interests & Hobbies</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.interests}
          onChangeText={(text) => setFormData(prev => ({ ...prev, interests: text }))}
          placeholder="e.g., reading, traveling, coding"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          Separate interests with commas
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={formData.dateOfBirth}
          onChangeText={(text) => setFormData(prev => ({ ...prev, dateOfBirth: text }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
        <View style={styles.genderOptions}>
          {['male', 'female', 'other', 'prefer_not_to_say'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.genderOption,
                formData.gender === option && styles.selectedGender,
                { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderWidth: 1
                }
              ]}
              onPress={() => setFormData(prev => ({ ...prev, gender: option }))}>
              <Text style={[
                styles.genderText,
                { 
                  color: formData.gender === option ? colors.gold : colors.text 
                }
              ]}>
                {option.replace('_', ' ').charAt(0).toUpperCase() + option.replace('_', ' ').slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Location</Text>
        <View style={styles.locationRow}>
          <TextInput
            style={[
              styles.halfInput,
              { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }
            ]}
            value={formData.location.city}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              location: { ...prev.location, city: text } 
            }))}
            placeholder="City"
            placeholderTextColor={colors.textSecondary}
          />
          <TextInput
            style={[
              styles.halfInput,
              { 
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border
              }
            ]}
            value={formData.location.country}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              location: { ...prev.location, country: text } 
            }))}
            placeholder="Country"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'basic' && styles.activeTab,
          { borderBottomColor: activeTab === 'basic' ? colors.gold : 'transparent' }
        ]}
        onPress={() => router.push('/edit-profile?tab=basic')}>
        <Text style={[
          styles.tabText,
          { color: activeTab === 'basic' ? colors.gold : colors.textSecondary }
        ]}>
          Basic Info
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'personal' && styles.activeTab,
          { borderBottomColor: activeTab === 'personal' ? colors.gold : 'transparent' }
        ]}
        onPress={() => router.push('/edit-profile?tab=personal')}>
        <Text style={[
          styles.tabText,
          { color: activeTab === 'personal' ? colors.gold : colors.textSecondary }
        ]}>
          Personal Info
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <IconSymbol size={24} name="chevron.left" color={colors.gold} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Edit Profile - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {renderTabs()}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {activeTab === 'basic' && renderBasicInfo()}
        {activeTab === 'personal' && renderPersonalInfo()}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      <View style={styles.bottomSaveContainer}>
        <TouchableOpacity
          style={[styles.bottomSaveButton, { backgroundColor: colors.gold }]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, // Balance the back button
  },
  placeholder: {
    width: 60, // Same width as the original save button
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomSaveContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30, // Extra padding for safe area
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  bottomSaveButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
  },
  bottomPadding: {
    height: 20, // Space above the bottom save button
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
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
  tabContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    height: 100,
  },
  helper: {
    fontSize: 12,
    marginTop: 4,
  },
  genderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genderOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedGender: {
    // Style set dynamically
  },
  genderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
});
