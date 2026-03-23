import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { FeedTrap } from '../../api/social';
import { TipButton } from './TipButton';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#47C96A',
  medium: '#FFB347',
  hard: '#FF7043',
  expert: '#9C27B0',
};

interface Props {
  trap: FeedTrap;
  onLike: (trapId: string) => void;
  onComment: (trapId: string) => void;
}

export function TrapCard({ trap, onLike, onComment }: Props) {
  const router = useRouter();
  const escapeRate = trap.attempt_count > 0
    ? Math.round((trap.escape_count / trap.attempt_count) * 100)
    : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.creatorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{trap.creator.username[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>@{trap.creator.username}</Text>
        </View>
        <View style={[styles.diffBadge, { backgroundColor: DIFFICULTY_COLORS[trap.difficulty] ?? '#aaa' }]}>
          <Text style={styles.diffText}>{trap.difficulty}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>{trap.title}</Text>
      {trap.description ? <Text style={styles.description} numberOfLines={2}>{trap.description}</Text> : null}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Stat icon="▶" value={trap.attempt_count} label="attempts" />
        {escapeRate !== null && <Stat icon="🔓" value={`${escapeRate}%`} label="escape rate" />}
        <Stat icon="♡" value={trap.like_count} label="likes" />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => router.push(`/trap/${trap.id}/play`)}
        >
          <Text style={styles.playBtnText}>Play Trap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconBtn, trap.liked_by_me && styles.iconBtnActive]}
          onPress={() => onLike(trap.id)}
        >
          <Text style={[styles.iconBtnText, trap.liked_by_me && styles.iconBtnTextActive]}>
            {trap.liked_by_me ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => onComment(trap.id)}>
          <Text style={styles.iconBtnText}>💬</Text>
        </TouchableOpacity>

        <TipButton
          creatorId={trap.creator_id}
          trapId={trap.id}
          creatorUsername={trap.creator.username}
        />
      </View>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16,
    marginVertical: 8, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#6C47FF', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  username: { fontSize: 13, color: '#555' },
  diffBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  diffText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  description: { fontSize: 14, color: '#777', marginBottom: 12, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statIcon: { fontSize: 13 },
  statValue: { fontSize: 13, fontWeight: '600', color: '#333' },
  statLabel: { fontSize: 12, color: '#999' },
  actions: { flexDirection: 'row', gap: 8 },
  playBtn: {
    flex: 1, backgroundColor: '#6C47FF', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  playBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 10, borderWidth: 1,
    borderColor: '#eee', justifyContent: 'center', alignItems: 'center',
  },
  iconBtnActive: { backgroundColor: '#FFF0F0', borderColor: '#FF4747' },
  iconBtnText: { fontSize: 18 },
  iconBtnTextActive: { color: '#FF4747' },
});
