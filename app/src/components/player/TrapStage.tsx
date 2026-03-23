import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, ScrollView } from 'react-native';
import { TrapStep } from '../../types/trap';
import {
  StepAnswer, LogicAnswer, SequenceAnswer, CipherAnswer,
  PatternAnswer, TimingAnswer,
  LogicStepConfig, SequenceStepConfig, CipherStepConfig,
  PatternStepConfig, TimingStepConfig,
} from '../../types/engine';

interface Props {
  step: TrapStep;
  stepIndex: number;
  totalSteps: number;
  hint: string | null;
  submitting: boolean;
  onSubmit: (answer: StepAnswer) => void;
}

export function TrapStage({ step, stepIndex, totalSteps, hint, submitting, onSubmit }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progress}>{stepIndex + 1} / {totalSteps}</Text>
      <Text style={styles.stepType}>{step.type.toUpperCase()}</Text>
      <Text style={styles.prompt}>{step.prompt}</Text>

      {hint && <View style={styles.hintBox}><Text style={styles.hintText}>{hint}</Text></View>}

      <View style={styles.answerArea}>
        {step.type === 'cipher' && <CipherInput config={step.config as CipherStepConfig} submitting={submitting} onSubmit={onSubmit} />}
        {step.type === 'logic' && <LogicInput config={step.config as LogicStepConfig} submitting={submitting} onSubmit={onSubmit} />}
        {step.type === 'sequence' && <SequenceInput config={step.config as SequenceStepConfig} submitting={submitting} onSubmit={onSubmit} />}
        {step.type === 'pattern' && <PatternInput config={step.config as PatternStepConfig} submitting={submitting} onSubmit={onSubmit} />}
        {step.type === 'timing' && <TimingInput config={step.config as TimingStepConfig} submitting={submitting} onSubmit={onSubmit} />}
      </View>
    </ScrollView>
  );
}

// ── Cipher ───────────────────────────────────────────────────────────────────

function CipherInput({ config, submitting, onSubmit }: { config: CipherStepConfig; submitting: boolean; onSubmit: (a: StepAnswer) => void }) {
  const [plaintext, setPlaintext] = useState('');
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Encoded: <Text style={styles.mono}>{config.encoded}</Text></Text>
      <Text style={styles.sublabel}>Cipher: {config.cipherType}</Text>
      <TextInput style={styles.textInput} placeholder="Your decoded answer" value={plaintext} onChangeText={setPlaintext} autoCapitalize="none" />
      <SubmitButton disabled={submitting || !plaintext.trim()} onPress={() => onSubmit({ plaintext } as CipherAnswer)} />
    </View>
  );
}

// ── Logic ────────────────────────────────────────────────────────────────────

function LogicInput({ config, submitting, onSubmit }: { config: LogicStepConfig; submitting: boolean; onSubmit: (a: StepAnswer) => void }) {
  const [values, setValues] = useState<Record<string, boolean>>(
    Object.fromEntries(Object.keys(config.variables).map((k) => [k, false]))
  );
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Expression: <Text style={styles.mono}>{config.expression}</Text></Text>
      {Object.entries(config.variables).map(([key, label]) => (
        <View key={key} style={styles.switchRow}>
          <Text style={styles.switchLabel}>{label} ({key})</Text>
          <Switch value={values[key]} onValueChange={(v) => setValues({ ...values, [key]: v })} thumbColor="#6C47FF" />
        </View>
      ))}
      <SubmitButton disabled={submitting} onPress={() => onSubmit({ values } as LogicAnswer)} />
    </View>
  );
}

// ── Sequence ─────────────────────────────────────────────────────────────────

function SequenceInput({ config, submitting, onSubmit }: { config: SequenceStepConfig; submitting: boolean; onSubmit: (a: StepAnswer) => void }) {
  const [order, setOrder] = useState(config.items.map((i) => i.id));

  function move(idx: number, dir: -1 | 1) {
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  }

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.sublabel}>Drag or use arrows to set the correct order:</Text>
      {order.map((id, idx) => {
        const item = config.items.find((i) => i.id === id);
        return (
          <View key={id} style={styles.seqRow}>
            <Text style={styles.seqIndex}>{idx + 1}.</Text>
            <Text style={styles.seqLabel}>{item?.label}</Text>
            <View style={styles.seqArrows}>
              <TouchableOpacity onPress={() => move(idx, -1)} disabled={idx === 0}><Text style={[styles.arrow, idx === 0 && styles.arrowDisabled]}>▲</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => move(idx, 1)} disabled={idx === order.length - 1}><Text style={[styles.arrow, idx === order.length - 1 && styles.arrowDisabled]}>▼</Text></TouchableOpacity>
            </View>
          </View>
        );
      })}
      <SubmitButton disabled={submitting} onPress={() => onSubmit({ order } as SequenceAnswer)} />
    </View>
  );
}

