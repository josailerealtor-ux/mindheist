import { View, Text, TextInput, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { TrapStep } from '../../types/trap';
import { StepSolution, StepConfig } from '../../types/engine';
import { CipherForm } from './forms/CipherForm';
import { LogicForm } from './forms/LogicForm';
import { SequenceForm } from './forms/SequenceForm';
import { PatternForm } from './forms/PatternForm';
import { TimingForm } from './forms/TimingForm';

interface Props {
  step: TrapStep | null;
  solution: StepSolution | undefined;
  onClose: () => void;
  onPromptChange: (stepId: string, prompt: string) => void;
  onConfigChange: (stepId: string, config: StepConfig) => void;
  onSolutionChange: (stepId: string, solution: StepSolution) => void;
}

export function StepEditor({ step, solution, onClose, onPromptChange, onConfigChange, onSolutionChange }: Props) {
  if (!step) return null;

  function renderForm() {
    if (!step) return null;
    const props = {
      config: step.config as never,
      solution: solution as never,
      onConfigChange: (c: StepConfig) => onConfigChange(step.id, c),
      onSolutionChange: (s: StepSolution) => onSolutionChange(step.id, s),
    };
    switch (step.type) {
      case 'cipher': return <CipherForm {...props} />;
      case 'logic': return <LogicForm {...props} />;
      case 'sequence': return <SequenceForm {...props} />;
      case 'pattern': return <PatternForm {...props} />;
      case 'timing': return <TimingForm {...props} />;
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>{step.type.charAt(0).toUpperCase() + step.type.slice(1)} Step</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Prompt</Text>
        <TextInput
          style={styles.promptInput}
          placeholder="What the player sees..."
          value={step.prompt}
          onChangeText={(p) => onPromptChange(step.id, p)}
          multiline
        />
        {renderForm()}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  closeBtn: { backgroundColor: '#6C47FF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  closeText: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  promptInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 15, backgroundColor: '#fafafa',
    minHeight: 80, marginBottom: 16, textAlignVertical: 'top',
  },
});
