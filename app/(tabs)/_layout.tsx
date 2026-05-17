import { IconSymbol } from '@/components/ui/icon-symbol';
import { MaterialTopTabs } from '@/components/ui/material-top-tabs';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Animated, BackHandler, DeviceEventEmitter, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ENTRIES_KEY = '@charisma_entries';

function AnimatedTabButton({ onPress, children, isFocused, color }: any) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const wiggleAnim = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    // Scale down effect
    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      stiffness: 1000,
      damping: 15,
      mass: 0.5,
    }).start();

    // Wiggle animation - rotate left-right-left-right
    wiggleAnim.setValue(0);
    Animated.sequence([
      Animated.timing(wiggleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(wiggleAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(wiggleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(wiggleAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 1000,
      damping: 15,
      mass: 0.5,
    }).start();
  };

  const rotation = wiggleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
      style={styles.tabItem}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { rotate: rotation }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

function AddMenu({ visible, onClose, colors, insets, router }: any) {
  const options = [
    { emoji: '✨', label: 'Add Charisma Entry', onPress: () => { onClose(); router.push('/onboarding-charisma'); } },
  ];
  
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose} />
      <View style={[styles.menuSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.menuHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.menuTitle, { color: colors.text }]}>What would you like to do?</Text>
        {options.map((opt: any) => (
          <TouchableOpacity key={opt.label} style={[styles.menuOption, { borderBottomColor: colors.border }]} onPress={opt.onPress} activeOpacity={0.7}>
            <Text style={styles.menuOptionEmoji}>{opt.emoji}</Text>
            <Text style={[styles.menuOptionText, { color: colors.text }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.menuCancel} onPress={onClose} activeOpacity={0.7}>
          <Text style={[styles.menuCancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <>
      <AddMenu
        visible={showAddMenu}
        onClose={() => setShowAddMenu(false)}
        colors={colors}
        insets={insets}
        router={router}
      />
      <View style={[styles.tabBar, {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      paddingBottom: insets.bottom,
    }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;
        const color = isFocused ? colors.gold : colors.textSecondary;

        const onPress = async () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          // If already focused on Home, emit event to trigger logo flip
          if (isFocused && route.name === 'index') {
            DeviceEventEmitter.emit('home-reselected');
            return;
          }

          if (!isFocused && !event.defaultPrevented) {
            // For the explore tab (Add button), we might want specific behavior?
            // Actually, the original code PUSHED to /onboarding-charisma.
            // If we nav to the tab, we need to decide if the tab ITSELF redirects or if we intercept here.
            // Let's intercept "explore" if that's the intention.
            if (route.name === 'explore') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddMenu(true);
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name, route.params);
            }
          }
        };

        // Special render for "explore" (Middle Button)
        if (route.name === 'explore') {
          return (
            <AnimatedTabButton key={route.key} onPress={onPress}>
              <View style={[styles.addButton, { backgroundColor: colors.gold }]}>
                <IconSymbol size={32} name="plus" color="#000000" />
              </View>
            </AnimatedTabButton>
          );
        }

        let iconName = "house";
        if (route.name === 'index') iconName = "house";
        if (route.name === 'ai-chat') iconName = "sparkles";
        if (route.name === 'quotes') iconName = "text.quote";
        if (route.name === 'profile') iconName = "person";

        return (
          <AnimatedTabButton
            key={route.key}
            onPress={onPress}
            isFocused={isFocused}
            color={color}
          >
            <View style={styles.tabIconWrap}>
              <IconSymbol size={24} name={iconName as any} color={color} style={styles.tabIcon} />
            </View>
            <Text style={[styles.tabLabel, { color }]}>
              {label}
            </Text>
          </AnimatedTabButton>
        );
      })}
      </View>
    </>
  );
}

export default function TabLayout() {
  const [hasEntries, setHasEntries] = useState(false);

  const checkEntries = useCallback(async () => {
    try {
      const entriesData = await AsyncStorage.getItem(ENTRIES_KEY);
      if (entriesData) {
        const entries = JSON.parse(entriesData);
        setHasEntries(entries.length > 0);
      } else {
        setHasEntries(false);
      }
    } catch (error) {
      console.error('Error checking entries:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkEntries();
    }, [checkEntries])
  );

  // Handle hardware back button to prevent freeze
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          BackHandler.exitApp();
          return true;
        }
        return false;
      })();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <MaterialTopTabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
        />
      )}
      tabBarPosition="bottom"
      screenOptions={{
        lazy: true,
        animationEnabled: true,
        swipeEnabled: true,
        // Cubic interpolation animation for smooth transitions
        sceneStyle: {
          // Enables hardware acceleration for smooth animations
          transform: [{ perspective: 1000 }],
        },
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <MaterialTopTabs.Screen
        name="ai-chat"
        options={{
          title: 'Czar AI',
        }}
      />
      <MaterialTopTabs.Screen
        name="explore"
        options={{
          title: '',
        }}
      />
      <MaterialTopTabs.Screen
        name="quotes"
        options={{
          title: 'Quotes',
        }}
      />
      <MaterialTopTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: 90, // approx 80 + padding
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tabIconWrap: {
    position: 'relative',
  },
  tabIcon: {
    marginTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 0,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  menuOptionEmoji: {
    fontSize: 22,
  },
  menuOptionText: {
    fontSize: 17,
    fontWeight: '500',
  },
  menuCancel: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