// ── Pattern ───────────────────────────────────────────────────────────────────

function PatternInput({ config, submitting, onSubmit }: { config: PatternStepConfig; submitting: boolean; onSubmit: (a: StepAnswer) => void }) {
  const [answer, setAnswer] = useState('');
  return (
    <View style={styles.inputGroup}>
      <View style={styles.seqRow}>
        {config.sequence.map((val, idx) => (
          <View key={idx} style={[styles.patCell, idx === config.gapIndex && styles.patGap]}>
            <Text style={[styles.patValue, idx === config.gapIndex && styles.patGapText]}>
              {idx === config.gapIndex ? '?' : String(val)}
            </Text>
          </View>
        ))}
      </View>
      <TextInput style={styles.textInput} placeholder="Fill in the gap" value={answer} onChangeText={setAnswer} keyboardType="numeric" />
      <SubmitButton disabled={submitting || !answer.trim()} onPress={() => {
        const parsed = isNaN(Number(answer)) ? answer : Number(answer);
        onSubmit({ answer: parsed } as PatternAnswer);
      }} />
    </View>
  );
}

// ── Timing ────────────────────────────────────────────────────────────────────

function TimingInput({ config, submitting, onSubmit }: { config: TimingStepConfig; submitting: boolean; onSubmit: (a: StepAnswer) => void }) {
  const startRef = useRef<number | null>(null);
  const [armed, setArmed] = useState(false);

  function arm() {
    startRef.current = Date.now();
    setArmed(true);
  }

  function submit() {
    if (!startRef.current) return;
    const elapsedMs = Date.now() - startRef.current;
    onSubmit({ elapsedMs } as TimingAnswer);
    setArmed(false);
  }

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.sublabel}>{config.prompt}</Text>
      <Text style={styles.timingHint}>Target: {(config.targetMs / 1000).toFixed(1)}s ± {(config.windowMs / 1000).toFixed(1)}s</Text>
      {!armed ? (
        <TouchableOpacity style={styles.timingBtn} onPress={arm}>
          <Text style={styles.submitText}>START</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.timingBtn, styles.timingBtnArmed]} onPress={submit} disabled={submitting}>
          <Text style={styles.submitText}>STOP</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function SubmitButton({ onPress, disabled }: { onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity style={[styles.submitBtn, disabled && styles.submitBtnDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.submitText}>{disabled ? '...' : 'Submit'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 },
  progress: { fontSize: 13, color: '#aaa', textAlign: 'center', marginBottom: 8 },
  stepType: { fontSize: 11, fontWeight: '700', color: '#6C47FF', textAlign: 'center', letterSpacing: 2, marginBottom: 8 },
  prompt: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 24, lineHeight: 28 },
  hintBox: { backgroundColor: '#FFF5E0', borderRadius: 8, padding: 12, marginBottom: 16 },
  hintText: { color: '#B87000', fontSize: 14 },
  answerArea: { gap: 12 },
  inputGroup: { gap: 12 },
  label: { fontSize: 14, color: '#444' },
  sublabel: { fontSize: 13, color: '#888' },
  mono: { fontFamily: 'monospace', color: '#6C47FF' },
  textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fafafa' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { fontSize: 15, color: '#333', flex: 1 },
  seqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  seqIndex: { fontWeight: 'bold', color: '#6C47FF', width: 24 },
  seqLabel: { flex: 1, fontSize: 15 },
  seqArrows: { flexDirection: 'row', gap: 12 },
  arrow: { fontSize: 18, color: '#6C47FF' },
  arrowDisabled: { color: '#ccc' },
  patCell: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  patGap: { backgroundColor: '#6C47FF', borderColor: '#6C47FF' },
  patValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  patGapText: { color: '#fff' },
  submitBtn: { backgroundColor: '#6C47FF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  timingBtn: { backgroundColor: '#333', borderRadius: 10, paddingVertical: 24, alignItems: 'center' },
  timingBtnArmed: { backgroundColor: '#FF4747' },
  timingHint: { fontSize: 13, color: '#888', textAlign: 'center' },
});
