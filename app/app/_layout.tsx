import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { usePlayerStore } from '../src/store/playerStore';
import { registerForPushNotifications } from '../src/lib/notifications';

export default function RootLayout() {
  const { session, loading, initialize } = useAuthStore();
  const { resumeIfPending } = usePlayerStore();
  const segments = useSegments();
  const router = useRouter();
  const resumeChecked = useRef(false);

  useEffect(() => {
    initialize();
  }, []);

  // After auth is resolved, check for pending attempt and register push token
  useEffect(() => {
    if (loading || !session || resumeChecked.current) return;
    resumeChecked.current = true;

    resumeIfPending().then((pending) => {
      if (pending) {
        Alert.alert(
          'Resume Trap?',
          `You have an in-progress attempt on "${pending.trapTitle}".`,
          [
            { text: 'Abandon', style: 'destructive', onPress: () => usePlayerStore.getState().abandon() },
            { text: 'Resume', onPress: () => router.push(`/trap/${pending.trapId}/play`) },
          ]
        );
      }
    });

    registerForPushNotifications().catch(() => {/* non-fatal */});
  }, [loading, session]);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/feed');
    }
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trap" />
    </Stack>
  );
}
