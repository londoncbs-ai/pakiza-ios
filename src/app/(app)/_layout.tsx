import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { profilesApi } from '@/api/profiles';
import { initAnalytics } from '@/lib/analytics';
import { syncContactHashes } from '@/lib/contactPrivacy';
import { useAuth } from '@/store/auth';
import { useRealtime } from '@/store/realtime';
import { fonts, palette, useTheme } from '@/theme';

export default function AppTabsLayout() {
  const { c } = useTheme();
  const { unreadCount } = useRealtime();
  const { verifyRequired } = useAuth();
  const insets = useSafeAreaInsets();

  // iOS asks for App Tracking Transparency inside initAnalytics(). Ask here,
  // once the member is signed in and past verification, rather than at launch
  // over the welcome screen. initAnalytics() only ever runs once.
  useEffect(() => {
    if (Platform.OS === 'ios' && !verifyRequired) initAnalytics();
  }, [verifyRequired]);

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
          // Opens on the Journey (see discover.tsx).
          title: 'Journey',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'trail-sign' : 'trail-sign-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="advisors"
        options={{
          // Named for what it is: a personal human matchmaker.
          title: 'Matchmaker',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={23} color={color} />
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
