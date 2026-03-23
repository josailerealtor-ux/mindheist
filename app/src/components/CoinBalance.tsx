import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../api/client';

export function CoinBalance() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    apiFetch<{ balance: number }>('/coins/balance')
      .then((data) => setBalance(data.balance))
      .catch(() => null);
  }, []);

  if (balance === null) return null;

  return (
    <TouchableOpacity style={styles.container} onPress={() => router.push('/coin-store')}>
      <Text style={styles.icon}>🪙</Text>
      <Text style={styles.balance}>{balance.toLocaleString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF8E1', borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#FFD54F',
  },
  icon: { fontSize: 14 },
  balance: { fontSize: 13, fontWeight: '700', color: '#E65100' },
});
