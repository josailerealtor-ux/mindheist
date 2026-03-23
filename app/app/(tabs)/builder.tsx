import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Modal, Alert, ActivityIndicator,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useBuilderStore } from '../../src/store/builderStore';
import { DragCanvas } from '../../src/components/builder/DragCanvas';
import { StepEditor } from '../../src/components/builder/StepEditor';
import { TrapStep } from '../../src/types/trap';

const STEP_TYPES: TrapStep['type'][] = ['logic', 'sequence', 'cipher', 'pattern', 'timing'];

const DIFFICULTY_LABELS = ['easy', 'medium', 'hard', 'expert'] as const;

export default function BuilderScreen() {
  const {
    draft, saving, publishing, publishErrors,
    initDraft, setTitle, setDescription, setDifficulty,
    addStep, removeStep, reorderSteps,
    updateStepConfig, updateStepPrompt, updateStepSolution,
    publish,
  } = useBuilderStore();

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);

  useEffect(() => { initDraft(); }, []);

  const editingStep = draft.steps.find((s) => s.id === editingStepId) ?? null;
  const editingSolution = editingStepId ? draft.solution[editingStepId] : undefined;

  async function handlePublish() {
    const success = await publish();
    if (success) {
      Alert.alert('Published!', 'Your trap is now live.');
      initDraft();
    }
  }

  function handleAddStep(type: TrapStep['type']) {
    const id = addStep(type);
    setShowAddStep(false);
    setEditingStepId(id);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Build a Trap</Text>
          <View style={styles.headerRight}>
            {saving && <ActivityIndicator size="small" color="#6C47FF" style={{ marginRight: 8 }} />}
            <TouchableOpacity
              style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
              onPress={handlePublish}
              disabled={publishing}
            >
              <Text style={styles.publishBtnText}>{publishing ? 'Publishing...' : 'Publish'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Validation errors */}
        {publishErrors.length > 0 && (
          <View style={styles.errorBanner}>
            {publishErrors.map((e, i) => (
              <Text key={i} style={styles.errorText}>• {e.message}</Text>
            ))}
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metaSection}>
          <TextInput
            style={styles.titleInput}
            placeholder="Trap title..."
            value={draft.title}
            onChangeText={setTitle}
            maxLength={80}
          />
          <TextInput
            style={styles.descInput}
            placeholder="Description (optional)"
            value={draft.description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.difficultyRow}>
            {DIFFICULTY_LABELS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.diffChip, draft.difficulty === d && styles.diffChipActive]}
                onPress={() => setDifficulty(d)}
              >
                <Text style={[styles.diffChipText, draft.difficulty === d && styles.diffChipTextActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Steps */}
        <View style={styles.stepsHeader}>
          <Text style={styles.stepsTitle}>Steps ({draft.steps.length})</Text>
          <TouchableOpacity onPress={() => setShowAddStep(true)} style={styles.addStepBtn}>
            <Text style={styles.addStepBtnText}>+ Add Step</Text>
          </TouchableOpacity>
        </View>

        {draft.steps.length === 0 ? (
          <View style={styles.emptySteps}>
            <Text style={styles.emptyText}>No steps yet — tap "+ Add Step" to begin.</Text>
          </View>
        ) : (
          <DragCanvas
            steps={draft.steps}
            onReorder={reorderSteps}
            onEdit={setEditingStepId}
            onDelete={(id) => {
              Alert.alert('Remove step?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeStep(id) },
              ]);
            }}
          />
        )}

        {/* Step editor modal */}
        <StepEditor
          step={editingStep}
          solution={editingSolution}
          onClose={() => setEditingStepId(null)}
          onPromptChange={updateStepPrompt}
          onConfigChange={updateStepConfig}
          onSolutionChange={updateStepSolution}
        />

        {/* Add step type picker */}
        <Modal visible={showAddStep} transparent animationType="fade" onRequestClose={() => setShowAddStep(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAddStep(false)}>
            <View style={styles.stepPicker}>
              <Text style={styles.stepPickerTitle}>Choose Step Type</Text>
              {STEP_TYPES.map((type) => (
                <TouchableOpacity key={type} style={styles.stepTypeRow} onPress={() => handleAddStep(type)}>
                  <Text style={styles.stepTypeName}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  publishBtn: {
    backgroundColor: '#6C47FF', borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  publishBtnDisabled: { opacity: 0.5 },
  publishBtnText: { color: '#fff', fontWeight: '600' },
  errorBanner: {
    backgroundColor: '#FFF0F0', borderLeftWidth: 4, borderLeftColor: '#FF4747',
    padding: 12, margin: 12, borderRadius: 8,
  },
  errorText: { color: '#CC0000', fontSize: 13, marginBottom: 2 },
  metaSection: { backgroundColor: '#fff', padding: 16, gap: 10 },
  titleInput: {
    fontSize: 18, fontWeight: '600', borderBottomWidth: 1,
    borderBottomColor: '#eee', paddingBottom: 8,
  },
  descInput: { fontSize: 14, color: '#555', minHeight: 40 },
  difficultyRow: { flexDirection: 'row', gap: 8 },
  diffChip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  diffChipActive: { backgroundColor: '#6C47FF', borderColor: '#6C47FF' },
  diffChipText: { fontSize: 12, color: '#555', textTransform: 'capitalize' },
  diffChipTextActive: { color: '#fff', fontWeight: '600' },
  stepsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  stepsTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  addStepBtn: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#6C47FF',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  addStepBtnText: { color: '#6C47FF', fontWeight: '600', fontSize: 13 },
  emptySteps: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#aaa', textAlign: 'center', fontSize: 15 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  stepPicker: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 4,
  },
  stepPickerTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  stepTypeRow: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  stepTypeName: { fontSize: 16, color: '#333', textTransform: 'capitalize' },
});
