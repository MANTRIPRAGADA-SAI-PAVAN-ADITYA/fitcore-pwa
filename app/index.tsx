import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import LoadingScreen from '../components/ui/LoadingScreen';

export default function Index() {
  const { session, profile, loading } = useAuthStore();

  if (loading) return <LoadingScreen message="Starting LooP..." />;

  if (!session && !profile) return <Redirect href="/(auth)/phone" />;

  if (session && !profile?.name) return <Redirect href="/(auth)/setup" />;

  return <Redirect href="/(app)/home" />;
}
