// Test the pure store logic by extracting reducers — no API/Supabase calls

import { TrapStep } from '../types/trap';
import { TrapSolution, CipherStepSolution } from '../types/engine';

// ── helper: simulate the pure state transformations ──────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

interface DraftState {
  steps: TrapStep[];
  solution: TrapSolution;
  title: string;
  description: string;
  difficulty: string;
}

function addStep(state: DraftState, type: TrapStep['type']): { state: DraftState; id: string } {
  const id = generateId();
  const configMap: Record<TrapStep['type'], TrapStep['config']> = {
    logic: { expression: '', variables: {} },
    sequence: { items: [] },
    cipher: { encoded: '', cipherType: 'caesar' },
    pattern: { sequence: [null], gapIndex: 0 },
    timing: { prompt: '', targetMs: 3000, windowMs: 500 },
  };
  const newStep: TrapStep = { id, type, prompt: '', config: configMap[type] };
  return { state: { ...state, steps: [...state.steps, newStep] }, id };
}

function removeStep(state: DraftState, stepId: string): DraftState {
  const { [stepId]: _removed, ...remainingSolution } = state.solution;
  return {
    ...state,
    steps: state.steps.filter((s) => s.id !== stepId),
    solution: remainingSolution,
  };
}

function reorderSteps(state: DraftState, steps: TrapStep[]): DraftState {
  return { ...state, steps };
}

function updateStepSolution(state: DraftState, stepId: string, sol: CipherStepSolution): DraftState {
  return { ...state, solution: { ...state.solution, [stepId]: sol } };
}

function updateStepPrompt(state: DraftState, stepId: string, prompt: string): DraftState {
  return {
    ...state,
    steps: state.steps.map((s) => (s.id === stepId ? { ...s, prompt } : s)),
  };
}

const emptyDraft = (): DraftState => ({
  steps: [],
  solution: {},
  title: '',
  description: '',
  difficulty: 'medium',
});

// ── tests ──────────────────────────────────────────────────────────────────

describe('addStep', () => {
  it('appends a step of the given type', () => {
    const { state } = addStep(emptyDraft(), 'cipher');
    expect(state.steps).toHaveLength(1);
    expect(state.steps[0].type).toBe('cipher');
  });

  it('generates unique IDs across multiple adds', () => {
    let state = emptyDraft();
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const result = addStep(state, 'logic');
      ids.push(result.id);
      state = result.state;
    }
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });

  it('initialises cipher step with correct default config', () => {
    const { state } = addStep(emptyDraft(), 'cipher');
    expect(state.steps[0].config).toEqual({ encoded: '', cipherType: 'caesar' });
  });

  it('initialises pattern step with null in sequence at gapIndex', () => {
    const { state } = addStep(emptyDraft(), 'pattern');
    const config = state.steps[0].config as { sequence: unknown[]; gapIndex: number };
    expect(config.sequence[config.gapIndex]).toBeNull();
  });
});

describe('removeStep', () => {
  it('removes the step from the steps array', () => {
    const { state: s1, id } = addStep(emptyDraft(), 'cipher');
    const s2 = removeStep(s1, id);
    expect(s2.steps).toHaveLength(0);
  });

  it('removes the corresponding solution entry', () => {
    const { state: s1, id } = addStep(emptyDraft(), 'cipher');
    const s2 = updateStepSolution(s1, id, { plaintext: 'hello' });
    const s3 = removeStep(s2, id);
    expect(s3.solution[id]).toBeUndefined();
  });

  it('leaves other steps intact', () => {
    let state = emptyDraft();
    const { state: s1, id: id1 } = addStep(state, 'cipher');
    const { state: s2, id: id2 } = addStep(s1, 'pattern');
    state = removeStep(s2, id1);
    expect(state.steps).toHaveLength(1);
    expect(state.steps[0].id).toBe(id2);
  });
});

describe('reorderSteps', () => {
  it('replaces steps in new order', () => {
    let state = emptyDraft();
    const { state: s1, id: id1 } = addStep(state, 'cipher');
    const { state: s2, id: id2 } = addStep(s1, 'logic');
    const reversed = [s2.steps[1], s2.steps[0]];
    state = reorderSteps(s2, reversed);
    expect(state.steps[0].id).toBe(id2);
    expect(state.steps[1].id).toBe(id1);
  });
});

describe('updateStepSolution', () => {
  it('sets solution for the given step', () => {
    const { state: s1, id } = addStep(emptyDraft(), 'cipher');
    const s2 = updateStepSolution(s1, id, { plaintext: 'secret' });
    expect((s2.solution[id] as CipherStepSolution).plaintext).toBe('secret');
  });

  it('does not overwrite other solutions', () => {
    let state = emptyDraft();
    const { state: s1, id: id1 } = addStep(state, 'cipher');
    const { state: s2, id: id2 } = addStep(s1, 'cipher');
    state = updateStepSolution(s2, id1, { plaintext: 'first' });
    state = updateStepSolution(state, id2, { plaintext: 'second' });
    expect((state.solution[id1] as CipherStepSolution).plaintext).toBe('first');
    expect((state.solution[id2] as CipherStepSolution).plaintext).toBe('second');
  });
});

describe('updateStepPrompt', () => {
  it('updates only the matching step prompt', () => {
    let state = emptyDraft();
    const { state: s1, id: id1 } = addStep(state, 'cipher');
    const { state: s2, id: id2 } = addStep(s1, 'logic');
    state = updateStepPrompt(s2, id1, 'Decode this message');
    expect(state.steps.find((s) => s.id === id1)?.prompt).toBe('Decode this message');
    expect(state.steps.find((s) => s.id === id2)?.prompt).toBe('');
  });
});
