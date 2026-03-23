import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { CipherStepConfig, CipherStepSolution } from '../../../types/engine';

interface Props {
  config: CipherStepConfig;
  solution: CipherStepSolution | undefined;
  onConfigChange: (config: CipherStepConfig) => void;
  onSolutionChange: (solution: CipherStepSolution) => void;
}

const CIPHER_TYPES: CipherStepConfig['cipherType'][] = ['caesar', 'reverse', 'atbash', 'base64'];

export function CipherForm({ config, solution, onConfigChange, onSolutionChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Cipher Type</Text>
      <View style={styles.row}>
        {CIPHER_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, config.cipherType === type && styles.chipActive]}
            onPress={() => onConfigChange({ ...config, cipherType: type })}
          >
            <Text style={[styles.chipText, config.cipherType === type && styles.chipTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Encoded Message</Text>
      <TextInput
        style={styles.input}
        placeholder="The encoded text the player must decode"
        value={config.encoded}
        onChangeText={(encoded) => onConfigChange({ ...config, encoded })}
        multiline
      />

      <Text style={styles.label}>Solution (plaintext)</Text>
      <TextInput
        style={styles.input}
        placeholder="The correct decoded answer"
        value={solution?.plaintext ?? ''}
        onChangeText={(plaintext) => onSolutionChange({ plaintext })}
        autoCapitalize="none"
      />
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipActive: { backgroundColor: '#6C47FF', borderColor: '#6C47FF' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});
