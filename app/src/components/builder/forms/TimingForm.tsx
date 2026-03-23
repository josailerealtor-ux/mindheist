import { View, Text, TextInput, StyleSheet } from 'react-native';
import { TimingStepConfig, TimingStepSolution } from '../../../types/engine';

interface Props {
  config: TimingStepConfig;
  solution: TimingStepSolution | undefined;
  onConfigChange: (config: TimingStepConfig) => void;
  onSolutionChange: (solution: TimingStepSolution) => void;
}

export function TimingForm({ config, solution, onConfigChange, onSolutionChange }: Props) {
  const targetMs = solution?.targetMs ?? config.targetMs ?? 3000;
  const windowMs = solution?.windowMs ?? config.windowMs ?? 500;

  function updateTiming(field: 'targetMs' | 'windowMs', value: string) {
    const ms = Math.max(0, parseInt(value, 10) || 0);
    const updated = { targetMs, windowMs, [field]: ms };
    onConfigChange({ ...config, [field]: ms });
    onSolutionChange(updated);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Player Instruction</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Press the button after exactly 3 seconds"
        value={config.prompt}
        onChangeText={(prompt) => onConfigChange({ ...config, prompt })}
        multiline
      />

      <Text style={styles.label}>Target Time (ms)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={String(targetMs)}
        onChangeText={(v) => updateTiming('targetMs', v)}
        placeholder="3000"
      />

      <Text style={styles.label}>Acceptable Window ± (ms)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={String(windowMs)}
        onChangeText={(v) => updateTiming('windowMs', v)}
        placeholder="500"
      />

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          Player must submit between {Math.max(0, targetMs - windowMs)}ms and{' '}
          {targetMs + windowMs}ms
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 15, backgroundColor: '#fafafa',
  },
  hint: {
    backgroundColor: '#f0edff', borderRadius: 8,
    padding: 10, marginTop: 8,
  },
  hintText: { color: '#6C47FF', fontSize: 13 },
});
