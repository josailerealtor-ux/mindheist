import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../services/trapService';
import { trendingScore } from '../../shared/trending';
import { notifyChallengeSent } from '../services/notificationService';

const FEED_PAGE_SIZE = 20;

const router = Router();

// GET /api/feed — paginated trending traps
router.get('/feed', async (req, res) => {
  const cursor = req.query.cursor as string | undefined;
  const userId = await getOptionalUserId(req);

  let query = supabase
    .from('traps')
    .select(`
      *,
      creator:users!traps_creator_id_fkey(username, avatar_url)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100); // fetch a batch then score in-process

  if (cursor) {
    query = query.lt('published_at', cursor);
  }

  const { data: traps, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Score and sort
  const scored = (traps ?? [])
    .map((t) => ({ ...t, _score: trendingScore(t) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, FEED_PAGE_SIZE);

  // Attach liked_by_me if authenticated
  let likedSet = new Set<string>();
  if (userId) {
    const ids = scored.map((t) => t.id);
    const { data: likes } = await supabase
      .from('likes')
      .select('trap_id')
      .eq('user_id', userId)
      .in('trap_id', ids);
    likedSet = new Set((likes ?? []).map((l: { trap_id: string }) => l.trap_id));
  }

  const result = scored.map(({ _score: _, ...t }) => ({
    ...t,
    liked_by_me: likedSet.has(t.id),
  }));

  const nextCursor =
    scored.length === FEED_PAGE_SIZE
      ? scored[scored.length - 1].published_at
      : null;

  res.json({ traps: result, nextCursor });
});

// POST /api/traps/:id/like — toggle like
router.post('/traps/:id/like', requireAuth, async (req: AuthRequest, res) => {
  const trapId = req.params.id as string;
  const userId = req.userId!;

  const { data: existing } = await supabase
    .from('likes')
    .select('trap_id')
    .eq('user_id', userId)
    .eq('trap_id', trapId)
    .single();

  if (existing) {
    await supabase.from('likes').delete().eq('user_id', userId).eq('trap_id', trapId);
  } else {
    await supabase.from('likes').insert({ user_id: userId, trap_id: trapId });
  }

  const { data: trap } = await supabase
    .from('traps')
    .select('like_count')
    .eq('id', trapId)
    .single();

  res.json({ liked: !existing, like_count: trap?.like_count ?? 0 });
});

// GET /api/traps/:id/comments
router.get('/traps/:id/comments', async (req, res) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*, user:users!comments_user_id_fkey(username, avatar_url)')
    .eq('trap_id', req.params.id as string)
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data ?? []);
});

// POST /api/traps/:id/comments
router.post('/traps/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  const { body } = req.body;
  if (!body?.trim()) {
    res.status(400).json({ error: 'Comment body is required' });
    return;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({ trap_id: req.params.id as string, user_id: req.userId, body: body.trim() })
    .select('*, user:users!comments_user_id_fkey(username, avatar_url)')
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// POST /api/challenges — send a challenge
router.post('/challenges', requireAuth, async (req: AuthRequest, res) => {
  const { target_id, trap_id } = req.body;

  if (!target_id || !trap_id) {
    res.status(400).json({ error: 'target_id and trap_id are required' });
    return;
  }
  if (target_id === req.userId) {
    res.status(400).json({ error: 'Cannot challenge yourself' });
    return;
  }

  const { data, error } = await supabase
    .from('challenges')
    .insert({ challenger_id: req.userId, target_id, trap_id, status: 'pending' })
    .select(`
      *,
      challenger:users!challenges_challenger_id_fkey(username),
      target:users!challenges_target_id_fkey(username),
      trap:traps!challenges_trap_id_fkey(title, difficulty)
    `)
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  // Notify target (fire-and-forget)
  notifyChallengeSent(req.userId!, target_id, data.trap.title, trap_id);

  // Deduct coins from challenger, award to target (fire-and-forget)
  supabase.rpc('spend_coins', { p_user_id: req.userId!, p_amount: 20, p_reason: 'spend_challenge', p_ref_id: data.id });
  supabase.rpc('award_coins', { p_user_id: target_id, p_amount: 2, p_reason: 'challenge_received', p_ref_id: data.id });

  res.status(201).json(data);
});

// GET /api/challenges — my challenges (sent + received)
router.get('/challenges', requireAuth, async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('challenges')
    .select(`
      *,
      challenger:users!challenges_challenger_id_fkey(username),
      target:users!challenges_target_id_fkey(username),
      trap:traps!challenges_trap_id_fkey(title, difficulty)
    `)
    .or(`challenger_id.eq.${req.userId},target_id.eq.${req.userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data ?? []);
});

// PATCH /api/challenges/:id — accept or decline (target only)
router.patch('/challenges/:id', requireAuth, async (req: AuthRequest, res) => {
  const { action } = req.body;
  if (action !== 'accept' && action !== 'decline') {
    res.status(400).json({ error: 'action must be "accept" or "decline"' });
    return;
  }

  const { data: existing } = await supabase
    .from('challenges')
    .select('target_id, status')
    .eq('id', req.params.id as string)
    .single();

  if (!existing) {
    res.status(404).json({ error: 'Challenge not found' });
    return;
  }
  if (existing.target_id !== req.userId) {
    res.status(403).json({ error: 'Only the target can respond' });
    return;
  }
  if (existing.status !== 'pending') {
    res.status(400).json({ error: 'Challenge is no longer pending' });
    return;
  }

  const newStatus = action === 'accept' ? 'accepted' : 'resolved';
  const { data, error } = await supabase
    .from('challenges')
    .update({ status: newStatus })
    .eq('id', req.params.id as string)
    .select(`
      *,
      challenger:users!challenges_challenger_id_fkey(username),
      target:users!challenges_target_id_fkey(username),
      trap:traps!challenges_trap_id_fkey(title, difficulty)
    `)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data);
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function getOptionalUserId(req: { headers: { authorization?: string } }): Promise<string | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user } } = await supabase.auth.getUser(auth.slice(7));
  return user?.id ?? null;
}

export default router;
