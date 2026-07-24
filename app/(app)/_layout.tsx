import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { COLORS } from '../../constants/theme';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { Ionicons } from '@expo/vector-icons';

export default function AppLayout() {
  const { session, profile, loading } = useAuthStore();

  if (loading) return <LoadingScreen />;
  if (!session && !profile) return <Redirect href="/(auth)/phone" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.32)',
        tabBarStyle: {
          backgroundColor: '#0D0D0D',
          borderTopWidth: 0,
          paddingBottom: 6,
          paddingTop: 4,
          height: 62,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed/index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post/index"
        options={{
          title: 'Post',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size} color={color} />,
          tabBarIconStyle: { marginBottom: -3 },
        }}
      />
      <Tabs.Screen
        name="trips/index"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />

      {/* Hidden screens — no tab buttons */}
      <Tabs.Screen name="feed/[id]" options={{ href: null }} />
      <Tabs.Screen name="post/truck" options={{ href: null }} />
      <Tabs.Screen name="post/load" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/kyc" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="trips/track" options={{ href: null }} />
      <Tabs.Screen name="admin/index" options={{ href: null }} />
      <Tabs.Screen name="admin/kyc" options={{ href: null }} />
      <Tabs.Screen name="admin/users" options={{ href: null }} />
      <Tabs.Screen name="admin/trips" options={{ href: null }} />
      <Tabs.Screen name="admin/pricing" options={{ href: null }} />
      <Tabs.Screen name="notifications/index" options={{ href: null }} />
      <Tabs.Screen name="credits/index" options={{ href: null }} />
    </Tabs>
  );
}
