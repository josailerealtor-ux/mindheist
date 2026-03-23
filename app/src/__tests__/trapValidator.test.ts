import { validateTrap } from '../engine/trapValidator';
import { Trap, TrapStep } from '../types/trap';
import { TrapSolution } from '../types/engine';

function makeTrap(steps: TrapStep[]): Trap {
  return {
    id: 'trap-1',
    creator_id: 'user-1',
    title: 'Test',
    description: '',
    status: 'draft',
    difficulty: 'easy',
    attempt_count: 0,
    escape_count: 0,
    like_count: 0,
    created_at: new Date().toISOString(),
    published_at: null,
    steps,
  };
}

describe('validateTrap — empty trap', () => {
  it('fails with no steps', () => {
    const result = validateTrap(makeTrap([]), {});
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/at least one step/);
  });
});

describe('validateTrap — cipher step', () => {
  const step: TrapStep = {
    id: 's1',
    type: 'cipher',
    prompt: 'Decode this',
    config: { encoded: 'uryyb', cipherType: 'caesar' },
  };
  const solution: TrapSolution = { s1: { plaintext: 'hello' } };

  it('passes for valid cipher step', () => {
    expect(validateTrap(makeTrap([step]), solution).valid).toBe(true);
  });

  it('fails when encoded is missing', () => {
    const bad = { ...step, config: { cipherType: 'caesar' } };
    const result = validateTrap(makeTrap([bad as TrapStep]), solution);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/encoded/);
  });

  it('fails when cipherType is invalid', () => {
    const bad = { ...step, config: { encoded: 'abc', cipherType: 'rot13' } };
    const result = validateTrap(makeTrap([bad as TrapStep]), solution);
    expect(result.valid).toBe(false);
  });

  it('fails when solution plaintext is empty', () => {
    const result = validateTrap(makeTrap([step]), { s1: { plaintext: '' } });
    expect(result.valid).toBe(false);
  });
});

describe('validateTrap — sequence step', () => {
  const step: TrapStep = {
    id: 's1',
    type: 'sequence',
    prompt: 'Order these',
    config: { items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] },
  };
  const solution: TrapSolution = { s1: { order: ['c', 'a', 'b'] } };

  it('passes for valid sequence step', () => {
    expect(validateTrap(makeTrap([step]), solution).valid).toBe(true);
  });

  it('fails when items < 2', () => {
    const bad = { ...step, config: { items: [{ id: 'a', label: 'A' }] } };
    const result = validateTrap(makeTrap([bad as TrapStep]), solution);
    expect(result.valid).toBe(false);
  });

  it('fails when solution order has wrong IDs', () => {
    const result = validateTrap(makeTrap([step]), { s1: { order: ['x', 'y', 'z'] } });
    expect(result.valid).toBe(false);
  });

  it('fails when solution order has wrong length', () => {
    const result = validateTrap(makeTrap([step]), { s1: { order: ['a', 'b'] } });
    expect(result.valid).toBe(false);
  });
});

describe('validateTrap — logic step', () => {
  const step: TrapStep = {
    id: 's1',
    type: 'logic',
    prompt: 'Set the variables',
    config: { expression: 'A AND B', variables: { A: 'Gate A', B: 'Gate B' } },
  };
  const solution: TrapSolution = { s1: { values: { A: true, B: true } } };

  it('passes for valid logic step', () => {
    expect(validateTrap(makeTrap([step]), solution).valid).toBe(true);
  });

  it('fails when solution variables do not match config variables', () => {
    const result = validateTrap(makeTrap([step]), { s1: { values: { A: true, C: false } } });
    expect(result.valid).toBe(false);
  });
});

describe('validateTrap — pattern step', () => {
  const step: TrapStep = {
    id: 's1',
    type: 'pattern',
    prompt: 'Fill the gap',
    config: { sequence: [2, 4, null, 16], gapIndex: 2 },
  };
  const solution: TrapSolution = { s1: { answer: 8 } };

  it('passes for valid pattern step', () => {
    expect(validateTrap(makeTrap([step]), solution).valid).toBe(true);
  });

  it('fails when sequence has no null at gapIndex', () => {
    const bad = { ...step, config: { sequence: [2, 4, 8, 16], gapIndex: 2 } };
    const result = validateTrap(makeTrap([bad as TrapStep]), solution);
    expect(result.valid).toBe(false);
  });

  it('fails when gapIndex is out of bounds', () => {
    const bad = { ...step, config: { sequence: [2, null], gapIndex: 5 } };
    const result = validateTrap(makeTrap([bad as TrapStep]), solution);
    expect(result.valid).toBe(false);
  });
});

describe('validateTrap — timing step', () => {
  const step: TrapStep = {
    id: 's1',
    type: 'timing',
    prompt: 'Wait for it',
    config: { prompt: 'Wait for it', targetMs: 3000, windowMs: 500 },
  };
  const solution: TrapSolution = { s1: { targetMs: 3000, windowMs: 500 } };

  it('passes for valid timing step', () => {
    expect(validateTrap(makeTrap([step]), solution).valid).toBe(true);
  });

  it('fails when targetMs is missing', () => {
    const bad = { ...step, config: { prompt: 'x', windowMs: 500 } };
    const result = validateTrap(makeTrap([bad as TrapStep]), solution);
    expect(result.valid).toBe(false);
  });
});

describe('validateTrap — structural checks', () => {
  const step: TrapStep = {
    id: 's1',
    type: 'cipher',
    prompt: 'Decode',
    config: { encoded: 'abc', cipherType: 'reverse' },
  };

  it('fails when no solution defined for a step', () => {
    const result = validateTrap(makeTrap([step]), {});
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/No solution/);
  });

  it('fails with duplicate step IDs', () => {
    const trap = makeTrap([step, { ...step }]);
    const result = validateTrap(trap, { s1: { plaintext: 'hello' } });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/Duplicate/);
  });

  it('fails when solution has orphan key not matching any step', () => {
    const solution: TrapSolution = {
      s1: { plaintext: 'hello' },
      ghost: { plaintext: 'nobody' },
    };
    const result = validateTrap(makeTrap([step]), solution);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.match(/no matching step/))).toBe(true);
  });

  it('fails when prompt is empty', () => {
    const bad = { ...step, prompt: '   ' };
    const result = validateTrap(makeTrap([bad]), { s1: { plaintext: 'hello' } });
    expect(result.valid).toBe(false);
  });
});
