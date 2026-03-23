import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { PatternStepConfig, PatternStepSolution } from '../../../types/engine';

interface Props {
  config: PatternStepConfig;
  solution: PatternStepSolution | undefined;
  onConfigChange: (config: PatternStepConfig) => void;
  onSolutionChange: (solution: PatternStepSolution) => void;
}

export function PatternForm({ config, solution, onConfigChange, onSolutionChange }: Props) {
  const sequence = config.sequence ?? [];
  const gapIndex = config.gapIndex ?? 0;

  function updateCell(index: number, value: string) {
    const newSeq = [...sequence];
    newSeq[index] = value === '' ? null : isNaN(Number(value)) ? value : Number(value);
    onConfigChange({ ...config, sequence: newSeq });
  }

  function setGap(index: number) {
    const newSeq = sequence.map((v, i) =>
      i === gapIndex ? (v === null ? null : v) : v
    );
    // restore old gap cell if it was null
    if (newSeq[gapIndex] === null) newSeq[gapIndex] = undefined as unknown as null;
    newSeq[index] = null;
    onConfigChange({ ...config, sequence: newSeq, gapIndex: index });
  }

  function addCell() {
    onConfigChange({ ...config, sequence: [...sequence, 0] });
  }

  function removeLastCell() {
    if (sequence.length <= 2) return;
    const newSeq = sequence.slice(0, -1);
    const newGap = gapIndex >= newSeq.length ? newSeq.length - 1 : gapIndex;
    onConfigChange({ ...config, sequence: newSeq, gapIndex: newGap });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Sequence (tap a cell to set the gap)</Text>
      <View style={styles.sequenceRow}>
        {sequence.map((val, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.cell, idx === gapIndex && styles.gapCell]}
            onPress={() => setGap(idx)}
          >
            {idx === gapIndex ? (
              <Text style={styles.gapText}>?</Text>
            ) : (
              <TextInput
                style={styles.cellInput}
                value={val === null ? '' : String(val)}
                onChangeText={(v) => updateCell(idx, v)}
                keyboardType="numeric"
                textAlign="center"
              />
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addCell} onPress={addCell}>
          <Text style={styles.addCellText}>+</Text>
        </TouchableOpacity>
        {sequence.length > 2 && (
          <TouchableOpacity style={styles.addCell} onPress={removeLastCell}>
            <Text style={styles.addCellText}>−</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Answer (fills the gap)</Text>
      <TextInput
        style={styles.input}
        placeholder="The correct value"
        value={solution?.answer !== undefined ? String(solution.answer) : ''}
        onChangeText={(v) => {
          const parsed = isNaN(Number(v)) ? v : Number(v);
          onSolutionChange({ answer: parsed });
        }}
        keyboardType="numeric"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 8 },
  sequenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  cell: {
    width: 48, height: 48, borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  gapCell: { backgroundColor: '#6C47FF', borderColor: '#6C47FF' },
  gapText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cellInput: { width: '100%', textAlign: 'center', fontSize: 15 },
  addCell: {
    width: 36, height: 48, borderWidth: 1, borderColor: '#6C47FF',
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
  addCellText: { color: '#6C47FF', fontSize: 20, fontWeight: 'bold' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 15, backgroundColor: '#fafafa',
  },
});
