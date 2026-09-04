import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { profilesApi } from '@/api/profiles';
import { syncContactHashes } from '@/lib/contactPrivacy';
import { useRealtime } from '@/store/realtime';
import { fonts, palette, useTheme } from '@/theme';

export default function AppTabsLayout() {
  const { c } = useTheme();
  const { unreadCount } = useRealtime();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const me = await profilesApi.getMine();
        if (me?.hide_from_contacts) await syncContactHashes(me.phone, false);
      } catch {
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
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
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
        name="advisors"
        options={{
          title: 'Find For Me',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={23} color={color} />
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
      
      {/* Hidden Screens */}
            <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="find-for-me" options={{ href: null }} />
      <Tabs.Screen name="create-request" options={{ href: null }} />
      <Tabs.Screen name="requests/[id]" options={{ href: null }} />
      <Tabs.Screen name="requests/chat/[offerId]" options={{ href: null }} />
    </Tabs>
  );
}
