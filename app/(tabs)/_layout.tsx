import { IconSymbol } from '@/components/ui/icon-symbol';
import { MaterialTopTabs } from '@/components/ui/material-top-tabs';
import { useTheme } from '@/hooks/use-theme';
import { getCurrentUser, getUnreadCount, subscribeToConversations } from '@/utils/message-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Animated, BackHandler, DeviceEventEmitter, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CZAR_IMAGE = require('@/assets/images/czar.png');
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
    { emoji: '🎬', label: 'Create Czareel', onPress: () => { onClose(); router.push('/create-czareel'); } },
    { emoji: '✨', label: 'Add Charisma Entry', onPress: () => { onClose(); router.push('/onboarding-charisma'); } },
    { emoji: '🔗', label: 'Paste Social Link', onPress: () => { onClose(); router.push({ pathname: '/(tabs)', params: { openPasteLink: Date.now().toString() } }); } },
  ];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.menuBackdrop} onPress={onClose} />
      <View style={[styles.menuSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.menuHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.menuTitle, { color: colors.text }]}>What would you like to do?</Text>
        {options.map((opt) => (
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

function CustomTabBar({ state, descriptors, navigation, hasNewMessages, clearNewMessages }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const focusedRouteName = state?.routes?.[state.index]?.name;

  useEffect(() => {
    if (focusedRouteName === 'messages' && hasNewMessages) {
      clearNewMessages?.();
    }
  }, [focusedRouteName, hasNewMessages, clearNewMessages]);

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
            } else if (route.name === 'czar-chat') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              try {
                // Use navigation.navigate for better production build compatibility
                navigation.navigate('ai-chat', route.params);
              } catch (error) {
                console.error('Tab navigation error:', error);
                router.push('/ai-chat');
              }
            } else if (route.name === 'messages') {
              clearNewMessages?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name, route.params);
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
        if (route.name === 'messages') iconName = "message";
        if (route.name === 'profile') iconName = "person";

        // Special render for Czar AI chat tab — use Czar profile image
        if (route.name === 'czar-chat') {
          return (
            <AnimatedTabButton
              key={route.key}
              onPress={onPress}
              isFocused={isFocused}
              color={color}
            >
              <View style={styles.tabIconWrap}>
                <Image
                  source={CZAR_IMAGE}
                  style={[
                    styles.czarTabImage,
                    { borderColor: isFocused ? colors.gold : 'transparent' },
                  ]}
                  resizeMode="cover"
                />
              </View>
              <Text style={[styles.tabLabel, { color }]}>
                {label}
              </Text>
            </AnimatedTabButton>
          );
        }

        return (
          <AnimatedTabButton
            key={route.key}
            onPress={onPress}
            isFocused={isFocused}
            color={color}
          >
            <View style={styles.tabIconWrap}>
              <IconSymbol size={24} name={iconName as any} color={color} style={styles.tabIcon} />
              {route.name === 'messages' && !!hasNewMessages && !isFocused ? (
                <View style={styles.messageDot} />
              ) : null}
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
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const router = useRouter();

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

  // Check for unread messages on initial load and when app comes to foreground
  const checkUnreadMessages = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      if (count > 0) {
        setHasNewMessages(true);
      }
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  }, []);

  // Check unread messages on mount and when tab layout gains focus
  useFocusEffect(
    useCallback(() => {
      checkUnreadMessages();
    }, [checkUnreadMessages])
  );

  useEffect(() => {
    let unsubscribe: undefined | (() => void);
    let isMounted = true;

    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user || !isMounted) return;

        // Initial check for unread messages
        await checkUnreadMessages();

        // Subscribe to real-time conversation updates
        unsubscribe = subscribeToConversations((conversation) => {
          if (conversation?.unreadCount && conversation.unreadCount > 0) {
            setHasNewMessages(true);
          }
        });
      } catch (error) {
        console.error('Error subscribing to conversations:', error);
      }
    })();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [checkUnreadMessages]);

  // Handle hardware back button to prevent freeze
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Check if user is authenticated
      (async () => {
        const user = await getCurrentUser();
        if (!user) {
          // If not authenticated, exit the app
          BackHandler.exitApp();
          return true;
        }
        // If authenticated, let the default back behavior handle it
        return false;
      })();
      return true; // Prevent default behavior while we check auth
    });

    return () => backHandler.remove();
  }, []);

  return (
    <MaterialTopTabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          hasNewMessages={hasNewMessages}
          clearNewMessages={() => setHasNewMessages(false)}
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
        name="messages"
        options={{
          title: 'Messages',
        }}
      />
      {/* explore is strictly a placeholder for the button in this logic, 
          but for swiping order, it will exist as a screen.
          Ideally we want to SKIP it during swipe or make it a real screen.
          Users CAN swipe to 'explore' if we leave it here.
          If we want to avoid swiping to 'explore' (since it pushes a route),
          we should probably NOT include it as a tab and just render the button overlay?
          BUT MaterialTopTabs needs the route to exist to map it in the bar easily.
          
          Better UX: Make 'explore' a real View (maybe "New Entry") that auto-redirects?
          OR, simpler: Just let it be a tab that shows "New Entry" screen directly instead of Pushing?
          
          The user originally had it strictly as a button. 
          If I swipe to it, what happens? 
          For now, I'll map it to a View that redirects on focus if accessed via swipe.
      */}
      <MaterialTopTabs.Screen
        name="explore"
        options={{
          title: '',
        }}
      />
      <MaterialTopTabs.Screen
        name="czar-chat"
        options={{
          title: 'Czar AI',
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
  messageDot: {
    position: 'absolute',
    top: 0,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  czarTabImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
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
