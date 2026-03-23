import { Trap, TrapStep } from '../types/trap';
import { Attempt, AttemptEvent } from '../types/attempt';
import { StepAnswer, TrapSolution, EvaluationResult } from '../types/engine';
import { evaluate } from './evaluator';

export interface StepRunnerResult {
  evaluation: EvaluationResult;
  /** Updated attempt fields to persist */
  attemptPatch: Partial<Attempt>;
  /** New event to append to attempt.events */
  event: AttemptEvent;
}

export function getCurrentStep(attempt: Attempt, trap: Trap): TrapStep | null {
  return trap.steps[attempt.current_step] ?? null;
}

export function isComplete(attempt: Attempt, trap: Trap): boolean {
  return attempt.current_step >= trap.steps.length;
}

export function processAnswer(
  attempt: Attempt,
  trap: Trap,
  answer: StepAnswer,
  solution: TrapSolution
): StepRunnerResult {
  const step = getCurrentStep(attempt, trap);

  if (!step) {
    throw new Error('No active step — attempt may already be complete.');
  }

  const stepSolution = solution[step.id];
  if (!stepSolution) {
    throw new Error(`No solution found for step ${step.id}.`);
  }

  const evaluation = evaluate(step.type, answer, stepSolution);
  const nowMs = Date.now();
  const elapsedMs = nowMs - new Date(attempt.started_at).getTime();

  if (evaluation.correct) {
    const nextStep = attempt.current_step + 1;
    const escaped = nextStep >= trap.steps.length;

    const event: AttemptEvent = {
      type: escaped ? 'escape' : 'step_pass',
      step_id: step.id,
      timestamp_ms: elapsedMs,
    };

    const attemptPatch: Partial<Attempt> = {
      current_step: nextStep,
      ...(escaped && {
        status: 'escaped',
        completed_at: new Date().toISOString(),
        elapsed_ms: elapsedMs,
      }),
    };

    return { evaluation, attemptPatch, event };
  } else {
    const event: AttemptEvent = {
      type: 'step_fail',
      step_id: step.id,
      timestamp_ms: elapsedMs,
      payload: { hint: evaluation.hint },
    };

    const attemptPatch: Partial<Attempt> = {
      fail_count: attempt.fail_count + 1,
    };

    return { evaluation, attemptPatch, event };
  }
}
