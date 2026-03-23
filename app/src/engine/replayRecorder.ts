import { AttemptEvent } from '../types/attempt';

export interface RecordingSession {
  startedAt: number;
  events: AttemptEvent[];
}

export function startRecording(): RecordingSession {
  return { startedAt: Date.now(), events: [] };
}

export function recordEvent(
  session: RecordingSession,
  event: Omit<AttemptEvent, 'timestamp_ms'>
): RecordingSession {
  const timestamp_ms = Date.now() - session.startedAt;
  return {
    ...session,
    events: [...session.events, { ...event, timestamp_ms }],
  };
}

export function finalizeRecording(session: RecordingSession): AttemptEvent[] {
  return session.events;
}

export function getElapsedMs(session: RecordingSession): number {
  return Date.now() - session.startedAt;
}
