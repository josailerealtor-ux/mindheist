import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { SequenceStepConfig, SequenceStepSolution } from '../../../types/engine';

interface Props {
  config: SequenceStepConfig;
  solution: SequenceStepSolution | undefined;
  onConfigChange: (config: SequenceStepConfig) => void;
  onSolutionChange: (solution: SequenceStepSolution) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 8);
}

export function SequenceForm({ config, solution, onConfigChange, onSolutionChange }: Props) {
  const items = config.items ?? [];
  const order = solution?.order ?? items.map((i) => i.id);

  function addItem() {
    const newId = generateId();
    const newItems = [...items, { id: newId, label: '' }];
    onConfigChange({ ...config, items: newItems });
    onSolutionChange({ order: [...order, newId] });
  }

  function removeItem(id: string) {
    onConfigChange({ ...config, items: items.filter((i) => i.id !== id) });
    onSolutionChange({ order: order.filter((o) => o !== id) });
  }

  function updateLabel(id: string, label: string) {
    onConfigChange({
      ...config,
      items: items.map((i) => (i.id === id ? { ...i, label } : i)),
    });
  }

  function moveSolutionItem(idx: number, direction: -1 | 1) {
    const newOrder = [...order];
    const target = idx + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];
    onSolutionChange({ order: newOrder });
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Items</Text>
        <TouchableOpacity onPress={addItem} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <TextInput
            style={[styles.input, styles.itemInput]}
            placeholder="Item label"
            value={item.label}
            onChangeText={(label) => updateLabel(item.id, label)}
          />
          <TouchableOpacity onPress={() => removeItem(item.id)}>
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {order.length > 1 && (
        <>
          <Text style={[styles.label, { marginTop: 16 }]}>Correct Order (drag to arrange)</Text>
          {order.map((id, idx) => {
            const item = items.find((i) => i.id === id);
            return (
              <View key={id} style={styles.orderRow}>
                <Text style={styles.orderIndex}>{idx + 1}.</Text>
                <Text style={styles.orderLabel}>{item?.label || id}</Text>
                <View style={styles.orderActions}>
                  <TouchableOpacity onPress={() => moveSolutionItem(idx, -1)} disabled={idx === 0}>
                    <Text style={[styles.arrow, idx === 0 && styles.arrowDisabled]}>▲</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveSolutionItem(idx, 1)} disabled={idx === order.length - 1}>
                    <Text style={[styles.arrow, idx === order.length - 1 && styles.arrowDisabled]}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { backgroundColor: '#6C47FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 15, backgroundColor: '#fafafa',
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemInput: { flex: 1 },
  deleteIcon: { color: '#FF4747', fontSize: 16, padding: 4 },
  orderRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5',
    borderRadius: 8, padding: 10, gap: 8,
  },
  orderIndex: { fontWeight: 'bold', color: '#6C47FF', width: 24 },
  orderLabel: { flex: 1, fontSize: 14 },
  orderActions: { flexDirection: 'row', gap: 12 },
  arrow: { fontSize: 16, color: '#6C47FF' },
  arrowDisabled: { color: '#ccc' },
});
