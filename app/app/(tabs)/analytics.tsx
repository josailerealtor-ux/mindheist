import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { analyticsApi, CreatorStats, RecentActivity } from '../../src/api/analytics';

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: '#22C55E', medium: '#F59E0B', hard: '#EF4444', expert: '#7C3AED',
};

export default function AnalyticsScreen() {
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [statsData, recentData] = await Promise.all([
        analyticsApi.getCreatorStats(),
        analyticsApi.getRecentActivity(),
      ]);
      setStats(statsData);
      setRecent(recentData);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C47FF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTips = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6C47FF" />}
      >
        <Text style={styles.heading}>Creator Analytics</Text>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <StatCard label="Attempts" value={stats?.totalAttempts ?? 0} />
          <StatCard label="Escapes" value={stats?.totalEscapes ?? 0} />
          <StatCard label="Likes" value={stats?.totalLikes ?? 0} />
          <StatCard label="Tips" value={formatTips(stats?.totalTips ?? 0)} isString />
        </View>

        {/* Per-trap breakdown */}
        <Text style={styles.sectionTitle}>Your Traps</Text>
        {(stats?.traps ?? []).length === 0 ? (
          <Text style={styles.empty}>No published traps yet.</Text>
        ) : (
          stats!.traps.map((trap) => (
            <View key={trap.id} style={styles.trapCard}>
              <View style={styles.trapHeader}>
                <View style={styles.trapTitleRow}>
                  <View style={[styles.diffDot, { backgroundColor: DIFFICULTY_COLOR[trap.difficulty] ?? '#888' }]} />
                  <Text style={styles.trapTitle} numberOfLines={1}>{trap.title}</Text>
                </View>
                <Text style={styles.trapStatus}>{trap.status}</Text>
              </View>

              <View style={styles.trapStats}>
                <MiniStat label="Attempts" value={trap.attempt_count} />
                <MiniStat label="Escapes" value={trap.escape_count} />
                <MiniStat label="Escape %" value={`${(trap.escape_rate * 100).toFixed(0)}%`} isString />
                <MiniStat label="Likes" value={trap.like_count} />
                <MiniStat label="Tips" value={formatTips(trap.tip_total_cents)} isString />
              </View>

              {/* Step fail heatmap */}
              {Object.keys(trap.step_fails).length > 0 && (
                <View style={styles.failSection}>
                  <Text style={styles.failLabel}>Fail heatmap by step</Text>
                  <View style={styles.failRow}>
                    {Object.entries(trap.step_fails)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([step, count]) => (
                        <View key={step} style={styles.failBar}>
                          <View
                            style={[
                              styles.failBarFill,
                              {
                                height: Math.min(4 + (count as number) * 4, 48),
                                backgroundColor: `rgba(239,68,68,${Math.min(0.3 + (count as number) * 0.1, 1)})`,
                              },
                            ]}
                          />
                          <Text style={styles.failBarLabel}>S{Number(step) + 1}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </View>
          ))
        )}

        {/* Recent activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>No recent activity.</Text>
        ) : (
          recent.map((a) => (
            <View key={a.id} style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: a.status === 'escaped' ? '#22C55E' : '#EF4444' }]} />
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>
                  <Text style={styles.activityUser}>@{a.users?.username ?? '?'}</Text>
                  {' '}{a.status === 'escaped' ? 'escaped' : a.status === 'in_progress' ? 'is attempting' : 'failed'}
                  {' '}<Text style={styles.activityTrap}>"{a.traps?.title ?? '?'}"</Text>
                </Text>
                {a.status !== 'in_progress' && (
                  <Text style={styles.activityMeta}>{a.fail_count} fail{a.fail_count !== 1 ? 's' : ''}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, isString }: { label: string; value: number | string; isString?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{isString ? value : value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MiniStat({ label, value, isString }: { label: string; value: number | string; isString?: boolean }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{isString ? value : value.toLocaleString()}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#6C47FF' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#222', marginBottom: 10, marginTop: 8 },
  empty: { color: '#aaa', textAlign: 'center', marginTop: 20, marginBottom: 20 },
  trapCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  trapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  trapTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  diffDot: { width: 10, height: 10, borderRadius: 5 },
  trapTitle: { fontSize: 15, fontWeight: '600', color: '#222', flex: 1 },
  trapStatus: { fontSize: 11, color: '#888', textTransform: 'capitalize' },
  trapStats: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  miniStat: { alignItems: 'center', minWidth: 52 },
  miniStatValue: { fontSize: 15, fontWeight: '700', color: '#333' },
  miniStatLabel: { fontSize: 10, color: '#999', marginTop: 1 },
  failSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  failLabel: { fontSize: 11, color: '#888', marginBottom: 6 },
  failRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  failBar: { alignItems: 'center', gap: 4 },
  failBarFill: { width: 24, borderRadius: 4, minHeight: 4 },
  failBarLabel: { fontSize: 9, color: '#888' },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 14, color: '#333', lineHeight: 20 },
  activityUser: { fontWeight: '700', color: '#6C47FF' },
  activityTrap: { fontStyle: 'italic' },
  activityMeta: { fontSize: 12, color: '#aaa', marginTop: 2 },
  errorText: { color: '#CC0000', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#6C47FF', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
