import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { Trap } from '../../src/types/trap';

interface ProfileStats {
  trapsBuilt: Trap[];
  loading: boolean;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<ProfileStats>({ trapsBuilt: [], loading: true });
  const [refreshing, setRefreshing] = useState(false);

  async function fetchStats(isRefresh = false) {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    const { data } = await supabase
      .from('traps')
      .select('id, title, difficulty, attempt_count, escape_count, like_count, status, published_at')
      .eq('creator_id', user.id)
      .neq('status', 'archived')
      .order('published_at', { ascending: false })
      .limit(10);
    setStats({ trapsBuilt: (data as Trap[]) ?? [], loading: false });
    setRefreshing(false);
  }

  useEffect(() => { fetchStats(); }, [user]);

  if (stats.loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#6C47FF" /></View>;
  }

  const publishedCount = stats.trapsBuilt.filter((t) => t.status === 'published').length;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={stats.trapsBuilt}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchStats(true)} tintColor="#6C47FF" />}
        ListHeaderComponent={
          <>
            {/* Profile header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <Text style={styles.username}>@{user?.username}</Text>
              <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <StatCell label="Traps Built" value={publishedCount} color="#6C47FF" />
              <StatCell label="Escapes" value={user?.traps_escaped ?? 0} color="#47C96A" />
              <StatCell label="Total Likes" value={stats.trapsBuilt.reduce((sum, t) => sum + t.like_count, 0)} color="#FF6C47" />
            </View>

            <Text style={styles.sectionTitle}>Your Traps</Text>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.trapRow}
            onPress={() => router.push(`/trap/${item.id}/play`)}
          >
            <View style={styles.trapInfo}>
              <Text style={styles.trapTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.trapMeta}>
                {item.attempt_count} attempts · {item.escape_count} escapes · {item.like_count} likes
              </Text>
            </View>
            <Text style={styles.trapStatus}>{item.status === 'published' ? '●' : '○'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No traps yet — go build one!</Text>}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', gap: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#6C47FF', justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  username: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  signOutBtn: { marginTop: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 6 },
  signOutText: { color: '#888', fontSize: 14 },
  statsGrid: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#555', textTransform: 'uppercase',
    letterSpacing: 1, paddingHorizontal: 16, paddingVertical: 12,
  },
  list: { paddingBottom: 40 },
  trapRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  trapInfo: { flex: 1 },
  trapTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
  trapMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  trapStatus: { fontSize: 16, color: '#47C96A', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 15, padding: 24 },
});
