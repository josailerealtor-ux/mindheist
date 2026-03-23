import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { socialApi, Challenge } from '../../src/api/social';
import { useAuthStore } from '../../src/store/authStore';

const STATUS_LABELS: Record<Challenge['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  resolved: 'Done',
};

const STATUS_COLORS: Record<Challenge['status'], string> = {
  pending: '#FFB347',
  accepted: '#47C96A',
  resolved: '#aaa',
};

export default function ChallengesScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchChallenges(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await socialApi.getChallenges();
      setChallenges(data);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }

  useEffect(() => { fetchChallenges(); }, []);

  async function respond(challengeId: string, action: 'accept' | 'decline') {
    const updated = await socialApi.respondToChallenge(challengeId, action);
    setChallenges((prev) => prev.map((c) => (c.id === challengeId ? updated : c)));
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#6C47FF" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Challenges</Text>
      </View>

      <FlatList
        data={challenges}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchChallenges(true)} tintColor="#6C47FF" />}
        ListEmptyComponent={<Text style={styles.empty}>No challenges yet.</Text>}
        renderItem={({ item }) => {
          const isReceived = item.target_id === user?.id;
          const isPending = item.status === 'pending';
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                  <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
                </View>
                <Text style={styles.direction}>{isReceived ? '← Received' : '→ Sent'}</Text>
              </View>

              <Text style={styles.trapTitle}>{item.trap.title}</Text>
              <Text style={styles.trapDiff}>{item.trap.difficulty}</Text>
              <Text style={styles.participants}>
                {isReceived
                  ? `@${item.challenger.username} challenged you`
                  : `You challenged @${item.target.username}`}
              </Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => router.push(`/trap/${item.trap_id}/play`)}
                >
                  <Text style={styles.playBtnText}>Play</Text>
                </TouchableOpacity>

                {isReceived && isPending && (
                  <>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(item.id, 'accept')}>
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => respond(item.id, 'decline')}>
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  direction: { fontSize: 12, color: '#888' },
  trapTitle: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  trapDiff: { fontSize: 12, color: '#6C47FF', textTransform: 'capitalize', marginBottom: 6 },
  participants: { fontSize: 13, color: '#777', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  playBtn: { flex: 1, backgroundColor: '#6C47FF', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  playBtnText: { color: '#fff', fontWeight: '600' },
  acceptBtn: { borderWidth: 1, borderColor: '#47C96A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  acceptBtnText: { color: '#47C96A', fontWeight: '600' },
  declineBtn: { borderWidth: 1, borderColor: '#FF4747', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  declineBtnText: { color: '#FF4747', fontWeight: '600' },
});
