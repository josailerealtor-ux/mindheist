import {
  Trap, TrapSolution, TrapStep, StepType,
  LogicStepConfig, SequenceStepConfig, CipherStepConfig,
  PatternStepConfig, TimingStepConfig,
  LogicStepSolution, SequenceStepSolution, CipherStepSolution,
  PatternStepSolution, TimingStepSolution,
} from './types';

export interface ValidationError {
  stepId: string | null;
  message: string;
}
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const VALID_STEP_TYPES: StepType[] = ['logic', 'sequence', 'cipher', 'pattern', 'timing'];
const VALID_CIPHER_TYPES = ['caesar', 'reverse', 'atbash', 'base64'];

export function validateTrap(trap: Trap, solution: TrapSolution): ValidationResult {
  const errors: ValidationError[] = [];

  if (!trap.steps || trap.steps.length === 0) {
    errors.push({ stepId: null, message: 'Trap must have at least one step.' });
    return { valid: false, errors };
  }

  const stepIds = trap.steps.map((s) => s.id);
  const duplicates = stepIds.filter((id, i) => stepIds.indexOf(id) !== i);
  if (duplicates.length > 0) {
    errors.push({ stepId: null, message: `Duplicate step IDs: ${duplicates.join(', ')}.` });
  }

  for (const step of trap.steps) {
    errors.push(...validateStep(step));
    errors.push(...validateStepSolution(step, solution));
  }

  for (const key of Object.keys(solution).filter((k) => !stepIds.includes(k))) {
    errors.push({ stepId: key, message: 'Solution entry has no matching step.' });
  }

  return { valid: errors.length === 0, errors };
}

function validateStep(step: TrapStep): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!step.id) errors.push({ stepId: null, message: 'Step is missing a valid id.' });
  if (!VALID_STEP_TYPES.includes(step.type)) {
    errors.push({ stepId: step.id, message: `Unknown step type: "${step.type}".` });
    return errors;
  }
  if (!step.prompt?.trim()) {
    errors.push({ stepId: step.id, message: 'Step must have a non-empty prompt.' });
  }
  errors.push(...validateStepConfig(step));
  return errors;
}

function validateStepConfig(step: TrapStep): ValidationError[] {
  const { id, type, config } = step;
  switch (type) {
    case 'logic': {
      const c = config as LogicStepConfig;
      if (!c.expression) return [{ stepId: id, message: 'Logic step requires an expression string.' }];
      if (!c.variables || typeof c.variables !== 'object') return [{ stepId: id, message: 'Logic step requires a variables map.' }];
      return [];
    }
    case 'sequence': {
      const c = config as SequenceStepConfig;
      if (!Array.isArray(c.items) || c.items.length < 2) return [{ stepId: id, message: 'Sequence step requires at least 2 items.' }];
      return [];
    }
    case 'cipher': {
      const c = config as CipherStepConfig;
      if (!c.encoded) return [{ stepId: id, message: 'Cipher step requires an encoded string.' }];
      if (!VALID_CIPHER_TYPES.includes(c.cipherType)) return [{ stepId: id, message: `Invalid cipherType: "${c.cipherType}".` }];
      return [];
    }
    case 'pattern': {
      const c = config as PatternStepConfig;
      if (!Array.isArray(c.sequence) || c.sequence.length < 2) return [{ stepId: id, message: 'Pattern step requires a sequence with at least 2 elements.' }];
      if (typeof c.gapIndex !== 'number' || c.gapIndex < 0 || c.gapIndex >= c.sequence.length) return [{ stepId: id, message: 'Pattern step gapIndex is out of bounds.' }];
      if (c.sequence[c.gapIndex] !== null) return [{ stepId: id, message: 'Pattern step sequence must have null at gapIndex.' }];
      return [];
    }
    case 'timing': {
      const c = config as TimingStepConfig;
      if (typeof c.targetMs !== 'number' || c.targetMs <= 0) return [{ stepId: id, message: 'Timing step requires a positive targetMs.' }];
      if (typeof c.windowMs !== 'number' || c.windowMs <= 0) return [{ stepId: id, message: 'Timing step requires a positive windowMs.' }];
      return [];
    }
  }
}

function validateStepSolution(step: TrapStep, solution: TrapSolution): ValidationError[] {
  const sol = solution[step.id];
  if (!sol) return [{ stepId: step.id, message: 'No solution defined for this step.' }];

  switch (step.type) {
    case 'logic': {
      const s = sol as LogicStepSolution;
      if (!s.values || typeof s.values !== 'object') return [{ stepId: step.id, message: 'Logic solution requires a values map.' }];
      const configVars = Object.keys((step.config as LogicStepConfig).variables ?? {}).sort();
      if (configVars.join() !== Object.keys(s.values).sort().join()) return [{ stepId: step.id, message: 'Logic solution variables must match config variables.' }];
      return [];
    }
    case 'sequence': {
      const s = sol as SequenceStepSolution;
      const items = (step.config as SequenceStepConfig).items;
      if (!Array.isArray(s.order) || s.order.length !== items.length) return [{ stepId: step.id, message: 'Sequence solution order length must match items length.' }];
      if (items.map((i) => i.id).sort().join() !== [...s.order].sort().join()) return [{ stepId: step.id, message: 'Sequence solution must contain the same item IDs as config.' }];
      return [];
    }
    case 'cipher': {
      const s = sol as CipherStepSolution;
      if (!s.plaintext?.trim()) return [{ stepId: step.id, message: 'Cipher solution requires a non-empty plaintext.' }];
      return [];
    }
    case 'pattern': {
      const s = sol as PatternStepSolution;
      if (s.answer === undefined || s.answer === null) return [{ stepId: step.id, message: 'Pattern solution requires an answer value.' }];
      return [];
    }
    case 'timing': {
      const s = sol as TimingStepSolution;
      if (typeof s.targetMs !== 'number' || typeof s.windowMs !== 'number') return [{ stepId: step.id, message: 'Timing solution requires targetMs and windowMs.' }];
      return [];
    }
  }
}
