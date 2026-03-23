import { StepConfig } from './engine';

export type StepType = 'logic' | 'sequence' | 'cipher' | 'pattern' | 'timing';

export interface TrapStep {
  id: string;
  type: StepType;
  prompt: string;
  config: StepConfig;
}

export type TrapStatus = 'draft' | 'published' | 'archived';
export type TrapDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Trap {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  status: TrapStatus;
  steps: TrapStep[];
  difficulty: TrapDifficulty;
  attempt_count: number;
  escape_count: number;
  like_count: number;
  is_premium: boolean;
  price_cents: number;
  created_at: string;
  published_at: string | null;
}
