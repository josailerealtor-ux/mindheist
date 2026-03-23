// Shared types mirrored from app/src/types — keep in sync

export type StepType = 'logic' | 'sequence' | 'cipher' | 'pattern' | 'timing';

export interface LogicStepConfig {
  expression: string;
  variables: Record<string, string>;
}
export interface SequenceStepConfig {
  items: Array<{ id: string; label: string }>;
}
export interface CipherStepConfig {
  encoded: string;
  cipherType: 'caesar' | 'reverse' | 'atbash' | 'base64';
}
export interface PatternStepConfig {
  sequence: Array<number | string | null>;
  gapIndex: number;
}
export interface TimingStepConfig {
  prompt: string;
  windowMs: number;
  targetMs: number;
}
export type StepConfig =
  | LogicStepConfig
  | SequenceStepConfig
  | CipherStepConfig
  | PatternStepConfig
  | TimingStepConfig;

export interface TrapStep {
  id: string;
  type: StepType;
  prompt: string;
  config: StepConfig;
}

export interface LogicStepSolution { values: Record<string, boolean>; }
export interface SequenceStepSolution { order: string[]; }
export interface CipherStepSolution { plaintext: string; }
export interface PatternStepSolution { answer: number | string; }
export interface TimingStepSolution { targetMs: number; windowMs: number; }
export type StepSolution =
  | LogicStepSolution
  | SequenceStepSolution
  | CipherStepSolution
  | PatternStepSolution
  | TimingStepSolution;

export type TrapSolution = Record<string, StepSolution>;

// Answer types
export interface LogicAnswer { values: Record<string, boolean>; }
export interface SequenceAnswer { order: string[]; }
export interface CipherAnswer { plaintext: string; }
export interface PatternAnswer { answer: number | string; }
export interface TimingAnswer { elapsedMs: number; }
export type StepAnswer = LogicAnswer | SequenceAnswer | CipherAnswer | PatternAnswer | TimingAnswer;

export interface EvaluationResult {
  correct: boolean;
  hint?: string;
}

export interface Trap {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  steps: TrapStep[];
  solution: TrapSolution;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  attempt_count: number;
  escape_count: number;
  like_count: number;
  created_at: string;
  published_at: string | null;
}
