import { getCurrentStep, isComplete, processAnswer } from '../engine/stepRunner';
import { Trap } from '../types/trap';
import { Attempt } from '../types/attempt';
import { TrapSolution } from '../types/engine';

const makeTrap = (stepCount: number): Trap => ({
  id: 'trap-1',
  creator_id: 'user-1',
  title: 'Test Trap',
  description: '',
  status: 'published',
  difficulty: 'easy',
  attempt_count: 0,
  escape_count: 0,
  like_count: 0,
  created_at: new Date().toISOString(),
  published_at: new Date().toISOString(),
  steps: Array.from({ length: stepCount }, (_, i) => ({
    id: `step-${i}`,
    type: 'cipher' as const,
    prompt: `Decode step ${i}`,
    config: { encoded: 'abc', cipherType: 'reverse' as const },
  })),
});

const makeAttempt = (currentStep = 0, failCount = 0): Attempt => ({
  id: 'attempt-1',
  trap_id: 'trap-1',
  player_id: 'user-2',
  status: 'in_progress',
  started_at: new Date(Date.now() - 10000).toISOString(),
  completed_at: null,
  elapsed_ms: null,
  fail_count: failCount,
  current_step: currentStep,
  events: [],
});

const makeSolution = (stepCount: number): TrapSolution =>
  Object.fromEntries(
    Array.from({ length: stepCount }, (_, i) => [`step-${i}`, { plaintext: `answer${i}` }])
  );

describe('getCurrentStep', () => {
  it('returns the current step', () => {
    const trap = makeTrap(3);
    const attempt = makeAttempt(1);
    expect(getCurrentStep(attempt, trap)?.id).toBe('step-1');
  });

  it('returns null when past the last step', () => {
    const trap = makeTrap(2);
    const attempt = makeAttempt(2);
    expect(getCurrentStep(attempt, trap)).toBeNull();
  });
});

describe('isComplete', () => {
  it('returns false when steps remain', () => {
    expect(isComplete(makeAttempt(0), makeTrap(3))).toBe(false);
  });

  it('returns true when current_step equals step count', () => {
    expect(isComplete(makeAttempt(3), makeTrap(3))).toBe(true);
  });
});

describe('processAnswer — correct answer', () => {
  it('advances current_step on correct answer', () => {
    const trap = makeTrap(3);
    const attempt = makeAttempt(0);
    const solution = makeSolution(3);
    const result = processAnswer(attempt, trap, { plaintext: 'answer0' }, solution);
    expect(result.evaluation.correct).toBe(true);
    expect(result.attemptPatch.current_step).toBe(1);
    expect(result.event.type).toBe('step_pass');
  });

  it('sets status to escaped on last step', () => {
    const trap = makeTrap(1);
    const attempt = makeAttempt(0);
    const solution = makeSolution(1);
    const result = processAnswer(attempt, trap, { plaintext: 'answer0' }, solution);
    expect(result.attemptPatch.status).toBe('escaped');
    expect(result.attemptPatch.completed_at).toBeDefined();
    expect(result.event.type).toBe('escape');
  });
});

describe('processAnswer — wrong answer', () => {
  it('increments fail_count on wrong answer', () => {
    const trap = makeTrap(2);
    const attempt = makeAttempt(0, 2);
    const solution = makeSolution(2);
    const result = processAnswer(attempt, trap, { plaintext: 'wrong' }, solution);
    expect(result.evaluation.correct).toBe(false);
    expect(result.attemptPatch.fail_count).toBe(3);
    expect(result.event.type).toBe('step_fail');
  });

  it('does not advance current_step on wrong answer', () => {
    const trap = makeTrap(2);
    const attempt = makeAttempt(1);
    const solution = makeSolution(2);
    const result = processAnswer(attempt, trap, { plaintext: 'wrong' }, solution);
    expect(result.attemptPatch.current_step).toBeUndefined();
  });
});

describe('processAnswer — error cases', () => {
  it('throws when no active step', () => {
    const trap = makeTrap(1);
    const attempt = makeAttempt(1); // past end
    const solution = makeSolution(1);
    expect(() => processAnswer(attempt, trap, { plaintext: 'x' }, solution)).toThrow();
  });

  it('throws when solution missing for step', () => {
    const trap = makeTrap(2);
    const attempt = makeAttempt(0);
    expect(() => processAnswer(attempt, trap, { plaintext: 'x' }, {})).toThrow();
  });
});
