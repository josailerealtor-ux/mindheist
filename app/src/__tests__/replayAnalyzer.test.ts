import { analyzeReplay, normalizeTimestamp } from '../engine/replayAnalyzer';
import { AttemptEvent } from '../types/attempt';

function event(type: AttemptEvent['type'], step_id: string | null, timestamp_ms: number, payload?: Record<string, unknown>): AttemptEvent {
  return { type, step_id, timestamp_ms, payload };
}

describe('analyzeReplay — empty', () => {
  it('returns zeros for empty event list', () => {
    const stats = analyzeReplay([]);
    expect(stats.totalDurationMs).toBe(0);
    expect(stats.totalFails).toBe(0);
    expect(stats.escaped).toBe(false);
    expect(stats.stepSummaries).toHaveLength(0);
  });
});

describe('analyzeReplay — escaped run', () => {
  const events: AttemptEvent[] = [
    event('step_submit', 's1', 1000),
    event('step_fail',   's1', 1050),
    event('step_submit', 's1', 3000),
    event('step_pass',   's1', 3060),
    event('step_submit', 's2', 4000),
    event('escape',      's2', 4100),
  ];

  const stats = analyzeReplay(events);

  it('detects escape', () => expect(stats.escaped).toBe(true));
  it('counts total fails', () => expect(stats.totalFails).toBe(1));
  it('sets totalDurationMs to last event timestamp', () => expect(stats.totalDurationMs).toBe(4100));
  it('produces one summary per step', () => expect(stats.stepSummaries).toHaveLength(2));

  it('step 1: 2 attempts, passed', () => {
    const s1 = stats.stepSummaries[0];
    expect(s1.stepId).toBe('s1');
    expect(s1.attempts).toBe(2);
    expect(s1.passed).toBe(true);
    expect(s1.passedAtMs).toBe(3060);
  });

  it('step 2: 1 attempt, escaped', () => {
    const s2 = stats.stepSummaries[1];
    expect(s2.stepId).toBe('s2');
    expect(s2.attempts).toBe(1);
    expect(s2.passed).toBe(true);
    expect(s2.passedAtMs).toBe(4100);
  });
});

describe('analyzeReplay — abandoned run', () => {
  const events: AttemptEvent[] = [
    event('step_submit', 's1', 500),
    event('step_fail',   's1', 550),
    event('step_submit', 's1', 2000),
    event('step_fail',   's1', 2050),
    event('abandon',     null,  5000),
  ];

  const stats = analyzeReplay(events);

  it('does not detect escape', () => expect(stats.escaped).toBe(false));
  it('counts all fails', () => expect(stats.totalFails).toBe(2));

  it('step 1: 2 attempts, not passed', () => {
    const s1 = stats.stepSummaries[0];
    expect(s1.attempts).toBe(2);
    expect(s1.passed).toBe(false);
    expect(s1.passedAtMs).toBeNull();
  });
});

describe('analyzeReplay — events without step_id are ignored in summaries', () => {
  it('abandon event does not create a step summary', () => {
    const stats = analyzeReplay([event('abandon', null, 1000)]);
    expect(stats.stepSummaries).toHaveLength(0);
  });
});

describe('analyzeReplay — step order preserved', () => {
  it('preserves the order steps were first seen', () => {
    const events: AttemptEvent[] = [
      event('step_pass', 'step-A', 100),
      event('step_fail', 'step-B', 200),
      event('step_pass', 'step-B', 300),
    ];
    const stats = analyzeReplay(events);
    expect(stats.stepSummaries[0].stepId).toBe('step-A');
    expect(stats.stepSummaries[1].stepId).toBe('step-B');
  });
});

describe('normalizeTimestamp', () => {
  it('returns 0 for zero duration', () => {
    expect(normalizeTimestamp(500, 0)).toBe(0);
  });

  it('returns 0.5 for midpoint', () => {
    expect(normalizeTimestamp(500, 1000)).toBe(0.5);
  });

  it('clamps to 1 for values beyond total duration', () => {
    expect(normalizeTimestamp(1500, 1000)).toBe(1);
  });

  it('returns 0 for timestamp 0', () => {
    expect(normalizeTimestamp(0, 1000)).toBe(0);
  });
});
