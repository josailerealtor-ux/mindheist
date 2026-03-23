import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Replay } from '../../api/replays';
import { analyzeReplay, StepSummary } from '../../engine/replayAnalyzer';
import { ReplayTimeline } from './ReplayTimeline';

interface Props {
  replay: Replay;
  trapStepLabels?: Record<string, string>; // stepId → prompt (optional, falls back to stepId)
}

export function ReplayPlayer({ replay, trapStepLabels = {} }: Props) {
  const stats = analyzeReplay(replay.events);

  const elapsed = stats.totalDurationMs;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = ((elapsed % 60000) / 1000).toFixed(1);
  const timeLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary header */}
      <View style={[styles.outcomeCard, stats.escaped ? styles.escaped : styles.failed]}>
        <Text style={styles.outcomeIcon}>{stats.escaped ? '🎉' : '💀'}</Text>
        <Text style={styles.outcomeLabel}>{stats.escaped ? 'Escaped' : 'Failed'}</Text>
        <Text style={styles.outcomeStat}>{timeLabel}</Text>
        <Text style={styles.outcomeStat}>{stats.totalFails} fail{stats.totalFails !== 1 ? 's' : ''}</Text>
      </View>

      {/* Player & trap info */}
      {(replay.player || replay.trap) && (
        <View style={styles.metaRow}>
          {replay.player && <Text style={styles.metaText}>@{replay.player.username}</Text>}
          {replay.trap && <Text style={styles.metaDivider}>·</Text>}
          {replay.trap && <Text style={styles.metaText}>{replay.trap.title}</Text>}
        </View>
      )}

      {/* Timeline */}
      <ReplayTimeline events={replay.events} totalDurationMs={stats.totalDurationMs} />

      {/* Step breakdown */}
      <Text style={styles.sectionTitle}>Step Breakdown</Text>
      {stats.stepSummaries.map((summary, idx) => (
        <StepCard
          key={summary.stepId}
          index={idx}
          summary={summary}
          label={trapStepLabels[summary.stepId] ?? `Step ${idx + 1}`}
        />
      ))}
    </ScrollView>
  );
}

function StepCard({ index, summary, label }: { index: number; summary: StepSummary; label: string }) {
  const duration = summary.passedAtMs !== null
    ? ((summary.passedAtMs - summary.firstAttemptMs) / 1000).toFixed(1) + 's'
    : '—';

  return (
    <View style={[styles.stepCard, summary.passed ? styles.stepPassed : styles.stepFailed]}>
      <View style={[styles.stepBadge, summary.passed ? styles.badgePassed : styles.badgeFailed]}>
        <Text style={styles.stepBadgeText}>{index + 1}</Text>
      </View>
      <View style={styles.stepInfo}>
        <Text style={styles.stepLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.stepMeta}>
          {summary.attempts} attempt{summary.attempts !== 1 ? 's' : ''} · {duration}
        </Text>
      </View>
      <Text style={styles.stepOutcome}>{summary.passed ? '✓' : '✗'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { paddingBottom: 48 },
  outcomeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    margin: 16, padding: 16, borderRadius: 16,
  },
  escaped: { backgroundColor: '#E6F9ED' },
  failed: { backgroundColor: '#FFF0F0' },
  outcomeIcon: { fontSize: 28 },
  outcomeLabel: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  outcomeStat: { fontSize: 14, color: '#555' },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, marginBottom: 8,
  },
  metaText: { fontSize: 14, color: '#666' },
  metaDivider: { color: '#ccc' },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#555',
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: 24, marginBottom: 8, marginTop: 8,
  },
  stepCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginVertical: 4,
    padding: 12, borderRadius: 12, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  stepPassed: {},
  stepFailed: { opacity: 0.7 },
  stepBadge: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  badgePassed: { backgroundColor: '#E6F9ED' },
  badgeFailed: { backgroundColor: '#FFF0F0' },
  stepBadgeText: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  stepInfo: { flex: 1 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: '#222' },
  stepMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  stepOutcome: { fontSize: 18, color: '#aaa' },
});
