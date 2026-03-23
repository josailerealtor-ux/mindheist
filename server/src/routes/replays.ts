import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../services/trapService';

const PAGE_SIZE = 20;

const router = Router();

// GET /api/attempts/:id/replay
// Public replays are accessible to anyone; private only to the player
router.get('/attempts/:id/replay', async (req, res) => {
  const attemptId = req.params.id as string;

  const { data: replay, error } = await supabase
    .from('replays')
    .select(`
      *,
      player:users!replays_player_id_fkey(username, avatar_url),
      trap:traps!replays_trap_id_fkey(title, difficulty)
    `)
    .eq('attempt_id', attemptId)
    .single();

  if (error || !replay) {
    res.status(404).json({ error: 'Replay not found' });
    return;
  }

  // Check visibility: public replays are open, private require auth
  if (!replay.is_public) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(403).json({ error: 'This replay is private' });
      return;
    }
    const token = authHeader.slice(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user || user.id !== replay.player_id) {
      res.status(403).json({ error: 'This replay is private' });
      return;
    }
  }

  // Increment view count (fire-and-forget)
  supabase
    .from('replays')
    .update({ view_count: replay.view_count + 1 })
    .eq('id', replay.id);

  res.json(replay);
});

// PATCH /api/replays/:id — toggle public/private
router.patch('/replays/:id', requireAuth, async (req: AuthRequest, res) => {
  const { is_public } = req.body;

  if (typeof is_public !== 'boolean') {
    res.status(400).json({ error: 'is_public must be a boolean' });
    return;
  }

  const { data: existing } = await supabase
    .from('replays')
    .select('player_id')
    .eq('id', req.params.id as string)
    .single();

  if (!existing) {
    res.status(404).json({ error: 'Replay not found' });
    return;
  }
  if (existing.player_id !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { data, error } = await supabase
    .from('replays')
    .update({ is_public })
    .eq('id', req.params.id as string)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// GET /api/traps/:id/replays — list public replays for a trap (cursor paginated)
router.get('/traps/:id/replays', async (req, res) => {
  const trapId = req.params.id as string;
  const cursor = req.query.cursor as string | undefined;

  let query = supabase
    .from('replays')
    .select(`
      id, attempt_id, trap_id, player_id, view_count, created_at,
      player:users!replays_player_id_fkey(username, avatar_url)
    `)
    .eq('trap_id', trapId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const replays = hasMore ? data!.slice(0, PAGE_SIZE) : (data ?? []);
  const nextCursor = hasMore ? replays[replays.length - 1].created_at : null;

  res.json({ replays, nextCursor });
});

export default router;
