import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase, getTrapWithSolution, stripSolution } from '../services/trapService';

// trapValidator lives in app/src/engine — shared via relative import
// In a future step this can be extracted to a shared package
import { validateTrap } from '../../shared/trapValidator';

const router = Router();

// POST /api/traps — create draft
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const { title, description, steps, solution, difficulty } = req.body;

  const { data, error } = await supabase
    .from('traps')
    .insert({
      creator_id: req.userId,
      title,
      description: description ?? '',
      steps: steps ?? [],
      solution: solution ?? {},
      difficulty: difficulty ?? 'medium',
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json(stripSolution(data));
});

// GET /api/traps/:id — get published trap (no solution)
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('traps')
    .select('*')
    .eq('id', req.params.id)
    .neq('status', 'archived')
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Trap not found' });
    return;
  }

  res.json(stripSolution(data));
});

// PATCH /api/traps/:id — update own draft
router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { title, description, steps, solution, difficulty } = req.body;

  const { data: existing } = await supabase
    .from('traps')
    .select('creator_id, status')
    .eq('id', req.params.id)
    .single();

  if (!existing) {
    res.status(404).json({ error: 'Trap not found' });
    return;
  }
  if (existing.creator_id !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (existing.status !== 'draft') {
    res.status(400).json({ error: 'Only drafts can be edited.' });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (steps !== undefined) updates.steps = steps;
  if (solution !== undefined) updates.solution = solution;
  if (difficulty !== undefined) updates.difficulty = difficulty;

  const { data, error } = await supabase
    .from('traps')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json(stripSolution(data));
});

// POST /api/traps/:id/publish — validate then publish
router.post('/:id/publish', requireAuth, async (req: AuthRequest, res) => {
  const { data: trap, error } = await getTrapWithSolution(req.params.id as string);

  if (error || !trap) {
    res.status(404).json({ error: 'Trap not found' });
    return;
  }
  if (trap.creator_id !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (trap.status !== 'draft') {
    res.status(400).json({ error: 'Only drafts can be published.' });
    return;
  }

  const validation = validateTrap(trap, trap.solution);
  if (!validation.valid) {
    res.status(422).json({ error: 'Trap failed validation', details: validation.errors });
    return;
  }

  const { data: published, error: publishError } = await supabase
    .from('traps')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (publishError) {
    res.status(400).json({ error: publishError.message });
    return;
  }

  // Award coins for publishing
  supabase.rpc('award_coins', {
    p_user_id: req.userId!,
    p_amount: 5,
    p_reason: 'trap_published',
    p_ref_id: published.id,
  });

  res.json(stripSolution(published));
});

// DELETE /api/traps/:id — archive
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { data: existing } = await supabase
    .from('traps')
    .select('creator_id')
    .eq('id', req.params.id)
    .single();

  if (!existing) {
    res.status(404).json({ error: 'Trap not found' });
    return;
  }
  if (existing.creator_id !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  await supabase.from('traps').update({ status: 'archived' }).eq('id', req.params.id);
  res.status(204).send();
});

// GET /api/traps/:id/stats
router.get('/:id/stats', async (req, res) => {
  const { data, error } = await supabase
    .from('traps')
    .select('attempt_count, escape_count, like_count')
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Trap not found' });
    return;
  }

  res.json(data);
});

export default router;
