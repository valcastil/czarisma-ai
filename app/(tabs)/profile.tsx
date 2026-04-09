import { ProfileHeader } from '@/components/profile/profile-header';
import { RecentEntries } from '@/components/profile/recent-entries';
import { QuickActions } from '@/components/profile/settings-button';
import { StatsCard } from '@/components/profile/stats-card';
import { CharismaEntry, UserProfile, UserStats } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { calculateUserStats, getProfile, getRecentEntries, updateProfile } from '@/utils/profile-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const ENTRIES_KEY = '@charisma_entries';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const savedScrollPosition = useRef<number>(0);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentEntries, setRecentEntries] = useState<CharismaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  // Refresh profile data when screen comes into focus (after sign-in)
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      setLoading(true);
      console.log('Starting to load profile data...');

      let [profileData, entriesData] = await Promise.all([
        getProfile(),
        AsyncStorage.getItem(ENTRIES_KEY),
      ]);

      console.log('Profile data loaded:', profileData);
      console.log('Entries data loaded:', entriesData);

      const entries: CharismaEntry[] = entriesData ? JSON.parse(entriesData) : [];
      console.log('Parsed entries:', entries.length);

      // Calculate stats
      const userStats = await calculateUserStats(entries);
      const recent = getRecentEntries(entries, 5);

      console.log('User stats calculated:', userStats);
      console.log('Top charisma type:', userStats.topCharisma.type);
      console.log('Top charisma count:', userStats.topCharisma.count);
      console.log('Recent entries:', recent.length);

      // If no profile data exists (signed out), show default empty profile
      if (!profileData) {
        const defaultProfile: UserProfile = {
          id: '',
          name: 'Guest User',
          username: 'guest',
          email: '',
          password: '',
          bio: '',
          isVerified: false,
          twoFactorEnabled: false,
          totalEntries: 0,
          streak: 0,
          topCharisma: 'confidence',
          joinDate: Date.now(),
          location: { city: 'Unknown', country: 'Unknown' },
          interests: [],
          preferredEmotions: [],
          notifications: { push: true, email: true, dailyReminders: true, weeklyReports: false },
          privacy: { profileVisibility: 'public', showEmail: false, showPhone: false, showLocation: true, showBirthDate: false },
          preferences: { theme: 'auto', language: 'en' },
          socialLinks: {},
        };
        setProfile(defaultProfile);
        setStats(userStats);
        setRecentEntries(recent);
        return;
      }

      // Update profile with current stats
      const updatedProfile = await updateProfile({
        totalEntries: userStats.totalEntries,
        streak: userStats.currentStreak,
        topCharisma: userStats.topCharisma.type || 'confidence',
      });

      console.log('Profile updated successfully with topCharisma:', updatedProfile.topCharisma);

      setProfile(updatedProfile);
      setStats(userStats);
      setRecentEntries(recent);

    } catch (error) {
      console.error('Error loading profile data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `Unable to load profile data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
      // Restore scroll position when screen comes back into focus
      if (savedScrollPosition.current > 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: savedScrollPosition.current,
            animated: false,
          });
        }, 100);
      }
    }, [])
  );

  const handleEditProfile = () => {
    router.push('/profile-settings');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleSubscription = () => {
    // Save current scroll position before navigating
    router.push('/subscription');
  };

  const handleScroll = (event: any) => {
    savedScrollPosition.current = event.nativeEvent.contentOffset.y;
  };

  const handleExportData = async () => {
    // This is handled in the settings button component
  };

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

  if (!profile || !stats) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Unable to load profile
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.gold }]}
            onPress={loadProfileData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        <ProfileHeader
          profile={profile}
          onEditPress={handleEditProfile}
        />

        <StatsCard stats={stats} />

        <RecentEntries entries={recentEntries} />

        <QuickActions
          onEditProfile={handleEditProfile}
          onExportData={handleExportData}
          onSettings={handleSettings}
          /* onSubscription={handleSubscription} // Disabled for free mode */
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            CzarApp v{Constants.expoConfig?.version || '1.0.2'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000000',
    fontWeight: '600',
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
});
