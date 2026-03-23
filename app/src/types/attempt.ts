export type AttemptStatus = 'in_progress' | 'escaped' | 'failed';

export interface AttemptEvent {
  type: 'step_start' | 'step_submit' | 'step_fail' | 'step_pass' | 'escape' | 'abandon';
  step_id: string | null;
  timestamp_ms: number;
  payload?: Record<string, unknown>;
}

export interface Attempt {
  id: string;
  trap_id: string;
  player_id: string;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  elapsed_ms: number | null;
  fail_count: number;
  current_step: number;
  events: AttemptEvent[];
}
