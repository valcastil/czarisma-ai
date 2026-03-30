import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Switch
} from 'react-native';
import { UserProfile } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface ProfileEditModalProps {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (updates: Partial<UserProfile>) => void;
}

export function ProfileEditModal({ visible, profile, onClose, onSave }: ProfileEditModalProps) {
  const { colors } = useTheme();
  
  const [formData, setFormData] = useState({
    name: profile.name,
    username: profile.username,
    email: profile.email,
    phone: profile.phone || '',
    bio: profile.bio,
    occupation: profile.occupation || '',
    website: profile.website || '',
    location: {
      city: profile.location.city,
      country: profile.location.country,
    },
    interests: profile.interests.join(', '),
    gender: profile.gender || '',
    dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
  });

  const [socialLinks, setSocialLinks] = useState({
    facebook: profile.socialLinks.facebook || '',
    instagram: profile.socialLinks.instagram || '',
    whatsapp: profile.socialLinks.whatsapp || '',
    tiktok: profile.socialLinks.tiktok || '',
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'personal' | 'social'>('basic');

  const handleSave = () => {
    // Basic validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const updates: Partial<UserProfile> = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      bio: formData.bio.trim(),
      occupation: formData.occupation.trim() || undefined,
      website: formData.website.trim() || undefined,
      location: formData.location,
      interests: formData.interests.split(',').map(i => i.trim()).filter(i => i.length > 0),
      gender: formData.gender as any || undefined,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).getTime() : undefined,
      socialLinks: {
        facebook: socialLinks.facebook.trim() || undefined,
        instagram: socialLinks.instagram.trim() || undefined,
        whatsapp: socialLinks.whatsapp.trim() || undefined,
        tiktok: socialLinks.tiktok.trim() || undefined,
      },
    };

    onSave(updates);
    onClose();
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
            styles.readOnlyInput,
            { 
              backgroundColor: colors.background,
              color: colors.textSecondary,
              borderColor: colors.border
            }
          ]}
          value={formData.username}
          editable={false}
          placeholder="Auto-generated username"
          placeholderTextColor={colors.textSecondary}
        />
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Username is automatically generated and cannot be changed
        </Text>
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

  const renderSocialLinks = () => (
    <View style={styles.tabContent}>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Facebook</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={socialLinks.facebook}
          onChangeText={(text) => setSocialLinks(prev => ({ ...prev, facebook: text }))}
          placeholder="Facebook username or URL"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Instagram</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={socialLinks.instagram}
          onChangeText={(text) => setSocialLinks(prev => ({ ...prev, instagram: text }))}
          placeholder="Instagram username"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>WhatsApp</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={socialLinks.whatsapp}
          onChangeText={(text) => setSocialLinks(prev => ({ ...prev, whatsapp: text }))}
          placeholder="Phone number with country code"
          placeholderTextColor={colors.textSecondary}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>TikTok</Text>
        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={socialLinks.tiktok}
          onChangeText={(text) => setSocialLinks(prev => ({ ...prev, tiktok: text }))}
          placeholder="TikTok username"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit Profile
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol size={24} name="xmark" color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'basic' && styles.activeTab,
                { borderBottomColor: activeTab === 'basic' ? colors.gold : 'transparent' }
              ]}
              onPress={() => setActiveTab('basic')}>
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
              onPress={() => setActiveTab('personal')}>
              <Text style={[
                styles.tabText,
                { color: activeTab === 'personal' ? colors.gold : colors.textSecondary }
              ]}>
                Personal
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'social' && styles.activeTab,
                { borderBottomColor: activeTab === 'social' ? colors.gold : 'transparent' }
              ]}
              onPress={() => setActiveTab('social')}>
              <Text style={[
                styles.tabText,
                { color: activeTab === 'social' ? colors.gold : colors.textSecondary }
              ]}>
                Social
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {activeTab === 'basic' && renderBasicInfo()}
            {activeTab === 'personal' && renderPersonalInfo()}
            {activeTab === 'social' && renderSocialLinks()}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}>
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.gold }]}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 0,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
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
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#F4C542',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  readOnlyInput: {
    opacity: 0.7,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
