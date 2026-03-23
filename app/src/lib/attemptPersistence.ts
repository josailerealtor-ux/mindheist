import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mindheist:active_attempt';

export interface PersistedAttempt {
  attemptId: string;
  trapId: string;
  trapTitle: string;
  startedAt: string;
}

export async function saveActiveAttempt(data: PersistedAttempt): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function loadActiveAttempt(): Promise<PersistedAttempt | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedAttempt;
  } catch {
    return null;
  }
}

export async function clearActiveAttempt(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
