import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TrapStep } from '../../types/trap';

const STEP_TYPE_LABELS: Record<TrapStep['type'], string> = {
  logic: 'Logic',
  sequence: 'Sequence',
  cipher: 'Cipher',
  pattern: 'Pattern',
  timing: 'Timing',
};

const STEP_TYPE_COLORS: Record<TrapStep['type'], string> = {
  logic: '#6C47FF',
  sequence: '#FF6C47',
  cipher: '#47B3FF',
  pattern: '#47FF9A',
  timing: '#FF47B3',
};

interface Props {
  step: TrapStep;
  index: number;
  onEdit: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  drag: () => void;
  isActive: boolean;
}

export function StepBlock({ step, index, onEdit, onDelete, drag, isActive }: Props) {
  const color = STEP_TYPE_COLORS[step.type];

  return (
    <View style={[styles.container, isActive && styles.active]}>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{index + 1}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.typeLabel}>{STEP_TYPE_LABELS[step.type]}</Text>
        <Text style={styles.prompt} numberOfLines={1}>
          {step.prompt || 'No prompt set'}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onEdit(step.id)} style={styles.actionBtn}>
          <Text style={styles.actionIcon}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(step.id)} style={styles.actionBtn}>
          <Text style={[styles.actionIcon, styles.deleteIcon]}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity onLongPress={drag} style={styles.actionBtn}>
          <Text style={styles.dragHandle}>⠿</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  active: {
    shadowOpacity: 0.2,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  content: { flex: 1 },
  typeLabel: { fontSize: 11, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 2 },
  prompt: { fontSize: 14, color: '#222' },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  actionIcon: { fontSize: 16, color: '#888' },
  deleteIcon: { color: '#FF4747' },
  dragHandle: { fontSize: 18, color: '#ccc' },
});
