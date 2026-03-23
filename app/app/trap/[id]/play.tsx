import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePlayerStore, getCurrentStep } from '../../../src/store/playerStore';
import { trapsApi } from '../../../src/api/traps';
import { TrapStage } from '../../../src/components/player/TrapStage';
import { Timer } from '../../../src/components/player/Timer';
import { FailCounter } from '../../../src/components/player/FailCounter';
import { PremiumGate } from '../../../src/components/player/PremiumGate';
import { Trap } from '../../../src/types/trap';

export default function PlayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { phase, trap, attempt, submitting, lastHint, error, startAttempt, submitAnswer, abandon, reset } = usePlayerStore();
  const [pendingTrap, setPendingTrap] = useState<Trap | null>(null);
  const [premiumBlocked, setPremiumBlocked] = useState(false);

  useEffect(() => {
    if (!id) return;
    trapsApi.get(id).then((t) => {
      if (t.is_premium && t.price_cents > 0) {
        setPendingTrap(t);
        setPremiumBlocked(true);
      } else {
        startAttempt(t);
      }
    });
    return () => reset();
  }, [id]);

  if (premiumBlocked && pendingTrap) {
    return (
      <SafeAreaView style={styles.container}>
        <PremiumGate
          trap={pendingTrap}
          onUnlocked={() => {
            setPremiumBlocked(false);
            startAttempt(pendingTrap);
          }}
        />
      </SafeAreaView>
    );
  }

  if (phase === 'loading' || phase === 'idle') {
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'escaped') {
    return (
      <SafeAreaView style={styles.endScreen}>
        <Text style={styles.endIcon}>🎉</Text>
        <Text style={styles.endTitle}>Escaped!</Text>
        <Text style={styles.endStat}>Fails: {attempt?.fail_count ?? 0}</Text>
        {attempt?.elapsed_ms && (
          <Text style={styles.endStat}>Time: {(attempt.elapsed_ms / 1000).toFixed(1)}s</Text>
        )}
        <TouchableOpacity style={styles.endBtn} onPress={() => router.back()}>
          <Text style={styles.endBtnText}>Back to Feed</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (phase === 'failed') {
    return (
      <SafeAreaView style={styles.endScreen}>
        <Text style={styles.endIcon}>💀</Text>
        <Text style={styles.endTitle}>You Quit</Text>
        <TouchableOpacity style={styles.endBtn} onPress={() => router.back()}>
          <Text style={styles.endBtnText}>Back to Feed</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!trap || !attempt) return null;

  const currentStep = getCurrentStep(trap, attempt);
  if (!currentStep) return null;

  function handleAbandon() {
    Alert.alert('Abandon trap?', 'Your progress will be lost.', [
      { text: 'Keep trying', style: 'cancel' },
      { text: 'Abandon', style: 'destructive', onPress: abandon },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAbandon} style={styles.abandonBtn}>
          <Text style={styles.abandonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.trapTitle} numberOfLines={1}>{trap.title}</Text>
        <View style={styles.headerRight}>
          <FailCounter count={attempt.fail_count} />
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerRow}>
        <Timer startedAt={attempt.started_at} running={phase === 'playing'} />
      </View>

      {/* Step */}
      <View style={{ flex: 1 }}>
        <TrapStage
          step={currentStep}
          stepIndex={attempt.current_step}
          totalSteps={trap.steps.length}
          hint={lastHint}
          submitting={submitting}
          onSubmit={submitAnswer}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#CC0000', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  abandonBtn: { padding: 4, marginRight: 8 },
  abandonText: { fontSize: 18, color: '#888' },
  trapTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  headerRight: { marginLeft: 8 },
  timerRow: { alignItems: 'center', paddingVertical: 16 },
  backBtn: { backgroundColor: '#6C47FF', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  endScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  endIcon: { fontSize: 64 },
  endTitle: { fontSize: 36, fontWeight: 'bold' },
  endStat: { fontSize: 18, color: '#555' },
  endBtn: { backgroundColor: '#6C47FF', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 16 },
  endBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
