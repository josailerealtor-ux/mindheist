import { View, Text, TextInput, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { LogicStepConfig, LogicStepSolution } from '../../../types/engine';

interface Props {
  config: LogicStepConfig;
  solution: LogicStepSolution | undefined;
  onConfigChange: (config: LogicStepConfig) => void;
  onSolutionChange: (solution: LogicStepSolution) => void;
}

export function LogicForm({ config, solution, onConfigChange, onSolutionChange }: Props) {
  const variables = Object.entries(config.variables ?? {});

  function addVariable() {
    const key = `VAR_${variables.length + 1}`;
    onConfigChange({
      ...config,
      variables: { ...config.variables, [key]: `Variable ${variables.length + 1}` },
    });
  }

  function removeVariable(key: string) {
    const { [key]: _removed, ...rest } = config.variables;
    const { [key]: _removedSol, ...restSol } = solution?.values ?? {};
    onConfigChange({ ...config, variables: rest });
    onSolutionChange({ values: restSol });
  }

  function setVariableLabel(key: string, label: string) {
    onConfigChange({ ...config, variables: { ...config.variables, [key]: label } });
  }

  function setVariableValue(key: string, value: boolean) {
    onSolutionChange({ values: { ...(solution?.values ?? {}), [key]: value } });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Expression</Text>
      <TextInput
        style={styles.input}
        placeholder='e.g. "A AND (B OR NOT C)"'
        value={config.expression}
        onChangeText={(expression) => onConfigChange({ ...config, expression })}
        autoCapitalize="none"
      />

      <View style={styles.headerRow}>
        <Text style={styles.label}>Variables</Text>
        <TouchableOpacity onPress={addVariable} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {variables.map(([key, label]) => (
        <View key={key} style={styles.variableRow}>
          <Text style={styles.varKey}>{key}</Text>
          <TextInput
            style={[styles.input, styles.varInput]}
            value={label}
            onChangeText={(l) => setVariableLabel(key, l)}
            placeholder="Label"
          />
          <Switch
            value={solution?.values?.[key] ?? false}
            onValueChange={(v) => setVariableValue(key, v)}
            thumbColor="#6C47FF"
          />
          <TouchableOpacity onPress={() => removeVariable(key)}>
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { backgroundColor: '#6C47FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  variableRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  varKey: { fontWeight: 'bold', color: '#6C47FF', width: 60, fontSize: 13 },
  varInput: { flex: 1 },
  deleteIcon: { color: '#FF4747', fontSize: 16, padding: 4 },
});
