import { startRecording, recordEvent, finalizeRecording, getElapsedMs } from '../engine/replayRecorder';

describe('startRecording', () => {
  it('creates a session with empty events', () => {
    const session = startRecording();
    expect(session.events).toHaveLength(0);
    expect(typeof session.startedAt).toBe('number');
  });

  it('records startedAt close to now', () => {
    const before = Date.now();
    const session = startRecording();
    expect(session.startedAt).toBeGreaterThanOrEqual(before);
    expect(session.startedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('recordEvent', () => {
  it('appends an event to the session', () => {
    let session = startRecording();
    session = recordEvent(session, { type: 'step_start', step_id: 'step-1' });
    expect(session.events).toHaveLength(1);
    expect(session.events[0].type).toBe('step_start');
    expect(session.events[0].step_id).toBe('step-1');
  });

  it('timestamps events relative to session start', () => {
    let session = startRecording();
    session = recordEvent(session, { type: 'step_fail', step_id: 'step-1' });
    expect(session.events[0].timestamp_ms).toBeGreaterThanOrEqual(0);
  });

  it('does not mutate the original session (immutable update)', () => {
    const original = startRecording();
    const updated = recordEvent(original, { type: 'escape', step_id: null });
    expect(original.events).toHaveLength(0);
    expect(updated.events).toHaveLength(1);
  });

  it('accumulates multiple events in order', () => {
    let session = startRecording();
    session = recordEvent(session, { type: 'step_start', step_id: 's1' });
    session = recordEvent(session, { type: 'step_fail', step_id: 's1' });
    session = recordEvent(session, { type: 'step_pass', step_id: 's1' });
    session = recordEvent(session, { type: 'escape', step_id: null });
    expect(session.events.map((e) => e.type)).toEqual([
      'step_start', 'step_fail', 'step_pass', 'escape',
    ]);
  });

  it('timestamps are non-decreasing', () => {
    let session = startRecording();
    for (let i = 0; i < 5; i++) {
      session = recordEvent(session, { type: 'step_fail', step_id: 's1' });
    }
    for (let i = 1; i < session.events.length; i++) {
      expect(session.events[i].timestamp_ms).toBeGreaterThanOrEqual(
        session.events[i - 1].timestamp_ms
      );
    }
  });

  it('includes payload when provided', () => {
    let session = startRecording();
    session = recordEvent(session, { type: 'step_fail', step_id: 's1', payload: { hint: 'Try again' } });
    expect(session.events[0].payload).toEqual({ hint: 'Try again' });
  });
});

describe('finalizeRecording', () => {
  it('returns the events array', () => {
    let session = startRecording();
    session = recordEvent(session, { type: 'escape', step_id: null });
    const events = finalizeRecording(session);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('escape');
  });
});

describe('getElapsedMs', () => {
  it('returns a non-negative elapsed time', () => {
    const session = startRecording();
    const elapsed = getElapsedMs(session);
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });
});
