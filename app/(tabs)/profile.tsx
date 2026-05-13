import { CzareelsGrid } from '@/components/profile/czareels-grid';
import { ProfileHeader } from '@/components/profile/profile-header';
import { RecentEntries } from '@/components/profile/recent-entries';
import { QuickActions } from '@/components/profile/settings-button';
import { StatsCard } from '@/components/profile/stats-card';
import { CharismaEntry, UserProfile, UserStats } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { calculateUserStats, getProfile, getRecentEntries, updateProfile } from '@/utils/profile-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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
  const [userId, setUserId] = useState<string | null>(null);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const isLoadingRef = useRef(false);

  const loadProfileData = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      setLoading(true);

      // Grab current user id for Czareels grid + follow counts
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: fc } = await supabase
          .from('profiles')
          .select('follower_count, following_count')
          .eq('id', uid)
          .maybeSingle();
        if (fc) setFollowCounts({ followers: fc.follower_count ?? 0, following: fc.following_count ?? 0 });
      }
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

      // Fetch czareels count from Supabase
      let czareelsCount = 0;
      if (uid) {
        const { count, error: czareelsError } = await supabase
          .from('czareels')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', uid);
        if (!czareelsError && count !== null) {
          czareelsCount = count;
        }
      }
      userStats.czareelsCount = czareelsCount;

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
      isLoadingRef.current = false;
    }
  };

  // Single useFocusEffect handles both initial mount and subsequent focus
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
    router.push('/subscription' as any);
  };

  const handleSubscriptionsInfo = () => {
    router.push('/subscriptions-info' as any);
  };

  const handleSearch = () => {
    router.push('/search');
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
          followCounts={followCounts}
          isFollowing={true}
          currentUserId={userId || undefined}
        />

        {userId && <CzareelsGrid userId={userId} />}

        <StatsCard stats={stats} />

        <RecentEntries entries={recentEntries} />

        <QuickActions
          onEditProfile={handleEditProfile}
          onExportData={handleExportData}
          onSettings={handleSettings}
          onSubscriptionsInfo={handleSubscriptionsInfo}
          onSearch={handleSearch}
          /* onSubscription={handleSubscription} // Disabled for free mode */
        />

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Czarisma AI v{Constants.expoConfig?.version || '1.0.2'}
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
