// Shared step runner logic — mirrored from app/src/engine/stepRunner.ts
import { TrapSolution, EvaluationResult, StepAnswer } from './types';
import { evaluator } from './evaluator';

export interface TrapStepMinimal {
  id: string;
  type: string;
  prompt: string;
  config: unknown;
}

export interface AttemptMinimal {
  id: string;
  trap_id: string;
  player_id: string;
  status: string;
  started_at: string;
  fail_count: number;
  current_step: number;
  events: AttemptEventMinimal[];
}

export interface AttemptEventMinimal {
  type: string;
  step_id: string | null;
  timestamp_ms: number;
  payload?: Record<string, unknown>;
}

export interface StepRunnerResult {
  evaluation: EvaluationResult;
  attemptPatch: Partial<AttemptMinimal & { completed_at: string; elapsed_ms: number }>;
  event: AttemptEventMinimal;
}

export function processAnswer(
  attempt: AttemptMinimal,
  steps: TrapStepMinimal[],
  answer: StepAnswer,
  solution: TrapSolution
): StepRunnerResult {
  const step = steps[attempt.current_step];

  if (!step) throw new Error('No active step — attempt may already be complete.');

  const stepSolution = solution[step.id];
  if (!stepSolution) throw new Error(`No solution found for step ${step.id}.`);

  const evaluation = evaluator.evaluate(step.type as never, answer, stepSolution);
  const elapsedMs = Date.now() - new Date(attempt.started_at).getTime();

  if (evaluation.correct) {
    const nextStep = attempt.current_step + 1;
    const escaped = nextStep >= steps.length;
    const event: AttemptEventMinimal = {
      type: escaped ? 'escape' : 'step_pass',
      step_id: step.id,
      timestamp_ms: elapsedMs,
    };
    const attemptPatch: StepRunnerResult['attemptPatch'] = {
      current_step: nextStep,
      ...(escaped && {
        status: 'escaped',
        completed_at: new Date().toISOString(),
        elapsed_ms: elapsedMs,
      }),
    };
    return { evaluation, attemptPatch, event };
  } else {
    return {
      evaluation,
      attemptPatch: { fail_count: attempt.fail_count + 1 },
      event: {
        type: 'step_fail',
        step_id: step.id,
        timestamp_ms: elapsedMs,
        payload: { hint: evaluation.hint },
      },
    };
  }
}
