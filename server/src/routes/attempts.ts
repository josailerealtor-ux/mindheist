import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../services/trapService';
import { processAnswer } from '../../shared/stepRunner';
import { notifyTrapFail } from '../services/notificationService';

const router = Router();

// POST /api/traps/:trapId/attempts — start a new attempt
router.post('/traps/:trapId/attempts', requireAuth, async (req: AuthRequest, res) => {
  const trapId = req.params.trapId as string;

  const { data: trap } = await supabase
    .from('traps')
    .select('id, status, steps')
    .eq('id', trapId)
    .single();

  if (!trap) {
    res.status(404).json({ error: 'Trap not found' });
    return;
  }
  if (trap.status !== 'published') {
    res.status(400).json({ error: 'Trap is not published' });
    return;
  }

  // Prevent duplicate in-progress attempts
  const { data: existing } = await supabase
    .from('attempts')
    .select('id')
    .eq('trap_id', trapId)
    .eq('player_id', req.userId)
    .eq('status', 'in_progress')
    .single();

  if (existing) {
    res.status(409).json({ error: 'You already have an in-progress attempt for this trap', attemptId: existing.id });
    return;
  }

  const { data: attempt, error } = await supabase
    .from('attempts')
    .insert({
      trap_id: trapId,
      player_id: req.userId,
      status: 'in_progress',
      current_step: 0,
      fail_count: 0,
      events: [],
    })
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  // Increment attempt_count on the trap
  await supabase.rpc('increment_attempt_count', { trap_id: trapId });

  res.status(201).json(attempt);
});

// GET /api/attempts/:id
router.get('/attempts/:id', requireAuth, async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', req.params.id as string)
    .eq('player_id', req.userId)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Attempt not found' });
    return;
  }

  res.json(data);
});

// POST /api/attempts/:id/step — submit answer for current step
router.post('/attempts/:id/step', requireAuth, async (req: AuthRequest, res) => {
  const { answer } = req.body;

  if (!answer) {
    res.status(400).json({ error: 'answer is required' });
    return;
  }

  const { data: attempt } = await supabase
    .from('attempts')
    .select('*')
    .eq('id', req.params.id as string)
    .eq('player_id', req.userId)
    .single();

  if (!attempt) {
    res.status(404).json({ error: 'Attempt not found' });
    return;
  }
  if (attempt.status !== 'in_progress') {
    res.status(400).json({ error: 'Attempt is already complete' });
    return;
  }

  // Fetch trap with solution (service role bypasses RLS)
  const { data: trap } = await supabase
    .from('traps')
    .select('steps, solution')
    .eq('id', attempt.trap_id)
    .single();

  if (!trap) {
    res.status(404).json({ error: 'Trap not found' });
    return;
  }

  let result;
  try {
    result = processAnswer(attempt, trap.steps, answer, trap.solution);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
    return;
  }

  const updatedEvents = [...attempt.events, result.event];
  const patch = { ...result.attemptPatch, events: updatedEvents };

  const { data: updated, error } = await supabase
    .from('attempts')
    .update(patch)
    .eq('id', attempt.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // If escaped, bump counters, create replay, award coins
  if (result.attemptPatch.status === 'escaped') {
    await Promise.all([
      supabase.rpc('increment_escape_count', { trap_id: attempt.trap_id }),
      supabase.rpc('increment_user_escapes', { user_id: req.userId }),
      supabase.rpc('award_coins', { p_user_id: req.userId, p_amount: 10, p_reason: 'escape', p_ref_id: attempt.id }),
    ]);
    await supabase.from('replays').insert({
      attempt_id: attempt.id,
      trap_id: attempt.trap_id,
      player_id: req.userId,
      is_public: false,
      events: updatedEvents,
    });
  }

  // Notify creator on step fail (fire-and-forget)
  if (result.event.type === 'step_fail') {
    const { data: trapMeta } = await supabase
      .from('traps')
      .select('creator_id, title')
      .eq('id', attempt.trap_id)
      .single();
    const { data: player } = await supabase
      .from('users')
      .select('username')
      .eq('id', req.userId)
      .single();
    if (trapMeta && player && trapMeta.creator_id !== req.userId) {
      notifyTrapFail(trapMeta.creator_id, player.username, trapMeta.title, attempt.trap_id);
    }
  }

  res.json({ correct: result.evaluation.correct, hint: result.evaluation.hint, attempt: updated });
});

// POST /api/attempts/:id/abandon
router.post('/attempts/:id/abandon', requireAuth, async (req: AuthRequest, res) => {
  const { data: attempt } = await supabase
    .from('attempts')
    .select('id, player_id, status')
    .eq('id', req.params.id as string)
    .eq('player_id', req.userId)
    .single();

  if (!attempt) {
    res.status(404).json({ error: 'Attempt not found' });
    return;
  }
  if (attempt.status !== 'in_progress') {
    res.status(400).json({ error: 'Attempt is not in progress' });
    return;
  }

  await supabase
    .from('attempts')
    .update({ status: 'failed', completed_at: new Date().toISOString() })
    .eq('id', attempt.id);

  res.status(204).send();
});

export default router;
