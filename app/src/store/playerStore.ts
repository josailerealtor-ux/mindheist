import { create } from 'zustand';
import { Attempt } from '../types/attempt';
import { Trap, TrapStep } from '../types/trap';
import { StepAnswer } from '../types/engine';
import { attemptsApi } from '../api/attempts';
import { trapsApi } from '../api/traps';
import { startRecording, recordEvent, RecordingSession } from '../engine/replayRecorder';
import {
  saveActiveAttempt,
  loadActiveAttempt,
  clearActiveAttempt,
} from '../lib/attemptPersistence';
import { track } from '../lib/analytics';

export type PlayerPhase = 'idle' | 'loading' | 'playing' | 'escaped' | 'failed';

interface PlayerState {
  phase: PlayerPhase;
  trap: Trap | null;
  attempt: Attempt | null;
  recording: RecordingSession | null;
  submitting: boolean;
  lastHint: string | null;
  error: string | null;

  startAttempt: (trap: Trap) => Promise<void>;
  resumeIfPending: () => Promise<{ trapId: string; trapTitle: string } | null>;
  submitAnswer: (answer: StepAnswer) => Promise<void>;
  abandon: () => Promise<void>;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  phase: 'idle',
  trap: null,
  attempt: null,
  recording: null,
  submitting: false,
  lastHint: null,
  error: null,

  startAttempt: async (trap) => {
    set({ phase: 'loading', trap, error: null });
    try {
      const attempt = await attemptsApi.start(trap.id);
      await saveActiveAttempt({
        attemptId: attempt.id,
        trapId: trap.id,
        trapTitle: trap.title,
        startedAt: attempt.started_at,
      });
      const recording = startRecording();
      track('attempt_started', { trap_id: trap.id, difficulty: trap.difficulty });
      set({ phase: 'playing', attempt, recording, lastHint: null });
    } catch (err) {
      set({ phase: 'idle', error: (err as Error).message });
    }
  },

  resumeIfPending: async () => {
    const persisted = await loadActiveAttempt();
    if (!persisted) return null;

    try {
      const attempt = await attemptsApi.get(persisted.attemptId);
      if (attempt.status !== 'in_progress') {
        await clearActiveAttempt();
        return null;
      }
      const trap = await trapsApi.get(persisted.trapId);
      const recording = startRecording();
      set({ phase: 'playing', trap, attempt, recording, lastHint: null });
      return { trapId: persisted.trapId, trapTitle: persisted.trapTitle };
    } catch {
      await clearActiveAttempt();
      return null;
    }
  },

  submitAnswer: async (answer) => {
    const { attempt, recording } = get();
    if (!attempt || !recording) return;

    set({ submitting: true, lastHint: null });

    const stepId = get().trap?.steps[attempt.current_step]?.id ?? null;
    let updatedRecording = recordEvent(recording, { type: 'step_submit', step_id: stepId });

    try {
      const { correct, hint, attempt: updated } = await attemptsApi.submitStep(attempt.id, answer);

      updatedRecording = recordEvent(updatedRecording, {
        type: correct ? (updated.status === 'escaped' ? 'escape' : 'step_pass') : 'step_fail',
        step_id: stepId,
        payload: hint ? { hint } : undefined,
      });

      if (updated.status === 'escaped') {
        await clearActiveAttempt();
        track('attempt_escaped', { trap_id: attempt.trap_id, fail_count: updated.fail_count });
        set({ phase: 'escaped', attempt: updated, recording: updatedRecording });
      } else {
        if (correct) {
          track('step_correct', { trap_id: attempt.trap_id, step: attempt.current_step });
        } else {
          track('step_fail', { trap_id: attempt.trap_id, step: attempt.current_step });
        }
        set({ attempt: updated, recording: updatedRecording, lastHint: hint ?? null });
      }
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ submitting: false });
    }
  },

  abandon: async () => {
    const { attempt } = get();
    if (!attempt) return;
    try {
      await attemptsApi.abandon(attempt.id);
      track('attempt_abandoned', { trap_id: attempt.trap_id });
    } finally {
      await clearActiveAttempt();
      set({ phase: 'failed', lastHint: null });
    }
  },

  reset: () => {
    clearActiveAttempt();
    set({
      phase: 'idle',
      trap: null,
      attempt: null,
      recording: null,
      submitting: false,
      lastHint: null,
      error: null,
    });
  },
}));

export function getCurrentStep(trap: Trap | null, attempt: Attempt | null): TrapStep | null {
  if (!trap || !attempt) return null;
  return trap.steps[attempt.current_step] ?? null;
}
