import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Share, ActivityIndicator, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { replaysApi, Replay } from '../../../src/api/replays';
import { ReplayPlayer } from '../../../src/components/replay/ReplayPlayer';
import { track } from '../../../src/lib/analytics';

export default function ReplayScreen() {
  const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  const router = useRouter();

  const [replay, setReplay] = useState<Replay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);

  const load = useCallback(async () => {
    if (!attemptId) return;
    setLoading(true);
    try {
      const data = await replaysApi.get(attemptId);
      setReplay(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (replay && id) {
      track('replay_viewed', { trap_id: id as string, is_public: replay.is_public });
    }
  }, [replay, id]);

  async function handleShare() {
    if (!replay || !id) return;
    track('replay_shared', { trap_id: id as string });
    await Share.share({
      message: `Watch my MindHeist replay! mindheist://trap/${id}/replay?attemptId=${replay.attempt_id}`,
      title: replay.trap?.title ?? 'MindHeist Replay',
    });
  }

  async function handleTogglePublic(value: boolean) {
    if (!replay) return;
    setTogglingPublic(true);
    try {
      const updated = await replaysApi.setPublic(replay.id, value);
      setReplay(updated);
    } finally {
      setTogglingPublic(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C47FF" />
      </View>
    );
  }

  if (error || !replay) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Replay not found'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stepLabels = Object.fromEntries(
    (replay.trap ? [] : []).map((_, i) => [`step-${i}`, `Step ${i + 1}`])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Text style={styles.backIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {replay.trap?.title ?? 'Replay'}
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Public toggle */}
      <View style={styles.publicRow}>
        <View style={styles.publicInfo}>
          <Text style={styles.publicLabel}>Public replay</Text>
          <Text style={styles.publicSub}>
            {replay.is_public
              ? `Anyone with the link can watch · ${replay.view_count} view${replay.view_count !== 1 ? 's' : ''}`
              : 'Only you can see this replay'}
          </Text>
        </View>
        {togglingPublic ? (
          <ActivityIndicator size="small" color="#6C47FF" />
        ) : (
          <Switch
            value={replay.is_public}
            onValueChange={handleTogglePublic}
            thumbColor="#6C47FF"
          />
        )}
      </View>

      {/* Replay viewer */}
      <ReplayPlayer replay={replay} trapStepLabels={stepLabels} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#CC0000', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  backIcon: { marginRight: 8, padding: 4 },
  backIconText: { fontSize: 22, color: '#6C47FF' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  shareBtn: {
    backgroundColor: '#6C47FF', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  publicRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
    gap: 12,
  },
  publicInfo: { flex: 1 },
  publicLabel: { fontSize: 15, fontWeight: '600', color: '#222' },
  publicSub: { fontSize: 12, color: '#888', marginTop: 2 },
  backBtn: {
    backgroundColor: '#6C47FF', borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
});
