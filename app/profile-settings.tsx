import { CzarCompanion } from '@/components/czar-companion';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { UserProfile } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentUser, registerCurrentUser } from '@/utils/message-utils';
import { getProfile, updateProfile } from '@/utils/profile-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
    whatsapp: '',
    tiktok: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    snapchat: '',
    threads: '',
    telegram: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setProfile(p);
        setName(p.name || '');
        setAbout(p.bio || '');
        setAvatarUri(p.avatar);
        if (p.socialLinks) {
          setSocialLinks({
            facebook: p.socialLinks.facebook || '',
            instagram: p.socialLinks.instagram || '',
            whatsapp: p.socialLinks.whatsapp || '',
            tiktok: p.socialLinks.tiktok || '',
            twitter: p.socialLinks.twitter || '',
            linkedin: p.socialLinks.linkedin || '',
            youtube: p.socialLinks.youtube || '',
            snapchat: p.socialLinks.snapchat || '',
            threads: p.socialLinks.threads || '',
            telegram: p.socialLinks.telegram || '',
          });
        }
      } catch (e) {
        Alert.alert('Error', 'Unable to load profile settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    const normalizedAbout = about.trim();
    const normalizedProfileAbout = (profile.bio || '').trim();
    const socialChanged = Object.keys(socialLinks).some((key) => {
      const k = key as keyof typeof socialLinks;
      return (socialLinks[k] || '').trim() !== (profile.socialLinks?.[k] || '').trim();
    });
    return (
      name.trim() !== (profile.name || '').trim() ||
      normalizedAbout !== normalizedProfileAbout ||
      avatarUri !== profile.avatar ||
      socialChanged
    );
  }, [about, avatarUri, name, profile, socialLinks]);

  const handlePickPhoto = async () => {
    try {
      const { MediaPickerService } = await import('@/lib/media-picker-service');
      const photo = await MediaPickerService.pickImageWithAdjustableCrop();
      
      if (photo?.uri) {
        setAvatarUri(photo.uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to pick image. Please try again.');
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove photo', 'Remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setAvatarUri(undefined) },
    ]);
  };

  
  const handleSave = async () => {
    if (!profile) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }

    try {
      setSaving(true);
      
      console.log('Saving profile with avatar:', avatarUri ? 'Yes' : 'No');
      
      // Update profile (this now syncs to Supabase automatically, including avatar upload)
      // Build clean social links (only non-empty values)
      const cleanSocialLinks: Record<string, string> = {};
      Object.entries(socialLinks).forEach(([key, value]) => {
        if (value.trim()) cleanSocialLinks[key] = value.trim();
      });

      const updated = await updateProfile({
        name: trimmedName,
        bio: about.trim(),
        avatar: avatarUri,
        socialLinks: cleanSocialLinks as any,
      });
      
      console.log('Profile saved successfully');
      setProfile(updated);
      Alert.alert('Success', 'Profile updated and synced successfully!');

      // Sync avatar to AsyncStorage so chat screens can use it immediately
      try {
        const me = await getCurrentUser();
        if (me) {
          const photoKey = `@profile_photo_${me.id}`;
          if (avatarUri) {
            await AsyncStorage.setItem(photoKey, avatarUri);
            console.log('Avatar synced to AsyncStorage:', avatarUri);
          } else {
            await AsyncStorage.removeItem(photoKey);
            console.log('Avatar removed from AsyncStorage');
          }
        }
      } catch (photoSyncErr) {
        console.error('Error syncing avatar to AsyncStorage:', photoSyncErr);
      }
    } catch (e) {
      console.error('Profile update error:', e);
      Alert.alert('Error', 'Unable to save profile settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Unable to load profile.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <IconSymbol size={24} name="chevron.left" color={colors.gold} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity
          style={[
            styles.saveButton,
            { 
              backgroundColor: hasChanges ? colors.gold : colors.border,
              opacity: hasChanges ? 1 : 0.6
            }
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {/* Czar AI Companion - Duolingo-style floating mascot */}
      <View style={styles.czarContainer}>
        <CzarCompanion
          size="medium"
          mood="profile"
          position="floating"
          message="Looking good!"
          onPress={() => {
            // Czar reacts when tapped - wiggles and talks
          }}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} style={styles.avatarTap}>
              <View style={[styles.avatarRing, { borderColor: colors.gold }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.background }]}
                  >
                    <Text style={[styles.avatarInitial, { color: colors.gold }]}>
                      {(profile.name || 'C').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.cameraBadge, { backgroundColor: colors.gold }]}
              >
                <IconSymbol size={14} name="camera" color="#000000" />
              </View>
            </TouchableOpacity>

            <View style={styles.avatarTextCol}>
              <Text style={[styles.avatarTitle, { color: colors.text }]}>Profile photo</Text>
              <Text style={[styles.avatarSubtitle, { color: colors.textSecondary }]}>
                Tap to choose from gallery
              </Text>
            </View>
          </View>

          {avatarUri ? (
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={handleRemovePhoto}
              activeOpacity={0.8}
            >
              <IconSymbol size={18} name="trash" color="#FF4444" />
              <Text style={[styles.secondaryButtonText, { color: '#FF4444' }]}>Remove photo</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>ABOUT</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <IconSymbol size={18} name="person" color={colors.gold} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldIconWrap}>
              <IconSymbol size={18} name="info.circle" color={colors.gold} />
            </View>
            <View style={styles.fieldBody}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>About</Text>
              <TextInput
                value={about}
                onChangeText={setAbout}
                style={[styles.fieldInput, { color: colors.text }]}
                placeholder="A short bio"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>
          </View>
        </View>

        <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>SOCIAL MEDIA LINKS</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { key: 'instagram', label: 'Instagram', placeholder: '@username', icon: '📸' },
            { key: 'facebook', label: 'Facebook', placeholder: 'Profile URL or username', icon: '👤' },
            { key: 'twitter', label: 'X (Twitter)', placeholder: '@handle', icon: '𝕏' },
            { key: 'tiktok', label: 'TikTok', placeholder: '@username', icon: '🎵' },
            { key: 'youtube', label: 'YouTube', placeholder: 'Channel URL or @handle', icon: '▶️' },
            { key: 'linkedin', label: 'LinkedIn', placeholder: 'Profile URL', icon: '💼' },
            { key: 'snapchat', label: 'Snapchat', placeholder: '@username', icon: '👻' },
            { key: 'threads', label: 'Threads', placeholder: '@username', icon: '🧵' },
            { key: 'whatsapp', label: 'WhatsApp', placeholder: 'Phone number', icon: '💬' },
            { key: 'telegram', label: 'Telegram', placeholder: '@username', icon: '✈️' },
          ].map((item, index, arr) => (
            <View key={item.key}>
              <View style={styles.fieldRow}>
                <View style={styles.socialIconWrap}>
                  <Text style={styles.socialIcon}>{item.icon}</Text>
                </View>
                <View style={styles.fieldBody}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                  <TextInput
                    value={socialLinks[item.key as keyof typeof socialLinks]}
                    onChangeText={(text) => setSocialLinks(prev => ({ ...prev, [item.key]: text }))}
                    style={[styles.fieldInput, { color: colors.text }]}
                    placeholder={item.placeholder}
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
              {index < arr.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.footerSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  czarContainer: {
    position: 'absolute',
    top: 96,
    right: 16,
    zIndex: 100,
  },
  header: {
    height: 96,
    paddingHorizontal: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarTap: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  avatarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatarSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  secondaryButton: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 2,
    paddingBottom: 8,
    marginTop: 4,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldIconWrap: {
    width: 34,
    paddingTop: 2,
    alignItems: 'center',
  },
  fieldBody: {
    flex: 1,
    paddingRight: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  socialIconWrap: {
    width: 34,
    paddingTop: 2,
    alignItems: 'center',
  },
  socialIcon: {
    fontSize: 18,
  },
  footerSpacer: {
    height: 20,
  },
  errorText: {
    padding: 16,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
