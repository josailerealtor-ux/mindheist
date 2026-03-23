import { supabase } from './supabase';

type EventName =
  | 'trap_published'
  | 'attempt_started'
  | 'attempt_escaped'
  | 'attempt_failed'
  | 'attempt_abandoned'
  | 'step_correct'
  | 'step_fail'
  | 'like_toggled'
  | 'comment_posted'
  | 'challenge_sent'
  | 'challenge_responded'
  | 'replay_viewed'
  | 'replay_shared';

type EventProperties = Record<string, string | number | boolean | null>;

export async function track(event: EventName, properties: EventProperties = {}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Fire-and-forget: don't await or surface errors to caller
  supabase
    .from('analytics_events')
    .insert({ user_id: user.id, event, properties })
    .then(({ error }) => {
      if (error && __DEV__) {
        console.warn('[analytics] failed to track', event, error.message);
      }
    });
}
