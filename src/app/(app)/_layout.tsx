import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { profilesApi } from '@/api/profiles';
import { syncContactHashes } from '@/lib/contactPrivacy';
import { useRealtime } from '@/store/realtime';
import { fonts, palette, useTheme } from '@/theme';

export default function AppTabsLayout() {
  const { c } = useTheme();
  const { unreadCount } = useRealtime();

  // Hide-from-contacts drifts as the phone book changes; refresh the hash
  // set once per launch, silently (never prompts - the settings toggle owns
  // the permission ask).
  useEffect(() => {
    (async () => {
      try {
        const me = await profilesApi.getMine();
        if (me?.hide_from_contacts) await syncContactHashes(me.phone, false);
      } catch {
        // Best effort only; the last uploaded set keeps working.
      }
    })();
  }, []);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.burgundy,
        tabBarInactiveTintColor: c.textSubtle,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11, letterSpacing: 0.3 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={21} color={color} />
          ),
        }}
      />
      {/* Explore stays a full route (/explore) reached from the Discover header,
          so the bar keeps to five tabs. href:null hides it from the bar. */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen
        name="fund"
        options={{
          title: 'Fund',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart-circle' : 'heart-circle-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
