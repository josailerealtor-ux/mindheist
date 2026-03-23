import { AttemptEvent } from '../types/attempt';

export interface StepSummary {
  stepId: string;
  attempts: number;
  passed: boolean;
  firstAttemptMs: number;
  passedAtMs: number | null;
  events: AttemptEvent[];
}

export interface ReplayStats {
  totalDurationMs: number;
  totalFails: number;
  escaped: boolean;
  stepSummaries: StepSummary[];
}

export function analyzeReplay(events: AttemptEvent[]): ReplayStats {
  const totalDurationMs = events.length > 0
    ? events[events.length - 1].timestamp_ms
    : 0;

  const escaped = events.some((e) => e.type === 'escape');
  const totalFails = events.filter((e) => e.type === 'step_fail').length;

  // Group events by step_id (preserving order of first appearance)
  const stepIds: string[] = [];
  const stepEventMap = new Map<string, AttemptEvent[]>();

  for (const event of events) {
    if (!event.step_id) continue;
    if (!stepEventMap.has(event.step_id)) {
      stepIds.push(event.step_id);
      stepEventMap.set(event.step_id, []);
    }
    stepEventMap.get(event.step_id)!.push(event);
  }

  const stepSummaries: StepSummary[] = stepIds.map((stepId) => {
    const stepEvents = stepEventMap.get(stepId)!;
    const fails = stepEvents.filter((e) => e.type === 'step_fail').length;
    const passEvent = stepEvents.find((e) => e.type === 'step_pass' || e.type === 'escape');
    const firstEvent = stepEvents[0];

    return {
      stepId,
      attempts: fails + (passEvent ? 1 : 0),
      passed: !!passEvent,
      firstAttemptMs: firstEvent?.timestamp_ms ?? 0,
      passedAtMs: passEvent?.timestamp_ms ?? null,
      events: stepEvents,
    };
  });

  return { totalDurationMs, totalFails, escaped, stepSummaries };
}

export function normalizeTimestamp(timestampMs: number, totalDurationMs: number): number {
  if (totalDurationMs === 0) return 0;
  return Math.min(timestampMs / totalDurationMs, 1);
}
