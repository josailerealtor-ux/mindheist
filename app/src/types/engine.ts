// ──────────────────────────────────────────────
// Step configs — define the puzzle presented to the player
// ──────────────────────────────────────────────

export interface LogicStepConfig {
  /** Human-readable logic expression, e.g. "A AND (B OR NOT C)" */
  expression: string;
  /** Variable labels shown to the player */
  variables: Record<string, string>;
}

export interface SequenceStepConfig {
  /** Items the player must order correctly */
  items: Array<{ id: string; label: string }>;
}

export interface CipherStepConfig {
  /** The encoded message the player must decode */
  encoded: string;
  /** Cipher type for UI hints */
  cipherType: 'caesar' | 'reverse' | 'atbash' | 'base64';
}

export interface PatternStepConfig {
  /** Sequence with a gap the player must fill, e.g. [2, 4, 8, null, 32] */
  sequence: Array<number | string | null>;
  /** Position of the gap in the sequence */
  gapIndex: number;
}

export interface TimingStepConfig {
  /** Instructions shown to the player */
  prompt: string;
  /** Acceptable time window in milliseconds */
  windowMs: number;
  /** Target elapsed time in milliseconds from step start */
  targetMs: number;
}

// ──────────────────────────────────────────────
// Step solutions — stored server-side, never sent to client
// ──────────────────────────────────────────────

export interface LogicStepSolution {
  /** Map of variable id → boolean value that satisfies the expression */
  values: Record<string, boolean>;
}

export interface SequenceStepSolution {
  /** Ordered array of item IDs representing the correct sequence */
  order: string[];
}

export interface CipherStepSolution {
  /** The decoded plaintext answer (lowercased, trimmed) */
  plaintext: string;
}

export interface PatternStepSolution {
  /** The value that fills the gap */
  answer: number | string;
}

export interface TimingStepSolution {
  /** Same as config.targetMs — duplicated here for evaluator access */
  targetMs: number;
  windowMs: number;
}

// ──────────────────────────────────────────────
// Union types
// ──────────────────────────────────────────────

export type StepConfig =
  | LogicStepConfig
  | SequenceStepConfig
  | CipherStepConfig
  | PatternStepConfig
  | TimingStepConfig;

export type StepSolution =
  | LogicStepSolution
  | SequenceStepSolution
  | CipherStepSolution
  | PatternStepSolution
  | TimingStepSolution;

/** Map of stepId → solution, stored in trap.solution jsonb */
export type TrapSolution = Record<string, StepSolution>;

// ──────────────────────────────────────────────
// Player answers — submitted per step
// ──────────────────────────────────────────────

export interface LogicAnswer {
  values: Record<string, boolean>;
}

export interface SequenceAnswer {
  order: string[];
}

export interface CipherAnswer {
  plaintext: string;
}

export interface PatternAnswer {
  answer: number | string;
}

export interface TimingAnswer {
  /** Elapsed ms from when the step was presented to when the player submitted */
  elapsedMs: number;
}

export type StepAnswer =
  | LogicAnswer
  | SequenceAnswer
  | CipherAnswer
  | PatternAnswer
  | TimingAnswer;

// ──────────────────────────────────────────────
// Evaluator result
// ──────────────────────────────────────────────

export interface EvaluationResult {
  correct: boolean;
  /** Optional hint for the player on failure */
  hint?: string;
}
